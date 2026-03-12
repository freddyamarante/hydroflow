import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';
import { canAccessLocal } from '../lib/access.js';
import '../types/index.js';

const meRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /me/locales - Locales the current user has access to
  fastify.get('/me/locales', async (request, reply) => {
    try {
      const user = request.user;

      let locales;

      if (user.rol === 'ADMIN') {
        locales = await prisma.localProductivo.findMany({
          include: {
            empresa: {
              select: {
                id: true,
                razonSocial: true,
                grupoCorporativo: { select: { id: true, razonSocial: true } },
              },
            },
            _count: {
              select: {
                areas: true,
              },
            },
          },
          orderBy: { nombre: 'asc' },
        });
      } else {
        const links = await prisma.usuarioLocalProductivo.findMany({
          where: { usuarioId: user.id },
          include: {
            localProductivo: {
              include: {
                empresa: {
                  select: {
                    id: true,
                    razonSocial: true,
                    grupoCorporativo: { select: { id: true, razonSocial: true } },
                  },
                },
                _count: {
                  select: {
                    areas: true,
                  },
                },
              },
            },
          },
        });
        locales = links.map((l) => l.localProductivo);
      }

      // Add stats for each local
      const localesWithStats = await Promise.all(
        locales.map(async (local) => {
          const [totalSectores, totalUnidades] = await Promise.all([
            prisma.sector.count({
              where: { area: { localProductivoId: local.id } },
            }),
            prisma.unidadProduccion.count({
              where: { sector: { area: { localProductivoId: local.id } } },
            }),
          ]);

          return {
            ...local,
            stats: {
              totalAreas: local._count.areas,
              totalSectores,
              totalUnidades,
            },
          };
        }),
      );

      return { items: localesWithStats };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching user locales',
      });
    }
  });

  // GET /me/locales/:id/stats - Aggregated stats for a specific local
  fastify.get('/me/locales/:id/stats', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user;

      const hasAccess = await canAccessLocal(user.id, id, user.rol);
      if (!hasAccess) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this local',
        });
      }

      const local = await prisma.localProductivo.findUnique({
        where: { id },
        include: {
          empresa: { select: { id: true, razonSocial: true } },
        },
      });

      if (!local) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Local productivo not found',
        });
      }

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [totalAreas, totalSectores, totalUnidades, totalEquipos, lecturasHoy, alertasActivas] =
        await Promise.all([
          prisma.area.count({
            where: { localProductivoId: id },
          }),
          prisma.sector.count({
            where: { area: { localProductivoId: id } },
          }),
          prisma.unidadProduccion.count({
            where: { sector: { area: { localProductivoId: id } } },
          }),
          prisma.equipo.count({
            where: { unidadProduccion: { sector: { area: { localProductivoId: id } } } },
          }),
          prisma.lectura.count({
            where: {
              timestamp: { gte: startOfDay },
              unidadProduccion: { sector: { area: { localProductivoId: id } } },
            },
          }),
          prisma.alerta.count({
            where: {
              resuelta: false,
              unidadProduccion: { sector: { area: { localProductivoId: id } } },
            },
          }),
        ]);

      return {
        local,
        stats: {
          totalAreas,
          totalSectores,
          totalUnidades,
          totalEquipos,
          lecturasHoy,
          alertasActivas,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching local stats',
      });
    }
  });
};

export default meRoutes;
