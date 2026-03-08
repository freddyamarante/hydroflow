'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const unidadSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  sectorId: z.string().min(1, 'El sector es requerido'),
  topicMqtt: z.string().optional(),
  dispositivoId: z.string().optional(),
});

export type UnidadFormValues = z.infer<typeof unidadSchema>;

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
  dispositivos?: DispositivoOption[];
}

export function UnidadForm({
  defaultValues,
  onSubmit,
  loading = false,
  sectores = [],
  sectorId,
  dispositivos = [],
}: UnidadFormProps) {
  const form = useForm<UnidadFormValues>({
    resolver: zodResolver(unidadSchema),
    defaultValues: {
      nombre: '',
      sectorId: sectorId ?? '',
      topicMqtt: '',
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

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Unidad de Produccion
        </Button>
      </form>
    </Form>
  );
}
