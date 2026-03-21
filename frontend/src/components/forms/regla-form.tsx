'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import api from '@/lib/api';
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

const reglaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  unidadProduccionId: z.string().min(1, 'La unidad es requerida'),
  variable: z.string().min(1, 'La variable es requerida'),
  operador: z.enum(['MAYOR_QUE', 'MENOR_QUE', 'IGUAL_A', 'DIFERENTE_DE', 'FUERA_DE_RANGO']),
  compararCon: z.string().optional(),
  valorFijo: z.string().optional(),
  codigoEspecificacion: z.string().optional(),
  toleranciaPorcentaje: z.string().optional(),
  severidad: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  activa: z.boolean().optional(),
});

export type ReglaFormValues = z.infer<typeof reglaSchema>;

interface UnidadOption {
  id: string;
  nombre: string;
}

interface VariableOption {
  codigo: string;
  nombre: string;
  unidad?: string | null;
  tipo: string;
}

interface ReglaFormProps {
  defaultValues?: Partial<ReglaFormValues>;
  onSubmit: (values: ReglaFormValues) => void | Promise<void>;
  loading?: boolean;
  unidades?: UnidadOption[];
}

export function ReglaForm({
  defaultValues,
  onSubmit,
  loading = false,
  unidades = [],
}: ReglaFormProps) {
  const form = useForm<ReglaFormValues>({
    resolver: zodResolver(reglaSchema),
    defaultValues: {
      nombre: '',
      unidadProduccionId: '',
      variable: '',
      operador: '' as any,
      compararCon: '',
      valorFijo: '',
      codigoEspecificacion: '',
      toleranciaPorcentaje: '',
      severidad: '' as any,
      activa: true,
      ...defaultValues,
    },
  });

  const isEdit = !!defaultValues;

  const selectedUnidadId = form.watch('unidadProduccionId');
  const [availableVariables, setAvailableVariables] = useState<VariableOption[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(false);

  useEffect(() => {
    if (!selectedUnidadId) {
      setAvailableVariables([]);
      return;
    }

    let cancelled = false;

    const fetchVariables = async () => {
      setLoadingVariables(true);
      try {
        // Fetch the unit to get its tipoUnidadProduccionId
        const unidadRes = await api.get(`/api/unidades/${selectedUnidadId}`);
        const tipoId = unidadRes.data.tipoUnidadProduccionId;

        if (!tipoId) {
          if (!cancelled) setAvailableVariables([]);
          return;
        }

        // Fetch the tipo to get its variables
        const tipoRes = await api.get(`/api/tipos-unidad/${tipoId}`);
        const vars = tipoRes.data.variables;

        if (!cancelled && Array.isArray(vars)) {
          setAvailableVariables(
            vars.map((v: any) => ({
              codigo: v.codigo,
              nombre: v.nombre,
              unidad: v.unidad,
              tipo: v.tipo,
            })),
          );
        }
      } catch {
        if (!cancelled) setAvailableVariables([]);
      } finally {
        if (!cancelled) setLoadingVariables(false);
      }
    };

    fetchVariables();

    return () => {
      cancelled = true;
    };
  }, [selectedUnidadId]);

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
                <Input placeholder="Nombre de la regla" {...field} />
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
          name="variable"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Variable *</FormLabel>
              {availableVariables.length > 0 ? (
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingVariables ? 'Cargando variables...' : 'Seleccionar variable'} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {availableVariables.map((v) => (
                      <SelectItem key={v.codigo} value={v.codigo}>
                        {v.nombre} ({v.codigo}){v.unidad ? ` — ${v.unidad}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <FormControl>
                  <Input placeholder="Ej: velocidad, nivel, flujo_instantaneo" {...field} />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="operador"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operador *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar operador" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MAYOR_QUE">Mayor que</SelectItem>
                  <SelectItem value="MENOR_QUE">Menor que</SelectItem>
                  <SelectItem value="IGUAL_A">Igual a</SelectItem>
                  <SelectItem value="DIFERENTE_DE">Diferente de</SelectItem>
                  <SelectItem value="FUERA_DE_RANGO">Fuera de rango</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="compararCon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Comparar con</FormLabel>
              <FormControl>
                <Input placeholder="Ej: valor_fijo, especificacion" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valorFijo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor fijo</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="Valor numerico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="codigoEspecificacion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Codigo especificacion</FormLabel>
              <FormControl>
                <Input placeholder="Ej: voltaje_nominal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="toleranciaPorcentaje"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tolerancia (%)</FormLabel>
              <FormControl>
                <Input type="number" step="any" placeholder="Ej: 10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="severidad"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Severidad *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar severidad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="BAJA">Baja</SelectItem>
                  <SelectItem value="MEDIA">Media</SelectItem>
                  <SelectItem value="ALTA">Alta</SelectItem>
                  <SelectItem value="CRITICA">Critica</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading} className="w-full">
          {loading && <Loader2 className="animate-spin" />}
          {isEdit ? 'Actualizar' : 'Crear'} Regla
        </Button>
      </form>
    </Form>
  );
}
