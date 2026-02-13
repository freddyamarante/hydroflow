import { FastifyPluginAsync } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { config } from '../config/index.js';
import prisma from '../lib/prisma.js';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  contrasena: z.string().min(8, 'Password must be at least 8 characters'),
  nombre: z.string().min(1, 'Name is required'),
  apellido: z.string().optional(),
  telefono: z.string().optional(),
  empresaId: z.string().optional(),
});

const isSecure = config.NODE_ENV !== 'development';
const cookieDomain = isSecure ? '.hydro-flow.io' : undefined;

const cookieOptions = {
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax' as const,
  domain: cookieDomain,
  path: '/',
  maxAge: 7 * 24 * 60 * 60,
};

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/login - Authenticate user
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      const user = await prisma.usuario.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          contrasena: true,
          nombre: true,
          apellido: true,
          rol: true,
        },
      });

      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      const validPassword = await argon2.verify(user.contrasena, password);

      if (!validPassword) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });

      reply.setCookie('token', token, cookieOptions);

      return {
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellido: user.apellido,
          rol: user.rol,
        },
      };
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
        message: 'An error occurred during login',
      });
    }
  });

  // POST /auth/register - Register new user
  fastify.post('/auth/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);

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

      const user = await prisma.usuario.create({
        data: {
          email: data.email,
          contrasena: hashedPassword,
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          empresaId: data.empresaId,
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          rol: true,
        },
      });

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });

      reply.setCookie('token', token, cookieOptions);

      return { user };
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
        message: 'An error occurred during registration',
      });
    }
  });

  // GET /auth/me - Get current user
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.id;

      const user = await prisma.usuario.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          nombre: true,
          apellido: true,
          rol: true,
        },
      });

      if (!user) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      return { user };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching user data',
      });
    }
  });

  // POST /auth/logout - Clear authentication cookie
  fastify.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie('token', {
      path: '/',
      domain: cookieDomain,
    });

    return { message: 'Logged out successfully' };
  });

  // POST /auth/refresh - Refresh JWT token
  fastify.post('/auth/refresh', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user;

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        rol: user.rol,
      });

      reply.setCookie('token', token, cookieOptions);

      return { message: 'Token refreshed successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while refreshing token',
      });
    }
  });
};

export default authRoutes;
