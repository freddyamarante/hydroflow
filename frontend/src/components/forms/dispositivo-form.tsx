'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { Loader2 } from 'lucide-react';

const AREA_ACTIVIDAD_OPTIONS = [
  { value: 'AIREACION_MECANICA', label: 'Aireacion Mecanica' },
  { value: 'AIREACION_ELECTRICA', label: 'Aireacion Electrica' },
  { value: 'ESTACION_DE_BOMBEO', label: 'Estacion de Bombeo' },
];

const dispositivoSchema = z.object({
  tipoDispositivoId: z.string().min(1, 'El tipo de dispositivo es requerido'),
  areaActividad: z.string().min(1, 'El area de actividad es requerida'),
  localProductivoId: z.string().min(1, 'El local productivo es requerido'),
});

export type DispositivoFormValues = z.infer<typeof dispositivoSchema>;

interface TipoDispositivoOption {
  id: string;
  codigo: string;
  nombre: string;
}

interface LocalOption {
  id: string;
  nombre: string;
}

interface DispositivoFormProps {
  defaultValues?: Partial<DispositivoFormValues>;
  onSubmit: (values: DispositivoFormValues) => void | Promise<void>;
  loading?: boolean;
  tiposDispositivo?: TipoDispositivoOption[];
  locales?: LocalOption[];
  localProductivoId?: string;
}

export function DispositivoForm({
  defaultValues,
  onSubmit,
  loading = false,
  tiposDispositivo = [],
  locales = [],
  localProductivoId,
}: DispositivoFormProps) {
  const form = useForm<DispositivoFormValues>({
    resolver: zodResolver(dispositivoSchema),
    defaultValues: {
      tipoDispositivoId: '',
      areaActividad: '',
      localProductivoId: localProductivoId ?? '',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="tipoDispositivoId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Dispositivo *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tiposDispositivo.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.codigo} - {tipo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="areaActividad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area de Actividad *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar area" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AREA_ACTIVIDAD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {!localProductivoId && locales.length > 0 && (
          <FormField
            control={form.control}
            name="localProductivoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local Productivo *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar local productivo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {locales.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          Crear Dispositivo
        </Button>
      </form>
    </Form>
  );
}
