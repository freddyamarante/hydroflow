'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ChevronDown } from 'lucide-react';
import { PointEditor } from '@/components/maps/point-editor';

const unidadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  sectorId: z.string().min(1, 'El sector es requerido'),
  topicMqtt: z.string().optional(),
  posicion: z.any().optional(),
  dispositivoId: z.string().optional(),
});

export type UnidadFormValues = z.infer<typeof unidadSchema>;

/** Transforms form values to the API payload shape */
export function transformUnidadPayload(values: UnidadFormValues) {
  const payload: Record<string, unknown> = {
    nombre: values.nombre,
    sectorId: values.sectorId,
  };
  if (values.topicMqtt) payload.topicMqtt = values.topicMqtt;
  if (values.posicion) payload.posicion = values.posicion;
  if (values.dispositivoId) payload.dispositivoId = values.dispositivoId;
  return payload;
}

interface SectorOption {
  id: string;
  nombre: string;
}

interface DispositivoOption {
  id: string;
  codigo: string;
  tipoDispositivo: { codigo: string; nombre: string };
}

interface UnidadFormProps {
  defaultValues?: Partial<UnidadFormValues>;
  onSubmit: (values: UnidadFormValues) => void | Promise<void>;
  loading?: boolean;
  sectores?: SectorOption[];
  sectorId?: string;
  parentBounds?: GeoJSON.Polygon | null;
  dispositivos?: DispositivoOption[];
}

export function UnidadForm({
  defaultValues,
  onSubmit,
  loading = false,
  sectores = [],
  sectorId,
  parentBounds,
  dispositivos = [],
}: UnidadFormProps) {
  const [mapOpen, setMapOpen] = useState(!!defaultValues?.posicion);

  const form = useForm<UnidadFormValues>({
    resolver: zodResolver(unidadSchema),
    defaultValues: {
      nombre: '',
      sectorId: sectorId ?? '',
      topicMqtt: '',
      posicion: undefined,
      dispositivoId: '',
      ...defaultValues,
    },
  });

  const isEdit = !!defaultValues;
  const selectedDispositivoId = form.watch('dispositivoId');
  const hasDispositivo = !!selectedDispositivoId;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nombre"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre de la unidad de produccion" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!sectorId && sectores.length > 0 && (
          <FormField
            control={form.control}
            name="sectorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sector *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar sector" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sectores.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {dispositivos.length > 0 && (
          <FormField
            control={form.control}
            name="dispositivoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dispositivo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar dispositivo (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {dispositivos.map((disp) => (
                      <SelectItem key={disp.id} value={disp.id}>
                        {disp.codigo} ({disp.tipoDispositivo.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {hasDispositivo && (
                  <FormDescription>
                    El topic MQTT sera generado automaticamente
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {!hasDispositivo && (
          <FormField
            control={form.control}
            name="topicMqtt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Topic MQTT</FormLabel>
                <FormControl>
                  <Input
                    placeholder="hydroflow/local/area/sector/unidad_id"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Formato: hydroflow/local/area/sector/unidad_id. Dejar vacio si se selecciona un dispositivo.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Map section - collapsible */}
        <div className="border rounded-md">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
            onClick={() => setMapOpen(!mapOpen)}
          >
            <span>Ubicacion en Mapa (opcional)</span>
            <ChevronDown
              className={`size-4 transition-transform ${mapOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {mapOpen && (
            <div className="px-4 pb-4">
              <FormField
                control={form.control}
                name="posicion"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PointEditor
                        value={field.value as { lat: number; lng: number } | null | undefined}
                        onChange={field.onChange}
                        parentBounds={parentBounds}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Unidad de Produccion
        </Button>
      </form>
    </Form>
  );
}
