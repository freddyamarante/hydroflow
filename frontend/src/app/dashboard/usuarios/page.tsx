'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { UsuarioForm, UsuarioFormValues } from '@/components/forms/usuario-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string | null;
  telefono: string | null;
  empresaId: string | null;
  rol: 'ADMIN' | 'USER';
  esAdminEmpresa: boolean;
  createdAt: string;
}

interface Empresa {
  id: string;
  razonSocial: string;
}

const rolBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  ADMIN: 'default',
  USER: 'outline',
};

const rolLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuario',
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [deletingUsuario, setDeletingUsuario] = useState<Usuario | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [usuariosRes, empresasRes] = await Promise.all([
        api.get('/api/usuarios'),
        api.get('/api/empresas?limit=100'),
      ]);
      setUsuarios(usuariosRes.data.items);
      setEmpresas(empresasRes.data.items);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openCreateDialog() {
    setEditingUsuario(null);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(usuario: Usuario) {
    setEditingUsuario(usuario);
    setError(null);
    setDialogOpen(true);
  }

  function openDeleteDialog(usuario: Usuario) {
    setDeletingUsuario(usuario);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(values: UsuarioFormValues) {
    try {
      setSubmitting(true);
      setError(null);

      const payload: Record<string, unknown> = {
        email: values.email,
        nombre: values.nombre,
        apellido: values.apellido || undefined,
        telefono: values.telefono || undefined,
        rol: values.rol,
        empresaId: values.empresaId || undefined,
      };

      if (values.password) {
        payload.contrasena = values.password;
      }

      if (editingUsuario) {
        await api.put(`/api/usuarios/${editingUsuario.id}`, payload);
      } else {
        await api.post('/api/usuarios', payload);
      }

      setDialogOpen(false);
      fetchData();
    } catch {
      setError(editingUsuario ? 'Error al actualizar usuario' : 'Error al crear usuario');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingUsuario) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/usuarios/${deletingUsuario.id}`);
      setDeleteDialogOpen(false);
      setDeletingUsuario(null);
      fetchData();
    } catch {
      setError('Error al eliminar usuario');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Usuario>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      accessorFn: (row) => `${row.nombre} ${row.apellido ?? ''}`.trim(),
      sortable: true,
    },
    { id: 'email', header: 'Email', accessorKey: 'email', sortable: true },
    {
      id: 'rol',
      header: 'Rol',
      accessorFn: (row) => (
        <Badge variant={rolBadgeVariant[row.rol] ?? 'outline'}>
          {rolLabel[row.rol] ?? row.rol}
        </Badge>
      ),
    },
    {
      id: 'empresa',
      header: 'Empresa',
      accessorFn: (row) => {
        if (!row.empresaId) return '-';
        const empresa = empresas.find((e) => e.id === row.empresaId);
        return empresa?.razonSocial ?? '-';
      },
    },
  ];

  const rowActions: RowAction<Usuario>[] = [
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (usuario) => openEditDialog(usuario),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (usuario) => openDeleteDialog(usuario),
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Usuarios</h2>
          <p className="text-muted-foreground mt-1">
            Administra los usuarios del sistema
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nuevo Usuario
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={usuarios}
        loading={loading}
        searchKey="email"
        searchPlaceholder="Buscar por email..."
        emptyMessage="No hay usuarios registrados."
        rowActions={rowActions}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {editingUsuario
                ? 'Modifica los datos del usuario.'
                : 'Ingresa los datos del nuevo usuario.'}
            </DialogDescription>
          </DialogHeader>
          {error && dialogOpen && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <UsuarioForm
            defaultValues={
              editingUsuario
                ? {
                    email: editingUsuario.email,
                    nombre: editingUsuario.nombre,
                    apellido: editingUsuario.apellido ?? '',
                    telefono: editingUsuario.telefono ?? '',
                    rol: editingUsuario.rol,
                    empresaId: editingUsuario.empresaId ?? '',
                    password: '',
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            loading={submitting}
            empresas={empresas}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Usuario</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente al usuario{' '}
              <strong>
                {deletingUsuario?.nombre} {deletingUsuario?.apellido ?? ''}
              </strong>{' '}
              ({deletingUsuario?.email}).
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
    </div>
  );
}
