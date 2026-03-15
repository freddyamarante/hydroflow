'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Map as MapIcon, Layers, Box, Pencil, Trash2, Plus, Eye, RefreshCw } from 'lucide-react';
import { DashboardMapCard, PolygonOverlayLayers } from '@/components/maps/dashboard-map';

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

export default function LocalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const localId = params.id as string;

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
  const [clippingDialogOpen, setClippingDialogOpen] = useState(false);
  const [clippingData, setClippingData] = useState<{
    areasClipped: { id: string; nombre: string }[];
    areasOutside: { id: string; nombre: string }[];
    sectoresClipped: { id: string; nombre: string }[];
    sectoresOutside: { id: string; nombre: string }[];
    unidadesNulled: { id: string; nombre: string }[];
  } | null>(null);
  const [pendingEditValues, setPendingEditValues] = useState<LocalFormValues | null>(null);
  const [localUsuarios, setLocalUsuarios] = useState<LocalUsuario[]>([]);
  const [empresaUsuarios, setEmpresaUsuarios] = useState<EmpresaUsuario[]>([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRol, setAssignRol] = useState<'SUPERVISOR' | 'VISOR'>('VISOR');

  const fetchLocalUsuarios = useCallback(async (empresaId: string) => {
    try {
      const [localUsersRes, empresaUsersRes] = await Promise.all([
        api.get(`/api/locales/${localId}/usuarios`),
        api.get(`/api/empresas/${empresaId}/usuarios`),
      ]);
      setLocalUsuarios(localUsersRes.data.items.map((u: any) => ({ ...u, id: u.usuarioId })));
      setEmpresaUsuarios(empresaUsersRes.data.items);
    } catch { /* silent */ }
  }, [localId]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/locales/${localId}/dashboard`);
      setData(res.data);
      if (res.data.local.empresaId) fetchLocalUsuarios(res.data.local.empresaId);
    } catch {
      setError('Error al cargar los datos del local');
    } finally {
      setLoading(false);
    }
  }, [localId, fetchLocalUsuarios]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  async function handleEditSubmit(values: LocalFormValues) {
    try {
      setSubmitting(true);

      // Dry run first to check if clipping would occur
      const preview = await api.put(`/api/locales/${localId}?dryRun=true`, values);
      if (preview.data._clipping) {
        // Clipping needed — show confirmation modal before saving
        setClippingData(preview.data._clipping);
        setPendingEditValues(values);
        setClippingDialogOpen(true);
        return;
      }

      // No clipping — save directly
      await api.put(`/api/locales/${localId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch { setError('Error al actualizar el local'); } finally { setSubmitting(false); }
  }

  async function handleConfirmClipping() {
    if (!pendingEditValues) return;
    try {
      setSubmitting(true);
      await api.put(`/api/locales/${localId}`, pendingEditValues);
      setClippingDialogOpen(false);
      setEditDialogOpen(false);
      setClippingData(null);
      setPendingEditValues(null);
      fetchDashboard();
    } catch { setError('Error al actualizar el local'); } finally { setSubmitting(false); }
  }

  async function handleDelete() {
    try { setSubmitting(true); await api.delete(`/api/locales/${localId}`); router.push('/dashboard'); }
    catch { setError('Error al eliminar el local'); } finally { setSubmitting(false); }
  }

  async function handleCreateArea(values: AreaFormValues) {
    try { setSubmitting(true); await api.post('/api/areas', { ...values, localProductivoId: localId }); setAreaDialogOpen(false); fetchDashboard(); }
    catch { setError('Error al crear el area'); } finally { setSubmitting(false); }
  }

  async function handleAssignUser() {
    if (!assignUserId) return;
    try { setSubmitting(true); await api.post(`/api/locales/${localId}/usuarios`, { usuarioId: assignUserId, rol: assignRol }); setAssignUserDialogOpen(false); setAssignUserId(''); setAssignRol('VISOR'); if (data?.local.empresaId) fetchLocalUsuarios(data.local.empresaId); }
    catch { setError('Error al asignar el usuario'); } finally { setSubmitting(false); }
  }

  async function handleToggleRole(usuario: LocalUsuario) {
    try { setSubmitting(true); await api.put(`/api/locales/${localId}/usuarios/${usuario.usuarioId}`, { rol: usuario.rol === 'SUPERVISOR' ? 'VISOR' : 'SUPERVISOR' }); if (data?.local.empresaId) fetchLocalUsuarios(data.local.empresaId); }
    catch { setError('Error al cambiar el rol'); } finally { setSubmitting(false); }
  }

  async function handleUnassignUser() {
    if (!selectedAssignment) return;
    try { setSubmitting(true); await api.delete(`/api/locales/${localId}/usuarios/${selectedAssignment.usuarioId}`); setDeleteAssignDialogOpen(false); setSelectedAssignment(null); if (data?.local.empresaId) fetchLocalUsuarios(data.local.empresaId); }
    catch { setError('Error al desasignar el usuario'); } finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Cargando...</p></div>;
  if (error && !data) return <div className="flex items-center justify-center h-64"><p className="text-destructive">{error}</p></div>;
  if (!data) return null;

  const { local, stats, areas, currentUserLocalRole } = data;
  const canWrite = currentUserLocalRole === 'ADMIN' || currentUserLocalRole === 'SUPERVISOR';
  const isAdmin = currentUserLocalRole === 'ADMIN';
  const localBounds = local.bounds as GeoJSON.Polygon | null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: local.nombre }]} />
          <h2 className="text-3xl font-bold">{local.nombre}</h2>
          <p className="text-muted-foreground">{local.empresa.razonSocial}</p>
        </div>
        {canWrite && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}><Pencil className="size-4" />Editar</Button>
            {isAdmin && <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}><Trash2 className="size-4" />Eliminar</Button>}
          </div>
        )}
      </div>

      {error && <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <StatsGrid className="lg:grid-cols-3">
        <StatsCard icon={MapIcon} label="Areas" value={stats.totalAreas} />
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {localBounds && (
        <DashboardMapCard title="Mapa del Local" bounds={localBounds}>
          {(isSatellite) => (
            <PolygonOverlayLayers parentId="local" parentBounds={localBounds} isSatellite={isSatellite} onChildClick={(areaId) => router.push(`/dashboard/locales/${localId}/areas/${areaId}`)}>
              {areas}
            </PolygonOverlayLayers>
          )}
        </DashboardMapCard>
      )}

      <Card>
        <CardHeader><CardTitle>Informacion del Local</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
            {[
              { label: 'Nombre', value: local.nombre },
              { label: 'Tipo Productivo', value: local.tipoProductivo },
              { label: 'Area de Produccion', value: local.areaProduccion },
              { label: 'Direccion', value: local.direccion },
              { label: 'Ubicacion', value: local.ubicacionDomiciliaria },
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
          <h3 className="text-xl font-semibold">Areas</h3>
          {canWrite && <Button onClick={() => setAreaDialogOpen(true)}><Plus className="size-4" />Nueva Area</Button>}
        </div>
        <DataTable
          columns={[
            { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
            { id: 'actividadProductiva', header: 'Actividad Productiva', accessorKey: 'actividadProductiva' },
            { id: 'sectoresCount', header: 'Sectores', accessorFn: (row) => row.sectoresCount, className: 'text-center' },
          ] as ColumnDef<(typeof areas)[0]>[]}
          data={areas}
          searchKey="nombre"
          searchPlaceholder="Buscar areas..."
          emptyMessage="No hay areas registradas."
          rowActions={[{ label: 'Ver', icon: <Eye className="size-4" />, onClick: (area) => router.push(`/dashboard/locales/${localId}/areas/${area.id}`) }] as RowAction<(typeof areas)[0]>[]}
          onRowClick={(area) => router.push(`/dashboard/locales/${localId}/areas/${area.id}`)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Usuarios Asignados</h3>
          {isAdmin && <Button onClick={() => setAssignUserDialogOpen(true)}><Plus className="size-4" />Asignar Usuario</Button>}
        </div>
        <DataTable
          columns={[
            { id: 'nombre', header: 'Nombre', accessorFn: (row: LocalUsuario) => `${row.nombre} ${row.apellido ?? ''}`.trim(), sortable: true },
            { id: 'email', header: 'Email', accessorKey: 'email' as keyof LocalUsuario },
            { id: 'rol', header: 'Rol', accessorFn: (row: LocalUsuario) => <Badge variant={row.rol === 'SUPERVISOR' ? 'default' : 'secondary'}>{row.rol}</Badge> },
          ] as ColumnDef<LocalUsuario>[]}
          data={localUsuarios}
          searchKey="email"
          searchPlaceholder="Buscar usuarios asignados..."
          emptyMessage="No hay usuarios asignados a este local."
          rowActions={[
            { label: 'Cambiar Rol', icon: <RefreshCw className="size-4" />, onClick: (u: LocalUsuario) => handleToggleRole(u) },
            { label: 'Desasignar', icon: <Trash2 className="size-4" />, onClick: (u: LocalUsuario) => { setSelectedAssignment(u); setDeleteAssignDialogOpen(true); }, variant: 'destructive' },
          ] as RowAction<LocalUsuario>[]}
        />
      </div>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Editar Local Productivo</DialogTitle><DialogDescription>Modifica los datos del local productivo.</DialogDescription></DialogHeader>
          <LocalForm empresaId={local.empresaId} defaultValues={{ nombre: local.nombre, tipoProductivo: local.tipoProductivo ?? '', empresaId: local.empresaId, areaProduccion: local.areaProduccion ?? '', direccion: local.direccion ?? '', ubicacionDomiciliaria: local.ubicacionDomiciliaria ?? '', bounds: localBounds ?? undefined }} onSubmit={handleEditSubmit} loading={submitting} childPolygons={areas.filter(a => a.bounds).map(a => ({ id: a.id, nombre: a.nombre, bounds: a.bounds as GeoJSON.Polygon }))} />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar Local Productivo</DialogTitle><DialogDescription>Esta accion no se puede deshacer. Se eliminara permanentemente <strong>{local.nombre}</strong> y todas sus areas, sectores y unidades.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? 'Eliminando...' : 'Eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nueva Area</DialogTitle><DialogDescription>Crea una nueva area en {local.nombre}.</DialogDescription></DialogHeader>
          <AreaForm localProductivoId={localId} onSubmit={handleCreateArea} loading={submitting} parentBounds={localBounds} siblingAreas={areas.filter(a => a.bounds).map(a => ({ id: a.id, nombre: a.nombre, bounds: a.bounds as GeoJSON.Polygon }))} />
        </DialogContent>
      </Dialog>

      <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Asignar Usuario</DialogTitle><DialogDescription>Asigna un usuario de la empresa a este local productivo.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={assignUserId} onValueChange={setAssignUserId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar usuario" /></SelectTrigger>
                <SelectContent>
                  {empresaUsuarios.filter((eu) => !localUsuarios.some((lu) => lu.usuarioId === eu.id)).map((eu) => (
                    <SelectItem key={eu.id} value={eu.id}>{eu.nombre} {eu.apellido ?? ''} ({eu.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={assignRol} onValueChange={(v) => setAssignRol(v as 'SUPERVISOR' | 'VISOR')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="VISOR">Visor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignUserDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button onClick={handleAssignUser} disabled={submitting || !assignUserId}>{submitting ? 'Asignando...' : 'Asignar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteAssignDialogOpen} onOpenChange={(open) => { setDeleteAssignDialogOpen(open); if (!open) setSelectedAssignment(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Desasignar Usuario</DialogTitle><DialogDescription>Se removera a <strong>{selectedAssignment?.nombre} {selectedAssignment?.apellido ?? ''}</strong> de este local productivo.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAssignDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleUnassignUser} disabled={submitting}>{submitting ? 'Desasignando...' : 'Desasignar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clippingDialogOpen} onOpenChange={(open) => { setClippingDialogOpen(open); if (!open) { setClippingData(null); setPendingEditValues(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limites de areas seran ajustados</DialogTitle>
            <DialogDescription>Los nuevos limites del local afectaran las siguientes areas. Los sectores y unidades dentro de las areas afectadas perderan su posicion en el mapa y deberan ser reubicados.</DialogDescription>
          </DialogHeader>
          {clippingData && (
            <div className="space-y-3 text-sm max-h-64 overflow-y-auto">
              {clippingData.areasClipped.length > 0 && (
                <div>
                  <p className="font-medium">Areas que seran recortadas:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {clippingData.areasClipped.map((a) => <li key={a.id}>{a.nombre}</li>)}
                  </ul>
                </div>
              )}
              {clippingData.areasOutside.length > 0 && (
                <div>
                  <p className="font-medium">Areas completamente fuera de los nuevos limites:</p>
                  <ul className="list-disc list-inside text-muted-foreground">
                    {clippingData.areasOutside.map((a) => <li key={a.id}>{a.nombre}</li>)}
                  </ul>
                </div>
              )}
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
