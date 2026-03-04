'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { SectorForm, SectorFormValues } from '@/components/forms/sector-form';
import { UnidadForm, UnidadFormValues, transformUnidadPayload } from '@/components/forms/unidad-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Box, Pencil, Trash2, Plus } from 'lucide-react';

interface SectorDashboard {
  currentUserLocalRole: 'ADMIN' | 'SUPERVISOR' | 'VISOR' | null;
  sector: {
    id: string;
    nombre: string;
    areaId: string;
    tipo: string | null;
    bounds: unknown;
    detalles: unknown;
    usuarioResponsableId: string | null;
    usuarioResponsable: { id: string; nombre: string; apellido?: string | null } | null;
    area: {
      id: string;
      nombre: string;
      bounds: unknown;
      localProductivo: { id: string; nombre: string };
    };
  };
  stats: {
    totalUnidades: number;
  };
  unidades: {
    id: string;
    nombre: string;
    topicMqtt: string;
    posicion: unknown;
    ultimaLectura: string | null;
  }[];
}

export default function SectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;
  const localId = params.localId as string;
  const areaId = params.areaId as string;
  const sectorId = params.sectorId as string;

  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [empresaName, setEmpresaName] = useState<string>('');

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unidadDialogOpen, setUnidadDialogOpen] = useState(false);
  const [editUnidadDialogOpen, setEditUnidadDialogOpen] = useState(false);
  const [deleteUnidadDialogOpen, setDeleteUnidadDialogOpen] = useState(false);
  const [selectedUnidad, setSelectedUnidad] = useState<SectorDashboard['unidades'][0] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localUsuarios, setLocalUsuarios] = useState<{ id: string; nombre: string; apellido?: string | null }[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [sectorRes, empresaRes, localUsersRes] = await Promise.all([
        api.get(`/api/sectores/${sectorId}/dashboard`),
        api.get(`/api/empresas/${empresaId}`),
        api.get(`/api/locales/${localId}/usuarios`).catch(() => ({ data: { items: [] } })),
      ]);
      setData(sectorRes.data);
      setEmpresaName(empresaRes.data.razonSocial);
      setLocalUsuarios(localUsersRes.data.items.map((u: any) => ({
        id: u.usuarioId,
        nombre: u.nombre,
        apellido: u.apellido,
      })));
    } catch {
      setError('Error al cargar los datos del sector');
    } finally {
      setLoading(false);
    }
  }, [sectorId, empresaId, localId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handleEditSubmit(values: SectorFormValues) {
    try {
      setSubmitting(true);
      await api.put(`/api/sectores/${sectorId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al actualizar el sector');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/sectores/${sectorId}`);
      router.push(
        `/dashboard/empresas/${empresaId}/locales/${localId}/areas/${areaId}`
      );
    } catch {
      setError('Error al eliminar el sector');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateUnidad(values: UnidadFormValues) {
    try {
      setSubmitting(true);
      const payload = transformUnidadPayload(values);
      await api.post('/api/unidades', payload);
      setUnidadDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al crear la unidad de produccion');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditUnidad(values: UnidadFormValues) {
    if (!selectedUnidad) return;
    try {
      setSubmitting(true);
      const payload = transformUnidadPayload(values);
      await api.put(`/api/unidades/${selectedUnidad.id}`, payload);
      setEditUnidadDialogOpen(false);
      setSelectedUnidad(null);
      fetchDashboard();
    } catch {
      setError('Error al actualizar la unidad de produccion');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteUnidad() {
    if (!selectedUnidad) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/unidades/${selectedUnidad.id}`);
      setDeleteUnidadDialogOpen(false);
      setSelectedUnidad(null);
      fetchDashboard();
    } catch {
      setError('Error al eliminar la unidad de produccion');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const { sector, stats, unidades, currentUserLocalRole } = data;
  const canWrite = currentUserLocalRole === 'ADMIN' || currentUserLocalRole === 'SUPERVISOR';

  const basePath = `/dashboard/empresas/${empresaId}/locales/${localId}`;

  const sectorBounds = sector.bounds as GeoJSON.Polygon | null;

  const unidadColumns: ColumnDef<(typeof unidades)[0]>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'topicMqtt', header: 'Topic MQTT', accessorKey: 'topicMqtt' },
    {
      id: 'ultimaLectura',
      header: 'Ultima Lectura',
      accessorFn: (row) =>
        row.ultimaLectura
          ? new Date(row.ultimaLectura).toLocaleString('es-EC')
          : 'Sin lecturas',
    },
  ];

  const unidadActions: RowAction<(typeof unidades)[0]>[] = canWrite
    ? [
        {
          label: 'Editar',
          icon: <Pencil className="size-4" />,
          onClick: (unidad) => {
            setSelectedUnidad(unidad);
            setEditUnidadDialogOpen(true);
          },
        },
        {
          label: 'Eliminar',
          icon: <Trash2 className="size-4" />,
          onClick: (unidad) => {
            setSelectedUnidad(unidad);
            setDeleteUnidadDialogOpen(true);
          },
          variant: 'destructive',
        },
      ]
    : [];

  const infoFields = [
    { label: 'Nombre', value: sector.nombre },
    { label: 'Tipo', value: sector.tipo },
    {
      label: 'Responsable',
      value: sector.usuarioResponsable
        ? `${sector.usuarioResponsable.nombre} ${sector.usuarioResponsable.apellido ?? ''}`.trim()
        : null,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: 'Empresas', href: '/dashboard/empresas' },
              { label: empresaName, href: `/dashboard/empresas/${empresaId}` },
              { label: sector.area.localProductivo.nombre, href: basePath },
              { label: sector.area.nombre, href: `${basePath}/areas/${areaId}` },
              {
                label: sector.nombre,
                href: `${basePath}/areas/${areaId}/sectores/${sectorId}`,
              },
            ]}
          />
          <h2 className="text-3xl font-bold">{sector.nombre}</h2>
          {sector.tipo && (
            <p className="text-muted-foreground">Tipo: {sector.tipo}</p>
          )}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <StatsGrid className="lg:grid-cols-1 max-w-xs">
        <StatsCard icon={Box} label="Unidades de Produccion" value={stats.totalUnidades} />
      </StatsGrid>

      {/* Sector Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion del Sector</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {infoFields.map(
              (field) =>
                field.value && (
                  <div key={field.label}>
                    <span className="text-muted-foreground">{field.label}</span>
                    <p className="font-medium">{field.value}</p>
                  </div>
                )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Unidades Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Unidades de Produccion</h3>
          {canWrite && (
            <Button onClick={() => setUnidadDialogOpen(true)}>
              <Plus className="size-4" />
              Nueva Unidad
            </Button>
          )}
        </div>
        <DataTable
          columns={unidadColumns}
          data={unidades}
          searchKey="nombre"
          searchPlaceholder="Buscar unidades..."
          emptyMessage="No hay unidades de produccion registradas."
          rowActions={unidadActions}
        />
      </div>

      {/* Edit Sector Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Sector</DialogTitle>
            <DialogDescription>Modifica los datos del sector.</DialogDescription>
          </DialogHeader>
          <SectorForm
            areaId={areaId}
            usuarios={localUsuarios}
            defaultValues={{
              nombre: sector.nombre,
              areaId: sector.areaId,
              tipo: sector.tipo ?? '',
              usuarioResponsableId: sector.usuarioResponsableId ?? '',
              bounds: sector.bounds as GeoJSON.Polygon | undefined,
            }}
            parentBounds={sector.area.bounds as GeoJSON.Polygon | null}
            onSubmit={handleEditSubmit}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Sector Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Sector</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente{' '}
              <strong>{sector.nombre}</strong> y todas sus unidades de produccion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Unidad Dialog */}
      <Dialog open={unidadDialogOpen} onOpenChange={setUnidadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Unidad de Produccion</DialogTitle>
            <DialogDescription>
              Crea una nueva unidad de produccion en {sector.nombre}.
            </DialogDescription>
          </DialogHeader>
          <UnidadForm
            sectorId={sectorId}
            onSubmit={handleCreateUnidad}
            loading={submitting}
            parentBounds={sectorBounds}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Unidad Dialog */}
      <Dialog open={editUnidadDialogOpen} onOpenChange={(open) => {
        setEditUnidadDialogOpen(open);
        if (!open) setSelectedUnidad(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Unidad de Produccion</DialogTitle>
            <DialogDescription>Modifica los datos de la unidad.</DialogDescription>
          </DialogHeader>
          {selectedUnidad && (
            <UnidadForm
              sectorId={sectorId}
              defaultValues={{
                nombre: selectedUnidad.nombre,
                sectorId,
                topicMqtt: selectedUnidad.topicMqtt,
                posicion: selectedUnidad.posicion as { lat: number; lng: number } | undefined,
              }}
              onSubmit={handleEditUnidad}
              loading={submitting}
              parentBounds={sectorBounds}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Unidad Dialog */}
      <Dialog open={deleteUnidadDialogOpen} onOpenChange={(open) => {
        setDeleteUnidadDialogOpen(open);
        if (!open) setSelectedUnidad(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Unidad de Produccion</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente{' '}
              <strong>{selectedUnidad?.nombre}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUnidadDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUnidad} disabled={submitting}>
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
