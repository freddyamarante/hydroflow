'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { DispositivoForm, DispositivoFormValues } from '@/components/forms/dispositivo-form';
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
import { Plus, Trash2, Eye } from 'lucide-react';

interface TipoDispositivo {
  id: string;
  codigo: string;
  nombre: string;
}

interface Dispositivo {
  id: string;
  codigo: string;
  tipoDispositivo: TipoDispositivo;
  areaActividad: string;
  asignado: boolean;
  localProductivo?: { id: string; nombre: string };
  createdAt: string;
}

interface Local {
  id: string;
  nombre: string;
}

const AREA_LABELS: Record<string, string> = {
  AIREACION_MECANICA: 'Aireacion Mecanica',
  AIREACION_ELECTRICA: 'Aireacion Electrica',
  ESTACION_DE_BOMBEO: 'Estacion de Bombeo',
};

export default function DispositivosPage() {
  const router = useRouter();
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [tiposDispositivo, setTiposDispositivo] = useState<TipoDispositivo[]>([]);
  const [locales, setLocales] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDispositivo, setDeletingDispositivo] = useState<Dispositivo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const [dispRes, tiposRes, localesRes] = await Promise.all([
        api.get('/api/dispositivos?limit=100'),
        api.get('/api/tipos-dispositivo'),
        api.get('/api/locales?limit=100'),
      ]);
      setDispositivos(dispRes.data.items);
      setTiposDispositivo(tiposRes.data);
      setLocales(localesRes.data.items);
    } catch {
      setError('Error al cargar dispositivos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(values: DispositivoFormValues) {
    try {
      setSubmitting(true);
      setError(null);
      await api.post('/api/dispositivos', values);
      setDialogOpen(false);
      fetchData();
    } catch {
      setError('Error al crear dispositivo');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deletingDispositivo) return;
    try {
      setSubmitting(true);
      await api.delete(`/api/dispositivos/${deletingDispositivo.id}`);
      setDeleteDialogOpen(false);
      setDeletingDispositivo(null);
      fetchData();
    } catch {
      setError('Error al eliminar dispositivo');
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<Dispositivo>[] = [
    { id: 'codigo', header: 'Codigo', accessorKey: 'codigo', sortable: true },
    {
      id: 'tipo',
      header: 'Tipo',
      accessorFn: (row) => (
        <Badge variant="outline">{row.tipoDispositivo.codigo}</Badge>
      ),
    },
    {
      id: 'areaActividad',
      header: 'Area Actividad',
      accessorFn: (row) => AREA_LABELS[row.areaActividad] ?? row.areaActividad,
      sortable: true,
    },
    {
      id: 'asignado',
      header: 'Estado',
      accessorFn: (row) => (
        <Badge variant={row.asignado ? 'default' : 'secondary'}>
          {row.asignado ? 'Asignado' : 'Disponible'}
        </Badge>
      ),
    },
    {
      id: 'local',
      header: 'Local Productivo',
      accessorFn: (row) => row.localProductivo?.nombre ?? '-',
    },
  ];

  const rowActions: RowAction<Dispositivo>[] = [
    {
      label: 'Ver',
      icon: <Eye className="size-4" />,
      onClick: (disp) => router.push(`/dashboard/dispositivos/${disp.id}`),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 className="size-4" />,
      onClick: (disp) => {
        if (disp.asignado) {
          setError('No se puede eliminar un dispositivo asignado. Desasignelo primero.');
          return;
        }
        setDeletingDispositivo(disp);
        setDeleteDialogOpen(true);
      },
      variant: 'destructive',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Dispositivos</h2>
          <p className="text-muted-foreground mt-1">
            Administra los dispositivos PLC y Nodos IOT
          </p>
        </div>
        <Button onClick={() => { setError(null); setDialogOpen(true); }}>
          <Plus className="size-4" />
          Nuevo Dispositivo
        </Button>
      </div>

      {error && !dialogOpen && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <DataTable
        columns={columns}
        data={dispositivos}
        loading={loading}
        searchKey="codigo"
        searchPlaceholder="Buscar por codigo..."
        emptyMessage="No hay dispositivos registrados."
        rowActions={rowActions}
        onRowClick={(disp) => router.push(`/dashboard/dispositivos/${disp.id}`)}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Dispositivo</DialogTitle>
            <DialogDescription>
              El codigo sera generado automaticamente.
            </DialogDescription>
          </DialogHeader>
          {error && dialogOpen && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <DispositivoForm
            onSubmit={handleSubmit}
            loading={submitting}
            tiposDispositivo={tiposDispositivo}
            locales={locales}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Dispositivo</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el dispositivo{' '}
              <strong>{deletingDispositivo?.codigo}</strong>.
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
