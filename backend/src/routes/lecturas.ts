import { FastifyPluginAsync } from 'fastify';
import { Rol } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { canAccessUnidad } from '../lib/access.js';
import { addWsConnection, removeWsConnection } from '../services/readings.js';

const lecturasRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /ws/lecturas/:unidadId - WebSocket endpoint for real-time readings
  fastify.get('/ws/lecturas/:unidadId', { websocket: true }, async (socket, request) => {
    // Verify JWT from cookie (sent automatically with the WS upgrade request)
    try {
      await request.jwtVerify();
    } catch {
      socket.close(1008, 'Invalid or missing token');
      return;
    }

    const { unidadId } = request.params as { unidadId: string };
    const user = request.user as { id: string; rol: Rol };

    // Check access to this unidad
    const allowed = await canAccessUnidad(user.id, unidadId, user.rol);
    if (!allowed) {
      socket.close(1008, 'Forbidden');
      return;
    }

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
      const { unidadProduccionId, limit = '100', desde, hasta } = request.query as {
        unidadProduccionId?: string;
        limit?: string;
        desde?: string;
        hasta?: string;
      };

      if (!unidadProduccionId) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: 'unidadProduccionId query parameter is required',
        });
      }

      // Check access to this unidad
      const user = request.user as { id: string; rol: Rol };
      const allowed = await canAccessUnidad(user.id, unidadProduccionId, user.rol);
      if (!allowed) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You do not have access to this unidad',
        });
      }

      const limitNum = Math.max(1, Math.min(1000, parseInt(limit)));

      const where: any = { unidadProduccionId };
      if (desde || hasta) {
        where.timestamp = {};
        if (desde) where.timestamp.gte = new Date(desde);
        if (hasta) where.timestamp.lte = new Date(hasta);
      }

      const lecturas = await prisma.lectura.findMany({
        where,
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
