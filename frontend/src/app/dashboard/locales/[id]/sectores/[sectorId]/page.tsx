'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, Clock } from 'lucide-react';
import Link from 'next/link';

interface UnidadItem {
  id: string;
  nombre: string;
  topicMqtt?: string;
  posicion?: number;
  ultimaLectura: string | null;
}

interface SectorDashboard {
  sector: {
    id: string;
    nombre: string;
    area: {
      id: string;
      nombre: string;
      localProductivo: { id: string; nombre: string };
    };
  };
  stats: {
    totalUnidades: number;
  };
  unidades: UnidadItem[];
}

export default function SectorDashboardPage() {
  const params = useParams();
  const localId = params.id as string;
  const sectorId = params.sectorId as string;
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get(`/api/sectores/${sectorId}/dashboard`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching sector dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [sectorId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-24 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No se encontro el sector.</p>
      </div>
    );
  }

  const localName = data.sector.area.localProductivo.nombre;

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: localName, href: `/dashboard/locales/${localId}` },
    { label: data.sector.nombre, href: `/dashboard/locales/${localId}/sectores/${sectorId}` },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <div>
        <h2 className="text-3xl font-bold">{data.sector.nombre}</h2>
        <p className="text-muted-foreground mt-1">
          {data.sector.area.nombre} - {localName}
        </p>
      </div>

      <StatsGrid>
        <StatsCard
          icon={Box}
          label="Unidades de Produccion"
          value={data.stats.totalUnidades}
        />
      </StatsGrid>

      <div>
        <h3 className="text-lg font-semibold mb-4">Unidades de Produccion</h3>
        {data.unidades.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No hay unidades configuradas.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.unidades.map((unidad) => (
              <Link
                key={unidad.id}
                href={`/dashboard/unidades/${unidad.id}`}
              >
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Box className="h-4 w-4 text-primary" />
                      {unidad.nombre}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {unidad.ultimaLectura
                        ? `Ultima lectura: ${new Date(unidad.ultimaLectura).toLocaleString('es')}`
                        : 'Sin lecturas'}
                    </div>
                    {unidad.posicion != null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Posicion: {unidad.posicion}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
