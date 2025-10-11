import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PriorityBadge } from "@/components/medicamentos/PriorityBadge";
import { useRedistribucionDetails, useCompleteRedistribucion } from "@/hooks/useRedistribuciones";
import { format, formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Package, Calendar, User, CheckCircle, Clock } from "lucide-react";

interface RedistributionDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redistribucionId: number | null;
}

export const RedistributionDetailsModal = ({
  open,
  onOpenChange,
  redistribucionId,
}: RedistributionDetailsModalProps) => {
  const { data: redistribucion, isLoading } = useRedistribucionDetails(redistribucionId);
  const completeMutation = useCompleteRedistribucion();
  const [showConfirmComplete, setShowConfirmComplete] = useState(false);
  const [cantidadAprobada, setCantidadAprobada] = useState<number>(0);
  const [observaciones, setObservaciones] = useState("");

  if (!redistribucion) return null;

  const prioridadFinal = redistribucion.prioridad_ajustada || redistribucion.prioridad_automatica;
  const wasAdjusted =
    redistribucion.prioridad_ajustada &&
    redistribucion.prioridad_ajustada !== redistribucion.prioridad_automatica;

  const handleOpenConfirmComplete = () => {
    setCantidadAprobada(redistribucion.cantidad_solicitada);
    setShowConfirmComplete(true);
  };

  const handleConfirmComplete = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      if (cantidadAprobada < 1 || cantidadAprobada > redistribucion.cantidad_solicitada) {
        toast.error("La cantidad aprobada debe estar entre 1 y la cantidad solicitada");
        return;
      }

      await completeMutation.mutateAsync({
        redistribucionId: redistribucion.id,
        cantidadAprobada,
        observaciones,
        userId: user.id,
      });

      toast.success("✅ Redistribución marcada como completada exitosamente");
      toast.info("📦 Inventarios actualizados en ambas sedes");
      setShowConfirmComplete(false);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Error al completar la redistribución");
    }
  };

  const calculateDuration = () => {
    if (!redistribucion.fecha_completado) return null;
    const hours = differenceInHours(
      new Date(redistribucion.fecha_completado),
      new Date(redistribucion.fecha_solicitud)
    );
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days} día${days !== 1 ? "s" : ""}${remainingHours > 0 ? `, ${remainingHours} hora${remainingHours !== 1 ? "s" : ""}` : ""}`;
  };

  if (showConfirmComplete) {
    return (
      <Dialog open={showConfirmComplete} onOpenChange={setShowConfirmComplete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>¿Confirmar que la redistribución se completó?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esto actualizará el inventario de ambas sedes
          </p>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="cantidad">Cantidad efectivamente redistribuida *</Label>
              <Input
                id="cantidad"
                type="number"
                min={1}
                max={redistribucion.cantidad_solicitada}
                value={cantidadAprobada}
                onChange={(e) => setCantidadAprobada(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Puede ser menor a la solicitada si hubo cambios
              </p>
            </div>

            <div>
              <Label htmlFor="obs">Observaciones del Completado</Label>
              <Textarea
                id="obs"
                placeholder="Observaciones sobre el traslado (opcional)..."
                rows={3}
                maxLength={500}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              onClick={handleConfirmComplete}
              disabled={completeMutation.isPending}
              className="flex-1"
            >
              {completeMutation.isPending ? "Confirmando..." : "Confirmar Completado"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowConfirmComplete(false)}
              disabled={completeMutation.isPending}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {isLoading ? (
          <p className="text-center py-8">Cargando...</p>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3 flex-wrap">
                <DialogTitle className="text-2xl">
                  Solicitud de Redistribución #{redistribucion.id}
                </DialogTitle>
                <Badge
                  variant={redistribucion.estado === "completada" ? "default" : "secondary"}
                  className="text-sm"
                >
                  {redistribucion.estado === "completada" ? "Completada" : "Solicitada"}
                </Badge>
                <PriorityBadge priority={prioridadFinal} className="text-sm" />
              </div>
            </DialogHeader>

            <div className="space-y-6">
              {/* Sección 1: Información del Medicamento */}
              <Card className="p-4 bg-muted/30">
                <h3 className="font-semibold mb-3 text-lg">Información del Medicamento</h3>
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    {redistribucion.medicamentos.nombre}{" "}
                    {redistribucion.medicamentos.concentracion}{" "}
                    {redistribucion.medicamentos.presentacion}
                  </p>
                  {redistribucion.medicamentos.principio_activo && (
                    <p className="text-sm text-muted-foreground">
                      Principio activo: {redistribucion.medicamentos.principio_activo}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm">Categoría de patología:</span>
                    <span className="font-medium">
                      {redistribucion.medicamentos.categorias_patologias?.nombre}
                    </span>
                    <PriorityBadge
                      priority={
                        redistribucion.medicamentos.categorias_patologias?.nivel_prioridad || "BAJA"
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Nivel de prioridad automática:</span>
                    <PriorityBadge priority={redistribucion.prioridad_automatica} />
                  </div>
                </div>

                {wasAdjusted && (
                  <div className="mt-4 space-y-2">
                    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold">⚠️ La prioridad fue modificada manualmente</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span>Prioridad original:</span>
                          <PriorityBadge
                            priority={redistribucion.prioridad_automatica}
                            className="opacity-60 line-through"
                          />
                          <span>→</span>
                          <PriorityBadge priority={redistribucion.prioridad_ajustada!} />
                        </div>
                      </AlertDescription>
                    </Alert>
                    <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                      <p className="font-semibold text-sm mb-1">
                        Justificación del cambio de prioridad:
                      </p>
                      <p className="text-sm">{redistribucion.justificacion_prioridad}</p>
                    </Card>
                  </div>
                )}
              </Card>

              {/* Sección 2: Detalles de la Redistribución */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    📤 Sede Origen
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">{redistribucion.sede_origen.nombre}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{redistribucion.sede_origen.tipo}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {redistribucion.sede_origen.ciudad}
                      </span>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-muted-foreground">Stock disponible actual:</p>
                      <p className="text-2xl font-bold">{redistribucion.stockActual}</p>
                      <p className="text-xs">unidades</p>
                      {redistribucion.stockActual >= redistribucion.cantidad_solicitada ? (
                        <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                          ✅ Stock suficiente
                        </p>
                      ) : (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                          ⚠️ Stock insuficiente actualmente
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    📥 Sede Destino
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium text-lg">{redistribucion.sede_destino.nombre}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{redistribucion.sede_destino.tipo}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {redistribucion.sede_destino.ciudad}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-4 bg-primary/5">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Cantidad solicitada</p>
                    <p className="text-3xl font-bold">{redistribucion.cantidad_solicitada}</p>
                    <p className="text-sm">unidades</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Lote asignado</p>
                    <p className="text-xl font-semibold">{redistribucion.lote || "N/A"}</p>
                  </div>
                </div>
                <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Fecha de solicitud</p>
                      <p className="font-medium">
                        {format(new Date(redistribucion.fecha_solicitud), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(redistribucion.fecha_solicitud), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-muted-foreground">Solicitante</p>
                      <p className="font-medium">{redistribucion.solicitante.nombre_completo}</p>
                      <p className="text-xs text-muted-foreground">
                        {redistribucion.solicitante.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sede: {redistribucion.solicitante.sedes?.nombre}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sección 3: Justificación Médica */}
              <Card
                className="p-4"
                style={{ borderLeftWidth: "4px", borderLeftColor: `hsl(var(--priority-${prioridadFinal.toLowerCase()}))` }}
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  📋 Justificación Médica
                </h3>
                <p className="whitespace-pre-wrap">{redistribucion.motivo}</p>
                {redistribucion.cantidad_pacientes_afectados && (
                  <Alert className="mt-3">
                    <AlertDescription>
                      👥 Pacientes afectados estimados:{" "}
                      <span className="font-semibold">
                        {redistribucion.cantidad_pacientes_afectados}
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </Card>

              {/* Sección 4: Estado y Seguimiento */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Estado y Seguimiento</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Solicitada</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(redistribucion.fecha_solicitud), "dd/MM/yyyy HH:mm", {
                          locale: es,
                        })}
                      </p>
                      <p className="text-sm">Por: {redistribucion.solicitante.nombre_completo}</p>
                    </div>
                  </div>

                  {redistribucion.estado === "completada" ? (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <Card className="p-3 bg-green-50 dark:bg-green-950/20 border-green-200">
                          <p className="font-semibold text-green-700 dark:text-green-400">
                            ✅ Redistribución Completada
                          </p>
                          <p className="text-sm mt-1">
                            Fecha de completado:{" "}
                            {format(new Date(redistribucion.fecha_completado!), "dd/MM/yyyy HH:mm", {
                              locale: es,
                            })}
                          </p>
                          <p className="text-sm">Duración total: {calculateDuration()}</p>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
                          <AlertDescription>
                            <p className="font-semibold">⏳ Esta redistribución está pendiente de completarse</p>
                            <p className="text-sm mt-1">
                              Solicitada{" "}
                              {formatDistanceToNow(new Date(redistribucion.fecha_solicitud), {
                                addSuffix: true,
                                locale: es,
                              })}
                            </p>
                          </AlertDescription>
                        </Alert>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Footer con botones */}
            <div className="flex gap-2 mt-6">
              {redistribucion.estado === "solicitada" && (
                <Button onClick={handleOpenConfirmComplete} className="flex-1">
                  ✅ Marcar como Completada
                </Button>
              )}
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
