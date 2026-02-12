import { Rol } from '@prisma/client';
import prisma from './prisma.js';

export async function getUserLocalIds(userId: string, rol: Rol): Promise<string[]> {
  if (rol === 'ADMIN') {
    const locales = await prisma.localProductivo.findMany({
      select: { id: true },
    });
    return locales.map((l) => l.id);
  }

  const links = await prisma.usuarioLocalProductivo.findMany({
    where: { usuarioId: userId },
    select: { localProductivoId: true },
  });

  return links.map((l) => l.localProductivoId);
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
