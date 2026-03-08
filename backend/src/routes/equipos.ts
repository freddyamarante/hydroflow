import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, requireWriteAccess, getLocalIdForUnidad } from '../lib/access.js';

const createEquipoSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  tipo: z.string().min(1, 'Tipo is required'),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  especificaciones: z.any().optional(),
  unidadProduccionId: z.string().min(1, 'Unidad de Produccion ID is required'),
});

const updateEquipoSchema = createEquipoSchema.partial();

const equiposRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /equipos - List with optional unidadProduccionId filter
  fastify.get('/equipos', async (request, reply) => {
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
        prisma.equipo.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            unidadProduccion: {
              select: { id: true, nombre: true },
            },
          },
        }),
        prisma.equipo.count({ where }),
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
        message: 'An error occurred while fetching equipos',
      });
    }
  });

  // GET /equipos/:id
  fastify.get('/equipos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const equipo = await prisma.equipo.findUnique({
        where: { id },
        include: {
          unidadProduccion: { select: { id: true, nombre: true } },
        },
      });

      if (!equipo) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Equipo not found',
        });
      }

      return equipo;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching equipo',
      });
    }
  });

  // POST /equipos
  fastify.post('/equipos', {
    preHandler: [requireWriteAccess(async (req) => {
      const body = req.body as { unidadProduccionId?: string };
      return body.unidadProduccionId ? getLocalIdForUnidad(body.unidadProduccionId) : null;
    })],
  }, async (request, reply) => {
    try {
      const data = createEquipoSchema.parse(request.body);
      const equipo = await prisma.equipo.create({ data });
      return reply.code(201).send(equipo);
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
        message: 'An error occurred while creating equipo',
      });
    }
  });

  // PUT /equipos/:id
  fastify.put('/equipos/:id', {
    preHandler: [requireWriteAccess(async (req) => {
      const { id } = req.params as { id: string };
      const equipo = await prisma.equipo.findUnique({ where: { id }, select: { unidadProduccionId: true } });
      return equipo ? getLocalIdForUnidad(equipo.unidadProduccionId) : null;
    })],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateEquipoSchema.parse(request.body);
      const equipo = await prisma.equipo.update({ where: { id }, data });
      return equipo;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors[0]?.message || 'Invalid input',
        });
      }
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({ error: 'Not Found', message: 'Equipo not found' });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating equipo',
      });
    }
  });

  // DELETE /equipos/:id
  fastify.delete('/equipos/:id', {
    preHandler: [requireWriteAccess(async (req) => {
      const { id } = req.params as { id: string };
      const equipo = await prisma.equipo.findUnique({ where: { id }, select: { unidadProduccionId: true } });
      return equipo ? getLocalIdForUnidad(equipo.unidadProduccionId) : null;
    })],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await prisma.equipo.delete({ where: { id } });
      return { message: 'Equipo deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({ error: 'Not Found', message: 'Equipo not found' });
      }
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting equipo',
      });
    }
  });
};

export default equiposRoutes;
