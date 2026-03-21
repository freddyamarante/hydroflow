import { FastifyPluginAsync } from 'fastify';
import { Prisma, Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, requireWriteAccess, requireReadAccess, getLocalIdForArea, computeUserLocalRole } from '../lib/access.js';
import { requireAdmin } from '../lib/rbac.js';
import { clipBounds, isPointInsideBounds } from '../lib/geo.js';

const createAreaSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  localProductivoId: z.string().min(1, 'Local productivo ID is required'),
  actividadProductiva: z.string().optional(),
  bounds: z.any().refine((v) => v && v.type === 'Polygon' && v.coordinates?.length > 0, {
    message: 'Bounds (map polygon) is required',
  }),
});

const updateAreaSchema = createAreaSchema.partial();

const areasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /areas - List with pagination and optional localProductivoId filter
  fastify.get('/areas', async (request, reply) => {
    try {
      const { page = '1', limit = '20', localProductivoId } = request.query as {
        page?: string;
        limit?: string;
        localProductivoId?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user as { id: string; rol: Rol };
      let where: any = localProductivoId ? { localProductivoId } : {};

      if (user.rol !== 'ADMIN') {
        const localIds = await getUserLocalIds(user.id, user.rol);
        where = { ...where, localProductivoId: { in: localIds } };
      }

      const [items, total] = await Promise.all([
        prisma.area.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            localProductivo: { select: { id: true, nombre: true } },
            _count: { select: { sectores: true } },
          },
        }),
        prisma.area.count({ where }),
      ]);

      return {
        items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching areas',
      });
    }
  });

  // GET /areas/:id - Single area
  fastify.get('/areas/:id', { preHandler: [requireReadAccess(async (req) => getLocalIdForArea((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const area = await prisma.area.findUnique({
        where: { id },
        include: {
          _count: { select: { sectores: true } },
        },
      });

      if (!area) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Area not found',
        });
      }

      return area;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching area',
      });
    }
  });

  // GET /areas/:id/dashboard - Area dashboard data
  fastify.get('/areas/:id/dashboard', { preHandler: [requireReadAccess(async (req) => getLocalIdForArea((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const area = await prisma.area.findUnique({
        where: { id },
        include: {
          localProductivo: { select: { id: true, nombre: true, bounds: true } },
          sectores: {
            select: {
              id: true,
              nombre: true,
              tipo: true,
              bounds: true,
              usuarioResponsable: { select: { id: true, nombre: true } },
              _count: { select: { unidadesProduccion: true } },
            },
          },
        },
      });

      if (!area) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Area not found',
        });
      }

      const totalUnidades = await prisma.unidadProduccion.count({
        where: { sector: { areaId: id } },
      });

      const siblingAreas = await prisma.area.findMany({
        where: { localProductivoId: area.localProductivoId, id: { not: id } },
        select: { id: true, nombre: true, bounds: true },
      });

      const { sectores, ...areaData } = area;

      const user = request.user as { id: string; rol: Rol };
      const currentUserLocalRole = await computeUserLocalRole(user.id, area.localProductivoId, user.rol);

      return {
        area: areaData,
        stats: {
          totalSectores: sectores.length,
          totalUnidades,
        },
        sectores: sectores.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          tipo: s.tipo,
          bounds: s.bounds,
          unidadesCount: s._count.unidadesProduccion,
          usuarioResponsable: s.usuarioResponsable,
        })),
        siblingAreas,
        currentUserLocalRole,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching area dashboard',
      });
    }
  });

  // POST /areas - Create area (supervisor+)
  fastify.post('/areas', { preHandler: [requireWriteAccess(async (req) => {
    const body = req.body as { localProductivoId?: string };
    return body.localProductivoId ?? null;
  })] }, async (request, reply) => {
    try {
      const data = createAreaSchema.parse(request.body);

      const area = await prisma.area.create({ data });

      return reply.code(201).send(area);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors[0]?.message || 'Invalid input',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while creating area',
      });
    }
  });

  // PUT /areas/:id - Update area (supervisor+)
  // When bounds change, clips child sectors and cascade-nulls unidad positions
  // Use ?dryRun=true to preview clipping without saving
  fastify.put('/areas/:id', { preHandler: [requireWriteAccess(async (req) => getLocalIdForArea((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { dryRun } = request.query as { dryRun?: string };
      const data = updateAreaSchema.parse(request.body);
      const isDryRun = dryRun === 'true';

      if (!data.bounds) {
        if (isDryRun) return { _clipping: null };
        const area = await prisma.area.update({ where: { id }, data });
        return area;
      }

      const newBounds = data.bounds as GeoJSON.Polygon;

      // Fetch sectors with bounds and their unidades (including posicion for point checks)
      const sectors = await prisma.sector.findMany({
        where: { areaId: id, bounds: { not: Prisma.DbNull } },
        select: {
          id: true, nombre: true, tipo: true, bounds: true,
          unidadesProduccion: {
            where: { posicion: { not: Prisma.DbNull } },
            select: { id: true, nombre: true, posicion: true },
          },
        },
      });

      const sectoresClipped: { id: string; nombre: string }[] = [];
      const sectoresOutside: { id: string; nombre: string }[] = [];
      const sectorUpdates: { id: string; bounds: GeoJSON.Polygon }[] = [];
      const sectorNullIds: string[] = [];
      const unidadesNulled: { id: string; nombre: string }[] = [];
      const unidadNullIds: string[] = [];

      for (const sector of sectors) {
        const result = clipBounds(sector.bounds as GeoJSON.Polygon, newBounds);
        if (result.status === 'unchanged') continue;

        if (result.status === 'clipped') {
          sectoresClipped.push({ id: sector.id, nombre: sector.nombre });
          sectorUpdates.push({ id: sector.id, bounds: result.bounds });
          // Only null unidades that are outside the new clipped sector bounds
          for (const u of sector.unidadesProduccion) {
            const pos = u.posicion as { lat: number; lng: number };
            if (!isPointInsideBounds(pos, result.bounds)) {
              unidadesNulled.push({ id: u.id, nombre: u.nombre });
              unidadNullIds.push(u.id);
            }
          }
        } else {
          // Sector fully outside — all unidades lose position
          sectoresOutside.push({ id: sector.id, nombre: sector.nombre });
          sectorNullIds.push(sector.id);
          for (const u of sector.unidadesProduccion) {
            unidadesNulled.push({ id: u.id, nombre: u.nombre });
            unidadNullIds.push(u.id);
          }
        }
      }

      const hasClipping = sectoresClipped.length > 0 || sectoresOutside.length > 0;
      const clippingSummary = hasClipping ? { sectoresClipped, sectoresOutside, unidadesNulled } : null;

      if (isDryRun) return { _clipping: clippingSummary };

      // Execute all changes in a transaction
      const txOps: any[] = [prisma.area.update({ where: { id }, data })];

      for (const upd of sectorUpdates) {
        txOps.push(prisma.sector.update({ where: { id: upd.id }, data: { bounds: upd.bounds as any } }));
      }
      if (sectorNullIds.length > 0) {
        txOps.push(prisma.sector.updateMany({ where: { id: { in: sectorNullIds } }, data: { bounds: Prisma.DbNull } }));
      }

      // Only null positions of unidades that are actually outside their new sector bounds
      if (unidadNullIds.length > 0) {
        txOps.push(prisma.unidadProduccion.updateMany({
          where: { id: { in: unidadNullIds } },
          data: { posicion: Prisma.DbNull },
        }));
      }

      const results = await prisma.$transaction(txOps);
      const updatedArea = results[0];

      if (hasClipping) return { ...updatedArea, _clipping: clippingSummary };
      return updatedArea;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors[0]?.message || 'Invalid input',
        });
      }

      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Area not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating area',
      });
    }
  });

  // DELETE /areas/:id - Delete area (admin only)
  fastify.delete('/areas/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.area.delete({ where: { id } });

      return { message: 'Area deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Area not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting area',
      });
    }
  });
};

export default areasRoutes;
