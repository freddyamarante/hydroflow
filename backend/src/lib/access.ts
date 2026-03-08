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

// Get the user's local-level role for a specific local_productivo
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

// Resolve the localProductivoId from an area, sector, or unidad
export async function getLocalIdFromArea(areaId: string): Promise<string | null> {
  const area = await prisma.area.findUnique({
    where: { id: areaId },
    select: { localProductivoId: true },
  });
  return area?.localProductivoId ?? null;
}

export async function getLocalIdFromSector(sectorId: string): Promise<string | null> {
  const sector = await prisma.sector.findUnique({
    where: { id: sectorId },
    select: { area: { select: { localProductivoId: true } } },
  });
  return sector?.area.localProductivoId ?? null;
}

export async function getLocalIdFromUnidad(unidadId: string): Promise<string | null> {
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
