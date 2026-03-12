'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { LocalForm, LocalFormValues } from '@/components/forms/local-form';
import { AreaForm, AreaFormValues } from '@/components/forms/area-form';
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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Map as MapIcon, Layers, Box, Users, Pencil, Trash2, Plus, Eye, RefreshCw, Satellite, LocateFixed } from 'lucide-react';
import { getPolygonBBox } from '@/lib/geo';
import { Map as MapComponent, MapControls, useMap } from '@/components/ui/map';
import type MapLibreGL from 'maplibre-gl';

interface LocalDashboard {
  local: {
    id: string;
    nombre: string;
    tipoProductivo: string | null;
    empresaId: string;
    areaProduccion: string | null;
    direccion: string | null;
    ubicacionDomiciliaria: string | null;
    bounds: unknown;
    empresa: { id: string; razonSocial: string };
  };
  stats: {
    totalAreas: number;
    totalSectores: number;
    totalUnidades: number;
  };
  areas: {
    id: string;
    nombre: string;
    actividadProductiva: string | null;
    bounds: unknown;
    sectoresCount: number;
  }[];
  currentUserLocalRole: 'ADMIN' | 'SUPERVISOR' | 'VISOR' | null;
}

interface LocalUsuario {
  id: string;
  usuarioId: string;
  nombre: string;
  apellido: string | null;
  email: string;
  rol: 'SUPERVISOR' | 'VISOR';
}

interface EmpresaUsuario {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string;
}

const SATELLITE_STYLE = {
  version: 8 as const,
  sources: {
    satellite: {
      type: 'raster' as const,
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'satellite-layer', type: 'raster' as const, source: 'satellite', minzoom: 0, maxzoom: 22 },
  ],
};

