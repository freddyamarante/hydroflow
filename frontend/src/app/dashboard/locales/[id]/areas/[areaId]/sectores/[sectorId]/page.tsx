'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Box, Pencil, Trash2, Plus, Map as MapIcon, Satellite, LocateFixed } from 'lucide-react';
import { getPolygonBBox } from '@/lib/geo';
import { Map as MapComponent, MapControls, useMap } from '@/components/ui/map';

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

const UNIDAD_COLOR = '#3b82f6';

function SectorMapLayers({ sectorBounds, unidades, isSatellite, recenterTrigger, onUnidadClick }: {
  sectorBounds: GeoJSON.Polygon;
  unidades: { id: string; nombre: string; posicion: unknown }[];
  isSatellite: boolean;
  recenterTrigger: number;
  onUnidadClick?: (unidadId: string) => void;
}) {
  const { map, isLoaded } = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const unidadesWithPos = unidades.filter((u) => u.posicion);

    function addLayers() {
      // Sector boundary
      if (!map!.getSource('sector-bounds-source')) {
        map!.addSource('sector-bounds-source', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: sectorBounds },
        });
      }
      if (!map!.getLayer('sector-bounds-fill')) {
        map!.addLayer({ id: 'sector-bounds-fill', type: 'fill', source: 'sector-bounds-source', paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.08 } });
      }
      if (!map!.getLayer('sector-bounds-line')) {
        map!.addLayer({ id: 'sector-bounds-line', type: 'line', source: 'sector-bounds-source', paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 3] } });
      }

      // Unidad points
      if (!map!.getSource('unidades-source')) {
        const features = unidadesWithPos.map((u) => {
          const pos = u.posicion as { lat: number; lng: number };
          return {
            type: 'Feature' as const,
            properties: { id: u.id, nombre: u.nombre },
            geometry: { type: 'Point' as const, coordinates: [pos.lng, pos.lat] },
          };
        });
        map!.addSource('unidades-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });
      }
      if (!map!.getLayer('unidades-circles')) {
        map!.addLayer({
          id: 'unidades-circles', type: 'circle', source: 'unidades-source',
          paint: {
            'circle-radius': 7,
            'circle-color': UNIDAD_COLOR,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2,
          },
        });
      }
      if (!map!.getLayer('unidades-labels')) {
        map!.addLayer({
          id: 'unidades-labels', type: 'symbol', source: 'unidades-source',
          layout: {
            'text-field': ['get', 'nombre'],
            'text-size': 12,
            'text-anchor': 'top',
            'text-offset': [0, 1],
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          },
          paint: {
            'text-color': UNIDAD_COLOR,
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.5,
          },
        });
      }
    }

    addLayers();

    // Click & hover on unidad points
    const clickHandler = (e: any) => {
      const id = e.features?.[0]?.properties?.id;
      if (id) onUnidadClick?.(id);
    };
    const enterHandler = () => { map.getCanvas().style.cursor = 'pointer'; };
    const leaveHandler = () => { map.getCanvas().style.cursor = ''; };

    if (map.getLayer('unidades-circles')) {
      map.on('click', 'unidades-circles', clickHandler);
      map.on('mouseenter', 'unidades-circles', enterHandler);
      map.on('mouseleave', 'unidades-circles', leaveHandler);
    }

    const onStyleLoad = () => addLayers();
    map.on('style.load', onStyleLoad);

    if (!fittedRef.current) {
      fittedRef.current = true;
      const coords = sectorBounds.coordinates[0] as [number, number][];
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 40, duration: 0 });
    }

    return () => {
      try {
        map.off('style.load', onStyleLoad);
        if (map.getLayer('unidades-circles')) {
          map.off('click', 'unidades-circles', clickHandler);
          map.off('mouseenter', 'unidades-circles', enterHandler);
          map.off('mouseleave', 'unidades-circles', leaveHandler);
        }
        ['unidades-labels', 'unidades-circles'].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
        if (map.getSource('unidades-source')) map.removeSource('unidades-source');
        if (map.getLayer('sector-bounds-line')) map.removeLayer('sector-bounds-line');
        if (map.getLayer('sector-bounds-fill')) map.removeLayer('sector-bounds-fill');
        if (map.getSource('sector-bounds-source')) map.removeSource('sector-bounds-source');
      } catch { /* map may already be destroyed */ }
    };
  }, [isLoaded, map, sectorBounds, unidades]);

  // Update paint properties for satellite toggle
  useEffect(() => {
    if (!isLoaded || !map) return;
    try {
      if (map.getLayer('sector-bounds-fill')) map.setPaintProperty('sector-bounds-fill', 'fill-opacity', isSatellite ? 0.2 : 0.08);
      if (map.getLayer('sector-bounds-line')) {
        map.setPaintProperty('sector-bounds-line', 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty('sector-bounds-line', 'line-width', isSatellite ? 3 : 2);
      }
      if (map.getLayer('unidades-circles')) {
        map.setPaintProperty('unidades-circles', 'circle-stroke-color', isSatellite ? '#000000' : '#ffffff');
      }
      if (map.getLayer('unidades-labels')) {
        map.setPaintProperty('unidades-labels', 'text-halo-color', isSatellite ? '#000000' : '#ffffff');
        map.setPaintProperty('unidades-labels', 'text-halo-width', isSatellite ? 2 : 1.5);
      }
    } catch { /* layers may not exist yet */ }
  }, [isLoaded, map, isSatellite]);

  // Constrain map to sector bounds
  useEffect(() => {
    if (!isLoaded || !map) return;
    const bbox = getPolygonBBox(sectorBounds, 0.2);
    map.setMaxBounds(bbox);
    return () => { try { map.setMaxBounds(null); } catch { /* ignore */ } };
  }, [isLoaded, map, sectorBounds]);

  // Recenter
  useEffect(() => {
    if (!isLoaded || !map || recenterTrigger === 0) return;
    map.fitBounds(getPolygonBBox(sectorBounds, 0), { padding: 40, duration: 300 });
  }, [isLoaded, map, sectorBounds, recenterTrigger]);

  return null;
}

