import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, differenceInDays } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMedicamentos, useMedicamentoWithPriority } from "@/hooks/useMedicamentos";
import { useSedes } from "@/hooks/useSedes";
import { PriorityBadge } from "@/components/medicamentos/PriorityBadge";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formSchema = z.object({
  id_medicamento: z.number({ required_error: "Seleccione un medicamento" }),
  id_sede: z.number({ required_error: "Seleccione una sede" }),
  cantidad: z.number().min(1, "La cantidad debe ser mayor a 0"),
  lote: z.string().min(1, "El lote es obligatorio").max(50),
  fecha_vencimiento: z.date({ required_error: "Seleccione la fecha de vencimiento" }),
  proveedor: z.string().max(100).optional(),
  precio_unitario: z.number().min(0).optional(),
  observaciones: z.string().max(500).optional(),
});

type FormData = z.infer<typeof formSchema>;

const Entradas = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState<number | null>(null);
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null);

  const { data: medicamentos } = useMedicamentos();
  const { data: sedes } = useSedes();
  const { data: medWithPriority } = useMedicamentoWithPriority(selectedMedId);

  const { data: recentEntradas } = useQuery({
    queryKey: ["recent-entradas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movimientos")
        .select(`
          id,
          fecha_movimiento,
          lote,
          cantidad,
          observaciones,
          medicamentos (nombre, concentracion, presentacion),
          sedes (nombre),
          usuarios (nombre_completo)
        `)
        .eq("tipo", "entrada")
        .gte("fecha_movimiento", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order("fecha_movimiento", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user");

      // Step 1: Create movement
      const { error: movError } = await supabase.from("movimientos").insert({
        tipo: "entrada",
        id_medicamento: data.id_medicamento,
        id_sede: data.id_sede,
        cantidad: data.cantidad,
        lote: data.lote,
        id_usuario: user.id,
        observaciones: data.observaciones,
      });

      if (movError) throw movError;

      // Step 2: Check if inventory exists
      const { data: existingInv } = await supabase
        .from("inventario")
        .select("id, cantidad_actual")
        .eq("id_medicamento", data.id_medicamento)
        .eq("id_sede", data.id_sede)
        .eq("lote", data.lote)
        .maybeSingle();

      if (existingInv) {
        // Update existing
        const { error: updateError } = await supabase
          .from("inventario")
          .update({
            cantidad_actual: existingInv.cantidad_actual + data.cantidad,
          })
          .eq("id", existingInv.id);

        if (updateError) throw updateError;
      } else {
        // Create new
        const { error: insertError } = await supabase.from("inventario").insert({
          id_medicamento: data.id_medicamento,
          id_sede: data.id_sede,
          lote: data.lote,
          cantidad_actual: data.cantidad,
          fecha_vencimiento: format(data.fecha_vencimiento, "yyyy-MM-dd"),
          proveedor: data.proveedor,
          precio_unitario: data.precio_unitario,
        });

        if (insertError) throw insertError;
      }

      toast({
        title: "✅ Entrada registrada exitosamente",
        duration: 3000,
      });

      form.reset();
      setSelectedMedId(null);
      setExpiryWarning(null);
      queryClient.invalidateQueries({ queryKey: ["recent-entradas"] });
      queryClient.invalidateQueries({ queryKey: ["inventario"] });
    } catch (error: any) {
      toast({
        title: "Error al registrar entrada",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      form.setValue("fecha_vencimiento", date);
      const daysUntilExpiry = differenceInDays(date, new Date());
      if (daysUntilExpiry < 180) {
        setExpiryWarning("⚠️ Este medicamento vence en menos de 6 meses");
      } else {
        setExpiryWarning(null);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registro de Entradas</h1>
        <p className="text-muted-foreground">Registra nuevas entradas de medicamentos al inventario</p>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Registrar Nueva Entrada</h2>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Medicamento */}
            <div className="space-y-2">
              <Label>Medicamento *</Label>
              <Select
                value={form.watch("id_medicamento")?.toString()}
                onValueChange={(value) => {
                  const id = parseInt(value);
                  form.setValue("id_medicamento", id);
                  setSelectedMedId(id);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un medicamento" />
                </SelectTrigger>
                <SelectContent>
                  {medicamentos?.map((med) => (
                    <SelectItem key={med.id} value={med.id.toString()}>
                      {med.nombre} - {med.concentracion} - {med.presentacion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {medWithPriority?.categorias_patologias && (
                <div className="mt-2">
                  <PriorityBadge priority={medWithPriority.categorias_patologias.nivel_prioridad} />
                </div>
              )}
              {form.formState.errors.id_medicamento && (
                <p className="text-sm text-destructive">{form.formState.errors.id_medicamento.message}</p>
              )}
            </div>

            {/* Sede */}
            <div className="space-y-2">
              <Label>Sede *</Label>
              <Select
                value={form.watch("id_sede")?.toString()}
                onValueChange={(value) => form.setValue("id_sede", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes?.map((sede) => (
                    <SelectItem key={sede.id} value={sede.id.toString()}>
                      {sede.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.id_sede && (
                <p className="text-sm text-destructive">{form.formState.errors.id_sede.message}</p>
              )}
            </div>

            {/* Cantidad */}
            <div className="space-y-2">
              <Label>Cantidad *</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ej: 100"
                {...form.register("cantidad", { valueAsNumber: true })}
              />
              {form.formState.errors.cantidad && (
                <p className="text-sm text-destructive">{form.formState.errors.cantidad.message}</p>
              )}
            </div>

            {/* Lote */}
            <div className="space-y-2">
              <Label>Lote *</Label>
              <Input
                maxLength={50}
                placeholder="Ej: LOT-2024-001"
                {...form.register("lote")}
              />
              {form.formState.errors.lote && (
                <p className="text-sm text-destructive">{form.formState.errors.lote.message}</p>
              )}
            </div>

            {/* Fecha de Vencimiento */}
            <div className="space-y-2">
              <Label>Fecha de Vencimiento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("fecha_vencimiento") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("fecha_vencimiento") ? (
                      format(form.watch("fecha_vencimiento"), "dd/MM/yyyy")
                    ) : (
                      <span>Seleccione una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("fecha_vencimiento")}
                    onSelect={handleDateChange}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {expiryWarning && (
                <Alert className="bg-priority-medium/10 border-priority-medium">
                  <AlertDescription>{expiryWarning}</AlertDescription>
                </Alert>
              )}
              {form.formState.errors.fecha_vencimiento && (
                <p className="text-sm text-destructive">{form.formState.errors.fecha_vencimiento.message}</p>
              )}
            </div>

            {/* Proveedor */}
            <div className="space-y-2">
              <Label>Proveedor</Label>
              <Input
                maxLength={100}
                placeholder="Nombre del proveedor"
                {...form.register("proveedor")}
              />
            </div>

            {/* Precio Unitario */}
            <div className="space-y-2">
              <Label>Precio Unitario</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1500.00"
                  className="pl-7"
                  {...form.register("precio_unitario", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              rows={3}
              maxLength={500}
              placeholder="Notas adicionales sobre esta entrada..."
              {...form.register("observaciones")}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1 md:flex-none">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Entrada
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                form.reset();
                setSelectedMedId(null);
                setExpiryWarning(null);
              }}
            >
              Limpiar Formulario
            </Button>
          </div>
        </form>
      </Card>

      {/* Recent Entries Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Entradas Recientes (Últimos 30 días)</h2>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Medicamento</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Lote</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentEntradas?.map((entrada: any) => (
                <TableRow key={entrada.id}>
                  <TableCell>{format(new Date(entrada.fecha_movimiento), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>
                    {entrada.medicamentos.nombre} {entrada.medicamentos.concentracion} {entrada.medicamentos.presentacion}
                  </TableCell>
                  <TableCell>{entrada.sedes.nombre}</TableCell>
                  <TableCell>{entrada.lote}</TableCell>
                  <TableCell>{entrada.cantidad}</TableCell>
                  <TableCell>{entrada.usuarios.nombre_completo}</TableCell>
                </TableRow>
              ))}
              {!recentEntradas?.length && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay entradas recientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default Entradas;
