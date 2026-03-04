import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';
import { getUserLocalIds, requireWriteAccess, computeUserLocalRole } from '../lib/access.js';

const createLocalSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  tipoProductivo: z.string().optional(),
  empresaId: z.string().min(1, 'Empresa ID is required'),
  bounds: z.any().optional(),
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
  fastify.get('/locales/:id', async (request, reply) => {
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
  fastify.get('/locales/:id/dashboard', async (request, reply) => {
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
  fastify.put('/locales/:id', { preHandler: [requireWriteAccess(async (req) => (req.params as { id: string }).id)] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateLocalSchema.parse(request.body);

      const local = await prisma.localProductivo.update({
        where: { id },
        data,
      });

      return local;
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

  // GET /locales/:id/usuarios - List assigned users with their local roles (admin only)
  fastify.get('/locales/:id/usuarios', { preHandler: [requireAdmin] }, async (request, reply) => {
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

  // POST /locales/:id/usuarios - Assign user to local (admin only)
  fastify.post('/locales/:id/usuarios', { preHandler: [requireAdmin] }, async (request, reply) => {
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

  // PUT /locales/:id/usuarios/:userId - Update local-level role (admin only)
  fastify.put('/locales/:id/usuarios/:userId', { preHandler: [requireAdmin] }, async (request, reply) => {
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

  // DELETE /locales/:id/usuarios/:userId - Remove assignment (admin only)
  fastify.delete('/locales/:id/usuarios/:userId', { preHandler: [requireAdmin] }, async (request, reply) => {
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
