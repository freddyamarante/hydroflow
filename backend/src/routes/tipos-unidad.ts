import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';

const createTipoUnidadSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  codigo: z.string().min(1, 'Codigo is required'),
  descripcion: z.string().optional(),
  tipoActividadProductivaId: z.string().min(1, 'Tipo de actividad productiva ID is required'),
});

const updateTipoUnidadSchema = createTipoUnidadSchema.partial();

const tiposUnidadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /tipos-unidad - List all, optional tipoActividadId filter
  fastify.get('/tipos-unidad', async (request, reply) => {
    try {
      const { tipoActividadId } = request.query as { tipoActividadId?: string };

      const where: any = tipoActividadId
        ? { tipoActividadProductivaId: tipoActividadId }
        : {};

      const items = await prisma.tipoUnidadProduccion.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        include: {
          tipoActividadProductiva: { select: { nombre: true } },
          _count: { select: { variables: true, unidadesProduccion: true } },
        },
      });

      return items;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching tipos de unidad',
      });
    }
  });

  // GET /tipos-unidad/:id
  fastify.get('/tipos-unidad/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const tipoUnidad = await prisma.tipoUnidadProduccion.findUnique({
        where: { id },
        include: {
          tipoActividadProductiva: true,
          variables: { orderBy: { orden: 'asc' } },
        },
      });

      if (!tipoUnidad) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Tipo de unidad not found',
        });
      }

      return tipoUnidad;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching tipo de unidad',
      });
    }
  });

  // POST /tipos-unidad
  fastify.post('/tipos-unidad', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const data = createTipoUnidadSchema.parse(request.body);
      const tipoUnidad = await prisma.tipoUnidadProduccion.create({ data });
      return reply.code(201).send(tipoUnidad);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors[0]?.message || 'Invalid input',
        });
      }
      if ((error as any).code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'A tipo de unidad with this codigo already exists',
        });
      }
      if ((error as any).code === 'P2003') {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'The specified tipo de actividad productiva does not exist',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while creating tipo de unidad',
      });
    }
  });

  // PUT /tipos-unidad/:id
  fastify.put('/tipos-unidad/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateTipoUnidadSchema.parse(request.body);
      const tipoUnidad = await prisma.tipoUnidadProduccion.update({
        where: { id },
        data,
      });
      return tipoUnidad;
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
          message: 'Tipo de unidad not found',
        });
      }
      if ((error as any).code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'A tipo de unidad with this codigo already exists',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating tipo de unidad',
      });
    }
  });

  // DELETE /tipos-unidad/:id
  fastify.delete('/tipos-unidad/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if has assigned unidades de produccion
      const unidadCount = await prisma.unidadProduccion.count({
        where: { tipoUnidadProduccionId: id },
      });

      if (unidadCount > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: `Cannot delete: this tipo de unidad has ${unidadCount} unidad(es) de produccion assigned`,
        });
      }

      await prisma.tipoUnidadProduccion.delete({ where: { id } });
      return { message: 'Tipo de unidad deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Tipo de unidad not found',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting tipo de unidad',
      });
    }
  });
};

export default tiposUnidadRoutes;
