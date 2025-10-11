import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/medicamentos/PriorityBadge";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Package, Calendar, AlertTriangle } from "lucide-react";
import type { Alerta } from "@/hooks/useAlertas";

interface AlertaCardProps {
  alerta: Alerta;
  onResolve: () => void;
  onViewDetails?: () => void;
}

const getAlertIcon = (tipo: string) => {
  switch (tipo) {
    case "vencimiento":
      return <Calendar className="w-12 h-12 text-yellow-500" />;
    case "desabastecimiento":
      return <Package className="w-12 h-12 text-red-500" />;
    case "stock_minimo":
      return <AlertTriangle className="w-12 h-12 text-orange-500" />;
    case "critico":
      return <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />;
    default:
      return <AlertCircle className="w-12 h-12 text-gray-500" />;
  }
};

const getStockColor = (cantidad?: number) => {
  if (!cantidad) return "text-gray-500";
  if (cantidad < 10) return "text-red-600 font-bold";
  if (cantidad <= 50) return "text-yellow-600";
  return "text-green-600";
};

export const AlertaCard = ({ alerta, onResolve, onViewDetails }: AlertaCardProps) => {
  const tiempoTranscurrido = formatDistanceToNow(new Date(alerta.fecha_generada), {
    addSuffix: true,
    locale: es,
  });

  const medicamentoCompleto = `${alerta.medicamento_nombre} ${alerta.medicamento_concentracion || ""} ${alerta.medicamento_presentacion || ""}`.trim();

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow border-l-4" style={{
      borderLeftColor: 
        alerta.nivel_prioridad === "CRITICA" ? "#dc2626" :
        alerta.nivel_prioridad === "ALTA" ? "#ea580c" :
        alerta.nivel_prioridad === "MEDIA" ? "#ca8a04" : "#16a34a"
    }}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {getAlertIcon(alerta.tipo)}
        </div>
        
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">{tiempoTranscurrido}</p>
              <h3 className="text-lg font-bold mt-1">
                {alerta.tipo === "vencimiento" && "Vencimiento Próximo"}
                {alerta.tipo === "desabastecimiento" && "Desabastecimiento"}
                {alerta.tipo === "stock_minimo" && "Stock Mínimo"}
                {alerta.tipo === "critico" && "CRÍTICO"}
                : {medicamentoCompleto}
              </h3>
            </div>
            <PriorityBadge priority={alerta.nivel_prioridad} />
          </div>

          <p className="text-foreground">{alerta.descripcion}</p>

          <Card className="bg-muted p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Medicamento:</span>
                <p className="font-medium">{medicamentoCompleto}</p>
              </div>
              {alerta.lote && (
                <div>
                  <span className="text-muted-foreground">Lote:</span>
                  <p className="font-medium">{alerta.lote}</p>
                </div>
              )}
              {alerta.cantidad_actual !== undefined && (
                <div>
                  <span className="text-muted-foreground">Cantidad actual:</span>
                  <p className={`font-medium ${getStockColor(alerta.cantidad_actual)}`}>
                    {alerta.cantidad_actual} unidades
                  </p>
                </div>
              )}
              {alerta.fecha_vencimiento && (
                <div>
                  <span className="text-muted-foreground">Fecha vencimiento:</span>
                  <p className="font-medium">
                    {format(new Date(alerta.fecha_vencimiento), "dd/MM/yyyy")}
                  </p>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-muted-foreground">Sede:</span>
                <Badge variant="outline" className="ml-2">
                  {alerta.sede_nombre} {alerta.sede_ciudad && `(${alerta.sede_ciudad})`}
                </Badge>
              </div>
            </div>
          </Card>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={onResolve} variant="default" size="sm">
              ✅ Marcar como Resuelta
            </Button>
            {onViewDetails && (
              <Button onClick={onViewDetails} variant="outline" size="sm">
                📦 Ver Medicamento
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Generada el {format(new Date(alerta.fecha_generada), "dd/MM/yyyy HH:mm")}
          </p>
        </div>
      </div>
    </Card>
  );
};
