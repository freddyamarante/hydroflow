import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, getLocalRole, getLocalIdFromSector, getLocalIdFromUnidad } from '../lib/access.js';
import type { PaginationQuery } from '../types/index.js';

const createUnidadSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  sectorId: z.string().min(1, 'Sector ID is required'),
  posicion: z.any().optional(),
  detalles: z.any().optional(),
  tipoModuloId: z.string().optional(),
  topicMqtt: z.string().min(1, 'MQTT topic is required'),
  configuracion: z.any().optional(),
});

const updateUnidadSchema = createUnidadSchema.partial();

const unidadesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /unidades - List with pagination and optional sectorId filter
  fastify.get('/unidades', async (request, reply) => {
    try {
      const { page = '1', limit = '20', sectorId } = request.query as
        PaginationQuery & { sectorId?: string };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user;
      let where: any = sectorId ? { sectorId } : {};

      if (user.rol !== 'ADMIN') {
        const localIds = await getUserLocalIds(user.id, user.rol);
        where = { ...where, sector: { area: { localProductivoId: { in: localIds } } } };
      }

      const [items, total] = await Promise.all([
        prisma.unidadProduccion.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.unidadProduccion.count({ where }),
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
        message: 'An error occurred while fetching unidades de produccion',
      });
    }
  });

  // GET /unidades/:id - Single unidad
  fastify.get('/unidades/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const unidad = await prisma.unidadProduccion.findUnique({
        where: { id },
      });

      if (!unidad) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Unidad de produccion not found',
        });
      }

      return unidad;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching unidad de produccion',
      });
    }
  });

  // POST /unidades - Create unidad (admin or supervisor on the parent local)
  fastify.post('/unidades', async (request, reply) => {
    try {
      const data = createUnidadSchema.parse(request.body);
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localId = await getLocalIdFromSector(data.sectorId);
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
            message: 'You do not have permission to create unidades in this local productivo',
          });
        }
      }

      const unidad = await prisma.unidadProduccion.create({ data });

      return reply.code(201).send(unidad);
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
        message: 'An error occurred while creating unidad de produccion',
      });
    }
  });

  // PUT /unidades/:id - Update unidad (admin or supervisor on the parent local)
  fastify.put('/unidades/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateUnidadSchema.parse(request.body);
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localId = await getLocalIdFromUnidad(id);
        if (!localId) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Unidad de produccion not found',
          });
        }
        const localRole = await getLocalRole(user.id, localId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to update this unidad de produccion',
          });
        }
      }

      const unidad = await prisma.unidadProduccion.update({
        where: { id },
        data,
      });

      return unidad;
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
          message: 'Unidad de produccion not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating unidad de produccion',
      });
    }
  });

  // DELETE /unidades/:id - Delete unidad (admin or supervisor on the parent local)
  fastify.delete('/unidades/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localId = await getLocalIdFromUnidad(id);
        if (!localId) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Unidad de produccion not found',
          });
        }
        const localRole = await getLocalRole(user.id, localId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to delete this unidad de produccion',
          });
        }
      }

      await prisma.unidadProduccion.delete({ where: { id } });

      return { message: 'Unidad de produccion deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Unidad de produccion not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting unidad de produccion',
      });
    }
  });
};

export default unidadesRoutes;
