'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { AreaForm, AreaFormValues } from '@/components/forms/area-form';
import { SectorForm, SectorFormValues } from '@/components/forms/sector-form';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Layers, Box, Pencil, Trash2, Plus, Eye, MapPinOff } from 'lucide-react';
import { DashboardMapCard, PolygonOverlayLayers } from '@/components/maps/dashboard-map';

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
  const [clippingDialogOpen, setClippingDialogOpen] = useState(false);
  const [clippingData, setClippingData] = useState<{
    sectoresClipped: { id: string; nombre: string }[];
    sectoresOutside: { id: string; nombre: string }[];
    unidadesNulled: { id: string; nombre: string }[];
  } | null>(null);
  const [pendingEditValues, setPendingEditValues] = useState<AreaFormValues | null>(null);
  const [localUsuarios, setLocalUsuarios] = useState<{ id: string; nombre: string; apellido?: string | null }[]>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const areaRes = await api.get(`/api/areas/${areaId}/dashboard`);
      setData(areaRes.data);
      if (areaRes.data.currentUserLocalRole === 'ADMIN') {
        const localUsersRes = await api.get(`/api/locales/${localId}/usuarios`).catch(() => ({ data: { items: [] } }));
        setLocalUsuarios(localUsersRes.data.items.map((u: any) => ({
          id: u.usuarioId, nombre: u.nombre, apellido: u.apellido,
        })));
      }
    } catch {
      setError('Error al cargar los datos del area');
    } finally {
      setLoading(false);
    }
  }, [areaId, localId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  async function handleEditSubmit(values: AreaFormValues) {
    console.log('[AreaDetail] Actualizar Area', { areaId, values });
    try {
      setSubmitting(true);

      const preview = await api.put(`/api/areas/${areaId}?dryRun=true`, values);
      if (preview.data._clipping) {
        setClippingData(preview.data._clipping);
        setPendingEditValues(values);
        setClippingDialogOpen(true);
        return;
      }

      await api.put(`/api/areas/${areaId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch { setError('Error al actualizar el area'); } finally { setSubmitting(false); }
  }

  async function handleConfirmClipping() {
    if (!pendingEditValues) return;
    try {
      setSubmitting(true);
      await api.put(`/api/areas/${areaId}`, pendingEditValues);
      setClippingDialogOpen(false);
      setEditDialogOpen(false);
      setClippingData(null);
      setPendingEditValues(null);
      fetchDashboard();
    } catch { setError('Error al actualizar el area'); } finally { setSubmitting(false); }
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
    { id: 'nombre', header: 'Nombre', accessorFn: (row) => (
      <span className="flex items-center gap-2">
        {row.nombre}
        {!row.bounds && <Badge variant="outline" className="text-amber-600 border-amber-400 gap-1"><MapPinOff className="size-3" />Sin limites</Badge>}
      </span>
    ), sortable: true },
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

      {sectores.some(s => !s.bounds) && (
        <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <MapPinOff className="size-4 shrink-0" />
          <span>{sectores.filter(s => !s.bounds).length} sector(es) sin limites en el mapa. Editalos para asignarles un poligono dentro del area.</span>
        </div>
      )}

      <StatsGrid className="lg:grid-cols-2">
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {areaBounds && (
        <DashboardMapCard title="Mapa del Area" bounds={areaBounds}>
          {(isSatellite) => (
            <PolygonOverlayLayers parentId="area" parentBounds={areaBounds} isSatellite={isSatellite} onChildClick={(sectorId) => router.push(`${basePath}/areas/${areaId}/sectores/${sectorId}`)}>
              {sectores}
            </PolygonOverlayLayers>
          )}
        </DashboardMapCard>
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

      <Dialog open={clippingDialogOpen} onOpenChange={(open) => { setClippingDialogOpen(open); if (!open) { setClippingData(null); setPendingEditValues(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limites de sectores seran ajustados</DialogTitle>
            <DialogDescription>Los nuevos limites del area afectaran los siguientes sectores. Las unidades de produccion dentro de los sectores afectados perderan su posicion en el mapa y deberan ser reubicadas.</DialogDescription>
          </DialogHeader>
          {clippingData && (
            <div className="space-y-3 text-sm max-h-64 overflow-y-auto">
              {clippingData.sectoresClipped.length > 0 && (
                <div>
                  <p className="font-medium">Sectores que seran recortados:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {clippingData.sectoresClipped.map((s) => <li key={s.id}>{s.nombre}</li>)}
                  </ul>
                </div>
              )}
              {clippingData.sectoresOutside.length > 0 && (
                <div>
                  <p className="font-medium">Sectores completamente fuera de los nuevos limites:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {clippingData.sectoresOutside.map((s) => <li key={s.id}>{s.nombre}</li>)}
                  </ul>
                </div>
              )}
              {clippingData.unidadesNulled.length > 0 && (
                <div>
                  <p className="font-medium">Unidades que perderan su posicion en el mapa:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {clippingData.unidadesNulled.map((u) => <li key={u.id}>{u.nombre}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setClippingDialogOpen(false); setClippingData(null); setPendingEditValues(null); }} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleConfirmClipping} disabled={submitting}>{submitting ? 'Guardando...' : 'Confirmar y guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
