import { FastifyPluginAsync } from 'fastify';
import { Prisma, Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin, requireEmpresaAdmin } from '../lib/rbac.js';
import { getUserLocalIds, requireWriteAccess, requireReadAccess, computeUserLocalRole, getEmpresaIdForLocal } from '../lib/access.js';
import { clipBounds, isPointInsideBounds } from '../lib/geo.js';

const createLocalSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  tipoProductivo: z.string().optional(),
  empresaId: z.string().min(1, 'Empresa ID is required'),
  bounds: z.any().refine((v) => v && v.type === 'Polygon' && v.coordinates?.length > 0, {
    message: 'Bounds (map location) is required',
  }),
  areaProduccion: z.string().optional(),
  direccion: z.string().optional(),
  ubicacionDomiciliaria: z.string().optional(),
});

const updateLocalSchema = createLocalSchema.partial();

const localesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /locales - List with pagination and optional empresaId filter
  fastify.get('/locales', async (request, reply) => {
    try {
      const { page = '1', limit = '20', empresaId } = request.query as {
        page?: string;
        limit?: string;
        empresaId?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user as { id: string; rol: Rol };
      let where: any = empresaId ? { empresaId } : {};

      if (user.rol !== 'ADMIN') {
        const localIds = await getUserLocalIds(user.id, user.rol);
        where = { ...where, id: { in: localIds } };
      }

      const [items, total] = await Promise.all([
        prisma.localProductivo.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.localProductivo.count({ where }),
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
        message: 'An error occurred while fetching locales productivos',
      });
    }
  });

  // GET /locales/:id - Single local productivo
  fastify.get('/locales/:id', { preHandler: [requireReadAccess(async (req) => (req.params as { id: string }).id)] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const local = await prisma.localProductivo.findUnique({
        where: { id },
        include: {
          _count: { select: { areas: true } },
        },
      });

      if (!local) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Local productivo not found',
        });
      }

      return local;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching local productivo',
      });
    }
  });

  // GET /locales/:id/dashboard - Local productivo dashboard data
  fastify.get('/locales/:id/dashboard', { preHandler: [requireReadAccess(async (req) => (req.params as { id: string }).id)] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const local = await prisma.localProductivo.findUnique({
        where: { id },
        include: {
          empresa: { select: { id: true, razonSocial: true } },
          areas: {
            select: {
              id: true,
              nombre: true,
              actividadProductiva: true,
              bounds: true,
              _count: { select: { sectores: true } },
            },
          },
        },
      });

      if (!local) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Local productivo not found',
        });
      }

      const [totalSectores, totalUnidades] = await Promise.all([
        prisma.sector.count({
          where: { area: { localProductivoId: id } },
        }),
        prisma.unidadProduccion.count({
          where: { sector: { area: { localProductivoId: id } } },
        }),
      ]);

      const { areas, ...localData } = local;

      const user = request.user as { id: string; rol: Rol };
      const currentUserLocalRole = await computeUserLocalRole(user.id, id, user.rol);

      return {
        local: localData,
        stats: {
          totalAreas: areas.length,
          totalSectores,
          totalUnidades,
        },
        areas: areas.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          actividadProductiva: a.actividadProductiva,
          bounds: a.bounds,
          sectoresCount: a._count.sectores,
        })),
        currentUserLocalRole,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching local dashboard',
      });
    }
  });

  // POST /locales - Create local productivo (admin only)
  fastify.post('/locales', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const data = createLocalSchema.parse(request.body);

      const local = await prisma.localProductivo.create({ data });

      return reply.code(201).send(local);
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
        message: 'An error occurred while creating local productivo',
      });
    }
  });

  // PUT /locales/:id - Update local productivo (supervisor+ can edit)
  // When bounds change, auto-clips child area polygons and cascade-nulls sector/unidad geometry
  // Use ?dryRun=true to preview clipping without saving
  fastify.put('/locales/:id', { preHandler: [requireWriteAccess(async (req) => (req.params as { id: string }).id)] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { dryRun } = request.query as { dryRun?: string };
      const data = updateLocalSchema.parse(request.body);
      const isDryRun = dryRun === 'true';

      // If bounds are not being updated, just do a simple update
      if (!data.bounds) {
        if (isDryRun) return { _clipping: null };
        const local = await prisma.localProductivo.update({ where: { id }, data });
        return local;
      }

      const newBounds = data.bounds as GeoJSON.Polygon;

      // Fetch areas with non-null bounds and their sectors
      const areas = await prisma.area.findMany({
        where: { localProductivoId: id, bounds: { not: Prisma.DbNull } },
        select: {
          id: true, nombre: true, bounds: true,
          sectores: {
            where: { bounds: { not: Prisma.DbNull } },
            select: {
              id: true, nombre: true, bounds: true,
              unidadesProduccion: {
                where: { posicion: { not: Prisma.DbNull } },
                select: { id: true, nombre: true, posicion: true },
              },
            },
          },
        },
      });

      // --- Clip areas against new local bounds ---
      const areasClipped: { id: string; nombre: string }[] = [];
      const areasOutside: { id: string; nombre: string }[] = [];
      const areaUpdates: { id: string; bounds: GeoJSON.Polygon }[] = [];
      const areaNullIds: string[] = [];

      // Build a map: areaId → new effective bounds (clipped or original)
      const areaNewBounds = new Map<string, GeoJSON.Polygon | null>();

      for (const area of areas) {
        const result = clipBounds(area.bounds as GeoJSON.Polygon, newBounds);
        if (result.status === 'unchanged') {
          areaNewBounds.set(area.id, area.bounds as GeoJSON.Polygon);
        } else if (result.status === 'clipped') {
          areasClipped.push({ id: area.id, nombre: area.nombre });
          areaUpdates.push({ id: area.id, bounds: result.bounds });
          areaNewBounds.set(area.id, result.bounds);
        } else {
          areasOutside.push({ id: area.id, nombre: area.nombre });
          areaNullIds.push(area.id);
          areaNewBounds.set(area.id, null);
        }
      }

      // --- Clip sectors against their area's new bounds ---
      const sectoresClipped: { id: string; nombre: string }[] = [];
      const sectoresOutside: { id: string; nombre: string }[] = [];
      const sectorUpdates: { id: string; bounds: GeoJSON.Polygon }[] = [];
      const sectorNullIds: string[] = [];
      const unidadesNulled: { id: string; nombre: string }[] = [];
      const unidadNullIds: string[] = [];

      for (const area of areas) {
        const effectiveBounds = areaNewBounds.get(area.id);

        for (const sector of area.sectores) {
          if (!effectiveBounds) {
            // Area is fully outside → all its sectors are outside too
            sectoresOutside.push({ id: sector.id, nombre: sector.nombre });
            sectorNullIds.push(sector.id);
            for (const u of sector.unidadesProduccion) {
              unidadesNulled.push({ id: u.id, nombre: u.nombre });
              unidadNullIds.push(u.id);
            }
            continue;
          }

          const result = clipBounds(sector.bounds as GeoJSON.Polygon, effectiveBounds);
          if (result.status === 'unchanged') continue;
          if (result.status === 'clipped') {
            sectoresClipped.push({ id: sector.id, nombre: sector.nombre });
            sectorUpdates.push({ id: sector.id, bounds: result.bounds });
            // Only null unidades actually outside the new clipped sector bounds
            for (const u of sector.unidadesProduccion) {
              const pos = u.posicion as { lat: number; lng: number };
              if (!isPointInsideBounds(pos, result.bounds)) {
                unidadesNulled.push({ id: u.id, nombre: u.nombre });
                unidadNullIds.push(u.id);
              }
            }
          } else {
            sectoresOutside.push({ id: sector.id, nombre: sector.nombre });
            sectorNullIds.push(sector.id);
            for (const u of sector.unidadesProduccion) {
              unidadesNulled.push({ id: u.id, nombre: u.nombre });
              unidadNullIds.push(u.id);
            }
          }
        }
      }

      const hasClipping = areasClipped.length > 0 || areasOutside.length > 0
        || sectoresClipped.length > 0 || sectoresOutside.length > 0;

      const clippingSummary = hasClipping ? {
        areasClipped, areasOutside,
        sectoresClipped, sectoresOutside,
        unidadesNulled,
      } : null;

      // Dry run — return preview without saving
      if (isDryRun) {
        return { _clipping: clippingSummary };
      }

      // Execute all changes in a single transaction
      const txOps: any[] = [
        prisma.localProductivo.update({ where: { id }, data }),
      ];

      for (const upd of areaUpdates) {
        txOps.push(prisma.area.update({ where: { id: upd.id }, data: { bounds: upd.bounds as any } }));
      }
      if (areaNullIds.length > 0) {
        txOps.push(prisma.area.updateMany({ where: { id: { in: areaNullIds } }, data: { bounds: Prisma.DbNull } }));
      }

      for (const upd of sectorUpdates) {
        txOps.push(prisma.sector.update({ where: { id: upd.id }, data: { bounds: upd.bounds as any } }));
      }
      if (sectorNullIds.length > 0) {
        txOps.push(prisma.sector.updateMany({ where: { id: { in: sectorNullIds } }, data: { bounds: Prisma.DbNull } }));
      }

      if (unidadNullIds.length > 0) {
        txOps.push(prisma.unidadProduccion.updateMany({
          where: { id: { in: unidadNullIds } },
          data: { posicion: Prisma.DbNull },
        }));
      }

      const results = await prisma.$transaction(txOps);
      const updatedLocal = results[0];

      if (hasClipping) {
        return { ...updatedLocal, _clipping: clippingSummary };
      }

      return updatedLocal;
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
          message: 'Local productivo not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating local productivo',
      });
    }
  });

  // DELETE /locales/:id - Delete local productivo (admin only)
  fastify.delete('/locales/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.localProductivo.delete({ where: { id } });

      return { message: 'Local productivo deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Local productivo not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting local productivo',
      });
    }
  });

  // GET /locales/:id/usuarios - List assigned users (admin or empresa admin)
  fastify.get('/locales/:id/usuarios', { preHandler: [requireEmpresaAdmin(async (req) => getEmpresaIdForLocal((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const assignments = await prisma.usuarioLocalProductivo.findMany({
        where: { localProductivoId: id },
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      });

      const items = assignments.map((a) => ({
        usuarioId: a.usuario.id,
        nombre: a.usuario.nombre,
        apellido: a.usuario.apellido,
        email: a.usuario.email,
        rol: a.rol,
      }));

      return { items };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching local usuarios',
      });
    }
  });

  // POST /locales/:id/usuarios - Assign user to local (admin or empresa admin)
  fastify.post('/locales/:id/usuarios', { preHandler: [requireEmpresaAdmin(async (req) => getEmpresaIdForLocal((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = z.object({
        usuarioId: z.string().min(1, 'Usuario ID is required'),
        rol: z.enum(['SUPERVISOR', 'VISOR']),
      }).parse(request.body);

      // Validate: user belongs to the same empresa that owns the local
      const local = await prisma.localProductivo.findUnique({
        where: { id },
        select: { empresaId: true },
      });
      if (!local) {
        return reply.code(404).send({ error: 'Not Found', message: 'Local productivo not found' });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id: data.usuarioId },
        select: { empresaId: true },
      });
      if (!usuario) {
        return reply.code(404).send({ error: 'Not Found', message: 'Usuario not found' });
      }

      if (usuario.empresaId !== local.empresaId) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'El usuario no pertenece a la misma empresa del local',
        });
      }

      // Check if already assigned
      const existing = await prisma.usuarioLocalProductivo.findUnique({
        where: {
          usuarioId_localProductivoId: {
            usuarioId: data.usuarioId,
            localProductivoId: id,
          },
        },
      });
      if (existing) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'El usuario ya esta asignado a este local',
        });
      }

      const assignment = await prisma.usuarioLocalProductivo.create({
        data: {
          usuarioId: data.usuarioId,
          localProductivoId: id,
          rol: data.rol,
        },
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      });

      return reply.code(201).send({
        usuarioId: assignment.usuario.id,
        nombre: assignment.usuario.nombre,
        apellido: assignment.usuario.apellido,
        email: assignment.usuario.email,
        rol: assignment.rol,
      });
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
        message: 'An error occurred while assigning usuario to local',
      });
    }
  });

  // PUT /locales/:id/usuarios/:userId - Update local-level role (admin or empresa admin)
  fastify.put('/locales/:id/usuarios/:userId', { preHandler: [requireEmpresaAdmin(async (req) => getEmpresaIdForLocal((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id, userId } = request.params as { id: string; userId: string };
      const data = z.object({
        rol: z.enum(['SUPERVISOR', 'VISOR']),
      }).parse(request.body);

      const assignment = await prisma.usuarioLocalProductivo.update({
        where: {
          usuarioId_localProductivoId: {
            usuarioId: userId,
            localProductivoId: id,
          },
        },
        data: { rol: data.rol },
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, email: true } },
        },
      });

      return {
        usuarioId: assignment.usuario.id,
        nombre: assignment.usuario.nombre,
        apellido: assignment.usuario.apellido,
        email: assignment.usuario.email,
        rol: assignment.rol,
      };
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
          message: 'Assignment not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating local usuario role',
      });
    }
  });

  // DELETE /locales/:id/usuarios/:userId - Remove assignment (admin or empresa admin)
  fastify.delete('/locales/:id/usuarios/:userId', { preHandler: [requireEmpresaAdmin(async (req) => getEmpresaIdForLocal((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id, userId } = request.params as { id: string; userId: string };

      await prisma.usuarioLocalProductivo.delete({
        where: {
          usuarioId_localProductivoId: {
            usuarioId: userId,
            localProductivoId: id,
          },
        },
      });

      return { message: 'Usuario removed from local successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Assignment not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while removing usuario from local',
      });
    }
  });
};

export default localesRoutes;
