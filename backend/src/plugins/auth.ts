import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config/index.js';

const authPlugin: FastifyPluginAsync = async (fastify) => {
  // Register JWT
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: '7d', // Access token expires in 7 days
    },
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Register Cookie
  await fastify.register(cookie, {
    secret: config.JWT_SECRET,
    hook: 'onRequest',
  });

  // JWT verification decorator
  fastify.decorate('authenticate', async function (request, reply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
    }
  });
};

export default fp(authPlugin, {
  name: 'auth-plugin',
});
