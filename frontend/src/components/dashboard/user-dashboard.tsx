'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Building2, Layers, Box } from 'lucide-react';
import Link from 'next/link';

interface LocalItem {
  id: string;
  nombre: string;
  tipoProductivo?: string;
  empresa?: { id: string; razonSocial: string };
  stats: {
    totalAreas: number;
    totalSectores: number;
    totalUnidades: number;
  };
}

export function UserDashboard() {
  const [locales, setLocales] = useState<LocalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchLocales = async () => {
      try {
        const response = await api.get('/api/me/locales');
        const items: LocalItem[] = response.data.items;

        if (items.length === 1) {
          router.push(`/dashboard/locales/${items[0].id}`);
          return;
        }

        setLocales(items);
      } catch (error) {
        console.error('Error fetching locales:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLocales();
  }, [router]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (locales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
        <MapPin className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-muted-foreground text-lg font-medium">
          No tienes locales asignados
        </p>
        <p className="text-muted-foreground text-sm mt-1">
          Contacta a un administrador para obtener acceso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Mis Locales</h2>
        <p className="text-muted-foreground mt-1">
          Selecciona un local productivo para ver su monitoreo
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locales.map((local) => (
          <Link key={local.id} href={`/dashboard/locales/${local.id}`}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {local.nombre}
                </CardTitle>
                {local.tipoProductivo && (
                  <p className="text-sm text-muted-foreground">
                    {local.tipoProductivo}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {local.empresa && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                    <Building2 className="h-3.5 w-3.5" />
                    {local.empresa.razonSocial}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{local.stats.totalAreas}</p>
                    <p className="text-xs text-muted-foreground">Areas</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{local.stats.totalSectores}</p>
                    <p className="text-xs text-muted-foreground">Sectores</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2">
                    <p className="text-lg font-bold">{local.stats.totalUnidades}</p>
                    <p className="text-xs text-muted-foreground">Unidades</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
