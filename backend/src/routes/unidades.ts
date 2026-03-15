import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, requireWriteAccess, requireReadAccess, getLocalIdForSector, getLocalIdForUnidad } from '../lib/access.js';
import { requireAdmin } from '../lib/rbac.js';

async function deriveTopicMqtt(dispositivoId: string): Promise<string> {
  const dispositivo = await prisma.dispositivo.findUnique({
    where: { id: dispositivoId },
  });
  if (!dispositivo) throw new Error('Dispositivo not found');

  return `hydroflow/${dispositivo.codigo}`;
}

const createUnidadSchema = z.object({
  nombre: z.string().min(1, 'Nombre is required'),
  sectorId: z.string().min(1, 'Sector ID is required'),
  posicion: z.any().refine((v) => v && typeof v.lat === 'number' && typeof v.lng === 'number', {
    message: 'Position (map location) is required',
  }),
  detalles: z.any().optional(),
  tipoModuloId: z.string().optional(),
  topicMqtt: z.string().optional(),
  dispositivoId: z.string().optional(),
  configuracion: z.any().optional(),
});

const updateUnidadSchema = createUnidadSchema.partial();

const unidadesRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /unidades - List with pagination and optional sectorId filter
  fastify.get('/unidades', async (request, reply) => {
    try {
      const { page = '1', limit = '20', sectorId } = request.query as {
        page?: string;
        limit?: string;
        sectorId?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user as { id: string; rol: Rol };
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
          include: {
            sector: { select: { id: true, nombre: true, area: { select: { id: true, nombre: true } } } },
            dispositivo: { select: { id: true, codigo: true, tipoDispositivo: { select: { codigo: true, nombre: true } } } },
          },
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
  fastify.get('/unidades/:id', { preHandler: [requireReadAccess(async (req) => getLocalIdForUnidad((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const unidad = await prisma.unidadProduccion.findUnique({
        where: { id },
        include: {
          sector: { select: { id: true, nombre: true, area: { select: { id: true, nombre: true, localProductivo: { select: { id: true, nombre: true } } } } } },
          dispositivo: { select: { id: true, codigo: true, tipoDispositivo: { select: { codigo: true, nombre: true } } } },
        },
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

  // POST /unidades - Create unidad (supervisor+)
  fastify.post('/unidades', { preHandler: [requireWriteAccess(async (req) => {
    const body = req.body as { sectorId?: string };
    return body.sectorId ? getLocalIdForSector(body.sectorId) : null;
  })] }, async (request, reply) => {
    try {
      const data = createUnidadSchema.parse(request.body);

      if (data.dispositivoId && !data.topicMqtt) {
        data.topicMqtt = await deriveTopicMqtt(data.dispositivoId);
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

  // PUT /unidades/:id - Update unidad (supervisor+)
  fastify.put('/unidades/:id', { preHandler: [requireWriteAccess(async (req) => getLocalIdForUnidad((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateUnidadSchema.parse(request.body);

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

  // DELETE /unidades/:id - Delete unidad (admin only)
  fastify.delete('/unidades/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

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
