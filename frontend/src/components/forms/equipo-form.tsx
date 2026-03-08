'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const equipoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.string().min(1, 'El tipo es requerido'),
  marca: z.string().optional().transform(v => v || undefined),
  modelo: z.string().optional().transform(v => v || undefined),
  especificaciones: z.string().optional().transform(v => {
    if (!v) return undefined;
    try { return JSON.parse(v); } catch { return undefined; }
  }),
  unidadProduccionId: z.string().min(1, 'La unidad es requerida'),
});

export type EquipoFormValues = z.infer<typeof equipoSchema>;

interface UnidadOption {
  id: string;
  nombre: string;
}

interface EquipoFormProps {
  defaultValues?: Partial<EquipoFormValues & { especificaciones: any }>;
  onSubmit: (values: EquipoFormValues) => void | Promise<void>;
  loading?: boolean;
  unidades?: UnidadOption[];
}

export function EquipoForm({
  defaultValues,
  onSubmit,
  loading = false,
  unidades = [],
}: EquipoFormProps) {
  const form = useForm<z.input<typeof equipoSchema>>({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      nombre: '',
      tipo: '',
      marca: '',
      modelo: '',
      especificaciones: defaultValues?.especificaciones
        ? JSON.stringify(defaultValues.especificaciones, null, 2)
        : '',
      unidadProduccionId: '',
      ...defaultValues,
      ...(defaultValues?.especificaciones
        ? { especificaciones: JSON.stringify(defaultValues.especificaciones, null, 2) }
        : {}),
    },
  });

  const isEdit = !!defaultValues;

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
                <Input placeholder="Nombre del equipo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="bomba">Bomba</SelectItem>
                  <SelectItem value="motor">Motor</SelectItem>
                  <SelectItem value="reductor">Reductor</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marca"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca</FormLabel>
              <FormControl>
                <Input placeholder="Marca del equipo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="modelo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <FormControl>
                <Input placeholder="Modelo del equipo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {unidades.length > 0 && (
          <FormField
            control={form.control}
            name="unidadProduccionId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad de Produccion *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar unidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {unidades.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="especificaciones"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Especificaciones (JSON)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='{"voltaje_nominal": 440, "corriente_nominal": 28}'
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Equipo
        </Button>
      </form>
    </Form>
  );
}
