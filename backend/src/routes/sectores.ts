import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, getLocalRole, getLocalIdFromArea, getLocalIdFromSector } from '../lib/access.js';
import type { PaginationQuery } from '../types/index.js';

const createSectorSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  areaId: z.string().min(1, 'Area ID is required'),
  tipo: z.string().optional(),
  bounds: z.any().optional(),
  detalles: z.any().optional(),
  usuarioResponsableId: z.string().optional().transform(v => v || undefined),
});

const updateSectorSchema = createSectorSchema.partial();

const sectoresRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /sectores - List with pagination and optional areaId filter
  fastify.get('/sectores', async (request, reply) => {
    try {
      const { page = '1', limit = '20', areaId } = request.query as
        PaginationQuery & { areaId?: string };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user;
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
              lecturas: {
                select: { timestamp: true },
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

      const { unidadesProduccion, ...sectorData } = sector;

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
          ultimaLectura: u.lecturas[0]?.timestamp ?? null,
        })),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching sector dashboard',
      });
    }
  });

  // POST /sectores - Create sector (admin or supervisor on the parent local)
  fastify.post('/sectores', async (request, reply) => {
    try {
      const data = createSectorSchema.parse(request.body);
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localId = await getLocalIdFromArea(data.areaId);
        if (!localId) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Area not found',
          });
        }
        const localRole = await getLocalRole(user.id, localId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to create sectores in this local productivo',
          });
        }
      }

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

  // PUT /sectores/:id - Update sector (admin or supervisor on the parent local)
  fastify.put('/sectores/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateSectorSchema.parse(request.body);
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localId = await getLocalIdFromSector(id);
        if (!localId) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Sector not found',
          });
        }
        const localRole = await getLocalRole(user.id, localId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to update this sector',
          });
        }
      }

      const sector = await prisma.sector.update({
        where: { id },
        data,
      });

      return sector;
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

  // DELETE /sectores/:id - Delete sector (admin or supervisor on the parent local)
  fastify.delete('/sectores/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localId = await getLocalIdFromSector(id);
        if (!localId) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Sector not found',
          });
        }
        const localRole = await getLocalRole(user.id, localId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to delete this sector',
          });
        }
      }

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
