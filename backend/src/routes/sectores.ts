import { FastifyPluginAsync } from 'fastify';
import { Prisma, Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, requireWriteAccess, getLocalIdForSector, getLocalIdForArea, computeUserLocalRole } from '../lib/access.js';
import { isPointInsideBounds } from '../lib/geo.js';

const createSectorSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  areaId: z.string().min(1, 'Area ID is required'),
  tipo: z.string().optional(),
  bounds: z.any().refine((v) => v && v.type === 'Polygon' && v.coordinates?.length > 0, {
    message: 'Bounds (map polygon) is required',
  }),
  detalles: z.any().optional(),
  usuarioResponsableId: z.string().optional().transform(v => v || undefined),
});

const updateSectorSchema = createSectorSchema.partial();

const sectoresRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /sectores - List with pagination and optional areaId filter
  fastify.get('/sectores', async (request, reply) => {
    try {
      const { page = '1', limit = '20', areaId } = request.query as {
        page?: string;
        limit?: string;
        areaId?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user as { id: string; rol: Rol };
      let where: any = areaId ? { areaId } : {};

      if (user.rol !== 'ADMIN') {
        const localIds = await getUserLocalIds(user.id, user.rol);
        where = { ...where, area: { localProductivoId: { in: localIds } } };
      }

      const [items, total] = await Promise.all([
        prisma.sector.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            area: {
              select: {
                id: true,
                nombre: true,
                localProductivo: { select: { id: true, nombre: true } },
              },
            },
            _count: { select: { unidadesProduccion: true } },
          },
        }),
        prisma.sector.count({ where }),
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
        message: 'An error occurred while fetching sectores',
      });
    }
  });

  // GET /sectores/:id - Single sector
  fastify.get('/sectores/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const sector = await prisma.sector.findUnique({
        where: { id },
        include: {
          _count: { select: { unidadesProduccion: true } },
        },
      });

      if (!sector) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Sector not found',
        });
      }

      return sector;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching sector',
      });
    }
  });

  // GET /sectores/:id/dashboard - Sector dashboard data
  fastify.get('/sectores/:id/dashboard', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const sector = await prisma.sector.findUnique({
        where: { id },
        include: {
          area: {
            select: {
              id: true,
              nombre: true,
              bounds: true,
              localProductivo: { select: { id: true, nombre: true } },
            },
          },
          usuarioResponsable: {
            select: { id: true, nombre: true, apellido: true },
          },
          unidadesProduccion: {
            select: {
              id: true,
              nombre: true,
              topicMqtt: true,
              posicion: true,
              dispositivo: { select: { id: true, codigo: true } },
              lecturas: {
                select: { timestamp: true, valores: true },
                orderBy: { timestamp: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      if (!sector) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Sector not found',
        });
      }

      const siblingSectores = await prisma.sector.findMany({
        where: { areaId: sector.areaId, id: { not: id } },
        select: { id: true, nombre: true, bounds: true },
      });

      const { unidadesProduccion, ...sectorData } = sector;

      const user = request.user as { id: string; rol: Rol };
      const localId = sector.area.localProductivo.id;
      const currentUserLocalRole = await computeUserLocalRole(user.id, localId, user.rol);

      return {
        sector: sectorData,
        stats: {
          totalUnidades: unidadesProduccion.length,
        },
        unidades: unidadesProduccion.map((u) => ({
          id: u.id,
          nombre: u.nombre,
          topicMqtt: u.topicMqtt,
          posicion: u.posicion,
          dispositivoCodigo: u.dispositivo?.codigo ?? null,
          ultimaLectura: u.lecturas[0]?.timestamp ?? null,
          valores: (u.lecturas[0]?.valores as Record<string, number> | undefined) ?? null,
        })),
        siblingSectores,
        currentUserLocalRole,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching sector dashboard',
      });
    }
  });

  // POST /sectores - Create sector (supervisor+)
  fastify.post('/sectores', { preHandler: [requireWriteAccess(async (req) => {
    const body = req.body as { areaId?: string };
    return body.areaId ? getLocalIdForArea(body.areaId) : null;
  })] }, async (request, reply) => {
    try {
      const data = createSectorSchema.parse(request.body);

      const sector = await prisma.sector.create({ data });

      return reply.code(201).send(sector);
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
        message: 'An error occurred while creating sector',
      });
    }
  });

  // PUT /sectores/:id - Update sector (supervisor+)
  // When bounds change, nulls positions of unidades outside new bounds
  // Use ?dryRun=true to preview without saving
  fastify.put('/sectores/:id', { preHandler: [requireWriteAccess(async (req) => getLocalIdForSector((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { dryRun } = request.query as { dryRun?: string };
      const data = updateSectorSchema.parse(request.body);
      const isDryRun = dryRun === 'true';

      if (!data.bounds) {
        if (isDryRun) return { _clipping: null };
        const sector = await prisma.sector.update({ where: { id }, data });
        return sector;
      }

      const newBounds = data.bounds as GeoJSON.Polygon;

      // Find unidades with positions that would be outside the new bounds
      const unidades = await prisma.unidadProduccion.findMany({
        where: { sectorId: id, posicion: { not: Prisma.DbNull } },
        select: { id: true, nombre: true, posicion: true },
      });

      const unidadesNulled: { id: string; nombre: string }[] = [];
      const unidadNullIds: string[] = [];

      for (const u of unidades) {
        const pos = u.posicion as { lat: number; lng: number };
        if (!isPointInsideBounds(pos, newBounds)) {
          unidadesNulled.push({ id: u.id, nombre: u.nombre });
          unidadNullIds.push(u.id);
        }
      }

      const hasClipping = unidadesNulled.length > 0;
      const clippingSummary = hasClipping ? { unidadesNulled } : null;

      if (isDryRun) return { _clipping: clippingSummary };

      const txOps: any[] = [prisma.sector.update({ where: { id }, data })];

      if (unidadNullIds.length > 0) {
        txOps.push(prisma.unidadProduccion.updateMany({
          where: { id: { in: unidadNullIds } },
          data: { posicion: Prisma.DbNull },
        }));
      }

      const results = await prisma.$transaction(txOps);
      const updatedSector = results[0];

      if (hasClipping) return { ...updatedSector, _clipping: clippingSummary };
      return updatedSector;
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
          message: 'Sector not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating sector',
      });
    }
  });

  // DELETE /sectores/:id - Delete sector (supervisor+)
  fastify.delete('/sectores/:id', { preHandler: [requireWriteAccess(async (req) => getLocalIdForSector((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.sector.delete({ where: { id } });

      return { message: 'Sector deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Sector not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting sector',
      });
    }
  });
};

export default sectoresRoutes;
