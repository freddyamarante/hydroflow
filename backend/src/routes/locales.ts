import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';
import { getUserLocalIds } from '../lib/access.js';

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

  // PUT /locales/:id - Update local productivo (admin only)
  fastify.put('/locales/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
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
};

export default localesRoutes;
