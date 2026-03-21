import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireEmpresaAdmin } from '../lib/rbac.js';
import { canAccessLocal, getEmpresaIdForLocal } from '../lib/access.js';

const assignUsuarioSchema = z.object({
  usuarioId: z.string().min(1, 'UsuarioId is required'),
  rol: z.enum(['SUPERVISOR', 'VISOR']),
});

const updateRolSchema = z.object({
  rol: z.enum(['SUPERVISOR', 'VISOR']),
});

const localUsuariosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /locales/:id/usuarios - List users linked to this local with their RolLocal
  fastify.get('/locales/:id/usuarios', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const user = request.user;

      const local = await prisma.localProductivo.findUnique({ where: { id } });
      if (!local) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Local productivo not found',
        });
      }

      const hasAccess = await canAccessLocal(user.id, id, user.rol);
      if (!hasAccess) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have permission to perform this action',
        });
      }

      const links = await prisma.usuarioLocalProductivo.findMany({
        where: { localProductivoId: id },
        include: {
          usuario: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      });

      const items = links.map((link) => ({
        id: link.usuario.id,
        nombre: link.usuario.nombre,
        apellido: link.usuario.apellido,
        email: link.usuario.email,
        rol: link.rol,
      }));

      return { items };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching local usuarios',
      });
    }
  });

  // POST /locales/:id/usuarios - Link a user to this local with a RolLocal (admin or empresa admin)
  fastify.post('/locales/:id/usuarios', { preHandler: [requireEmpresaAdmin(async (req) => getEmpresaIdForLocal((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = assignUsuarioSchema.parse(request.body);

      const local = await prisma.localProductivo.findUnique({ where: { id } });
      if (!local) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Local productivo not found',
        });
      }

      const usuario = await prisma.usuario.findUnique({ where: { id: data.usuarioId } });
      if (!usuario) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Usuario not found',
        });
      }

      if (usuario.empresaId !== local.empresaId) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Usuario does not belong to the empresa that owns this local',
        });
      }

      const link = await prisma.usuarioLocalProductivo.create({
        data: {
          usuarioId: data.usuarioId,
          localProductivoId: id,
          rol: data.rol,
        },
      });

      return reply.code(201).send(link);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors[0]?.message || 'Invalid input',
        });
      }

      if ((error as any).code === 'P2002') {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'Usuario is already linked to this local',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while linking usuario to local',
      });
    }
  });

  // PUT /locales/:id/usuarios/:userId - Update the RolLocal (admin or empresa admin)
  fastify.put('/locales/:id/usuarios/:userId', { preHandler: [requireEmpresaAdmin(async (req) => getEmpresaIdForLocal((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id, userId } = request.params as { id: string; userId: string };
      const data = updateRolSchema.parse(request.body);

      const link = await prisma.usuarioLocalProductivo.update({
        where: {
          usuarioId_localProductivoId: {
            usuarioId: userId,
            localProductivoId: id,
          },
        },
        data: { rol: data.rol },
      });

      return link;
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
          message: 'Usuario-local link not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating usuario role',
      });
    }
  });

  // DELETE /locales/:id/usuarios/:userId - Unlink user from local (admin or empresa admin)
  fastify.delete('/locales/:id/usuarios/:userId', { preHandler: [requireEmpresaAdmin(async (req) => getEmpresaIdForLocal((req.params as { id: string }).id))] }, async (request, reply) => {
    try {
      const { id, userId } = request.params as { id: string; userId: string };

      await prisma.usuarioLocalProductivo.delete({
        where: {
          usuarioId_localProductivoId: {
            usuarioId: userId,
            localProductivoId: id,
          },
        },
      });

      return { message: 'Usuario unlinked from local successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Usuario-local link not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while unlinking usuario from local',
      });
    }
  });
};

export default localUsuariosRoutes;
