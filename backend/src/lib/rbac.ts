import { FastifyReply, FastifyRequest } from 'fastify';
import { Rol } from '@prisma/client';

export function requireRole(...roles: Rol[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; email: string; rol: Rol };

    if (!user || !roles.includes(user.rol)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
      });
    }
  };
}

export const requireAdmin = requireRole('ADMIN');
