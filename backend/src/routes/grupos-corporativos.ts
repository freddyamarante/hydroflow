import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';
import { Rol } from '@prisma/client';

const createGrupoCorporativoSchema = z.object({
  razonSocial: z.string().min(1, 'Razon social is required'),
  tipoIndustria: z.string().optional(),
  direccion: z.string().optional(),
  ubicacionDomiciliaria: z.string().optional(),
  paginaWeb: z.string().optional(),
});

const updateGrupoCorporativoSchema = createGrupoCorporativoSchema.partial();

const gruposCorporativosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /grupos-corporativos - List with pagination (scoped for non-admins)
  fastify.get('/grupos-corporativos', async (request, reply) => {
    try {
      const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const user = request.user as { id: string; rol: Rol; empresaId?: string };

      // Non-admins can only see the grupo that contains their empresa
      let where: any = {};
      if (user.rol !== 'ADMIN' && user.empresaId) {
        const empresa = await prisma.empresa.findUnique({
          where: { id: user.empresaId },
          select: { grupoCorporativoId: true },
        });
        if (empresa?.grupoCorporativoId) {
          where = { id: empresa.grupoCorporativoId };
        } else {
          return { items: [], total: 0, page: pageNum, totalPages: 0 };
        }
      }

      const [items, total] = await Promise.all([
        prisma.grupoCorporativo.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: { _count: { select: { empresas: true } } },
        }),
        prisma.grupoCorporativo.count({ where }),
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
        message: 'An error occurred while fetching grupos corporativos',
      });
    }
  });

  // GET /grupos-corporativos/:id - Single grupo corporativo with empresas (scoped)
  fastify.get('/grupos-corporativos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as { id: string; rol: Rol; empresaId?: string };

      // Non-admins: verify their empresa belongs to this grupo
      if (user.rol !== 'ADMIN') {
        if (!user.empresaId) {
          return reply.code(403).send({ error: 'Forbidden', message: 'You do not have access to this resource' });
        }
        const empresa = await prisma.empresa.findUnique({
          where: { id: user.empresaId },
          select: { grupoCorporativoId: true },
        });
        if (empresa?.grupoCorporativoId !== id) {
          return reply.code(403).send({ error: 'Forbidden', message: 'You do not have access to this resource' });
        }
      }

      const grupo = await prisma.grupoCorporativo.findUnique({
        where: { id },
        include: {
          empresas: true,
        },
      });

      if (!grupo) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Grupo corporativo not found',
        });
      }

      return grupo;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching grupo corporativo',
      });
    }
  });

  // POST /grupos-corporativos - Create grupo corporativo (admin only)
  fastify.post('/grupos-corporativos', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const data = createGrupoCorporativoSchema.parse(request.body);

      const grupo = await prisma.grupoCorporativo.create({ data });

      return reply.code(201).send(grupo);
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
        message: 'An error occurred while creating grupo corporativo',
      });
    }
  });

  // PUT /grupos-corporativos/:id - Update grupo corporativo (admin only)
  fastify.put('/grupos-corporativos/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateGrupoCorporativoSchema.parse(request.body);

      const grupo = await prisma.grupoCorporativo.update({
        where: { id },
        data,
      });

      return grupo;
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
          message: 'Grupo corporativo not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating grupo corporativo',
      });
    }
  });

  // DELETE /grupos-corporativos/:id - Delete grupo corporativo (admin only)
  fastify.delete('/grupos-corporativos/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.grupoCorporativo.delete({ where: { id } });

      return { message: 'Grupo corporativo deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Grupo corporativo not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting grupo corporativo',
      });
    }
  });
};

export default gruposCorporativosRoutes;
