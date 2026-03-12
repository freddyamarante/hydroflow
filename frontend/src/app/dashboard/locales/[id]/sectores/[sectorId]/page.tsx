'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UnidadForm, UnidadFormValues } from '@/components/forms/unidad-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, Clock, Plus } from 'lucide-react';
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
  const { user } = useAuth();
  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocalRole, setUserLocalRole] = useState<string | null>(null);

  const [unidadDialogOpen, setUnidadDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const [sectorRes, localRes] = await Promise.all([
        api.get(`/api/sectores/${sectorId}/dashboard`),
        api.get(`/api/locales/${localId}/dashboard`),
      ]);
      setData(sectorRes.data);
      setUserLocalRole(localRes.data.userLocalRole ?? null);
    } catch {
      setError('Error al cargar los datos del sector');
    } finally {
      setLoading(false);
    }
  }, [sectorId, localId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const isSupervisor = user?.rol === 'ADMIN' || userLocalRole === 'SUPERVISOR';

  async function handleCreateUnidad(values: UnidadFormValues) {
    try {
      setSubmitting(true);
      await api.post('/api/unidades', {
        nombre: values.nombre,
        sectorId,
        topicMqtt: values.topicMqtt,
      });
      setUnidadDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al crear la unidad de producción');
    } finally {
      setSubmitting(false);
    }
  }

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

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <StatsGrid>
        <StatsCard
          icon={Box}
          label="Unidades de Produccion"
          value={data.stats.totalUnidades}
        />
      </StatsGrid>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Unidades de Produccion</h3>
          {isSupervisor && (
            <Button onClick={() => setUnidadDialogOpen(true)}>
              <Plus className="size-4" />
              Nueva Unidad
            </Button>
          )}
        </div>
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

      {/* New Unidad Dialog */}
      {isSupervisor && (
        <Dialog open={unidadDialogOpen} onOpenChange={setUnidadDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Unidad de Producción</DialogTitle>
              <DialogDescription>
                Crea una nueva unidad de producción en {data.sector.nombre}.
              </DialogDescription>
            </DialogHeader>
            <UnidadForm
              sectorId={sectorId}
              onSubmit={handleCreateUnidad}
              loading={submitting}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
