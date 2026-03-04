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

const empresaSchema = z.object({
  razonSocial: z.string().min(1, 'La razon social es requerida'),
  marcaComercial: z.string().optional(),
  ruc: z.string().optional(),
  actividadEconomica: z.string().optional(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  ubicacionDomiciliaria: z.string().optional(),
  areaProduccion: z.string().optional(),
  paginaWeb: z.string().optional(),
  grupoCorporativoId: z.string().optional().transform(v => (!v || v === '__none__') ? undefined : v),
});

export type EmpresaFormValues = z.infer<typeof empresaSchema>;

interface GrupoCorporativoOption {
  id: string;
  razonSocial: string;
}

interface EmpresaFormProps {
  defaultValues?: Partial<EmpresaFormValues>;
  onSubmit: (values: EmpresaFormValues) => void | Promise<void>;
  loading?: boolean;
  gruposCorporativos?: GrupoCorporativoOption[];
}

export function EmpresaForm({
  defaultValues,
  onSubmit,
  loading = false,
  gruposCorporativos = [],
}: EmpresaFormProps) {
  const form = useForm<EmpresaFormValues>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      razonSocial: '',
      marcaComercial: '',
      ruc: '',
      actividadEconomica: '',
      telefono: '',
      direccion: '',
      ubicacionDomiciliaria: '',
      areaProduccion: '',
      paginaWeb: '',
      grupoCorporativoId: '',
      ...defaultValues,
    },
  });

  const isEdit = !!defaultValues;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="razonSocial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razon Social *</FormLabel>
              <FormControl>
                <Input placeholder="Nombre de la empresa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="marcaComercial"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca Comercial</FormLabel>
              <FormControl>
                <Input placeholder="Marca comercial" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="ruc"
            render={({ field }) => (
              <FormItem>
                <FormLabel>RUC</FormLabel>
                <FormControl>
                  <Input placeholder="RUC" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="telefono"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefono</FormLabel>
                <FormControl>
                  <Input placeholder="Telefono" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="actividadEconomica"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Actividad Economica</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Acuicultura" {...field} />
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

        <FormField
          control={form.control}
          name="areaProduccion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Area de Produccion</FormLabel>
              <FormControl>
                <Input placeholder="Ej: 500 hectareas" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paginaWeb"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pagina Web</FormLabel>
              <FormControl>
                <Input placeholder="https://ejemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {gruposCorporativos.length > 0 && (
          <FormField
            control={form.control}
            name="grupoCorporativoId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grupo Corporativo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar grupo corporativo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguno</SelectItem>
                    {gruposCorporativos.map((grupo) => (
                      <SelectItem key={grupo.id} value={grupo.id}>
                        {grupo.razonSocial}
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
          {isEdit ? 'Actualizar' : 'Crear'} Empresa
        </Button>
      </form>
    </Form>
  );
}
