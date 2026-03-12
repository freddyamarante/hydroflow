'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DataTable, ColumnDef, RowAction } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle } from 'lucide-react';

interface Alerta {
  id: string;
  mensaje: string;
  severidad: string;
  resuelta: boolean;
  resueltaEn: string | null;
  resueltaPor: string | null;
  creadaEn: string;
  unidadProduccionId: string;
  unidadProduccion?: { id: string; nombre: string };
}

const severidadColors: Record<string, string> = {
  BAJA: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  MEDIA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  ALTA: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  CRITICA: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severidadFilter, setSeveridadFilter] = useState<string>('all');
  const [resueltaFilter, setResueltaFilter] = useState<string>('all');

  async function fetchData() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (severidadFilter !== 'all') params.set('severidad', severidadFilter);
      if (resueltaFilter !== 'all') params.set('resuelta', resueltaFilter);

      const res = await api.get(`/api/alertas?${params.toString()}`);
      setAlertas(res.data.items);
    } catch {
      setError('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [severidadFilter, resueltaFilter]);

  async function handleResolve(alerta: Alerta) {
    if (alerta.resuelta) return;
    try {
      await api.patch(`/api/alertas/${alerta.id}/resolver`);
      fetchData();
    } catch {
      setError('Error al resolver alerta');
    }
  }

  const columns: ColumnDef<Alerta>[] = [
    { id: 'mensaje', header: 'Mensaje', accessorKey: 'mensaje', sortable: true },
    {
      id: 'severidad',
      header: 'Severidad',
      accessorFn: (row) => row.severidad,
      cell: (row) => (
        <Badge className={severidadColors[row.severidad] ?? ''}>
          {row.severidad}
        </Badge>
      ),
    },
    {
      id: 'unidad',
      header: 'Unidad',
      accessorFn: (row) => row.unidadProduccion?.nombre ?? '-',
    },
    {
      id: 'resuelta',
      header: 'Estado',
      accessorFn: (row) => (row.resuelta ? 'Resuelta' : 'Pendiente'),
      cell: (row) => (
        <Badge variant={row.resuelta ? 'secondary' : 'destructive'}>
          {row.resuelta ? 'Resuelta' : 'Pendiente'}
        </Badge>
      ),
    },
    {
      id: 'creadaEn',
      header: 'Creada',
      accessorFn: (row) => new Date(row.creadaEn).toLocaleString(),
      sortable: true,
    },
    {
      id: 'resueltaEn',
      header: 'Resuelta en',
      accessorFn: (row) => row.resueltaEn ? new Date(row.resueltaEn).toLocaleString() : '-',
    },
  ];

  const rowActions: RowAction<Alerta>[] = [
    {
      label: 'Resolver',
      icon: <CheckCircle className="size-4" />,
      onClick: (alerta) => handleResolve(alerta),
      hidden: (alerta) => alerta.resuelta,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Alertas</h2>
          <p className="text-muted-foreground mt-1">
            Visualiza y gestiona las alertas del sistema
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Select value={severidadFilter} onValueChange={setSeveridadFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por severidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las severidades</SelectItem>
            <SelectItem value="BAJA">Baja</SelectItem>
            <SelectItem value="MEDIA">Media</SelectItem>
            <SelectItem value="ALTA">Alta</SelectItem>
            <SelectItem value="CRITICA">Critica</SelectItem>
          </SelectContent>
        </Select>

        <Select value={resueltaFilter} onValueChange={setResueltaFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="false">Pendientes</SelectItem>
            <SelectItem value="true">Resueltas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={alertas}
        loading={loading}
        searchKey="mensaje"
        searchPlaceholder="Buscar por mensaje..."
        emptyMessage="No hay alertas registradas."
        rowActions={rowActions}
      />
    </div>
  );
}
