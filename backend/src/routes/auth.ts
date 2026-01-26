import { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { z } from 'zod';
import { config } from '../config/index.js';

const prisma = new PrismaClient();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/login - Authenticate user
  fastify.post('/auth/login', async (request, reply) => {
    try {
      // Validate request body
      const { email, password } = loginSchema.parse(request.body);

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          role: true,
        },
      });

      if (!user) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Verify password
      const validPassword = await argon2.verify(user.password, password);

      if (!validPassword) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Set httpOnly cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      });

      // Return user data (without password)
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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

  // GET /auth/me - Get current user
  fastify.get('/auth/me', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const userId = request.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
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
  fastify.post('/auth/logout', async (request, reply) => {
    reply.clearCookie('token', {
      path: '/',
    });

    return { message: 'Logged out successfully' };
  });

  // POST /auth/refresh - Refresh JWT token
  fastify.post('/auth/refresh', {
    onRequest: [fastify.authenticate],
  }, async (request, reply) => {
    try {
      const user = request.user;

      // Generate new token
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        role: user.role,
      });

      // Set new cookie
      reply.setCookie('token', token, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      });

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
