import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, BarChart3, RotateCcw, Loader2 } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ReportType } from "./ReportSelector";
import { useSedes } from "@/hooks/useSedes";
import { useMedicamentos } from "@/hooks/useMedicamentos";

export interface ReportFilters {
  fechaDesde: Date | undefined;
  fechaHasta: Date | undefined;
  soloMiSede: boolean;
  sedesSeleccionadas: number[];
  prioridades: string[];
  estadosStock: string[];
  medicamentoId: number | null;
  tiposMovimiento: string[];
  estadosRedistribucion: string[];
  tiposAlerta: string[];
  estadoAlerta: "activas" | "resueltas" | "todas";
}

const reportDescriptions: Record<ReportType, { title: string; description: string }> = {
  inventario_sede: { title: "Inventario de Mi Sede", description: "Reporte detallado del inventario actual de tu sede asignada" },
  inventario_general: { title: "Inventario General", description: "Vista consolidada del inventario de todas las sedes" },
  medicamentos_prioridad: { title: "Medicamentos por Prioridad", description: "Distribución de medicamentos según su nivel de prioridad" },
  stock_critico: { title: "Stock Crítico", description: "Medicamentos con niveles de stock por debajo del mínimo" },
  entradas: { title: "Entradas de Medicamentos", description: "Registro de todos los ingresos de medicamentos" },
  salidas: { title: "Salidas de Medicamentos", description: "Registro de todas las dispensaciones de medicamentos" },
  historial_movimientos: { title: "Historial de Movimientos", description: "Historial completo de entradas y salidas" },
  redistribuciones_solicitadas: { title: "Redistribuciones Solicitadas", description: "Solicitudes de redistribución pendientes" },
  redistribuciones_completadas: { title: "Redistribuciones Completadas", description: "Redistribuciones finalizadas exitosamente" },
  analisis_redistribuciones: { title: "Análisis de Redistribuciones", description: "Métricas y estadísticas de redistribuciones" },
  proximos_vencer: { title: "Próximos a Vencer", description: "Medicamentos con fecha de vencimiento cercana" },
  historial_alertas: { title: "Historial de Alertas", description: "Registro histórico de alertas generadas" },
  desabastecimientos: { title: "Desabastecimientos", description: "Análisis de desabastecimientos por sede" },
  analisis_patologia: { title: "Análisis por Patología", description: "Distribución de medicamentos por categoría de patología" },
  estadisticas_consumo: { title: "Estadísticas de Consumo", description: "Análisis de patrones de consumo de medicamentos" },
  eficiencia_sistema: { title: "Eficiencia del Sistema", description: "Métricas de rendimiento y eficiencia operativa" },
};

const getReportCategory = (report: ReportType): "inventario" | "movimientos" | "redistribuciones" | "alertas" | "analiticos" => {
  if (["inventario_sede", "inventario_general", "medicamentos_prioridad", "stock_critico"].includes(report)) return "inventario";
  if (["entradas", "salidas", "historial_movimientos"].includes(report)) return "movimientos";
  if (["redistribuciones_solicitadas", "redistribuciones_completadas", "analisis_redistribuciones"].includes(report)) return "redistribuciones";
  if (["proximos_vencer", "historial_alertas", "desabastecimientos"].includes(report)) return "alertas";
  return "analiticos";
};

interface ReportConfigurationProps {
  selectedReport: ReportType;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  onGenerateReport: () => void;
  onClearFilters: () => void;
  isLoading: boolean;
}

