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
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';

interface GrupoCorporativo {
  id: string;
  razonSocial: string;
  tipoIndustria: string | null;
  direccion: string | null;
  ubicacionDomiciliaria: string | null;
  paginaWeb: string | null;
  _count?: { empresas: number };
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

  async function fetchGrupos() {
    try {
      setLoading(true);
      const res = await api.get('/api/grupos-corporativos?limit=100');
      setGrupos(res.data.items);
    } catch {
      setError('Error al cargar grupos corporativos');
    } finally {
      setLoading(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.razonSocial.trim()) {
      setError('La razon social es requerida');
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
      setError(editingGrupo ? 'Error al actualizar grupo' : 'Error al crear grupo');
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
      fetchGrupos();
    } catch {
      setError('Error al eliminar grupo corporativo');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<GrupoCorporativo>[] = [
    { id: 'razonSocial', header: 'Razon Social', accessorKey: 'razonSocial', sortable: true },
    { id: 'tipoIndustria', header: 'Tipo de Industria', accessorKey: 'tipoIndustria' },
    { id: 'direccion', header: 'Direccion', accessorKey: 'direccion' },
    { id: 'empresas', header: 'Empresas', accessorFn: (row) => row._count?.empresas ?? 0, className: 'text-center' },
  ];

  const rowActions: RowAction<GrupoCorporativo>[] = [
    { label: 'Ver', icon: <Eye className="size-4" />, onClick: (grupo) => router.push(`/dashboard/grupos-corporativos/${grupo.id}`) },
    { label: 'Editar', icon: <Pencil className="size-4" />, onClick: (grupo) => openEditDialog(grupo) },
    { label: 'Eliminar', icon: <Trash2 className="size-4" />, onClick: (grupo) => { setDeletingGrupo(grupo); setDeleteDialogOpen(true); }, variant: 'destructive' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Grupos Corporativos</h2>
          <p className="text-muted-foreground mt-1">Administra los grupos que agrupan empresas</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          Nuevo Grupo
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <DataTable
        columns={columns}
        data={grupos}
        loading={loading}
        searchKey="razonSocial"
        searchPlaceholder="Buscar por razon social..."
        emptyMessage="No hay grupos corporativos registrados."
        rowActions={rowActions}
        onRowClick={(grupo) => router.push(`/dashboard/grupos-corporativos/${grupo.id}`)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGrupo ? 'Editar Grupo Corporativo' : 'Nuevo Grupo Corporativo'}</DialogTitle>
            <DialogDescription>{editingGrupo ? 'Modifica los datos del grupo.' : 'Ingresa los datos del nuevo grupo corporativo.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && dialogOpen && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
            )}
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razon Social *</Label>
              <Input id="razonSocial" value={formData.razonSocial} onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })} placeholder="Ej: Grupo Almar" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipoIndustria">Tipo de Industria</Label>
              <Input id="tipoIndustria" value={formData.tipoIndustria} onChange={(e) => setFormData({ ...formData, tipoIndustria: e.target.value })} placeholder="Ej: Acuicultura" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Direccion</Label>
              <Input id="direccion" value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} placeholder="Direccion de la oficina" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacionDomiciliaria">Ubicacion Domiciliaria</Label>
              <Input id="ubicacionDomiciliaria" value={formData.ubicacionDomiciliaria} onChange={(e) => setFormData({ ...formData, ubicacionDomiciliaria: e.target.value })} placeholder="Ciudad, Pais" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paginaWeb">Pagina Web</Label>
              <Input id="paginaWeb" value={formData.paginaWeb} onChange={(e) => setFormData({ ...formData, paginaWeb: e.target.value })} placeholder="https://..." />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : editingGrupo ? 'Guardar Cambios' : 'Crear Grupo'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Grupo Corporativo</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente <strong>{deletingGrupo?.razonSocial}</strong>. Las empresas asociadas no seran eliminadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={submitting}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>{submitting ? 'Eliminando...' : 'Eliminar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
