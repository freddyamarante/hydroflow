import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';
import { reloadDefinitionsForType } from '../services/formula-engine.js';

const createVariableSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  codigo: z.string().min(1, 'Codigo is required'),
  unidad: z.string().optional(),
  tipo: z.enum(['SENSOR', 'FIJA', 'CALCULADA']),
  claveJson: z.string().optional(),
  formula: z.string().optional(),
  valorPorDefecto: z.number().optional(),
  orden: z.number().int().optional(),
  esVisibleEnDashboard: z.boolean().optional(),
  esVisibleEnMapa: z.boolean().optional(),
  iconoSugerido: z.string().optional(),
  colorSugerido: z.string().optional(),
});

const updateVariableSchema = createVariableSchema.partial();

const reorderSchema = z.object({
  orden: z.array(z.object({
    id: z.string().min(1),
    orden: z.number().int(),
  })),
});

async function tryReloadDefinitions(tipoUnidadProduccionId: string, fastify: any) {
  try {
    await reloadDefinitionsForType(tipoUnidadProduccionId);
  } catch (err) {
    fastify.log.warn(err, '[Formula Engine] Failed to reload definitions (engine may not be initialized yet)');
  }
}

const variablesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /tipos-unidad/:tipoUnidadId/variables - List variables for a type
  fastify.get('/tipos-unidad/:tipoUnidadId/variables', async (request, reply) => {
    try {
      const { tipoUnidadId } = request.params as { tipoUnidadId: string };

      const variables = await prisma.variableDefinicion.findMany({
        where: { tipoUnidadProduccionId: tipoUnidadId },
        orderBy: { orden: 'asc' },
      });

      return variables;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching variables',
      });
    }
  });

  // POST /tipos-unidad/:tipoUnidadId/variables
  fastify.post('/tipos-unidad/:tipoUnidadId/variables', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { tipoUnidadId } = request.params as { tipoUnidadId: string };
      const data = createVariableSchema.parse(request.body);

      const variable = await prisma.variableDefinicion.create({
        data: {
          ...data,
          tipoUnidadProduccionId: tipoUnidadId,
        },
      });

      await tryReloadDefinitions(tipoUnidadId, fastify);

      return reply.code(201).send(variable);
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
          message: 'A variable with this codigo already exists for this tipo de unidad',
        });
      }
      if ((error as any).code === 'P2003') {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'The specified tipo de unidad does not exist',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while creating variable',
      });
    }
  });

  // PUT /variables/:id
  fastify.put('/variables/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateVariableSchema.parse(request.body);

      const variable = await prisma.variableDefinicion.update({
        where: { id },
        data,
      });

      await tryReloadDefinitions(variable.tipoUnidadProduccionId, fastify);

      return variable;
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
          message: 'Variable not found',
        });
      }
      if ((error as any).code === 'P2002') {
        return reply.code(409).send({
          error: 'Conflict',
          message: 'A variable with this codigo already exists for this tipo de unidad',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating variable',
      });
    }
  });

  // DELETE /variables/:id
  fastify.delete('/variables/:id', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const variable = await prisma.variableDefinicion.findUnique({
        where: { id },
        select: { tipoUnidadProduccionId: true },
      });

      if (!variable) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Variable not found',
        });
      }

      await prisma.variableDefinicion.delete({ where: { id } });

      await tryReloadDefinitions(variable.tipoUnidadProduccionId, fastify);

      return { message: 'Variable deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Variable not found',
        });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting variable',
      });
    }
  });

  // PUT /tipos-unidad/:tipoUnidadId/variables/reorder - Bulk update orden values
  fastify.put('/tipos-unidad/:tipoUnidadId/variables/reorder', {
    preHandler: [requireAdmin],
  }, async (request, reply) => {
    try {
      const { tipoUnidadId } = request.params as { tipoUnidadId: string };
      const { orden } = reorderSchema.parse(request.body);

      await prisma.$transaction(
        orden.map(({ id, orden: newOrden }) =>
          prisma.variableDefinicion.update({
            where: { id },
            data: { orden: newOrden },
          })
        )
      );

      await tryReloadDefinitions(tipoUnidadId, fastify);

      const variables = await prisma.variableDefinicion.findMany({
        where: { tipoUnidadProduccionId: tipoUnidadId },
        orderBy: { orden: 'asc' },
      });

      return variables;
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
        message: 'An error occurred while reordering variables',
      });
    }
  });
};

export default variablesRoutes;
