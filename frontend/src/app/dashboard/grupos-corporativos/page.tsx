'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface GrupoCorporativo {
  id: string;
  razonSocial: string;
  tipoIndustria: string | null;
  direccion: string | null;
  ubicacionDomiciliaria: string | null;
  paginaWeb: string | null;
  createdAt: string;
  empresas?: { id: string; razonSocial: string }[];
}

interface GrupoFormData {
  razonSocial: string;
  tipoIndustria: string;
  direccion: string;
  ubicacionDomiciliaria: string;
  paginaWeb: string;
}

const emptyForm: GrupoFormData = {
  razonSocial: '',
  tipoIndustria: '',
  direccion: '',
  ubicacionDomiciliaria: '',
  paginaWeb: '',
};

export default function GruposCorporativosPage() {
  const router = useRouter();
  const [grupos, setGrupos] = useState<GrupoCorporativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<GrupoCorporativo | null>(null);
  const [deletingGrupo, setDeletingGrupo] = useState<GrupoCorporativo | null>(null);
  const [formData, setFormData] = useState<GrupoFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail panel
  const [selectedGrupo, setSelectedGrupo] = useState<GrupoCorporativo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function fetchGrupos() {
    try {
      setLoading(true);
      const res = await api.get('/api/grupos-corporativos');
      setGrupos(res.data.items);
    } catch {
      setError('Error al cargar grupos corporativos');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGrupoDetail(id: string) {
    try {
      setDetailLoading(true);
      const res = await api.get(`/api/grupos-corporativos/${id}`);
      setSelectedGrupo(res.data);
    } catch {
      setError('Error al cargar detalle del grupo');
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    fetchGrupos();
  }, []);

  function openCreateDialog() {
    setEditingGrupo(null);
    setFormData(emptyForm);
    setError(null);
    setDialogOpen(true);
  }

  function openEditDialog(grupo: GrupoCorporativo) {
    setEditingGrupo(grupo);
    setFormData({
      razonSocial: grupo.razonSocial,
      tipoIndustria: grupo.tipoIndustria ?? '',
      direccion: grupo.direccion ?? '',
      ubicacionDomiciliaria: grupo.ubicacionDomiciliaria ?? '',
      paginaWeb: grupo.paginaWeb ?? '',
    });
    setError(null);
    setDialogOpen(true);
  }

  function openDeleteDialog(grupo: GrupoCorporativo) {
    setDeletingGrupo(grupo);
    setDeleteDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.razonSocial.trim()) {
      setError('La razón social es requerida');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        razonSocial: formData.razonSocial.trim(),
        tipoIndustria: formData.tipoIndustria.trim() || undefined,
        direccion: formData.direccion.trim() || undefined,
        ubicacionDomiciliaria: formData.ubicacionDomiciliaria.trim() || undefined,
        paginaWeb: formData.paginaWeb.trim() || undefined,
      };

      if (editingGrupo) {
        await api.put(`/api/grupos-corporativos/${editingGrupo.id}`, payload);
      } else {
        await api.post('/api/grupos-corporativos', payload);
      }

      setDialogOpen(false);
      fetchGrupos();
    } catch {
      setError(editingGrupo ? 'Error al actualizar' : 'Error al crear');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingGrupo) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/grupos-corporativos/${deletingGrupo.id}`);
      setDeleteDialogOpen(false);
      setDeletingGrupo(null);
      if (selectedGrupo?.id === deletingGrupo.id) {
        setSelectedGrupo(null);
      }
      fetchGrupos();
    } catch {
      setError('Error al eliminar grupo corporativo');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<GrupoCorporativo>[] = [
    {
      id: 'razonSocial',
      header: 'Razón Social',
      accessorKey: 'razonSocial',
      sortable: true,
    },
    {
      id: 'tipoIndustria',
      header: 'Industria',
      accessorKey: 'tipoIndustria',
      sortable: true,
    },
    {
      id: 'direccion',
      header: 'Dirección',
      accessorKey: 'direccion',
    },
  ];

  const rowActions: RowAction<GrupoCorporativo>[] = [
    {
      label: 'Editar',
      icon: <Pencil className="size-4" />,
      onClick: (grupo) => openEditDialog(grupo),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (grupo) => openDeleteDialog(grupo),
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Grupos Corporativos</h2>
          <p className="text-muted-foreground mt-1">
            Administra los grupos corporativos del sistema
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nuevo Grupo
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Main content: table + detail panel */}
      <div className="flex gap-6">
        <div className={selectedGrupo ? 'flex-1 min-w-0' : 'w-full'}>
          <DataTable
            columns={columns}
            data={grupos}
            loading={loading}
            searchKey="razonSocial"
            searchPlaceholder="Buscar por razón social..."
            emptyMessage="No hay grupos corporativos registrados."
            rowActions={rowActions}
            onRowClick={(grupo) => fetchGrupoDetail(grupo.id)}
          />
        </div>

        {/* Detail panel */}
        {selectedGrupo && (
          <div className="w-80 shrink-0 rounded-lg border bg-card p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{selectedGrupo.razonSocial}</h3>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedGrupo(null)}
              >
                &times;
              </Button>
            </div>

            {detailLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : (
              <>
                <div className="space-y-2 text-sm">
                  {selectedGrupo.tipoIndustria && (
                    <div>
                      <span className="text-muted-foreground">Industria:</span>{' '}
                      {selectedGrupo.tipoIndustria}
                    </div>
                  )}
                  {selectedGrupo.direccion && (
                    <div>
                      <span className="text-muted-foreground">Dirección:</span>{' '}
                      {selectedGrupo.direccion}
                    </div>
                  )}
                  {selectedGrupo.paginaWeb && (
                    <div>
                      <span className="text-muted-foreground">Web:</span>{' '}
                      {selectedGrupo.paginaWeb}
                    </div>
                  )}
                </div>

                {/* Empresas list */}
                {selectedGrupo.empresas && selectedGrupo.empresas.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">
                      Empresas ({selectedGrupo.empresas.length})
                    </h4>
                    <div className="space-y-1">
                      {selectedGrupo.empresas.map((empresa) => (
                        <button
                          key={empresa.id}
                          className="block w-full text-left text-sm rounded-md px-2 py-1.5 hover:bg-accent transition-colors"
                          onClick={() => router.push(`/dashboard/empresas/${empresa.id}`)}
                        >
                          {empresa.razonSocial}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedGrupo.empresas && selectedGrupo.empresas.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No hay empresas en este grupo.
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGrupo ? 'Editar Grupo Corporativo' : 'Nuevo Grupo Corporativo'}
            </DialogTitle>
            <DialogDescription>
              {editingGrupo
                ? 'Modifica los datos del grupo corporativo.'
                : 'Ingresa los datos del nuevo grupo corporativo.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && dialogOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                placeholder="Ej: Corporación Acuícola S.A."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoIndustria">Tipo de Industria</Label>
              <Input
                id="tipoIndustria"
                value={formData.tipoIndustria}
                onChange={(e) => setFormData({ ...formData, tipoIndustria: e.target.value })}
                placeholder="Ej: Acuicultura"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                placeholder="Dirección del grupo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ubicacionDomiciliaria">Ubicación Domiciliaria</Label>
              <Input
                id="ubicacionDomiciliaria"
                value={formData.ubicacionDomiciliaria}
                onChange={(e) => setFormData({ ...formData, ubicacionDomiciliaria: e.target.value })}
                placeholder="Ciudad, País"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paginaWeb">Página Web</Label>
              <Input
                id="paginaWeb"
                value={formData.paginaWeb}
                onChange={(e) => setFormData({ ...formData, paginaWeb: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : editingGrupo ? 'Guardar Cambios' : 'Crear Grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Grupo Corporativo</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el grupo
              corporativo <strong>{deletingGrupo?.razonSocial}</strong>.
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