interface SectorDashboard {
  currentUserLocalRole: 'ADMIN' | 'SUPERVISOR' | 'VISOR' | null;
  sector: {
    id: string; nombre: string; areaId: string; tipo: string | null;
    bounds: unknown; detalles: unknown;
    usuarioResponsableId: string | null;
    usuarioResponsable: { id: string; nombre: string; apellido?: string | null } | null;
    area: {
      id: string; nombre: string; bounds: unknown;
      localProductivo: { id: string; nombre: string };
    };
  };
  stats: { totalUnidades: number; };
  unidades: {
    id: string; nombre: string; topicMqtt: string;
    posicion: unknown; dispositivoCodigo: string | null;
    ultimaLectura: string | null;
  }[];
  siblingSectores: { id: string; nombre: string; bounds: unknown }[];
}

export default function SectorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const localId = params.id as string;
  const areaId = params.areaId as string;
  const sectorId = params.sectorId as string;

  const [data, setData] = useState<SectorDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [unidadDialogOpen, setUnidadDialogOpen] = useState(false);
  const [editUnidadDialogOpen, setEditUnidadDialogOpen] = useState(false);
  const [deleteUnidadDialogOpen, setDeleteUnidadDialogOpen] = useState(false);
  const [selectedUnidad, setSelectedUnidad] = useState<SectorDashboard['unidades'][0] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSatellite, setIsSatellite] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [localUsuarios, setLocalUsuarios] = useState<{ id: string; nombre: string; apellido?: string | null }[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [sectorRes, localUsersRes] = await Promise.all([
        api.get(`/api/sectores/${sectorId}/dashboard`),
        api.get(`/api/locales/${localId}/usuarios`).catch(() => ({ data: { items: [] } })),
      ]);
      setData(sectorRes.data);
      setLocalUsuarios(localUsersRes.data.items.map((u: any) => ({
        id: u.usuarioId, nombre: u.nombre, apellido: u.apellido,
      })));
    } catch {
      setError('Error al cargar los datos del sector');
    } finally {
      setLoading(false);
    }
  }, [sectorId, localId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  async function handleEditSubmit(values: SectorFormValues) {
    try { setSubmitting(true); await api.put(`/api/sectores/${sectorId}`, values); setEditDialogOpen(false); fetchDashboard(); }
    catch { setError('Error al actualizar el sector'); } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    try { setSubmitting(true); await api.delete(`/api/sectores/${sectorId}`); router.push(`/dashboard/locales/${localId}/areas/${areaId}`); }
    catch { setError('Error al eliminar el sector'); } finally { setSubmitting(false); }
  }

  async function handleCreateUnidad(values: UnidadFormValues) {
    try { setSubmitting(true); await api.post('/api/unidades', transformUnidadPayload(values)); setUnidadDialogOpen(false); fetchDashboard(); }
    catch { setError('Error al crear la unidad de produccion'); } finally { setSubmitting(false); }
  }

  async function handleEditUnidad(values: UnidadFormValues) {
    if (!selectedUnidad) return;
    try { setSubmitting(true); await api.put(`/api/unidades/${selectedUnidad.id}`, transformUnidadPayload(values)); setEditUnidadDialogOpen(false); setSelectedUnidad(null); fetchDashboard(); }
    catch { setError('Error al actualizar la unidad de produccion'); } finally { setSubmitting(false); }
  }

  async function handleDeleteUnidad() {
    if (!selectedUnidad) return;
    try { setSubmitting(true); await api.delete(`/api/unidades/${selectedUnidad.id}`); setDeleteUnidadDialogOpen(false); setSelectedUnidad(null); fetchDashboard(); }
    catch { setError('Error al eliminar la unidad de produccion'); } finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando...</p></div>;
  if (error && !data) return <div className="flex items-center justify-center h-64"><p className="text-destructive">{error}</p></div>;
  if (!data) return null;

  const { sector, stats, unidades, siblingSectores, currentUserLocalRole } = data;
  const canWrite = currentUserLocalRole === 'ADMIN' || currentUserLocalRole === 'SUPERVISOR';
  const basePath = `/dashboard/locales/${localId}`;
  const sectorBounds = sector.bounds as GeoJSON.Polygon | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: sector.area.localProductivo.nombre, href: basePath },
            { label: sector.area.nombre, href: `${basePath}/areas/${areaId}` },
            { label: sector.nombre },
          ]} />
          <h2 className="text-3xl font-bold">{sector.nombre}</h2>
          {sector.tipo && <p className="text-muted-foreground">Tipo: {sector.tipo}</p>}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="size-4" />Editar</Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="size-4" />Eliminar</Button>
          </div>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <StatsGrid className="lg:grid-cols-1 max-w-xs">
        <StatsCard icon={Box} label="Unidades de Produccion" value={stats.totalUnidades} />
      </StatsGrid>

      {sectorBounds && (
        <Card className="p-0 gap-0 overflow-hidden">
          <CardHeader className="p-4"><CardTitle>Mapa del Sector</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[500px]">
              <div className="absolute top-2 left-2 z-10">
                <Button type="button" variant="secondary" size="icon" className="size-8 shadow-md" onClick={() => setRecenterTrigger((n) => n + 1)} title="Centrar en el sector"><LocateFixed className="size-4" /></Button>
              </div>
              <div className="absolute top-2 right-2 z-10">
                <Button type="button" variant="secondary" size="icon" className="size-8" onClick={() => setIsSatellite(prev => !prev)} title={isSatellite ? 'Vista mapa' : 'Vista satelital'}>
                  {isSatellite ? <MapIcon className="size-4" /> : <Satellite className="size-4" />}
                </Button>
              </div>
              <MapComponent center={[-79.9, -2.2]} zoom={10} className="h-full w-full" styles={isSatellite ? { light: SATELLITE_STYLE, dark: SATELLITE_STYLE } : undefined}>
                <SectorMapLayers sectorBounds={sectorBounds} unidades={unidades} isSatellite={isSatellite} recenterTrigger={recenterTrigger} onUnidadClick={(unidadId) => router.push(`/dashboard/unidades/${unidadId}`)} />
                <MapControls position="bottom-right" showZoom />
              </MapComponent>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Informacion del Sector</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              { label: 'Nombre', value: sector.nombre },
              { label: 'Tipo', value: sector.tipo },
              { label: 'Responsable', value: sector.usuarioResponsable ? `${sector.usuarioResponsable.nombre} ${sector.usuarioResponsable.apellido ?? ''}`.trim() : null },
            ].map((field) => field.value && (
              <div key={field.label}>
                <span className="text-muted-foreground">{field.label}</span>
                <p className="font-medium">{field.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Unidades de Produccion</h3>
          {canWrite && <Button onClick={() => setUnidadDialogOpen(true)}><Plus className="size-4" />Nueva Unidad</Button>}
        </div>
        <DataTable
          columns={[
            { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
            { id: 'dispositivoCodigo', header: 'Dispositivo', accessorFn: (row) => row.dispositivoCodigo ?? '-' },
            { id: 'ultimaLectura', header: 'Ultima Lectura', accessorFn: (row) => row.ultimaLectura ? new Date(row.ultimaLectura).toLocaleString('es-EC') : 'Sin lecturas' },
          ] as ColumnDef<(typeof unidades)[0]>[]}
          data={unidades}
          searchKey="nombre"
          searchPlaceholder="Buscar unidades..."
          emptyMessage="No hay unidades de produccion registradas."
          rowActions={canWrite ? [
            { label: 'Editar', icon: <Pencil className="size-4" />, onClick: (u) => { setSelectedUnidad(u); setEditUnidadDialogOpen(true); } },
            { label: 'Eliminar', icon: <Trash2 className="size-4" />, onClick: (u) => { setSelectedUnidad(u); setDeleteUnidadDialogOpen(true); }, variant: 'destructive' },
          ] as RowAction<(typeof unidades)[0]>[] : []}
          onRowClick={(u) => router.push(`/dashboard/unidades/${u.id}`)}
        />
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Sector</DialogTitle><DialogDescription>Modifica los datos del sector.</DialogDescription></DialogHeader>
          <SectorForm areaId={areaId} usuarios={localUsuarios} defaultValues={{ nombre: sector.nombre, areaId: sector.areaId, tipo: sector.tipo ?? '', usuarioResponsableId: sector.usuarioResponsableId ?? '', bounds: sector.bounds as GeoJSON.Polygon | undefined }} parentBounds={sector.area.bounds as GeoJSON.Polygon | null} siblingSectors={siblingSectores.filter(s => s.bounds).map(s => ({ id: s.id, nombre: s.nombre, bounds: s.bounds as GeoJSON.Polygon }))} onSubmit={handleEditSubmit} loading={submitting} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Sector</DialogTitle><DialogDescription>Esta accion no se puede deshacer. Se eliminara permanentemente <strong>{sector.nombre}</strong> y todas sus unidades de produccion.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? 'Eliminando...' : 'Eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={unidadDialogOpen} onOpenChange={setUnidadDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nueva Unidad de Produccion</DialogTitle><DialogDescription>Crea una nueva unidad de produccion en {sector.nombre}.</DialogDescription></DialogHeader>
          <UnidadForm sectorId={sectorId} onSubmit={handleCreateUnidad} loading={submitting} parentBounds={sectorBounds} siblingUnidades={unidades.filter(u => u.posicion).map(u => ({ id: u.id, nombre: u.nombre, posicion: u.posicion as { lat: number; lng: number } }))} />
        </DialogContent>
      </Dialog>

      <Dialog open={editUnidadDialogOpen} onOpenChange={(open) => { setEditUnidadDialogOpen(open); if (!open) setSelectedUnidad(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Unidad de Produccion</DialogTitle><DialogDescription>Modifica los datos de la unidad.</DialogDescription></DialogHeader>
          {selectedUnidad && (
            <UnidadForm sectorId={sectorId} defaultValues={{ nombre: selectedUnidad.nombre, sectorId, topicMqtt: selectedUnidad.topicMqtt, posicion: selectedUnidad.posicion as { lat: number; lng: number } | undefined }} onSubmit={handleEditUnidad} loading={submitting} parentBounds={sectorBounds} siblingUnidades={unidades.filter(u => u.posicion && u.id !== selectedUnidad.id).map(u => ({ id: u.id, nombre: u.nombre, posicion: u.posicion as { lat: number; lng: number } }))} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteUnidadDialogOpen} onOpenChange={(open) => { setDeleteUnidadDialogOpen(open); if (!open) setSelectedUnidad(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Unidad de Produccion</DialogTitle><DialogDescription>Esta accion no se puede deshacer. Se eliminara permanentemente <strong>{selectedUnidad?.nombre}</strong>.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUnidadDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteUnidad} disabled={submitting}>{submitting ? 'Eliminando...' : 'Eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