const ReportConfiguration = ({
  selectedReport,
  filters,
  onFiltersChange,
  onGenerateReport,
  onClearFilters,
  isLoading,
}: ReportConfigurationProps) => {
  const { data: sedes } = useSedes();
  const { data: medicamentos } = useMedicamentos();
  const reportInfo = reportDescriptions[selectedReport];
  const category = getReportCategory(selectedReport);

  const setQuickDate = (type: "today" | "7days" | "30days" | "thisMonth" | "lastMonth") => {
    const today = new Date();
    let desde: Date;
    let hasta: Date = today;

    switch (type) {
      case "today":
        desde = today;
        break;
      case "7days":
        desde = subDays(today, 7);
        break;
      case "30days":
        desde = subDays(today, 30);
        break;
      case "thisMonth":
        desde = startOfMonth(today);
        break;
      case "lastMonth":
        desde = startOfMonth(subMonths(today, 1));
        hasta = endOfMonth(subMonths(today, 1));
        break;
      default:
        desde = today;
    }

    onFiltersChange({ ...filters, fechaDesde: desde, fechaHasta: hasta });
  };

  const togglePrioridad = (prioridad: string) => {
    const current = filters.prioridades;
    const updated = current.includes(prioridad)
      ? current.filter((p) => p !== prioridad)
      : [...current, prioridad];
    onFiltersChange({ ...filters, prioridades: updated });
  };

  const toggleEstadoStock = (estado: string) => {
    const current = filters.estadosStock;
    const updated = current.includes(estado)
      ? current.filter((e) => e !== estado)
      : [...current, estado];
    onFiltersChange({ ...filters, estadosStock: updated });
  };

  const toggleTipoMovimiento = (tipo: string) => {
    const current = filters.tiposMovimiento;
    const updated = current.includes(tipo)
      ? current.filter((t) => t !== tipo)
      : [...current, tipo];
    onFiltersChange({ ...filters, tiposMovimiento: updated });
  };

  const toggleEstadoRedistribucion = (estado: string) => {
    const current = filters.estadosRedistribucion;
    const updated = current.includes(estado)
      ? current.filter((e) => e !== estado)
      : [...current, estado];
    onFiltersChange({ ...filters, estadosRedistribucion: updated });
  };

  const toggleTipoAlerta = (tipo: string) => {
    const current = filters.tiposAlerta;
    const updated = current.includes(tipo)
      ? current.filter((t) => t !== tipo)
      : [...current, tipo];
    onFiltersChange({ ...filters, tiposAlerta: updated });
  };

  const toggleSede = (sedeId: number) => {
    const current = filters.sedesSeleccionadas;
    const updated = current.includes(sedeId)
      ? current.filter((s) => s !== sedeId)
      : [...current, sedeId];
    onFiltersChange({ ...filters, sedesSeleccionadas: updated });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{reportInfo.title}</CardTitle>
        <CardDescription>{reportInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtro de Fechas */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Rango de Fechas</Label>
          <div className="flex flex-wrap gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !filters.fechaDesde && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.fechaDesde ? format(filters.fechaDesde, "dd/MM/yyyy") : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.fechaDesde}
                  onSelect={(date) => onFiltersChange({ ...filters, fechaDesde: date })}
                  locale={es}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !filters.fechaHasta && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.fechaHasta ? format(filters.fechaHasta, "dd/MM/yyyy") : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.fechaHasta}
                  onSelect={(date) => onFiltersChange({ ...filters, fechaHasta: date })}
                  locale={es}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickDate("today")}>Hoy</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate("7days")}>Últimos 7 días</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate("30days")}>Últimos 30 días</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate("thisMonth")}>Este mes</Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDate("lastMonth")}>Mes anterior</Button>
          </div>
        </div>

        {/* Filtro de Sede */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sede</Label>
          <div className="flex items-center gap-2">
            <Checkbox
              id="miSede"
              checked={filters.soloMiSede}
              onCheckedChange={(checked) => onFiltersChange({ ...filters, soloMiSede: !!checked })}
            />
            <Label htmlFor="miSede" className="text-sm cursor-pointer">Mi sede solamente</Label>
          </div>
          {!filters.soloMiSede && sedes && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {sedes.map((sede) => (
                <div key={sede.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`sede-${sede.id}`}
                    checked={filters.sedesSeleccionadas.includes(sede.id)}
                    onCheckedChange={() => toggleSede(sede.id)}
                  />
                  <Label htmlFor={`sede-${sede.id}`} className="text-sm cursor-pointer">{sede.nombre}</Label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filtros específicos por categoría */}
        {category === "inventario" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Prioridad</Label>
              <div className="flex flex-wrap gap-4">
                {["alta", "media", "baja"].map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Checkbox
                      id={`prioridad-${p}`}
                      checked={filters.prioridades.includes(p)}
                      onCheckedChange={() => togglePrioridad(p)}
                    />
                    <Label htmlFor={`prioridad-${p}`} className="text-sm cursor-pointer capitalize">{p}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Estado de Stock</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="critico" checked={filters.estadosStock.includes("critico")} onCheckedChange={() => toggleEstadoStock("critico")} />
                  <Label htmlFor="critico" className="text-sm cursor-pointer">Crítico (&lt;10)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="bajo" checked={filters.estadosStock.includes("bajo")} onCheckedChange={() => toggleEstadoStock("bajo")} />
                  <Label htmlFor="bajo" className="text-sm cursor-pointer">Bajo (10-50)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="optimo" checked={filters.estadosStock.includes("optimo")} onCheckedChange={() => toggleEstadoStock("optimo")} />
                  <Label htmlFor="optimo" className="text-sm cursor-pointer">Óptimo (&gt;50)</Label>
                </div>
              </div>
            </div>
          </>
        )}

        {category === "movimientos" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Movimiento</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="entradas" checked={filters.tiposMovimiento.includes("entrada")} onCheckedChange={() => toggleTipoMovimiento("entrada")} />
                  <Label htmlFor="entradas" className="text-sm cursor-pointer">Entradas</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="salidas" checked={filters.tiposMovimiento.includes("salida")} onCheckedChange={() => toggleTipoMovimiento("salida")} />
                  <Label htmlFor="salidas" className="text-sm cursor-pointer">Salidas</Label>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Medicamento (opcional)</Label>
              <Select
                value={filters.medicamentoId?.toString() || ""}
                onValueChange={(v) => onFiltersChange({ ...filters, medicamentoId: v ? parseInt(v) : null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los medicamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los medicamentos</SelectItem>
                  {medicamentos?.map((med) => (
                    <SelectItem key={med.id} value={med.id.toString()}>
                      {med.nombre} {med.concentracion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {category === "redistribuciones" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Estado</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="solicitadas" checked={filters.estadosRedistribucion.includes("solicitada")} onCheckedChange={() => toggleEstadoRedistribucion("solicitada")} />
                  <Label htmlFor="solicitadas" className="text-sm cursor-pointer">Solicitadas</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="completadas" checked={filters.estadosRedistribucion.includes("completada")} onCheckedChange={() => toggleEstadoRedistribucion("completada")} />
                  <Label htmlFor="completadas" className="text-sm cursor-pointer">Completadas</Label>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Prioridad</Label>
              <div className="flex flex-wrap gap-4">
                {["alta", "media", "baja"].map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <Checkbox
                      id={`red-prioridad-${p}`}
                      checked={filters.prioridades.includes(p)}
                      onCheckedChange={() => togglePrioridad(p)}
                    />
                    <Label htmlFor={`red-prioridad-${p}`} className="text-sm cursor-pointer capitalize">{p}</Label>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {category === "alertas" && (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Tipo de Alerta</Label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: "vencimiento", label: "Vencimiento" },
                  { value: "desabastecimiento", label: "Desabastecimiento" },
                  { value: "stock_minimo", label: "Stock Mínimo" },
                  { value: "critico", label: "Crítico" },
                ].map((tipo) => (
                  <div key={tipo.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`alerta-${tipo.value}`}
                      checked={filters.tiposAlerta.includes(tipo.value)}
                      onCheckedChange={() => toggleTipoAlerta(tipo.value)}
                    />
                    <Label htmlFor={`alerta-${tipo.value}`} className="text-sm cursor-pointer">{tipo.label}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-sm font-medium">Estado de Alerta</Label>
              <RadioGroup
                value={filters.estadoAlerta}
                onValueChange={(v) => onFiltersChange({ ...filters, estadoAlerta: v as "activas" | "resueltas" | "todas" })}
              >
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="activas" id="activas" />
                    <Label htmlFor="activas" className="text-sm cursor-pointer">Solo Activas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="resueltas" id="resueltas" />
                    <Label htmlFor="resueltas" className="text-sm cursor-pointer">Solo Resueltas</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="todas" id="todas" />
                    <Label htmlFor="todas" className="text-sm cursor-pointer">Todas</Label>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4">
          <Button onClick={onGenerateReport} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="mr-2 h-4 w-4" />
            )}
            Generar Reporte
          </Button>
          <Button variant="outline" onClick={onClearFilters}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Limpiar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportConfiguration;
