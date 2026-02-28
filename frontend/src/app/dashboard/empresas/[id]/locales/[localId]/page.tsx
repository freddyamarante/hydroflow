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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Map, Layers, Box, Pencil, Trash2, Plus, Eye, UserPlus, RefreshCw, Unlink } from 'lucide-react';

interface LocalUsuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  rol: string;
}

interface EmpresaUsuario {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
}

interface LocalDashboard {
  local: {
    id: string;
    nombre: string;
    tipoProductivo: string | null;
    empresaId: string;
    areaProduccion: string | null;
    direccion: string | null;
    ubicacionDomiciliaria: string | null;
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
    sectoresCount: number;
  }[];
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
  const [submitting, setSubmitting] = useState(false);

  const [localUsuarios, setLocalUsuarios] = useState<LocalUsuario[]>([]);
  const [assignUserDialogOpen, setAssignUserDialogOpen] = useState(false);
  const [empresaUsuarios, setEmpresaUsuarios] = useState<EmpresaUsuario[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRol, setSelectedRol] = useState<string>('SUPERVISOR');

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
  }, [fetchDashboard]);

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
      setError('Error al crear el área');
    } finally {
      setSubmitting(false);
    }
  }

  const fetchLocalUsuarios = useCallback(async () => {
    try {
      const res = await api.get(`/api/locales/${localId}/usuarios`);
      setLocalUsuarios(res.data.items);
    } catch {
      // silently fail, users section is supplementary
    }
  }, [localId]);

  useEffect(() => {
    fetchLocalUsuarios();
  }, [fetchLocalUsuarios]);

  async function handleOpenAssignDialog() {
    try {
      const res = await api.get(`/api/usuarios?limit=100`);
      const allUsers: EmpresaUsuario[] = res.data.items.filter(
        (u: EmpresaUsuario & { empresaId?: string }) => u.empresaId === empresaId
      );
      setEmpresaUsuarios(allUsers);
      setSelectedUserId('');
      setSelectedRol('SUPERVISOR');
      setAssignUserDialogOpen(true);
    } catch {
      setError('Error al cargar usuarios de la empresa');
    }
  }

  async function handleAssignUser() {
    if (!selectedUserId) return;
    try {
      setSubmitting(true);
      await api.post(`/api/locales/${localId}/usuarios`, {
        usuarioId: selectedUserId,
        rol: selectedRol,
      });
      setAssignUserDialogOpen(false);
      fetchLocalUsuarios();
    } catch {
      setError('Error al asignar usuario al local');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChangeRol(userId: string, currentRol: string) {
    const newRol = currentRol === 'SUPERVISOR' ? 'VISOR' : 'SUPERVISOR';
    try {
      await api.put(`/api/locales/${localId}/usuarios/${userId}`, { rol: newRol });
      fetchLocalUsuarios();
    } catch {
      setError('Error al cambiar el rol del usuario');
    }
  }

  async function handleUnlinkUser(userId: string) {
    try {
      await api.delete(`/api/locales/${localId}/usuarios/${userId}`);
      fetchLocalUsuarios();
    } catch {
      setError('Error al desvincular usuario del local');
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

  const { local, stats, areas } = data;

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

  const usuarioColumns: ColumnDef<LocalUsuario>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      accessorFn: (row) => `${row.nombre} ${row.apellido}`.trim(),
      sortable: true,
    },
    { id: 'email', header: 'Email', accessorKey: 'email' },
    { id: 'rol', header: 'Rol', accessorKey: 'rol' },
  ];

  const usuarioActions: RowAction<LocalUsuario>[] = [
    {
      label: 'Cambiar Rol',
      icon: <RefreshCw className="size-4" />,
      onClick: (user) => handleChangeRol(user.id, user.rol),
    },
    {
      label: 'Desvincular',
      icon: <Unlink className="size-4" />,
      onClick: (user) => handleUnlinkUser(user.id),
      variant: 'destructive',
    },
  ];

  const availableUsuarios = empresaUsuarios.filter(
    (eu) => !localUsuarios.some((lu) => lu.id === eu.id)
  );

  const infoFields = [
    { label: 'Nombre', value: local.nombre },
    { label: 'Tipo Productivo', value: local.tipoProductivo },
    { label: 'Área de Producción', value: local.areaProduccion },
    { label: 'Dirección', value: local.direccion },
    { label: 'Ubicación', value: local.ubicacionDomiciliaria },
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
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <StatsGrid className="lg:grid-cols-3">
        <StatsCard icon={Map} label="Áreas" value={stats.totalAreas} />
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {/* Local Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Local</CardTitle>
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
          <h3 className="text-xl font-semibold">Áreas</h3>
          <Button onClick={() => setAreaDialogOpen(true)}>
            <Plus className="size-4" />
            Nueva Área
          </Button>
        </div>
        <DataTable
          columns={areaColumns}
          data={areas}
          searchKey="nombre"
          searchPlaceholder="Buscar áreas..."
          emptyMessage="No hay áreas registradas."
          rowActions={areaActions}
          onRowClick={(area) =>
            router.push(`/dashboard/empresas/${empresaId}/locales/${localId}/areas/${area.id}`)
          }
        />
      </div>

      {/* Usuarios del Local */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Usuarios del Local</h3>
          <Button onClick={handleOpenAssignDialog}>
            <UserPlus className="size-4" />
            Asignar Usuario
          </Button>
        </div>
        <DataTable
          columns={usuarioColumns}
          data={localUsuarios}
          searchKey="nombre"
          searchPlaceholder="Buscar usuarios..."
          emptyMessage="No hay usuarios asignados a este local."
          rowActions={usuarioActions}
        />
      </div>

      {/* Assign User Dialog */}
      <Dialog open={assignUserDialogOpen} onOpenChange={setAssignUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Usuario al Local</DialogTitle>
            <DialogDescription>
              Selecciona un usuario de la empresa y asígnale un rol en este local.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsuarios.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No hay usuarios disponibles
                    </SelectItem>
                  ) : (
                    availableUsuarios.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nombre} {u.apellido} ({u.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={selectedRol} onValueChange={setSelectedRol}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar rol" />
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
            <Button onClick={handleAssignUser} disabled={submitting || !selectedUserId}>
              {submitting ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Esta acción no se puede deshacer. Se eliminará permanentemente{' '}
              <strong>{local.nombre}</strong> y todas sus áreas, sectores y unidades.
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
            <DialogTitle>Nueva Área</DialogTitle>
            <DialogDescription>
              Crea una nueva área en {local.nombre}.
            </DialogDescription>
          </DialogHeader>
          <AreaForm
            localProductivoId={localId}
            onSubmit={handleCreateArea}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
