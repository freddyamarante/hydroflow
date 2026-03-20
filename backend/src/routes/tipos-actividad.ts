import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';

const createTipoActividadSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  codigo: z.string().min(1, 'Codigo is required'),
  descripcion: z.string().optional(),
});

const updateTipoActividadSchema = createTipoActividadSchema.partial();

const tiposActividadRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /tipos-actividad - List all
  fastify.get('/tipos-actividad', async (_request, reply) => {
    try {
      const items = await prisma.tipoActividadProductiva.findMany({
        orderBy: { creadoEn: 'desc' },
        include: {
          _count: { select: { tiposUnidadProduccion: true } },
        },
      });

      return items;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching tipos de actividad',
      });
    }
  });

  // GET /tipos-actividad/:id
  fastify.get('/tipos-actividad/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const tipoActividad = await prisma.tipoActividadProductiva.findUnique({
        where: { id },
        include: {
          tiposUnidadProduccion: true,
        },
      });

      if (!tipoActividad) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Tipo de actividad not found',
        });
      }

      return tipoActividad;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching tipo de actividad',
      });
    }
  });

  // POST /tipos-actividad
  fastify.post('/tipos-actividad', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const data = createTipoActividadSchema.parse(request.body);
      const tipoActividad = await prisma.tipoActividadProductiva.create({ data });
      return reply.code(201).send(tipoActividad);
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
          message: 'A tipo de actividad with this nombre or codigo already exists',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while creating tipo de actividad',
      });
    }
  });

  // PUT /tipos-actividad/:id
  fastify.put('/tipos-actividad/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateTipoActividadSchema.parse(request.body);
      const tipoActividad = await prisma.tipoActividadProductiva.update({
        where: { id },
        data,
      });
      return tipoActividad;
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
          message: 'Tipo de actividad not found',
        });
      }
      if ((error as any).code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'A tipo de actividad with this nombre or codigo already exists',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating tipo de actividad',
      });
    }
  });

  // DELETE /tipos-actividad/:id
  fastify.delete('/tipos-actividad/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if has child tipos-unidad
      const childCount = await prisma.tipoUnidadProduccion.count({
        where: { tipoActividadProductivaId: id },
      });

      if (childCount > 0) {
        return reply.code(409).send({
          error: 'Conflict',
          message: `Cannot delete: this tipo de actividad has ${childCount} tipo(s) de unidad associated`,
        });
      }

      await prisma.tipoActividadProductiva.delete({ where: { id } });
      return { message: 'Tipo de actividad deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Tipo de actividad not found',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting tipo de actividad',
      });
    }
  });
};

export default tiposActividadRoutes;
