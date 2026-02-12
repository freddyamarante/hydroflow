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
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

const localSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipoProductivo: z.string().optional(),
  empresaId: z.string().min(1, 'La empresa es requerida'),
  areaProduccion: z.string().optional(),
  direccion: z.string().optional(),
  ubicacionDomiciliaria: z.string().optional(),
});

export type LocalFormValues = z.infer<typeof localSchema>;

interface EmpresaOption {
  id: string;
  razonSocial: string;
}

interface LocalFormProps {
  defaultValues?: Partial<LocalFormValues>;
  onSubmit: (values: LocalFormValues) => void | Promise<void>;
  loading?: boolean;
  empresas?: EmpresaOption[];
  empresaId?: string;
}

export function LocalForm({
  defaultValues,
  onSubmit,
  loading = false,
  empresas = [],
  empresaId,
}: LocalFormProps) {
  const form = useForm<LocalFormValues>({
    resolver: zodResolver(localSchema),
    defaultValues: {
      nombre: '',
      tipoProductivo: '',
      empresaId: empresaId ?? '',
      areaProduccion: '',
      direccion: '',
      ubicacionDomiciliaria: '',
      ...defaultValues,
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
                <Input placeholder="Nombre del local productivo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tipoProductivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Productivo</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="finca">Finca</SelectItem>
                  <SelectItem value="laboratorio">Laboratorio</SelectItem>
                  <SelectItem value="planta_procesamiento">Planta de Procesamiento</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {!empresaId && empresas.length > 0 && (
          <FormField
            control={form.control}
            name="empresaId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empresa" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {empresas.map((empresa) => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.razonSocial}
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
          name="areaProduccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area de Produccion</FormLabel>
              <FormControl>
                <Input placeholder="Ej: 200 hectareas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="direccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Direccion</FormLabel>
              <FormControl>
                <Input placeholder="Direccion" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ubicacionDomiciliaria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ubicacion Domiciliaria</FormLabel>
              <FormControl>
                <Input placeholder="Ciudad, Provincia, Pais" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Local Productivo
        </Button>
      </form>
    </Form>
  );
}
