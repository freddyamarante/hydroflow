import { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAdmin, requireEmpresaAdmin } from '../lib/rbac.js';
import { Rol } from '@prisma/client';

const createUsuarioSchema = z.object({
  email: z.string().email('Invalid email format'),
  contrasena: z.string().min(8, 'Password must be at least 8 characters'),
  nombre: z.string().min(1, 'Nombre is required'),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
  empresaId: z.string().optional().transform(v => v || undefined),
  rol: z.enum(['ADMIN', 'USER']).optional(),
  esAdminEmpresa: z.boolean().optional(),
});

const updateUsuarioSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  contrasena: z.string().min(8, 'Password must be at least 8 characters').optional(),
  nombre: z.string().min(1, 'Nombre is required').optional(),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
  empresaId: z.string().optional().transform(v => v || undefined),
  rol: z.enum(['ADMIN', 'USER']).optional(),
  esAdminEmpresa: z.boolean().optional(),
});

const userSelect = {
  id: true,
  email: true,
  nombre: true,
  apellido: true,
  telefono: true,
  empresaId: true,
  rol: true,
  esAdminEmpresa: true,
  createdAt: true,
  updatedAt: true,
};

const usuariosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /usuarios - List with pagination (scoped by role)
  // ADMIN: all users; esAdminEmpresa: own empresa; USER: self only
  fastify.get('/usuarios', async (request, reply) => {
    try {
      const user = request.user as { id: string; rol: Rol; empresaId?: string; esAdminEmpresa: boolean };
      const { page = '1', limit = '20', empresaId } = request.query as {
        page?: string;
        limit?: string;
        empresaId?: string;
      };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      let where: any = {};

      if (user.rol === 'ADMIN') {
        // ADMIN can filter by empresaId or see all
        if (empresaId) where = { empresaId };
      } else if (user.esAdminEmpresa && user.empresaId) {
        // Empresa admin: only own empresa users
        where = { empresaId: user.empresaId };
      } else {
        // Regular user: only self
        where = { id: user.id };
      }

      const [items, total] = await Promise.all([
        prisma.usuario.findMany({
          where,
          select: userSelect,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.usuario.count({ where }),
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
        message: 'An error occurred while fetching usuarios',
      });
    }
  });

  // GET /usuarios/:id - Single usuario (scoped by role)
  fastify.get('/usuarios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user as { id: string; rol: Rol; empresaId?: string; esAdminEmpresa: boolean };

      // Access control: ADMIN any, esAdminEmpresa own empresa, USER self only
      if (user.rol !== 'ADMIN') {
        if (user.id === id) {
          // Can always view self
        } else if (user.esAdminEmpresa && user.empresaId) {
          const target = await prisma.usuario.findUnique({
            where: { id },
            select: { empresaId: true },
          });
          if (!target || target.empresaId !== user.empresaId) {
            return reply.code(403).send({ error: 'Forbidden', message: 'You do not have access to this user' });
          }
        } else {
          return reply.code(403).send({ error: 'Forbidden', message: 'You do not have access to this user' });
        }
      }

      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: {
          ...userSelect,
          empresa: { select: { id: true, razonSocial: true } },
          localesProductivos: {
            include: {
              localProductivo: { select: { id: true, nombre: true } },
            },
          },
        },
      });

      if (!usuario) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Usuario not found',
        });
      }

      return usuario;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching usuario',
      });
    }
  });

  // POST /usuarios - Create usuario (admin only)
  fastify.post('/usuarios', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const data = createUsuarioSchema.parse(request.body);

      const existing = await prisma.usuario.findUnique({
        where: { email: data.email },
      });

      if (existing) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Email already in use',
        });
      }

      const hashedPassword = await argon2.hash(data.contrasena);

      const usuario = await prisma.usuario.create({
        data: {
          ...data,
          contrasena: hashedPassword,
        },
        select: userSelect,
      });

      return reply.code(201).send(usuario);
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
        message: 'An error occurred while creating usuario',
      });
    }
  });

  // PUT /usuarios/:id - Update usuario (admin only)
  fastify.put('/usuarios/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateUsuarioSchema.parse(request.body);

      const updateData: any = { ...data };

      if (data.contrasena) {
        updateData.contrasena = await argon2.hash(data.contrasena);
      }

      const usuario = await prisma.usuario.update({
        where: { id },
        data: updateData,
        select: userSelect,
      });

      return usuario;
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
          message: 'Usuario not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating usuario',
      });
    }
  });

  // DELETE /usuarios/:id - Delete usuario (admin only)
  fastify.delete('/usuarios/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.usuario.delete({ where: { id } });

      return { message: 'Usuario deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Usuario not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting usuario',
      });
    }
  });

  // POST /usuarios/:id/link-empresa - Link user to empresa (admin only)
  fastify.post('/usuarios/:id/link-empresa', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { empresaId } = z.object({ empresaId: z.string().min(1) }).parse(request.body);

      const usuario = await prisma.usuario.update({
        where: { id },
        data: { empresaId },
        select: userSelect,
      });

      return usuario;
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
          message: 'Usuario not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while linking usuario to empresa',
      });
    }
  });

  // DELETE /usuarios/:id/unlink-empresa - Unlink user from empresa (admin only)
  fastify.delete('/usuarios/:id/unlink-empresa', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const usuario = await prisma.usuario.update({
        where: { id },
        data: { empresaId: null },
        select: userSelect,
      });

      return usuario;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Usuario not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while unlinking usuario from empresa',
      });
    }
  });
};

export default usuariosRoutes;
