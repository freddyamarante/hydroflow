import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, requireWriteAccess, getLocalIdForArea, computeUserLocalRole } from '../lib/access.js';

const createAreaSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  localProductivoId: z.string().min(1, 'Local productivo ID is required'),
  actividadProductiva: z.string().optional(),
  bounds: z.any().optional(),
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
  fastify.get('/areas/:id', async (request, reply) => {
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
  fastify.get('/areas/:id/dashboard', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const area = await prisma.area.findUnique({
        where: { id },
        include: {
          localProductivo: { select: { id: true, nombre: true } },
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
  fastify.put('/areas/:id', { preHandler: [requireWriteAccess(async (req) => getLocalIdForArea((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateAreaSchema.parse(request.body);

      const area = await prisma.area.update({
        where: { id },
        data,
      });

      return area;
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

  // DELETE /areas/:id - Delete area (supervisor+)
  fastify.delete('/areas/:id', { preHandler: [requireWriteAccess(async (req) => getLocalIdForArea((req.params as { id: string }).id))] }, async (request, reply) => {
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
