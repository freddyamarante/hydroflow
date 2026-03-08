import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { getUserLocalIds, getLocalRole, getLocalIdFromDispositivo } from '../lib/access.js';
import type { PaginationQuery } from '../types/index.js';

// Area code mapping for device code generation
const AREA_CODES: Record<string, string> = {
  AIREACION_MECANICA: 'AM',
  AIREACION_ELECTRICA: 'AE',
  ESTACION_DE_BOMBEO: 'EB',
};

const createDispositivoSchema = z.object({
  tipoDispositivoId: z.string().min(1, 'Tipo dispositivo ID is required'),
  areaActividad: z.string().min(1, 'Area actividad is required'),
  localProductivoId: z.string().min(1, 'Local productivo ID is required'),
  configuracionMqtt: z.any().optional(),
});

const updateDispositivoSchema = z.object({
  configuracionMqtt: z.any().optional(),
  areaActividad: z.string().min(1).optional(),
});

async function generateCodigo(
  localProductivoId: string,
  areaActividad: string,
  tipoCodigo: string,
): Promise<string> {
  const areaCode = AREA_CODES[areaActividad] ?? areaActividad.substring(0, 2).toUpperCase();
  const prefix = `${areaCode}${tipoCodigo}`;

  const count = await prisma.dispositivo.count({
    where: {
      localProductivoId,
      codigo: { startsWith: prefix },
    },
  });

  const seq = (count + 1).toString().padStart(3, '0');
  return `${prefix}${seq}`;
}

const dispositivosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /tipos-dispositivo - List all device types
  fastify.get('/tipos-dispositivo', async (_request, reply) => {
    try {
      const items = await prisma.tipoDispositivo.findMany({
        orderBy: { codigo: 'asc' },
      });
      return items;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching tipos de dispositivo',
      });
    }
  });

  // GET /dispositivos - List with pagination and filters
  fastify.get('/dispositivos', async (request, reply) => {
    try {
      const { page = '1', limit = '20', localProductivoId, areaActividad, asignado } =
        request.query as PaginationQuery & {
          localProductivoId?: string;
          areaActividad?: string;
          asignado?: string;
        };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user;
      let where: any = {};

      if (localProductivoId) where.localProductivoId = localProductivoId;
      if (areaActividad) where.areaActividad = areaActividad;
      if (asignado !== undefined) where.asignado = asignado === 'true';

      if (user.rol !== 'ADMIN') {
        const localIds = await getUserLocalIds(user.id, user.rol);
        where.localProductivoId = where.localProductivoId
          ? where.localProductivoId
          : { in: localIds };
      }

      const [items, total] = await Promise.all([
        prisma.dispositivo.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: { tipoDispositivo: true },
        }),
        prisma.dispositivo.count({ where }),
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
        message: 'An error occurred while fetching dispositivos',
      });
    }
  });

  // GET /dispositivos/:id - Single device
  fastify.get('/dispositivos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const dispositivo = await prisma.dispositivo.findUnique({
        where: { id },
        include: {
          tipoDispositivo: true,
          sector: true,
          unidadesProduccion: { select: { id: true, nombre: true } },
        },
      });

      if (!dispositivo) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Dispositivo not found',
        });
      }

      return dispositivo;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching dispositivo',
      });
    }
  });

  // POST /dispositivos - Create device with auto-generated code
  fastify.post('/dispositivos', async (request, reply) => {
    try {
      const data = createDispositivoSchema.parse(request.body);
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localRole = await getLocalRole(user.id, data.localProductivoId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to create dispositivos in this local productivo',
          });
        }
      }

      // Look up device type code
      const tipoDispositivo = await prisma.tipoDispositivo.findUnique({
        where: { id: data.tipoDispositivoId },
      });
      if (!tipoDispositivo) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Tipo dispositivo not found',
        });
      }

      const codigo = await generateCodigo(
        data.localProductivoId,
        data.areaActividad,
        tipoDispositivo.codigo,
      );

      const dispositivo = await prisma.dispositivo.create({
        data: {
          codigo,
          tipoDispositivoId: data.tipoDispositivoId,
          areaActividad: data.areaActividad,
          localProductivoId: data.localProductivoId,
          configuracionMqtt: data.configuracionMqtt,
        },
        include: { tipoDispositivo: true },
      });

      return reply.code(201).send(dispositivo);
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
        message: 'An error occurred while creating dispositivo',
      });
    }
  });

  // PUT /dispositivos/:id - Update device
  fastify.put('/dispositivos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateDispositivoSchema.parse(request.body);
      const user = request.user;

      if (user.rol !== 'ADMIN') {
        const localId = await getLocalIdFromDispositivo(id);
        if (!localId) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'Dispositivo not found',
          });
        }
        const localRole = await getLocalRole(user.id, localId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to update this dispositivo',
          });
        }
      }

      const dispositivo = await prisma.dispositivo.update({
        where: { id },
        data,
        include: { tipoDispositivo: true },
      });

      return dispositivo;
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
          message: 'Dispositivo not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating dispositivo',
      });
    }
  });

  // DELETE /dispositivos/:id - Delete device (only if unassigned)
  fastify.delete('/dispositivos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user;

      const existing = await prisma.dispositivo.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Dispositivo not found',
        });
      }

      if (existing.asignado) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'Cannot delete an assigned dispositivo. Unassign it first.',
        });
      }

      if (user.rol !== 'ADMIN') {
        const localRole = await getLocalRole(user.id, existing.localProductivoId);
        if (localRole !== 'SUPERVISOR') {
          return reply.code(403).send({
            error: 'Forbidden',
            message: 'You do not have permission to delete this dispositivo',
          });
        }
      }

      await prisma.dispositivo.delete({ where: { id } });

      return { message: 'Dispositivo deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting dispositivo',
      });
    }
  });
};

export default dispositivosRoutes;