const AREA_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function MapOverviewLayers({ localBounds, areas, isSatellite, recenterTrigger }: { localBounds: GeoJSON.Polygon; areas: { id: string; nombre: string; bounds: unknown }[]; isSatellite: boolean; recenterTrigger: number }) {
  const { map, isLoaded } = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !map) return;

    const areasWithBounds = areas.filter((a) => a.bounds);

    function addLayers() {
      // Local bounds fill
      if (!map!.getSource('local-bounds-source')) {
        map!.addSource('local-bounds-source', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: localBounds,
          },
        });
      }
      if (!map!.getLayer('local-bounds-fill')) {
        map!.addLayer({
          id: 'local-bounds-fill',
          type: 'fill',
          source: 'local-bounds-source',
          paint: {
            'fill-color': '#94a3b8',
            'fill-opacity': 0.08,
          },
        });
      }
      if (!map!.getLayer('local-bounds-line')) {
        map!.addLayer({
          id: 'local-bounds-line',
          type: 'line',
          source: 'local-bounds-source',
          paint: {
            'line-color': '#94a3b8',
            'line-width': 2,
            'line-dasharray': [4, 3],
          },
        });
      }

      // Area polygons
      areasWithBounds.forEach((area, idx) => {
        const sourceId = `area-${area.id}-source`;
        const fillId = `area-${area.id}-fill`;
        const lineId = `area-${area.id}-line`;
        const color = AREA_COLORS[idx % AREA_COLORS.length];

        if (!map!.getSource(sourceId)) {
          map!.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: area.bounds as GeoJSON.Polygon,
            },
          });
        }
        if (!map!.getLayer(fillId)) {
          map!.addLayer({
            id: fillId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': color,
              'fill-opacity': 0.2,
            },
          });
        }
        if (!map!.getLayer(lineId)) {
          map!.addLayer({
            id: lineId,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': color,
              'line-width': 2,
            },
          });
        }
        const labelId = `area-${area.id}-label`;
        if (!map!.getLayer(labelId)) {
          map!.addLayer({
            id: labelId,
            type: 'symbol',
            source: sourceId,
            layout: {
              'text-field': area.nombre,
              'text-size': 13,
              'text-anchor': 'center',
              'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            },
            paint: {
              'text-color': color,
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          });
        }
      });
    }

    // Add layers initially
    addLayers();

    // Re-add layers after style changes (e.g. satellite toggle)
    const onStyleLoad = () => addLayers();
    map.on('style.load', onStyleLoad);

    // Fit to local bounds
    if (!fittedRef.current) {
      fittedRef.current = true;
      const coords = localBounds.coordinates[0] as [number, number][];
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, duration: 0 }
      );
    }

    return () => {
      map.off('style.load', onStyleLoad);
      try {
        // Clean up area layers
        areasWithBounds.forEach((area) => {
          const labelId = `area-${area.id}-label`;
          const lineId = `area-${area.id}-line`;
          const fillId = `area-${area.id}-fill`;
          const sourceId = `area-${area.id}-source`;
          if (map.getLayer(labelId)) map.removeLayer(labelId);
          if (map.getLayer(lineId)) map.removeLayer(lineId);
          if (map.getLayer(fillId)) map.removeLayer(fillId);
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        });
        if (map.getLayer('local-bounds-line')) map.removeLayer('local-bounds-line');
        if (map.getLayer('local-bounds-fill')) map.removeLayer('local-bounds-fill');
        if (map.getSource('local-bounds-source')) map.removeSource('local-bounds-source');
      } catch {
        // ignore
      }
    };
  }, [isLoaded, map, localBounds, areas]);

  // Adjust paint properties for satellite contrast
  useEffect(() => {
    if (!isLoaded || !map) return;
    const areasWithBounds = areas.filter((a) => a.bounds);
    try {
      if (map.getLayer('local-bounds-fill')) {
        map.setPaintProperty('local-bounds-fill', 'fill-opacity', isSatellite ? 0.2 : 0.08);
      }
      if (map.getLayer('local-bounds-line')) {
        map.setPaintProperty('local-bounds-line', 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty('local-bounds-line', 'line-width', isSatellite ? 3 : 2);
      }
      areasWithBounds.forEach((area) => {
        const fillId = `area-${area.id}-fill`;
        const lineId = `area-${area.id}-line`;
        if (map.getLayer(fillId)) {
          map.setPaintProperty(fillId, 'fill-opacity', isSatellite ? 0.4 : 0.2);
        }
        if (map.getLayer(lineId)) {
          map.setPaintProperty(lineId, 'line-width', isSatellite ? 3 : 2);
        }
        const labelId = `area-${area.id}-label`;
        if (map.getLayer(labelId)) {
          map.setPaintProperty(labelId, 'text-halo-color', isSatellite ? '#000000' : '#ffffff');
          map.setPaintProperty(labelId, 'text-halo-width', isSatellite ? 2 : 1.5);
        }
      });
    } catch {
      // layers may not exist yet
    }
  }, [isLoaded, map, isSatellite, areas]);

  // Restrict zoom-out to local bounds
  useEffect(() => {
    if (!isLoaded || !map) return;
    const bbox = getPolygonBBox(localBounds, 0.5);
    map.setMaxBounds(bbox);
    return () => {
      try { map.setMaxBounds(null); } catch { /* ignore */ }
    };
  }, [isLoaded, map, localBounds]);

  // Recenter to local bounds on trigger
  useEffect(() => {
    if (!isLoaded || !map || recenterTrigger === 0) return;
    const bbox = getPolygonBBox(localBounds, 0);
    map.fitBounds(bbox, { padding: 40, duration: 300 });
  }, [isLoaded, map, localBounds, recenterTrigger]);

  return null;
}

