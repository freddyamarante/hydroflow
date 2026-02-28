'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { StatsCard } from '@/components/dashboard/stats-card';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { EmpresaForm, EmpresaFormValues } from '@/components/forms/empresa-form';
import { LocalForm, LocalFormValues } from '@/components/forms/local-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MapPin,
  Map,
  Layers,
  Box,
  Users,
  Pencil,
  Trash2,
  Plus,
  Eye,
} from 'lucide-react';

interface EmpresaDashboard {
  empresa: {
    id: string;
    razonSocial: string;
    marcaComercial: string | null;
    ruc: string | null;
    actividadEconomica: string | null;
    telefono: string | null;
    direccion: string | null;
    ubicacionDomiciliaria: string | null;
    areaProduccion: string | null;
    paginaWeb: string | null;
    grupoCorporativoId: string | null;
  };
  stats: {
    totalLocales: number;
    totalAreas: number;
    totalSectores: number;
    totalUnidades: number;
    totalUsuarios: number;
  };
  locales: {
    id: string;
    nombre: string;
    tipoProductivo: string | null;
    areaProduccion: string | null;
  }[];
  usuarios: {
    id: string;
    nombre: string;
    apellido: string | null;
    email: string;
    rol: string;
  }[];
}

export default function EmpresaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const empresaId = params.id as string;

  const [data, setData] = useState<EmpresaDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [localDialogOpen, setLocalDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Assign usuario state
  const [allUsers, setAllUsers] = useState<
    { id: string; nombre: string; apellido: string | null; email: string }[]
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/empresas/${empresaId}/dashboard`);
      setData(res.data);
    } catch {
      setError('Error al cargar los datos de la empresa');
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  async function handleEditSubmit(values: EmpresaFormValues) {
    try {
      setSubmitting(true);
      await api.put(`/api/empresas/${empresaId}`, values);
      setEditDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al actualizar la empresa');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    try {
      setSubmitting(true);
      await api.delete(`/api/empresas/${empresaId}`);
      router.push('/dashboard/empresas');
    } catch {
      setError('Error al eliminar la empresa');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateLocal(values: LocalFormValues) {
    try {
      setSubmitting(true);
      await api.post('/api/locales', { ...values, empresaId });
      setLocalDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al crear el local productivo');
    } finally {
      setSubmitting(false);
    }
  }

  async function fetchAvailableUsers() {
    try {
      setLoadingUsers(true);
      const res = await api.get('/api/usuarios?limit=100');
      setAllUsers(res.data.data ?? res.data);
    } catch {
      setError('Error al cargar los usuarios disponibles');
    } finally {
      setLoadingUsers(false);
    }
  }

  function handleOpenAssignDialog() {
    setUserSearch('');
    setAssignDialogOpen(true);
    fetchAvailableUsers();
  }

  async function handleAssignUser(userId: string) {
    try {
      setSubmitting(true);
      await api.post(`/api/empresas/${empresaId}/usuarios`, { usuarioId: userId });
      setAssignDialogOpen(false);
      fetchDashboard();
    } catch {
      setError('Error al asignar el usuario a la empresa');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnlinkUser(userId: string) {
    try {
      setSubmitting(true);
      await api.delete(`/api/empresas/${empresaId}/usuarios/${userId}`);
      fetchDashboard();
    } catch {
      setError('Error al desvincular el usuario de la empresa');
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

  const { empresa, stats, locales, usuarios } = data;

  const localColumns: ColumnDef<(typeof locales)[0]>[] = [
    { id: 'nombre', header: 'Nombre', accessorKey: 'nombre', sortable: true },
    { id: 'tipoProductivo', header: 'Tipo', accessorKey: 'tipoProductivo' },
    { id: 'areaProduccion', header: 'Área de Producción', accessorKey: 'areaProduccion' },
  ];

  const localActions: RowAction<(typeof locales)[0]>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (local) => router.push(`/dashboard/empresas/${empresaId}/locales/${local.id}`),
    },
  ];

  const usuarioColumns: ColumnDef<(typeof usuarios)[0]>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      accessorFn: (row) => `${row.nombre} ${row.apellido ?? ''}`.trim(),
      sortable: true,
    },
    { id: 'email', header: 'Email', accessorKey: 'email' },
    { id: 'rol', header: 'Rol', accessorKey: 'rol' },
  ];

  const usuarioActions: RowAction<(typeof usuarios)[0]>[] = [
    {
      label: 'Desvincular',
      icon: <Trash2 className="size-4" />,
      variant: 'destructive',
      onClick: (usuario) => handleUnlinkUser(usuario.id),
    },
  ];

  const infoFields = [
    { label: 'Razón Social', value: empresa.razonSocial },
    { label: 'Marca Comercial', value: empresa.marcaComercial },
    { label: 'RUC', value: empresa.ruc },
    { label: 'Actividad Económica', value: empresa.actividadEconomica },
    { label: 'Teléfono', value: empresa.telefono },
    { label: 'Dirección', value: empresa.direccion },
    { label: 'Ubicación', value: empresa.ubicacionDomiciliaria },
    { label: 'Área de Producción', value: empresa.areaProduccion },
    { label: 'Página Web', value: empresa.paginaWeb },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Breadcrumbs
            items={[
              { label: 'Empresas', href: '/dashboard/empresas' },
              { label: empresa.razonSocial, href: `/dashboard/empresas/${empresaId}` },
            ]}
          />
          <h2 className="text-3xl font-bold">{empresa.razonSocial}</h2>
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
      <StatsGrid>
        <StatsCard icon={MapPin} label="Locales" value={stats.totalLocales} />
        <StatsCard icon={Map} label="Áreas" value={stats.totalAreas} />
        <StatsCard icon={Layers} label="Sectores" value={stats.totalSectores} />
        <StatsCard icon={Box} label="Unidades" value={stats.totalUnidades} />
      </StatsGrid>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
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

      {/* Locales Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Locales Productivos</h3>
          <Button onClick={() => setLocalDialogOpen(true)}>
            <Plus className="size-4" />
            Nuevo Local
          </Button>
        </div>
        <DataTable
          columns={localColumns}
          data={locales}
          searchKey="nombre"
          searchPlaceholder="Buscar locales..."
          emptyMessage="No hay locales productivos registrados."
          rowActions={localActions}
          onRowClick={(local) =>
            router.push(`/dashboard/empresas/${empresaId}/locales/${local.id}`)
          }
        />
      </div>

      {/* Usuarios Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            Usuarios ({stats.totalUsuarios})
          </h3>
          <Button onClick={handleOpenAssignDialog}>
            <Plus className="size-4" />
            Asignar Usuario
          </Button>
        </div>
        <DataTable
          columns={usuarioColumns}
          data={usuarios}
          searchKey="email"
          searchPlaceholder="Buscar usuarios..."
          emptyMessage="No hay usuarios vinculados a esta empresa."
          rowActions={usuarioActions}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>Modifica los datos de la empresa.</DialogDescription>
          </DialogHeader>
          <EmpresaForm
            defaultValues={{
              razonSocial: empresa.razonSocial,
              marcaComercial: empresa.marcaComercial ?? '',
              ruc: empresa.ruc ?? '',
              actividadEconomica: empresa.actividadEconomica ?? '',
              telefono: empresa.telefono ?? '',
              direccion: empresa.direccion ?? '',
              ubicacionDomiciliaria: empresa.ubicacionDomiciliaria ?? '',
              areaProduccion: empresa.areaProduccion ?? '',
              paginaWeb: empresa.paginaWeb ?? '',
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
            <DialogTitle>Eliminar Empresa</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente{' '}
              <strong>{empresa.razonSocial}</strong> y todos sus locales, áreas,
              sectores y unidades asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Local Dialog */}
      <Dialog open={localDialogOpen} onOpenChange={setLocalDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Local Productivo</DialogTitle>
            <DialogDescription>
              Crea un nuevo local productivo para {empresa.razonSocial}.
            </DialogDescription>
          </DialogHeader>
          <LocalForm
            empresaId={empresaId}
            onSubmit={handleCreateLocal}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Assign Usuario Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Usuario</DialogTitle>
            <DialogDescription>
              Selecciona un usuario para vincularlo a {empresa.razonSocial}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Buscar por nombre o email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            {loadingUsers ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Cargando usuarios...
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {(() => {
                  const linkedIds = new Set(usuarios.map((u) => u.id));
                  const searchLower = userSearch.toLowerCase();
                  const available = allUsers
                    .filter((u) => !linkedIds.has(u.id))
                    .filter(
                      (u) =>
                        !userSearch ||
                        u.nombre.toLowerCase().includes(searchLower) ||
                        (u.apellido ?? '').toLowerCase().includes(searchLower) ||
                        u.email.toLowerCase().includes(searchLower)
                    );

                  if (available.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay usuarios disponibles para asignar.
                      </p>
                    );
                  }

                  return available.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      disabled={submitting}
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                      onClick={() => handleAssignUser(user.id)}
                    >
                      <div className="text-left">
                        <p className="font-medium">
                          {user.nombre} {user.apellido ?? ''}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {user.email}
                        </p>
                      </div>
                      <Plus className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAssignDialogOpen(false)}
              disabled={submitting}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
