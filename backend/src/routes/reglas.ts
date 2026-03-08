import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, requireWriteAccess, getLocalIdForUnidad } from '../lib/access.js';

const createReglaSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  unidadProduccionId: z.string().min(1, 'Unidad de Produccion ID is required'),
  variable: z.string().min(1, 'Variable is required'),
  operador: z.enum(['MAYOR_QUE', 'MENOR_QUE', 'IGUAL_A', 'DIFERENTE_DE', 'FUERA_DE_RANGO']),
  compararCon: z.string().optional().nullable(),
  valorFijo: z.number().optional().nullable(),
  codigoEspecificacion: z.string().optional().nullable(),
  toleranciaPorcentaje: z.number().optional().nullable(),
  severidad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  activa: z.boolean().optional(),
});

const updateReglaSchema = createReglaSchema.partial();

async function getLocalIdForRegla(reglaId: string): Promise<string | null> {
  const regla = await prisma.regla.findUnique({
    where: { id: reglaId },
    select: { unidadProduccionId: true },
  });
  return regla ? getLocalIdForUnidad(regla.unidadProduccionId) : null;
}

const reglasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /reglas - List with optional unidadProduccionId filter
  fastify.get('/reglas', async (request, reply) => {
    try {
      const { page = '1', limit = '20', unidadProduccionId } = request.query as {
        page?: string;
        limit?: string;
        unidadProduccionId?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user as { id: string; rol: Rol };
      let where: any = unidadProduccionId ? { unidadProduccionId } : {};

      if (user.rol !== 'ADMIN') {
        const localIds = await getUserLocalIds(user.id, user.rol);
        where = {
          ...where,
          unidadProduccion: { sector: { area: { localProductivoId: { in: localIds } } } },
        };
      }

      const [items, total] = await Promise.all([
        prisma.regla.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            unidadProduccion: { select: { id: true, nombre: true } },
          },
        }),
        prisma.regla.count({ where }),
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
        message: 'An error occurred while fetching reglas',
      });
    }
  });

  // GET /reglas/:id
  fastify.get('/reglas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const regla = await prisma.regla.findUnique({
        where: { id },
        include: {
          unidadProduccion: { select: { id: true, nombre: true } },
        },
      });

      if (!regla) {
        return reply.code(404).send({ error: 'Not Found', message: 'Regla not found' });
      }

      return regla;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching regla',
      });
    }
  });

  // POST /reglas
  fastify.post('/reglas', {
    preHandler: [requireWriteAccess(async (req) => {
      const body = req.body as { unidadProduccionId?: string };
      return body.unidadProduccionId ? getLocalIdForUnidad(body.unidadProduccionId) : null;
    })],
  }, async (request, reply) => {
    try {
      const data = createReglaSchema.parse(request.body);
      const regla = await prisma.regla.create({ data });
      return reply.code(201).send(regla);
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
        message: 'An error occurred while creating regla',
      });
    }
  });

  // PUT /reglas/:id
  fastify.put('/reglas/:id', {
    preHandler: [requireWriteAccess(async (req) => getLocalIdForRegla((req.params as { id: string }).id))],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateReglaSchema.parse(request.body);
      const regla = await prisma.regla.update({ where: { id }, data });
      return regla;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors[0]?.message || 'Invalid input',
        });
      }
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({ error: 'Not Found', message: 'Regla not found' });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating regla',
      });
    }
  });

  // PATCH /reglas/:id/toggle - Toggle activa boolean
  fastify.patch('/reglas/:id/toggle', {
    preHandler: [requireWriteAccess(async (req) => getLocalIdForRegla((req.params as { id: string }).id))],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const existing = await prisma.regla.findUnique({ where: { id }, select: { activa: true } });
      if (!existing) {
        return reply.code(404).send({ error: 'Not Found', message: 'Regla not found' });
      }

      const regla = await prisma.regla.update({
        where: { id },
        data: { activa: !existing.activa },
      });

      return regla;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while toggling regla',
      });
    }
  });

  // DELETE /reglas/:id
  fastify.delete('/reglas/:id', {
    preHandler: [requireWriteAccess(async (req) => getLocalIdForRegla((req.params as { id: string }).id))],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.regla.delete({ where: { id } });
      return { message: 'Regla deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({ error: 'Not Found', message: 'Regla not found' });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting regla',
      });
    }
  });
};

export default reglasRoutes;
