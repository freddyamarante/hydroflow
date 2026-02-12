'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, Grid3X3, Box, MapPin } from 'lucide-react';
import Link from 'next/link';

interface AreaItem {
  id: string;
  nombre: string;
  actividadProductiva?: string;
  sectoresCount: number;
}

interface LocalDashboard {
  local: {
    id: string;
    nombre: string;
    tipoProductivo?: string;
    empresa?: { id: string; razonSocial: string };
  };
  stats: {
    totalAreas: number;
    totalSectores: number;
    totalUnidades: number;
  };
  areas: AreaItem[];
}

export default function LocalDashboardPage() {
  const params = useParams();
  const localId = params.id as string;
  const [data, setData] = useState<LocalDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get(`/api/locales/${localId}/dashboard`);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching local dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [localId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No se encontro el local productivo.</p>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: data.local.nombre, href: `/dashboard/locales/${localId}` },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <div>
        <h2 className="text-3xl font-bold">{data.local.nombre}</h2>
        {data.local.tipoProductivo && (
          <p className="text-muted-foreground mt-1">{data.local.tipoProductivo}</p>
        )}
      </div>

      <StatsGrid>
        <StatsCard
          icon={Layers}
          label="Areas"
          value={data.stats.totalAreas}
        />
        <StatsCard
          icon={Grid3X3}
          label="Sectores"
          value={data.stats.totalSectores}
        />
        <StatsCard
          icon={Box}
          label="Unidades"
          value={data.stats.totalUnidades}
        />
      </StatsGrid>

      <div>
        <h3 className="text-lg font-semibold mb-4">Areas y Sectores</h3>
        {data.areas.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No hay areas configuradas.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.areas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                localId={localId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AreaCard({ area, localId }: { area: AreaItem; localId: string }) {
  const [sectores, setSectores] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [loadingSectores, setLoadingSectores] = useState(false);

  const loadSectores = async () => {
    if (sectores.length > 0) {
      setExpanded(!expanded);
      return;
    }
    setLoadingSectores(true);
    try {
      const response = await api.get(`/api/sectores?areaId=${area.id}&limit=100`);
      setSectores(response.data.items);
      setExpanded(true);
    } catch (error) {
      console.error('Error fetching sectores:', error);
    } finally {
      setLoadingSectores(false);
    }
  };

  return (
    <Card>
      <CardHeader
        className="cursor-pointer pb-3"
        onClick={loadSectores}
      >
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {area.nombre}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {area.sectoresCount} {area.sectoresCount === 1 ? 'sector' : 'sectores'}
          </span>
        </CardTitle>
        {area.actividadProductiva && (
          <p className="text-sm text-muted-foreground">{area.actividadProductiva}</p>
        )}
      </CardHeader>
      {expanded && (
        <CardContent className="pt-0">
          {loadingSectores ? (
            <Skeleton className="h-16" />
          ) : sectores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin sectores</p>
          ) : (
            <div className="space-y-2">
              {sectores.map((sector) => (
                <Link
                  key={sector.id}
                  href={`/dashboard/locales/${localId}/sectores/${sector.id}`}
                  className="flex items-center justify-between rounded-md border p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">{sector.nombre}</span>
                  <span className="text-xs text-muted-foreground">Ver unidades</span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
