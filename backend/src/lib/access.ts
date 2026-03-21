import { FastifyReply, FastifyRequest } from 'fastify';
import { Rol, RolLocal } from '@prisma/client';
import prisma from './prisma.js';

export async function getUserLocalIds(userId: string, rol: Rol): Promise<string[]> {
  if (rol === 'ADMIN') {
    const locales = await prisma.localProductivo.findMany({
      select: { id: true },
    });
    return locales.map((l: { id: string }) => l.id);
  }

  const links = await prisma.usuarioLocalProductivo.findMany({
    where: { usuarioId: userId },
    select: { localProductivoId: true },
  });

  return links.map((l: { localProductivoId: string }) => l.localProductivoId);
}

export async function canAccessLocal(userId: string, localId: string, rol: Rol): Promise<boolean> {
  if (rol === 'ADMIN') return true;

  const link = await prisma.usuarioLocalProductivo.findUnique({
    where: {
      usuarioId_localProductivoId: {
        usuarioId: userId,
        localProductivoId: localId,
      },
    },
  });

  return !!link;
}

export async function canAccessUnidad(userId: string, unidadId: string, rol: Rol): Promise<boolean> {
  if (rol === 'ADMIN') return true;

  const unidad = await prisma.unidadProduccion.findUnique({
    where: { id: unidadId },
    select: {
      sector: {
        select: {
          area: {
            select: {
              localProductivoId: true,
            },
          },
        },
      },
    },
  });

  if (!unidad) return false;

  const localId = unidad.sector.area.localProductivoId;
  return canAccessLocal(userId, localId, rol);
}

/**
 * Get the user's RolLocal for a specific local productivo.
 * Returns null if the user has no link to this local.
 */
export async function getLocalRole(userId: string, localId: string): Promise<RolLocal | null> {
  const link = await prisma.usuarioLocalProductivo.findUnique({
    where: {
      usuarioId_localProductivoId: {
        usuarioId: userId,
        localProductivoId: localId,
      },
    },
    select: { rol: true },
  });

  return link?.rol ?? null;
}

/**
 * Check if a user can write (create/update/delete) within a local productivo.
 * Returns true if the user is ADMIN or has SUPERVISOR role at that local.
 */
export async function canWriteLocal(userId: string, localId: string, rol: Rol): Promise<boolean> {
  if (rol === 'ADMIN') return true;

  const localRole = await getLocalRole(userId, localId);
  return localRole === 'SUPERVISOR';
}

// --- Local ID resolution helpers ---

export async function getLocalIdForArea(areaId: string): Promise<string | null> {
  const area = await prisma.area.findUnique({
    where: { id: areaId },
    select: { localProductivoId: true },
  });
  return area?.localProductivoId ?? null;
}

export async function getLocalIdForSector(sectorId: string): Promise<string | null> {
  const sector = await prisma.sector.findUnique({
    where: { id: sectorId },
    select: { area: { select: { localProductivoId: true } } },
  });
  return sector?.area.localProductivoId ?? null;
}

export async function getLocalIdForUnidad(unidadId: string): Promise<string | null> {
  const unidad = await prisma.unidadProduccion.findUnique({
    where: { id: unidadId },
    select: { sector: { select: { area: { select: { localProductivoId: true } } } } },
  });
  return unidad?.sector.area.localProductivoId ?? null;
}

export async function getLocalIdFromDispositivo(dispositivoId: string): Promise<string | null> {
  const dispositivo = await prisma.dispositivo.findUnique({
    where: { id: dispositivoId },
    select: { localProductivoId: true },
  });
  return dispositivo?.localProductivoId ?? null;
}

// Aliases for backward compatibility
export const getLocalIdFromArea = getLocalIdForArea;
export const getLocalIdFromSector = getLocalIdForSector;
export const getLocalIdFromUnidad = getLocalIdForUnidad;

// --- Empresa-scoping helpers ---

export async function getEmpresaIdForLocal(localId: string): Promise<string | null> {
  const local = await prisma.localProductivo.findUnique({
    where: { id: localId },
    select: { empresaId: true },
  });
  return local?.empresaId ?? null;
}

export async function canAccessEmpresa(
  userId: string,
  targetEmpresaId: string,
  rol: Rol,
  userEmpresaId?: string
): Promise<boolean> {
  if (rol === 'ADMIN') return true;
  return userEmpresaId === targetEmpresaId;
}

/**
 * Factory that creates a preHandler to check read access (any role at that local).
 * `getLocalIdFn` receives the request and must return the localProductivoId.
 */
export function requireReadAccess(
  getLocalIdFn: (request: FastifyRequest) => Promise<string | null>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; rol: Rol };
    if (user.rol === 'ADMIN') return;

    const localId = await getLocalIdFn(request);
    if (!localId) {
      return reply.code(404).send({ error: 'Not Found', message: 'Resource not found' });
    }

    const allowed = await canAccessLocal(user.id, localId, user.rol);
    if (!allowed) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have access to this resource',
      });
    }
  };
}

/**
 * Factory that creates a preHandler to check write access.
 * `getLocalIdFn` receives the request and must return the localProductivoId.
 */
export function requireWriteAccess(
  getLocalIdFn: (request: FastifyRequest) => Promise<string | null>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { id: string; rol: Rol };
    if (user.rol === 'ADMIN') return; // admins always pass

    const localId = await getLocalIdFn(request);
    if (!localId) {
      return reply.code(404).send({ error: 'Not Found', message: 'Resource not found' });
    }

    const allowed = await canWriteLocal(user.id, localId, user.rol);
    if (!allowed) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have write permission for this local',
      });
    }
  };
}

/**
 * Compute the effective role for the current user at a given local.
 * Returns 'ADMIN' | 'SUPERVISOR' | 'VISOR' | null
 */
export async function computeUserLocalRole(
  userId: string,
  localId: string,
  rol: Rol
): Promise<'ADMIN' | 'SUPERVISOR' | 'VISOR' | null> {
  if (rol === 'ADMIN') return 'ADMIN';
  const localRole = await getLocalRole(userId, localId);
  return localRole;
}
