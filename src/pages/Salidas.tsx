import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMedicamentosWithStock } from "@/hooks/useMedicamentos";
import { useSedesWithStock } from "@/hooks/useSedes";
import { useLotesDisponibles } from "@/hooks/useLotes";
import { useMedicamentoWithPriority } from "@/hooks/useMedicamentos";
import { PriorityBadge } from "@/components/medicamentos/PriorityBadge";
import { CriticalAlertModal } from "@/components/salidas/CriticalAlertModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const salidaSchema = z.object({
  medicamento: z.number({ required_error: "Seleccione un medicamento" }),
  sede: z.number({ required_error: "Seleccione una sede" }),
  lote: z.string().min(1, "Seleccione un lote"),
  cantidad: z.number().min(1, "La cantidad debe ser al menos 1"),
  documento_paciente: z.string().min(1, "El documento es obligatorio").max(20),
  observaciones: z.string().max(500).optional(),
});

type SalidaFormData = z.infer<typeof salidaSchema>;

interface Movimiento {
  id: number;
  fecha_movimiento: string;
  medicamento: string;
  sede: string;
  lote: string;
  cantidad: number;
  documento_paciente: string;
  usuario: string;
}

const Salidas = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMedicamento, setSelectedMedicamento] = useState<number | null>(null);
  const [selectedSede, setSelectedSede] = useState<number | null>(null);
  const [selectedLote, setSelectedLote] = useState<string | null>(null);
  const [stockInfo, setStockInfo] = useState<{ cantidad: number; fecha: string } | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [criticalAlert, setCriticalAlert] = useState<{
    show: boolean;
    medicamento: string;
    sede: string;
    cantidad: number;
  }>({ show: false, medicamento: "", sede: "", cantidad: 0 });

  const { data: medicamentos, isLoading: loadingMedicamentos } = useMedicamentosWithStock();
  const { data: sedes, isLoading: loadingSedes } = useSedesWithStock(selectedMedicamento);
  const { data: lotes, isLoading: loadingLotes } = useLotesDisponibles(selectedMedicamento, selectedSede);
  const { data: medicamentoInfo } = useMedicamentoWithPriority(selectedMedicamento);

  const form = useForm<SalidaFormData>({
    resolver: zodResolver(salidaSchema),
  });

  const watchCantidad = form.watch("cantidad");

  useEffect(() => {
    loadMovimientos();
  }, []);

  useEffect(() => {
    if (selectedLote && lotes) {
      const loteData = lotes.find((l) => l.lote === selectedLote);
      if (loteData) {
        setStockInfo({
          cantidad: loteData.cantidad_actual,
          fecha: loteData.fecha_vencimiento,
        });
      }
    } else {
      setStockInfo(null);
    }
  }, [selectedLote, lotes]);

  const loadMovimientos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from("movimientos")
      .select(`
        id,
        fecha_movimiento,
        lote,
        cantidad,
        documento_paciente,
        medicamentos (nombre, concentracion, presentacion),
        sedes (nombre),
        usuarios (nombre_completo)
      `)
      .eq("tipo", "salida")
      .gte("fecha_movimiento", thirtyDaysAgo.toISOString())
      .order("fecha_movimiento", { ascending: false });

    if (error) {
      console.error("Error loading movimientos:", error);
      return;
    }

    const formattedData: Movimiento[] = (data || []).map((mov: any) => ({
      id: mov.id,
      fecha_movimiento: mov.fecha_movimiento,
      medicamento: `${mov.medicamentos.nombre} ${mov.medicamentos.concentracion} ${mov.medicamentos.presentacion}`,
      sede: mov.sedes.nombre,
      lote: mov.lote,
      cantidad: mov.cantidad,
      documento_paciente: mov.documento_paciente,
      usuario: mov.usuarios.nombre_completo,
    }));

    setMovimientos(formattedData);
  };

  const onSubmit = async (data: SalidaFormData) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Usuario no autenticado",
        });
        return;
      }

      // Paso 1: Validar stock actual
      const { data: inventarioData, error: inventarioError } = await supabase
        .from("inventario")
        .select("cantidad_actual")
        .eq("id_medicamento", data.medicamento)
        .eq("id_sede", data.sede)
        .eq("lote", data.lote)
        .single();

      if (inventarioError || !inventarioData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudo verificar el stock",
        });
        return;
      }

      if (inventarioData.cantidad_actual < data.cantidad) {
        toast({
          variant: "destructive",
          title: "Stock insuficiente",
          description: "Otra operación modificó el inventario.",
        });
        return;
      }

      // Paso 2: Crear movimiento
      const { error: movimientoError } = await supabase
        .from("movimientos")
        .insert({
          tipo: "salida",
          id_medicamento: data.medicamento,
          id_sede: data.sede,
          cantidad: data.cantidad,
          lote: data.lote,
          id_usuario: user.id,
          documento_paciente: data.documento_paciente,
          observaciones: data.observaciones || null,
        });

      if (movimientoError) throw movimientoError;

      // Paso 3: Actualizar inventario
      const { error: updateError } = await supabase
        .from("inventario")
        .update({ cantidad_actual: inventarioData.cantidad_actual - data.cantidad })
        .eq("id_medicamento", data.medicamento)
        .eq("id_sede", data.sede)
        .eq("lote", data.lote);

      if (updateError) throw updateError;

      // Paso 4: Obtener nuevo stock y prioridad
      const nuevoStock = inventarioData.cantidad_actual - data.cantidad;
      const { data: stockData } = await supabase
        .from("inventario")
        .select(`
          cantidad_actual,
          medicamentos (
            nombre,
            categorias_patologias (nivel_prioridad)
          ),
          sedes (nombre)
        `)
        .eq("id_medicamento", data.medicamento)
        .eq("id_sede", data.sede)
        .eq("lote", data.lote)
        .single();

      const prioridad = stockData?.medicamentos?.categorias_patologias?.nivel_prioridad;
      const medicamentoNombre = stockData?.medicamentos?.nombre;
      const sedeNombre = stockData?.sedes?.nombre;

      // Paso 5: Generar alertas automáticas
      let alertaCritica = false;

      if (nuevoStock < 10 && nuevoStock > 0) {
        await supabase.from("alertas").insert({
          tipo: "stock_minimo",
          id_medicamento: data.medicamento,
          id_sede: data.sede,
          nivel_prioridad: prioridad,
          descripcion: `Stock bajo de ${medicamentoNombre} en ${sedeNombre}: ${nuevoStock} unidades restantes`,
          estado: "activa",
        });
      }

      if (nuevoStock === 0) {
        await supabase.from("alertas").insert({
          tipo: "desabastecimiento",
          id_medicamento: data.medicamento,
          id_sede: data.sede,
          nivel_prioridad: prioridad,
          descripcion: `Desabastecimiento de ${medicamentoNombre} en ${sedeNombre}`,
          estado: "activa",
        });
      }

      if ((prioridad === "CRITICA" || prioridad === "ALTA") && nuevoStock < 5 && nuevoStock > 0) {
        await supabase.from("alertas").insert({
          tipo: "critico",
          id_medicamento: data.medicamento,
          id_sede: data.sede,
          nivel_prioridad: "CRITICA",
          descripcion: `CRÍTICO: Stock muy bajo de medicamento de alta prioridad - ${medicamentoNombre} en ${sedeNombre}: ${nuevoStock} unidades`,
          estado: "activa",
        });

        alertaCritica = true;
        setCriticalAlert({
          show: true,
          medicamento: medicamentoNombre || "",
          sede: sedeNombre || "",
          cantidad: nuevoStock,
        });
      }

      // Paso 6: Mostrar notificaciones
      toast({
        title: "✅ Salida registrada exitosamente",
        description: `Se dispensaron ${data.cantidad} unidades`,
      });

      if (alertaCritica) {
        toast({
          variant: "destructive",
          title: "⚠️ Alerta crítica generada",
          description: "Se generó una alerta crítica de desabastecimiento",
        });
      }

      // Paso 7: Limpiar formulario y recargar
      form.reset();
      setSelectedMedicamento(null);
      setSelectedSede(null);
      setSelectedLote(null);
      setStockInfo(null);
      loadMovimientos();
    } catch (error) {
      console.error("Error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la salida",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStockError = () => {
    if (!stockInfo || !watchCantidad) return null;
    if (watchCantidad > stockInfo.cantidad) {
      return `❌ La cantidad excede el stock disponible (${stockInfo.cantidad} unidades)`;
    }
    if (stockInfo.cantidad - watchCantidad < 5) {
      return "⚠️ El stock quedará en nivel crítico después de esta salida";
    }
    return null;
  };

  const isQuantityExceeded = stockInfo && watchCantidad > stockInfo.cantidad;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registro de Salidas</h1>
        <p className="text-muted-foreground">
          Registra la dispensación de medicamentos a pacientes
        </p>
      </div>

      {/* Formulario */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Nueva Salida</CardTitle>
          <CardDescription>Complete los datos de la dispensación</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="medicamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicamento *</FormLabel>
                    <Select
                      disabled={loadingMedicamentos}
                      onValueChange={(value) => {
                        const medId = parseInt(value);
                        field.onChange(medId);
                        setSelectedMedicamento(medId);
                        setSelectedSede(null);
                        setSelectedLote(null);
                        form.setValue("sede", 0);
                        form.setValue("lote", "");
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un medicamento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {medicamentos?.map((med: any) => (
                          <SelectItem key={med.id} value={med.id.toString()}>
                            {med.nombre} - {med.concentracion} - {med.presentacion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {medicamentoInfo?.categorias_patologias && (
                <div className="space-y-2">
                  <PriorityBadge
                    priority={medicamentoInfo.categorias_patologias.nivel_prioridad}
                    className="text-sm"
                  />
                  {(medicamentoInfo.categorias_patologias.nivel_prioridad === "CRITICA" ||
                    medicamentoInfo.categorias_patologias.nivel_prioridad === "ALTA") && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        ⚠️ Medicamento de prioridad{" "}
                        {medicamentoInfo.categorias_patologias.nivel_prioridad}. Verifique el stock
                        después de la dispensación.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="sede"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sede *</FormLabel>
                    <Select
                      disabled={!selectedMedicamento || loadingSedes}
                      onValueChange={(value) => {
                        const sedeId = parseInt(value);
                        field.onChange(sedeId);
                        setSelectedSede(sedeId);
                        setSelectedLote(null);
                        form.setValue("lote", "");
                      }}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedMedicamento
                                ? "Primero seleccione un medicamento"
                                : "Seleccione una sede"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sedes?.map((sede: any) => (
                          <SelectItem key={sede.id} value={sede.id.toString()}>
                            {sede.nombre} - Stock: {sede.stock_total}
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
                name="lote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote *</FormLabel>
                    <Select
                      disabled={!selectedSede || loadingLotes}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedLote(value);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              !selectedSede
                                ? "Primero seleccione una sede"
                                : "Seleccione un lote"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lotes?.map((lote) => (
                          <SelectItem key={lote.lote} value={lote.lote}>
                            <div className="flex items-center gap-2">
                              Lote: {lote.lote} | Stock: {lote.cantidad_actual} | Vence:{" "}
                              {format(new Date(lote.fecha_vencimiento), "dd/MM/yyyy", {
                                locale: es,
                              })}
                              {lote.dias_vencer < 30 && (
                                <Badge variant="destructive" className="ml-2">
                                  Próximo a vencer
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {stockInfo && (
                <Alert>
                  <Package className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p>📦 Stock disponible de este lote: {stockInfo.cantidad} unidades</p>
                      <p>
                        📅 Fecha de vencimiento:{" "}
                        {format(new Date(stockInfo.fecha), "dd/MM/yyyy", { locale: es })}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="cantidad"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="Cantidad a dispensar"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    {getStockError() && (
                      <p
                        className={`text-sm ${
                          isQuantityExceeded ? "text-destructive" : "text-yellow-600"
                        }`}
                      >
                        {getStockError()}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="documento_paciente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Documento del Paciente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de documento" maxLength={20} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observaciones"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Motivo de dispensación, tratamiento, etc."
                        rows={3}
                        maxLength={500}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting || isQuantityExceeded}
                  className="flex-1"
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Registrar Salida
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset();
                    setSelectedMedicamento(null);
                    setSelectedSede(null);
                    setSelectedLote(null);
                    setStockInfo(null);
                  }}
                >
                  Limpiar Formulario
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Salidas Recientes (Últimos 30 días)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Documento Paciente</TableHead>
                  <TableHead>Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay salidas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  movimientos.slice(0, 10).map((mov) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        {format(new Date(mov.fecha_movimiento), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </TableCell>
                      <TableCell>{mov.medicamento}</TableCell>
                      <TableCell>{mov.sede}</TableCell>
                      <TableCell>{mov.lote}</TableCell>
                      <TableCell>{mov.cantidad}</TableCell>
                      <TableCell>****-{mov.documento_paciente.slice(-4)}</TableCell>
                      <TableCell>{mov.usuario}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CriticalAlertModal
        open={criticalAlert.show}
        onClose={() => setCriticalAlert({ ...criticalAlert, show: false })}
        medicamentoNombre={criticalAlert.medicamento}
        sedeNombre={criticalAlert.sede}
        cantidadRestante={criticalAlert.cantidad}
      />
    </div>
  );
};

export default Salidas;
