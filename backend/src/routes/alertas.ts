import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, requireWriteAccess, getLocalIdForUnidad } from '../lib/access.js';

const alertasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /alertas - List with pagination and filters
  fastify.get('/alertas', async (request, reply) => {
    try {
      const { page = '1', limit = '20', unidadProduccionId, severidad, resuelta } = request.query as {
        page?: string;
        limit?: string;
        unidadProduccionId?: string;
        severidad?: string;
        resuelta?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user as { id: string; rol: Rol };
      let where: any = {};

      if (unidadProduccionId) where.unidadProduccionId = unidadProduccionId;
      if (severidad) where.severidad = severidad;
      if (resuelta !== undefined) where.resuelta = resuelta === 'true';

      if (user.rol !== 'ADMIN') {
        const localIds = await getUserLocalIds(user.id, user.rol);
        where = {
          ...where,
          unidadProduccion: { sector: { area: { localProductivoId: { in: localIds } } } },
        };
      }

      const [items, total] = await Promise.all([
        prisma.alerta.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { creadaEn: 'desc' },
          include: {
            unidadProduccion: { select: { id: true, nombre: true } },
          },
        }),
        prisma.alerta.count({ where }),
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
        message: 'An error occurred while fetching alertas',
      });
    }
  });

  // GET /alertas/:id
  fastify.get('/alertas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const alerta = await prisma.alerta.findUnique({
        where: { id },
        include: {
          unidadProduccion: { select: { id: true, nombre: true } },
        },
      });

      if (!alerta) {
        return reply.code(404).send({ error: 'Not Found', message: 'Alerta not found' });
      }

      return alerta;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching alerta',
      });
    }
  });

  // PATCH /alertas/:id/resolver - Mark alert as resolved
  fastify.patch('/alertas/:id/resolver', {
    preHandler: [requireWriteAccess(async (req) => {
      const { id } = req.params as { id: string };
      const alerta = await prisma.alerta.findUnique({ where: { id }, select: { unidadProduccionId: true } });
      return alerta ? getLocalIdForUnidad(alerta.unidadProduccionId) : null;
    })],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as { id: string };

      const alerta = await prisma.alerta.update({
        where: { id },
        data: {
          resuelta: true,
          resueltaEn: new Date(),
          resueltaPor: user.id,
        },
      });

      return alerta;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({ error: 'Not Found', message: 'Alerta not found' });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while resolving alerta',
      });
    }
  });
};

export default alertasRoutes;
