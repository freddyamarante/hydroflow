'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { AreaForm, AreaFormValues } from '@/components/forms/area-form';
import { SectorForm, SectorFormValues } from '@/components/forms/sector-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Layers, Box, Pencil, Trash2, Plus, Eye, Map as MapIcon, Satellite, LocateFixed } from 'lucide-react';
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

const SECTOR_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

function AreaMapLayers({ areaBounds, sectores, isSatellite, recenterTrigger, onSectorClick }: {
  areaBounds: GeoJSON.Polygon;
  sectores: { id: string; nombre: string; bounds: unknown }[];
  isSatellite: boolean;
  recenterTrigger: number;
  onSectorClick?: (sectorId: string) => void;
}) {
  const { map, isLoaded } = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !map) return;
    const sectoresWithBounds = sectores.filter((s) => s.bounds);

    function addLayers() {
      if (!map!.getSource('area-bounds-source')) {
        map!.addSource('area-bounds-source', {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: areaBounds },
        });
      }
      if (!map!.getLayer('area-bounds-fill')) {
        map!.addLayer({ id: 'area-bounds-fill', type: 'fill', source: 'area-bounds-source', paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.08 } });
      }
      if (!map!.getLayer('area-bounds-line')) {
        map!.addLayer({ id: 'area-bounds-line', type: 'line', source: 'area-bounds-source', paint: { 'line-color': '#94a3b8', 'line-width': 2, 'line-dasharray': [4, 3] } });
      }

      sectoresWithBounds.forEach((sector, idx) => {
        const sourceId = `sector-${sector.id}-source`;
        const fillId = `sector-${sector.id}-fill`;
        const lineId = `sector-${sector.id}-line`;
        const labelId = `sector-${sector.id}-label`;
        const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
        if (!map!.getSource(sourceId)) {
          map!.addSource(sourceId, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: sector.bounds as GeoJSON.Polygon } });
        }
        if (!map!.getLayer(fillId)) map!.addLayer({ id: fillId, type: 'fill', source: sourceId, paint: { 'fill-color': color, 'fill-opacity': 0.2 } });
        if (!map!.getLayer(lineId)) map!.addLayer({ id: lineId, type: 'line', source: sourceId, paint: { 'line-color': color, 'line-width': 2 } });
        if (!map!.getLayer(labelId)) {
          map!.addLayer({ id: labelId, type: 'symbol', source: sourceId, layout: { 'text-field': sector.nombre, 'text-size': 13, 'text-anchor': 'center', 'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] }, paint: { 'text-color': color, 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } });
        }
      });
    }

    addLayers();

    const clickHandlers: Array<{ layer: string; handler: () => void }> = [];
    const enterHandlers: Array<{ layer: string; handler: () => void }> = [];
    const leaveHandlers: Array<{ layer: string; handler: () => void }> = [];
    sectoresWithBounds.forEach((sector, idx) => {
      const fillId = `sector-${sector.id}-fill`;
      const lineId = `sector-${sector.id}-line`;
      const color = SECTOR_COLORS[idx % SECTOR_COLORS.length];
      const clickHandler = () => onSectorClick?.(sector.id);
      const enterHandler = () => {
        map.getCanvas().style.cursor = 'pointer';
        if (map.getLayer(fillId)) map.setPaintProperty(fillId, 'fill-opacity', isSatellite ? 0.65 : 0.45);
        if (map.getLayer(lineId)) {
          map.setPaintProperty(lineId, 'line-width', isSatellite ? 4 : 3);
          map.setPaintProperty(lineId, 'line-color', color);
        }
      };
      const leaveHandler = () => {
        map.getCanvas().style.cursor = '';
        if (map.getLayer(fillId)) map.setPaintProperty(fillId, 'fill-opacity', isSatellite ? 0.4 : 0.2);
        if (map.getLayer(lineId)) {
          map.setPaintProperty(lineId, 'line-width', isSatellite ? 3 : 2);
          map.setPaintProperty(lineId, 'line-color', color);
        }
      };
      if (map.getLayer(fillId)) {
        map.on('click', fillId, clickHandler);
        map.on('mouseenter', fillId, enterHandler);
        map.on('mouseleave', fillId, leaveHandler);
        clickHandlers.push({ layer: fillId, handler: clickHandler });
        enterHandlers.push({ layer: fillId, handler: enterHandler });
        leaveHandlers.push({ layer: fillId, handler: leaveHandler });
      }
    });

    const onStyleLoad = () => addLayers();
    map.on('style.load', onStyleLoad);
    if (!fittedRef.current) {
      fittedRef.current = true;
      const coords = areaBounds.coordinates[0] as [number, number][];
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 40, duration: 0 });
    }
    return () => {
      try {
        map.off('style.load', onStyleLoad);
        clickHandlers.forEach(({ layer, handler }) => { try { map.off('click', layer, handler); } catch { /* ignore */ } });
        enterHandlers.forEach(({ layer, handler }) => { try { map.off('mouseenter', layer, handler); } catch { /* ignore */ } });
        leaveHandlers.forEach(({ layer, handler }) => { try { map.off('mouseleave', layer, handler); } catch { /* ignore */ } });
        sectoresWithBounds.forEach((sector) => {
          [`sector-${sector.id}-label`, `sector-${sector.id}-line`, `sector-${sector.id}-fill`].forEach((id) => { if (map.getLayer(id)) map.removeLayer(id); });
          const sourceId = `sector-${sector.id}-source`;
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        });
        if (map.getLayer('area-bounds-line')) map.removeLayer('area-bounds-line');
        if (map.getLayer('area-bounds-fill')) map.removeLayer('area-bounds-fill');
        if (map.getSource('area-bounds-source')) map.removeSource('area-bounds-source');
      } catch { /* map may already be destroyed */ }
    };
  }, [isLoaded, map, areaBounds, sectores]);

  // Update paint properties when satellite mode changes
  useEffect(() => {
    if (!isLoaded || !map) return;
    const sectoresWithBounds = sectores.filter((s) => s.bounds);
    try {
      if (map.getLayer('area-bounds-fill')) map.setPaintProperty('area-bounds-fill', 'fill-opacity', isSatellite ? 0.2 : 0.08);
      if (map.getLayer('area-bounds-line')) {
        map.setPaintProperty('area-bounds-line', 'line-color', isSatellite ? '#ffffff' : '#94a3b8');
        map.setPaintProperty('area-bounds-line', 'line-width', isSatellite ? 3 : 2);
      }
      sectoresWithBounds.forEach((sector) => {
        if (map.getLayer(`sector-${sector.id}-fill`)) map.setPaintProperty(`sector-${sector.id}-fill`, 'fill-opacity', isSatellite ? 0.4 : 0.2);
        if (map.getLayer(`sector-${sector.id}-line`)) map.setPaintProperty(`sector-${sector.id}-line`, 'line-width', isSatellite ? 3 : 2);
        if (map.getLayer(`sector-${sector.id}-label`)) {
          map.setPaintProperty(`sector-${sector.id}-label`, 'text-halo-color', isSatellite ? '#000000' : '#ffffff');
          map.setPaintProperty(`sector-${sector.id}-label`, 'text-halo-width', isSatellite ? 2 : 1.5);
        }
      });
    } catch { /* layers may not exist yet */ }
  }, [isLoaded, map, isSatellite, sectores]);

  // Constrain map to area bounds
  useEffect(() => {
    if (!isLoaded || !map) return;
    const bbox = getPolygonBBox(areaBounds, 0.5);
    map.setMaxBounds(bbox);
    return () => { try { map.setMaxBounds(null); } catch { /* ignore */ } };
  }, [isLoaded, map, areaBounds]);

  // Recenter
  useEffect(() => {
    if (!isLoaded || !map || recenterTrigger === 0) return;
    map.fitBounds(getPolygonBBox(areaBounds, 0), { padding: 40, duration: 300 });
  }, [isLoaded, map, areaBounds, recenterTrigger]);

  return null;
}

