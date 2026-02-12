import { FastifyPluginAsync } from 'fastify';
import prisma from '../lib/prisma.js';
import { addWsConnection, removeWsConnection } from '../services/readings.js';

const lecturasRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /ws/lecturas/:unidadId - WebSocket endpoint for real-time readings
  fastify.get('/ws/lecturas/:unidadId', { websocket: true }, async (socket, request) => {
    // Verify JWT from query param for WebSocket connections
    const { token } = request.query as { token?: string };
    if (!token) {
      socket.close(1008, 'Token required');
      return;
    }

    try {
      fastify.jwt.verify(token);
    } catch {
      socket.close(1008, 'Invalid token');
      return;
    }

    const { unidadId } = request.params as { unidadId: string };

    addWsConnection(unidadId, socket);

    socket.on('close', () => {
      removeWsConnection(unidadId, socket);
    });
  });

  // GET /lecturas - REST endpoint for historical readings
  fastify.get('/lecturas', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const { unidadProduccionId, limit = '100' } = request.query as {
        unidadProduccionId?: string;
        limit?: string;
      };

      if (!unidadProduccionId) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'unidadProduccionId query parameter is required',
        });
      }

      const limitNum = Math.max(1, Math.min(1000, parseInt(limit)));

      const lecturas = await prisma.lectura.findMany({
        where: { unidadProduccionId },
        orderBy: { timestamp: 'desc' },
        take: limitNum,
      });

      return { items: lecturas };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching lecturas',
      });
    }
  });
};

export default lecturasRoutes;
