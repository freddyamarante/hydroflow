import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config/index.js';
import prisma from './lib/prisma.js';
import authPlugin from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import empresasRoutes from './routes/empresas.js';
import localesRoutes from './routes/locales.js';
import areasRoutes from './routes/areas.js';
import sectoresRoutes from './routes/sectores.js';
import unidadesRoutes from './routes/unidades.js';
import lecturasRoutes from './routes/lecturas.js';
import gruposCorporativosRoutes from './routes/grupos-corporativos.js';
import usuariosRoutes from './routes/usuarios.js';
import dispositivosRoutes from './routes/dispositivos.js';
import equiposRoutes from './routes/equipos.js';
import reglasRoutes from './routes/reglas.js';
import alertasRoutes from './routes/alertas.js';
import adminRoutes from './routes/admin.js';
import meRoutes from './routes/me.js';
import { connectMqtt, disconnectMqtt, getMqttClient } from './services/mqtt.js';
import { initReadingsHandler } from './services/readings.js';

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Register CORS
await fastify.register(cors, {
  origin: config.NODE_ENV === 'development'
    ? true
    : [
        'https://hydro-flow.io',
        'https://www.hydro-flow.io',
        'https://staging.hydro-flow.io',
      ],
  credentials: true,
});

// Register WebSocket plugin
await fastify.register(websocket);

// Register auth plugin
await fastify.register(authPlugin);

// Register auth routes
await fastify.register(authRoutes);

// Register API routes
await fastify.register(empresasRoutes, { prefix: '/api' });
await fastify.register(localesRoutes, { prefix: '/api' });
await fastify.register(areasRoutes, { prefix: '/api' });
await fastify.register(sectoresRoutes, { prefix: '/api' });
await fastify.register(unidadesRoutes, { prefix: '/api' });
await fastify.register(lecturasRoutes, { prefix: '/api' });
await fastify.register(gruposCorporativosRoutes, { prefix: '/api' });
await fastify.register(usuariosRoutes, { prefix: '/api' });
await fastify.register(dispositivosRoutes, { prefix: '/api' });
await fastify.register(equiposRoutes, { prefix: '/api' });
await fastify.register(reglasRoutes, { prefix: '/api' });
await fastify.register(alertasRoutes, { prefix: '/api' });
await fastify.register(adminRoutes, { prefix: '/api' });
await fastify.register(meRoutes, { prefix: '/api' });

// Health check endpoint
fastify.get('/health', async (_request, reply) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const mqttClient = getMqttClient();

    return {
      status: 'ok',
      message: 'funcionaaaaaa',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      database: 'connected',
      mqtt: mqttClient?.connected ? 'connected' : 'disconnected',
    };
  } catch (error) {
    reply.code(503);
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// Root endpoint
fastify.get('/', async () => {
  return {
    name: 'HydroFlow API',
    version: '1.0.0',
    environment: config.NODE_ENV,
    endpoints: {
      health: '/health',
      auth: {
        login: 'POST /auth/login',
        register: 'POST /auth/register',
        logout: 'POST /auth/logout',
        me: 'GET /auth/me',
        refresh: 'POST /auth/refresh',
      },
      api: {
        gruposCorporativos: '/api/grupos-corporativos',
        empresas: '/api/empresas',
        usuarios: '/api/usuarios',
        locales: '/api/locales',
        areas: '/api/areas',
        sectores: '/api/sectores',
        unidades: '/api/unidades',
        dispositivos: '/api/dispositivos',
        tiposDispositivo: '/api/tipos-dispositivo',
        lecturas: '/api/lecturas',
        ws: '/api/ws/lecturas/:unidadId',
      },
    },
  };
});

// Graceful shutdown
const gracefulShutdown = async () => {
  fastify.log.info('Received shutdown signal, closing gracefully...');

  await disconnectMqtt();
  await prisma.$disconnect();
  await fastify.close();

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const start = async () => {
  try {
    await fastify.listen({
      port: config.PORT,
      host: config.HOST
    });

    fastify.log.info(`HydroFlow Backend running on ${config.HOST}:${config.PORT}`);
    fastify.log.info(`Environment: ${config.NODE_ENV}`);

    // Connect MQTT (non-blocking, reconnects automatically)
    initReadingsHandler();
    connectMqtt();
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
