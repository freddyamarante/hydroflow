import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config/index.js';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma
const prisma = new PrismaClient();

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
});

// Register CORS
await fastify.register(cors, {
  origin: config.NODE_ENV === 'production'
    ? ['https://hydro-flow.io', 'https://www.hydro-flow.io']
    : true,
  credentials: true,
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      message: 'funciona!',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      database: 'connected',
      mqtt: 'pending', // Will update when MQTT client is implemented
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
      docs: '/docs', // Future
    },
  };
});

// Graceful shutdown
const gracefulShutdown = async () => {
  fastify.log.info('Received shutdown signal, closing gracefully...');

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

    fastify.log.info(`🚀 HydroFlow Backend running on ${config.HOST}:${config.PORT}`);
    fastify.log.info(`📊 Environment: ${config.NODE_ENV}`);
    fastify.log.info(`🔗 Database: ${config.DATABASE_URL.split('@')[1]?.split('/')[0] || 'connected'}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