export default function LocalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;
  const localId = params.localId as string;

  const [data, setData] = useState<LocalDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [deleteAssignDialogOpen, setDeleteAssignDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<LocalUsuario | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // User assignment state
  const [localUsuarios, setLocalUsuarios] = useState<LocalUsuario[]>([]);
  const [empresaUsuarios, setEmpresaUsuarios] = useState<EmpresaUsuario[]>([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRol, setAssignRol] = useState<'SUPERVISOR' | 'VISOR'>('VISOR');

  const fetchLocalUsuarios = useCallback(async () => {
    try {
      const [localUsersRes, empresaUsersRes] = await Promise.all([
        api.get(`/api/locales/${localId}/usuarios`),
        api.get(`/api/empresas/${empresaId}/usuarios`),
      ]);
      setLocalUsuarios(localUsersRes.data.items.map((u: any) => ({ ...u, id: u.usuarioId })));
      setEmpresaUsuarios(empresaUsersRes.data.items);
    } catch {
      // silent fail — not critical
    }
  }, [localId, empresaId]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/locales/${localId}/dashboard`);
      setData(res.data);
    } catch {
      setError('Error al cargar los datos del local');
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    fetchDashboard();
    fetchLocalUsuarios();
  }, [fetchDashboard, fetchLocalUsuarios]);

  async function handleEditSubmit(values: LocalFormValues) {
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

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/locales/${localId}`);
      router.push(`/dashboard/empresas/${empresaId}`);
    } catch {
      setError('Error al eliminar el local');
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
      setError('Error al crear el area');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignUser() {
    if (!assignUserId) return;
    try {
      setSubmitting(true);
      await api.post(`/api/locales/${localId}/usuarios`, {
        usuarioId: assignUserId,
        rol: assignRol,
      });
      setAssignUserDialogOpen(false);
      setAssignUserId('');
      setAssignRol('VISOR');
      fetchLocalUsuarios();
    } catch {
      setError('Error al asignar el usuario');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleRole(usuario: LocalUsuario) {
    try {
      setSubmitting(true);
      const newRol = usuario.rol === 'SUPERVISOR' ? 'VISOR' : 'SUPERVISOR';
      await api.put(`/api/locales/${localId}/usuarios/${usuario.usuarioId}`, { rol: newRol });
      fetchLocalUsuarios();
    } catch {
      setError('Error al cambiar el rol');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnassignUser() {
    if (!selectedAssignment) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/locales/${localId}/usuarios/${selectedAssignment.usuarioId}`);
      setDeleteAssignDialogOpen(false);
      setSelectedAssignment(null);
      fetchLocalUsuarios();
    } catch {
      setError('Error al desasignar el usuario');
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

  const { local, stats, areas, currentUserLocalRole } = data;
  const canWrite = currentUserLocalRole === 'ADMIN' || currentUserLocalRole === 'SUPERVISOR';
  const isAdmin = currentUserLocalRole === 'ADMIN';

  const localBounds = local.bounds as GeoJSON.Polygon | null;

  const areaColumns: ColumnDef<(typeof areas)[0]>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'actividadProductiva', header: 'Actividad Productiva', accessorKey: 'actividadProductiva' },
    {
      id: 'sectoresCount',
      header: 'Sectores',
      accessorFn: (row) => row.sectoresCount,
      className: 'text-center',
    },
  ];

  const areaActions: RowAction<(typeof areas)[0]>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (area) =>
        router.push(`/dashboard/empresas/${empresaId}/locales/${localId}/areas/${area.id}`),
    },
  ];

  const infoFields = [
    { label: 'Nombre', value: local.nombre },
    { label: 'Tipo Productivo', value: local.tipoProductivo },
    { label: 'Area de Produccion', value: local.areaProduccion },
    { label: 'Direccion', value: local.direccion },
    { label: 'Ubicacion', value: local.ubicacionDomiciliaria },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: 'Empresas', href: '/dashboard/empresas' },
              { label: local.empresa.razonSocial, href: `/dashboard/empresas/${empresaId}` },
              { label: local.nombre, href: `/dashboard/empresas/${empresaId}/locales/${localId}` },
            ]}
          />
          <h2 className="text-3xl font-bold">{local.nombre}</h2>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Pencil className="size-4" />
              Editar
            </Button>
            {isAdmin && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <StatsGrid className="lg:grid-cols-3">
        <StatsCard icon={MapIcon} label="Areas" value={stats.totalAreas} />
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {/* Map Overview */}
      {localBounds && (
        <Card className="p-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Mapa del Local</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[350px]">
              <div className="absolute top-2 left-2 z-10">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-8 shadow-md"
                  onClick={() => setRecenterTrigger((n) => n + 1)}
                  title="Centrar en el local"
                >
                  <LocateFixed className="size-4" />
                </Button>
              </div>
              <div className="absolute top-2 right-2 z-10">
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-8"
                  onClick={() => setIsSatellite(prev => !prev)}
                  title={isSatellite ? 'Vista mapa' : 'Vista satelital'}
                >
                  {isSatellite ? <MapIcon className="size-4" /> : <Satellite className="size-4" />}
                </Button>
              </div>
              <MapComponent
                center={[-79.9, -2.2]}
                zoom={10}
                className="h-full w-full"
                styles={isSatellite ? { light: SATELLITE_STYLE, dark: SATELLITE_STYLE } : undefined}
              >
                <MapOverviewLayers localBounds={localBounds} areas={areas} isSatellite={isSatellite} recenterTrigger={recenterTrigger} />
                <MapControls position="bottom-right" showZoom />
              </MapComponent>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Local Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informacion del Local</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
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

      {/* Areas Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Areas</h3>
          {canWrite && (
            <Button onClick={() => setAreaDialogOpen(true)}>
              <Plus className="size-4" />
              Nueva Area
            </Button>
          )}
        </div>
        <DataTable
          columns={areaColumns}
          data={areas}
          searchKey="nombre"
          searchPlaceholder="Buscar areas..."
          emptyMessage="No hay areas registradas."
          rowActions={areaActions}
          onRowClick={(area) =>
            router.push(`/dashboard/empresas/${empresaId}/locales/${localId}/areas/${area.id}`)
          }
        />
      </div>

      {/* Usuarios Asignados */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Usuarios Asignados</h3>
          {isAdmin && (
            <Button onClick={() => setAssignUserDialogOpen(true)}>
              <Plus className="size-4" />
              Asignar Usuario
            </Button>
          )}
        </div>
        <DataTable
          columns={[
            {
              id: 'nombre',
              header: 'Nombre',
              accessorFn: (row: LocalUsuario) => `${row.nombre} ${row.apellido ?? ''}`.trim(),
              sortable: true,
            },
            { id: 'email', header: 'Email', accessorKey: 'email' as keyof LocalUsuario },
            {
              id: 'rol',
              header: 'Rol',
              accessorFn: (row: LocalUsuario) => (
                <Badge variant={row.rol === 'SUPERVISOR' ? 'default' : 'secondary'}>
                  {row.rol}
                </Badge>
              ),
            },
          ] as ColumnDef<LocalUsuario>[]}
          data={localUsuarios}
          searchKey="email"
          searchPlaceholder="Buscar usuarios asignados..."
          emptyMessage="No hay usuarios asignados a este local."
          rowActions={[
            {
              label: 'Cambiar Rol',
              icon: <RefreshCw className="size-4" />,
              onClick: (usuario: LocalUsuario) => handleToggleRole(usuario),
            },
            {
              label: 'Desasignar',
              icon: <Trash2 className="size-4" />,
              onClick: (usuario: LocalUsuario) => {
                setSelectedAssignment(usuario);
                setDeleteAssignDialogOpen(true);
              },
              variant: 'destructive',
            },
          ] as RowAction<LocalUsuario>[]}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Local Productivo</DialogTitle>
            <DialogDescription>Modifica los datos del local productivo.</DialogDescription>
          </DialogHeader>
          <LocalForm
            empresaId={empresaId}
            defaultValues={{
              nombre: local.nombre,
              tipoProductivo: local.tipoProductivo ?? '',
              empresaId: local.empresaId,
              areaProduccion: local.areaProduccion ?? '',
              direccion: local.direccion ?? '',
              ubicacionDomiciliaria: local.ubicacionDomiciliaria ?? '',
              bounds: localBounds ?? undefined,
            }}
            onSubmit={handleEditSubmit}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Local Productivo</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente{' '}
              <strong>{local.nombre}</strong> y todas sus areas, sectores y unidades.
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

      {/* New Area Dialog */}
      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Area</DialogTitle>
            <DialogDescription>
              Crea una nueva area en {local.nombre}.
            </DialogDescription>
          </DialogHeader>
          <AreaForm
            localProductivoId={localId}
            onSubmit={handleCreateArea}
            loading={submitting}
            parentBounds={localBounds}
            siblingAreas={areas.filter(a => a.bounds).map(a => ({ id: a.id, nombre: a.nombre, bounds: a.bounds as GeoJSON.Polygon }))}
          />
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Usuario</DialogTitle>
            <DialogDescription>
              Asigna un usuario de la empresa a este local productivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {empresaUsuarios
                    .filter((eu) => !localUsuarios.some((lu) => lu.usuarioId === eu.id))
                    .map((eu) => (
                      <SelectItem key={eu.id} value={eu.id}>
                        {eu.nombre} {eu.apellido ?? ''} ({eu.email})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={assignRol} onValueChange={(v) => setAssignRol(v as 'SUPERVISOR' | 'VISOR')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="VISOR">Visor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUserDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleAssignUser} disabled={submitting || !assignUserId}>
              {submitting ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unassign User Dialog */}
      <Dialog open={deleteAssignDialogOpen} onOpenChange={(open) => {
        setDeleteAssignDialogOpen(open);
        if (!open) setSelectedAssignment(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desasignar Usuario</DialogTitle>
            <DialogDescription>
              Se removera a <strong>{selectedAssignment?.nombre} {selectedAssignment?.apellido ?? ''}</strong> de este local productivo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAssignDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleUnassignUser} disabled={submitting}>
              {submitting ? 'Desasignando...' : 'Desasignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
