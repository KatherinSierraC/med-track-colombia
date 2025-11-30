import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BarChart3, Package, RefreshCw, Bell, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportType = 
  | "inventario_sede" 
  | "inventario_general" 
  | "medicamentos_prioridad" 
  | "stock_critico"
  | "entradas" 
  | "salidas" 
  | "historial_movimientos"
  | "redistribuciones_solicitadas" 
  | "redistribuciones_completadas" 
  | "analisis_redistribuciones"
  | "proximos_vencer" 
  | "historial_alertas" 
  | "desabastecimientos"
  | "analisis_patologia" 
  | "estadisticas_consumo" 
  | "eficiencia_sistema";

interface ReportOption {
  value: ReportType;
  label: string;
}

interface ReportSection {
  title: string;
  icon: React.ReactNode;
  options: ReportOption[];
}

const reportSections: ReportSection[] = [
  {
    title: "Reportes de Inventario",
    icon: <BarChart3 className="h-4 w-4" />,
    options: [
      { value: "inventario_sede", label: "Inventario de Mi Sede" },
      { value: "inventario_general", label: "Inventario General (Todas las Sedes)" },
      { value: "medicamentos_prioridad", label: "Medicamentos por Prioridad" },
      { value: "stock_critico", label: "Medicamentos con Stock Crítico" },
    ],
  },
  {
    title: "Reportes de Movimientos",
    icon: <Package className="h-4 w-4" />,
    options: [
      { value: "entradas", label: "Entradas de Medicamentos" },
      { value: "salidas", label: "Salidas de Medicamentos" },
      { value: "historial_movimientos", label: "Historial Completo de Movimientos" },
    ],
  },
  {
    title: "Reportes de Redistribuciones",
    icon: <RefreshCw className="h-4 w-4" />,
    options: [
      { value: "redistribuciones_solicitadas", label: "Redistribuciones Solicitadas" },
      { value: "redistribuciones_completadas", label: "Redistribuciones Completadas" },
      { value: "analisis_redistribuciones", label: "Análisis de Redistribuciones" },
    ],
  },
  {
    title: "Reportes de Alertas",
    icon: <Bell className="h-4 w-4" />,
    options: [
      { value: "proximos_vencer", label: "Medicamentos Próximos a Vencer" },
      { value: "historial_alertas", label: "Historial de Alertas" },
      { value: "desabastecimientos", label: "Desabastecimientos por Sede" },
    ],
  },
  {
    title: "Reportes Analíticos",
    icon: <TrendingUp className="h-4 w-4" />,
    options: [
      { value: "analisis_patologia", label: "Análisis por Categoría de Patología" },
      { value: "estadisticas_consumo", label: "Estadísticas de Consumo" },
      { value: "eficiencia_sistema", label: "Eficiencia del Sistema" },
    ],
  },
];

interface ReportSelectorProps {
  selectedReport: ReportType | null;
  onSelectReport: (report: ReportType) => void;
}

const ReportSelector = ({ selectedReport, onSelectReport }: ReportSelectorProps) => {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Tipos de Reportes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup value={selectedReport || ""} onValueChange={(v) => onSelectReport(v as ReportType)}>
          {reportSections.map((section) => (
            <div key={section.title} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                {section.icon}
                <span>{section.title}</span>
              </div>
              <div className="ml-6 space-y-1">
                {section.options.map((option) => (
                  <Label
                    key={option.value}
                    htmlFor={option.value}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
                      selectedReport === option.value
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <RadioGroupItem value={option.value} id={option.value} />
                    <span className="text-sm">{option.label}</span>
                  </Label>
                ))}
              </div>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default ReportSelector;