interface AreaDashboard {
  area: {
    id: string; nombre: string; localProductivoId: string;
    actividadProductiva: string | null; bounds: unknown;
    localProductivo: { id: string; nombre: string; bounds: unknown };
  };
  stats: { totalSectores: number; totalUnidades: number; };
  sectores: {
    id: string; nombre: string; tipo: string | null; bounds: unknown;
    unidadesCount: number;
    usuarioResponsable: { id: string; nombre: string } | null;
  }[];
  siblingAreas: { id: string; nombre: string; bounds: unknown }[];
  currentUserLocalRole: 'ADMIN' | 'SUPERVISOR' | 'VISOR' | null;
}

export default function AreaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const localId = params.id as string;
  const areaId = params.areaId as string;

  const [data, setData] = useState<AreaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectorDialogOpen, setSectorDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSatellite, setIsSatellite] = useState(true);
  const [recenterTrigger, setRecenterTrigger] = useState(0);
  const [localUsuarios, setLocalUsuarios] = useState<{ id: string; nombre: string; apellido?: string | null }[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [areaRes, localUsersRes] = await Promise.all([
        api.get(`/api/areas/${areaId}/dashboard`),
        api.get(`/api/locales/${localId}/usuarios`).catch(() => ({ data: { items: [] } })),
      ]);
      setData(areaRes.data);
      setLocalUsuarios(localUsersRes.data.items.map((u: any) => ({
        id: u.usuarioId, nombre: u.nombre, apellido: u.apellido,
      })));
    } catch {
      setError('Error al cargar los datos del area');
    } finally {
      setLoading(false);
    }
  }, [areaId, localId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  async function handleEditSubmit(values: AreaFormValues) {
    try { setSubmitting(true); await api.put(`/api/areas/${areaId}`, values); setEditDialogOpen(false); fetchDashboard(); }
    catch { setError('Error al actualizar el area'); } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    try { setSubmitting(true); await api.delete(`/api/areas/${areaId}`); router.push(`/dashboard/locales/${localId}`); }
    catch { setError('Error al eliminar el area'); } finally { setSubmitting(false); }
  }

  async function handleCreateSector(values: SectorFormValues) {
    try { setSubmitting(true); await api.post('/api/sectores', { ...values, areaId }); setSectorDialogOpen(false); fetchDashboard(); }
    catch { setError('Error al crear el sector'); } finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando...</p></div>;
  if (error && !data) return <div className="flex items-center justify-center h-64"><p className="text-destructive">{error}</p></div>;
  if (!data) return null;

  const { area, stats, sectores, siblingAreas, currentUserLocalRole } = data;
  const canWrite = currentUserLocalRole === 'ADMIN' || currentUserLocalRole === 'SUPERVISOR';
  const basePath = `/dashboard/locales/${localId}`;
  const areaBounds = area.bounds as GeoJSON.Polygon | null;
  const localBounds = area.localProductivo.bounds as GeoJSON.Polygon | null;

  const sectorColumns: ColumnDef<(typeof sectores)[0]>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'tipo', header: 'Tipo', accessorKey: 'tipo' },
    { id: 'responsable', header: 'Responsable', accessorFn: (row) => row.usuarioResponsable?.nombre ?? '-' },
    { id: 'unidadesCount', header: 'Unidades', accessorFn: (row) => row.unidadesCount, className: 'text-center' },
  ];

  const sectorActions: RowAction<(typeof sectores)[0]>[] = [
    { label: 'Ver', icon: <Eye className="size-4" />, onClick: (sector) => router.push(`${basePath}/areas/${areaId}/sectores/${sector.id}`) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: area.localProductivo.nombre, href: basePath },
            { label: area.nombre },
          ]} />
          <h2 className="text-3xl font-bold">{area.nombre}</h2>
          {area.actividadProductiva && <p className="text-muted-foreground">{area.actividadProductiva}</p>}
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="size-4" />Editar</Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="size-4" />Eliminar</Button>
          </div>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <StatsGrid className="lg:grid-cols-2">
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {areaBounds && (
        <Card className="p-0 gap-0 overflow-hidden">
          <CardHeader className="p-4"><CardTitle>Mapa del Area</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="relative h-[500px]">
              <div className="absolute top-2 left-2 z-10">
                <Button type="button" variant="secondary" size="icon" className="size-8 shadow-md" onClick={() => setRecenterTrigger((n) => n + 1)} title="Centrar en el area"><LocateFixed className="size-4" /></Button>
              </div>
              <div className="absolute top-2 right-2 z-10">
                <Button type="button" variant="secondary" size="icon" className="size-8" onClick={() => setIsSatellite(prev => !prev)} title={isSatellite ? 'Vista mapa' : 'Vista satelital'}>
                  {isSatellite ? <MapIcon className="size-4" /> : <Satellite className="size-4" />}
                </Button>
              </div>
              <MapComponent center={[-79.9, -2.2]} zoom={10} className="h-full w-full" styles={isSatellite ? { light: SATELLITE_STYLE, dark: SATELLITE_STYLE } : undefined}>
                <AreaMapLayers areaBounds={areaBounds} sectores={sectores} isSatellite={isSatellite} recenterTrigger={recenterTrigger} onSectorClick={(sectorId) => router.push(`${basePath}/areas/${areaId}/sectores/${sectorId}`)} />
                <MapControls position="bottom-right" showZoom />
              </MapComponent>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Sectores</h3>
          {canWrite && <Button onClick={() => setSectorDialogOpen(true)}><Plus className="size-4" />Nuevo Sector</Button>}
        </div>
        <DataTable columns={sectorColumns} data={sectores} searchKey="nombre" searchPlaceholder="Buscar sectores..." emptyMessage="No hay sectores registrados." rowActions={sectorActions} onRowClick={(sector) => router.push(`${basePath}/areas/${areaId}/sectores/${sector.id}`)} />
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Area</DialogTitle><DialogDescription>Modifica los datos del area.</DialogDescription></DialogHeader>
          <AreaForm localProductivoId={localId} defaultValues={{ nombre: area.nombre, localProductivoId: area.localProductivoId, actividadProductiva: area.actividadProductiva ?? '', bounds: areaBounds ?? undefined }} parentBounds={localBounds} siblingAreas={siblingAreas.filter(a => a.bounds).map(a => ({ id: a.id, nombre: a.nombre, bounds: a.bounds as GeoJSON.Polygon }))} onSubmit={handleEditSubmit} loading={submitting} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Area</DialogTitle><DialogDescription>Esta accion no se puede deshacer. Se eliminara permanentemente <strong>{area.nombre}</strong> y todos sus sectores y unidades.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? 'Eliminando...' : 'Eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sectorDialogOpen} onOpenChange={setSectorDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Sector</DialogTitle><DialogDescription>Crea un nuevo sector en {area.nombre}.</DialogDescription></DialogHeader>
          <SectorForm areaId={areaId} usuarios={localUsuarios} onSubmit={handleCreateSector} loading={submitting} parentBounds={areaBounds} siblingSectors={sectores.filter(s => s.bounds).map(s => ({ id: s.id, nombre: s.nombre, bounds: s.bounds as GeoJSON.Polygon }))} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
