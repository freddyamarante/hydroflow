import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import argon2 from 'argon2';
import prisma from '../lib/prisma.js';
import { requireAdmin } from '../lib/rbac.js';

const createEmpresaSchema = z.object({
  razonSocial: z.string().min(1, 'Razon social is required'),
  marcaComercial: z.string().optional(),
  ruc: z.string().optional(),
  actividadEconomica: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  ubicacionDomiciliaria: z.string().optional(),
  areaProduccion: z.string().optional(),
  paginaWeb: z.string().optional(),
  grupoCorporativoId: z.string().optional().transform(v => v || undefined),
});

const updateEmpresaSchema = createEmpresaSchema.partial();

const empresasRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', fastify.authenticate);

  // GET /empresas - List with pagination
  fastify.get('/empresas', async (request, reply) => {
    try {
      const { page = '1', limit = '20' } = request.query as { page?: string; limit?: string };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
        prisma.empresa.findMany({
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.empresa.count(),
      ]);

      return {
        items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching empresas',
      });
    }
  });

  // GET /empresas/:id - Single empresa
  fastify.get('/empresas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const empresa = await prisma.empresa.findUnique({
        where: { id },
        include: {
          _count: { select: { localesProductivos: true } },
        },
      });

      if (!empresa) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Empresa not found',
        });
      }

      return empresa;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching empresa',
      });
    }
  });

  // GET /empresas/:id/dashboard - Empresa dashboard data
  fastify.get('/empresas/:id/dashboard', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const empresa = await prisma.empresa.findUnique({
        where: { id },
        include: {
          localesProductivos: {
            select: { id: true, nombre: true, tipoProductivo: true, bounds: true, areaProduccion: true },
          },
          usuarios: {
            select: { id: true, nombre: true, apellido: true, email: true, telefono: true, rol: true, esAdminEmpresa: true },
          },
        },
      });

      if (!empresa) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Empresa not found',
        });
      }

      const [totalAreas, totalSectores, totalUnidades] = await Promise.all([
        prisma.area.count({
          where: { localProductivo: { empresaId: id } },
        }),
        prisma.sector.count({
          where: { area: { localProductivo: { empresaId: id } } },
        }),
        prisma.unidadProduccion.count({
          where: { sector: { area: { localProductivo: { empresaId: id } } } },
        }),
      ]);

      const { localesProductivos, usuarios, ...empresaData } = empresa;

      return {
        empresa: empresaData,
        stats: {
          totalLocales: localesProductivos.length,
          totalAreas,
          totalSectores,
          totalUnidades,
          totalUsuarios: usuarios.length,
        },
        locales: localesProductivos,
        usuarios,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching empresa dashboard',
      });
    }
  });

  // POST /empresas - Create empresa (admin only)
  fastify.post('/empresas', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const data = createEmpresaSchema.parse(request.body);

      const empresa = await prisma.empresa.create({ data });

      return reply.code(201).send(empresa);
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
        message: 'An error occurred while creating empresa',
      });
    }
  });

  // PUT /empresas/:id - Update empresa (admin only)
  fastify.put('/empresas/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateEmpresaSchema.parse(request.body);

      const empresa = await prisma.empresa.update({
        where: { id },
        data,
      });

      return empresa;
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
          message: 'Empresa not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while updating empresa',
      });
    }
  });

  // DELETE /empresas/:id - Delete empresa (admin only)
  fastify.delete('/empresas/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await prisma.empresa.delete({ where: { id } });

      return { message: 'Empresa deleted successfully' };
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Empresa not found',
        });
      }

      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while deleting empresa',
      });
    }
  });

  // GET /empresas/:id/usuarios - List users for this empresa (admin only)
  fastify.get('/empresas/:id/usuarios', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { page = '1', limit = '100' } = request.query as { page?: string; limit?: string };
      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.max(1, Math.min(100, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const [items, total] = await Promise.all([
        prisma.usuario.findMany({
          where: { empresaId: id },
          select: { id: true, email: true, nombre: true, apellido: true, telefono: true, rol: true, esAdminEmpresa: true },
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.usuario.count({ where: { empresaId: id } }),
      ]);

      return { items, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'An error occurred while fetching empresa usuarios',
      });
    }
  });

  // POST /empresas/:id/usuarios - Create user within empresa (admin only)
  fastify.post('/empresas/:id/usuarios', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = z.object({
        email: z.string().email('Invalid email format'),
        contrasena: z.string().min(6, 'Password must be at least 6 characters'),
        nombre: z.string().min(1, 'Nombre is required'),
        apellido: z.string().optional(),
        telefono: z.string().optional(),
        esAdminEmpresa: z.boolean().optional(),
      }).parse(request.body);

      const existing = await prisma.usuario.findUnique({ where: { email: data.email } });
      if (existing) {
        return reply.code(400).send({ error: 'Validation Error', message: 'Email already in use' });
      }

      const hashedPassword = await argon2.hash(data.contrasena);
      const usuario = await prisma.usuario.create({
        data: {
          email: data.email,
          contrasena: hashedPassword,
          nombre: data.nombre,
          apellido: data.apellido,
          telefono: data.telefono,
          esAdminEmpresa: data.esAdminEmpresa,
          empresaId: id,
          rol: 'USER',
        },
        select: { id: true, email: true, nombre: true, apellido: true, telefono: true, rol: true, esAdminEmpresa: true },
      });

      return reply.code(201).send(usuario);
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
        message: 'An error occurred while creating empresa usuario',
      });
    }
  });
};

export default empresasRoutes;
