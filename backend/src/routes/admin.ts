import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /admin/stats - System-wide statistics (admin only)
  fastify.get('/admin/stats', { preHandler: [requireAdmin] }, async (_request, reply) => {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [
        totalEmpresas,
        totalLocales,
        totalUnidades,
        totalEquipos,
        totalUsuarios,
        totalLecturas,
        lecturasHoy,
        alertasActivas,
      ] = await Promise.all([
        prisma.empresa.count(),
        prisma.localProductivo.count(),
        prisma.unidadProduccion.count(),
        prisma.equipo.count(),
        prisma.usuario.count(),
        prisma.lectura.count(),
        prisma.lectura.count({
          where: { timestamp: { gte: startOfDay } },
        }),
        prisma.alerta.count({
          where: { resuelta: false },
        }),
      ]);

      return {
        totalEmpresas,
        totalLocales,
        totalUnidades,
        totalEquipos,
        totalUsuarios,
        totalLecturas,
        lecturasHoy,
        alertasActivas,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching admin stats',
      });
    }
  });

  // GET /admin/alerts - Paginated alerts with unidad info (admin only)
  fastify.get('/admin/alerts', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { page = '1', limit = '20' } = request.query as {
        page?: string;
        limit?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
        prisma.alerta.findMany({
          skip,
          take: limitNum,
          orderBy: { creadaEn: 'desc' },
          include: {
            unidadProduccion: {
              select: {
                id: true,
                nombre: true,
                sector: {
                  select: {
                    nombre: true,
                    area: {
                      select: {
                        nombre: true,
                        localProductivo: {
                          select: { nombre: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        prisma.alerta.count(),
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
        message: 'An error occurred while fetching alerts',
      });
    }
  });

  // GET /admin/lecturas-stats - Readings count grouped by time (admin only)
  fastify.get('/admin/lecturas-stats', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { periodo = '24h' } = request.query as { periodo?: string };

      const now = new Date();
      let since: Date;
      let interval: string;

      switch (periodo) {
        case '7d':
          since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          interval = '1 day';
          break;
        case '30d':
          since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          interval = '1 day';
          break;
        case '24h':
        default:
          since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          interval = '1 hour';
          break;
      }

      const stats = await prisma.$queryRawUnsafe<Array<{ bucket: Date; count: bigint }>>(
        `SELECT date_trunc($1, timestamp) as bucket, COUNT(*)::bigint as count
         FROM lectura
         WHERE timestamp >= $2
         GROUP BY bucket
         ORDER BY bucket ASC`,
        interval === '1 hour' ? 'hour' : 'day',
        since,
      );

      return {
        periodo,
        data: stats.map((s) => ({
          timestamp: s.bucket,
          count: Number(s.count),
        })),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching lecturas stats',
      });
    }
  });
};

export default adminRoutes;
