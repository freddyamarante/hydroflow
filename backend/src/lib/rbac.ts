import { FastifyReply, FastifyRequest } from 'fastify';
import { Rol } from '@prisma/client';
import '../types/index.js';

export function requireRole(...roles: Rol[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;

    if (!user || !roles.includes(user.rol)) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to perform this action',
      });
    }
  };
}

export const requireAdmin = requireRole('ADMIN');

/**
 * Middleware that passes if user is ADMIN, or if user.esAdminEmpresa and
 * the target empresa matches user.empresaId.
 * `getTargetEmpresaId` extracts the target empresaId from the request.
 */
export function requireEmpresaAdmin(
  getTargetEmpresaId: (request: FastifyRequest) => Promise<string | null>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (user.rol === 'ADMIN') return;

    if (user.esAdminEmpresa) {
      const targetEmpresaId = await getTargetEmpresaId(request);
      if (targetEmpresaId && targetEmpresaId === user.empresaId) return;
    }

    return reply.code(403).send({
      error: 'Forbidden',
      message: 'You do not have permission to perform this action',
    });
  };
}
