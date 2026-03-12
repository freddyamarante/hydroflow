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
import { LocalForm, LocalFormValues } from '@/components/forms/local-form';
import { AreaForm, AreaFormValues } from '@/components/forms/area-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Layers, Grid3X3, Box, MapPin, Pencil, Plus } from 'lucide-react';
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
    empresaId: string;
    areaProduccion?: string;
    direccion?: string;
    ubicacionDomiciliaria?: string;
    empresa?: { id: string; razonSocial: string };
  };
  stats: {
    totalAreas: number;
    totalSectores: number;
    totalUnidades: number;
  };
  areas: AreaItem[];
  userLocalRole?: 'SUPERVISOR' | 'VISOR' | null;
}

export default function LocalDashboardPage() {
  const params = useParams();
  const localId = params.id as string;
  const { user } = useAuth();
  const [data, setData] = useState<LocalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get(`/api/locales/${localId}/dashboard`);
      setData(response.data);
    } catch {
      setError('Error al cargar los datos del local');
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const isSupervisor = user?.rol === 'ADMIN' || data?.userLocalRole === 'SUPERVISOR';

  async function handleEditLocal(values: LocalFormValues) {
    try {
      setSubmitting(true);
      await api.put(`/api/locales/${localId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al actualizar el local');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateArea(values: AreaFormValues) {
    try {
      setSubmitting(true);
      await api.post('/api/areas', { ...values, localProductivoId: localId });
      setAreaDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al crear el área');
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumbs items={breadcrumbs} />
          <h2 className="text-3xl font-bold mt-1">{data.local.nombre}</h2>
          {data.local.tipoProductivo && (
            <p className="text-muted-foreground mt-1">{data.local.tipoProductivo}</p>
          )}
        </div>
        {isSupervisor && (
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <StatsGrid>
        <StatsCard icon={Layers} label="Areas" value={data.stats.totalAreas} />
        <StatsCard icon={Grid3X3} label="Sectores" value={data.stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={data.stats.totalUnidades} />
      </StatsGrid>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Areas y Sectores</h3>
          {isSupervisor && (
            <Button onClick={() => setAreaDialogOpen(true)}>
              <Plus className="size-4" />
              Nueva Área
            </Button>
          )}
        </div>
        {data.areas.length === 0 ? (
          <div className="flex items-center justify-center h-32 border border-dashed rounded-lg">
            <p className="text-muted-foreground">No hay areas configuradas.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.areas.map((area) => (
              <AreaCard key={area.id} area={area} localId={localId} />
            ))}
          </div>
        )}
      </div>

      {/* Edit Local Dialog */}
      {isSupervisor && (
        <>
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Editar Local Productivo</DialogTitle>
                <DialogDescription>Modifica los datos del local productivo.</DialogDescription>
              </DialogHeader>
              <LocalForm
                empresaId={data.local.empresaId}
                defaultValues={{
                  nombre: data.local.nombre,
                  tipoProductivo: data.local.tipoProductivo ?? '',
                  empresaId: data.local.empresaId,
                  areaProduccion: data.local.areaProduccion ?? '',
                  direccion: data.local.direccion ?? '',
                  ubicacionDomiciliaria: data.local.ubicacionDomiciliaria ?? '',
                }}
                onSubmit={handleEditLocal}
                loading={submitting}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Nueva Área</DialogTitle>
                <DialogDescription>
                  Crea una nueva área en {data.local.nombre}.
                </DialogDescription>
              </DialogHeader>
              <AreaForm
                localProductivoId={localId}
                onSubmit={handleCreateArea}
                loading={submitting}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
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
      <CardHeader className="cursor-pointer pb-3" onClick={loadSectores}>
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
              {sectores.map((sector: any) => (
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
