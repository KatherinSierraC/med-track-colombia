import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ReportKPICards, { KPIData } from "./ReportKPICards";
import { ReportType } from "./ReportSelector";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export interface ReportData {
  kpis: KPIData[];
  tableData: any[];
  chartData?: any[];
}

interface ReportResultsProps {
  reportType: ReportType;
  data: ReportData | null;
  isLoading: boolean;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const getPrioridadColor = (prioridad: string) => {
  switch (prioridad?.toLowerCase()) {
    case "alta":
      return "bg-destructive text-destructive-foreground";
    case "media":
      return "bg-yellow-500 text-white";
    case "baja":
      return "bg-green-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getEstadoColor = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case "activa":
      return "bg-destructive text-destructive-foreground";
    case "resuelta":
      return "bg-green-500 text-white";
    case "completada":
      return "bg-green-500 text-white";
    case "solicitada":
      return "bg-yellow-500 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const ReportResults = ({ reportType, data, isLoading }: ReportResultsProps) => {
  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const renderTable = () => {
    if (!data.tableData || data.tableData.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No se encontraron datos para los filtros seleccionados.
          </CardContent>
        </Card>
      );
    }

    // Determine columns based on report type
    const getColumns = () => {
      switch (reportType) {
        case "inventario_sede":
        case "inventario_general":
        case "medicamentos_prioridad":
        case "stock_critico":
          return [
            { key: "medicamento", label: "Medicamento" },
            { key: "sede", label: "Sede" },
            { key: "lote", label: "Lote" },
            { key: "cantidad", label: "Cantidad" },
            { key: "vencimiento", label: "Vencimiento" },
            { key: "prioridad", label: "Prioridad" },
          ];
        case "entradas":
        case "salidas":
        case "historial_movimientos":
          return [
            { key: "fecha", label: "Fecha" },
            { key: "medicamento", label: "Medicamento" },
            { key: "tipo", label: "Tipo" },
            { key: "cantidad", label: "Cantidad" },
            { key: "sede", label: "Sede" },
            { key: "usuario", label: "Usuario" },
          ];
        case "redistribuciones_solicitadas":
        case "redistribuciones_completadas":
        case "analisis_redistribuciones":
          return [
            { key: "fecha", label: "Fecha" },
            { key: "medicamento", label: "Medicamento" },
            { key: "origen", label: "Origen" },
            { key: "destino", label: "Destino" },
            { key: "cantidad", label: "Cantidad" },
            { key: "prioridad", label: "Prioridad" },
            { key: "estado", label: "Estado" },
          ];
        case "proximos_vencer":
        case "historial_alertas":
        case "desabastecimientos":
          return [
            { key: "fecha", label: "Fecha" },
            { key: "medicamento", label: "Medicamento" },
            { key: "sede", label: "Sede" },
            { key: "tipo", label: "Tipo" },
            { key: "descripcion", label: "Descripción" },
            { key: "estado", label: "Estado" },
          ];
        default:
          return [
            { key: "categoria", label: "Categoría" },
            { key: "valor", label: "Valor" },
          ];
      }
    };

    const columns = getColumns();

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalle del Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key}>{col.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tableData.slice(0, 50).map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={col.key}>
                        {col.key === "prioridad" ? (
                          <Badge className={getPrioridadColor(row[col.key])}>{row[col.key]}</Badge>
                        ) : col.key === "estado" ? (
                          <Badge className={getEstadoColor(row[col.key])}>{row[col.key]}</Badge>
                        ) : col.key === "tipo" && ["entrada", "salida"].includes(row[col.key]) ? (
                          <Badge variant={row[col.key] === "entrada" ? "default" : "secondary"}>
                            {row[col.key]}
                          </Badge>
                        ) : col.key === "fecha" && row[col.key] ? (
                          format(new Date(row[col.key]), "dd/MM/yyyy", { locale: es })
                        ) : col.key === "vencimiento" && row[col.key] ? (
                          format(new Date(row[col.key]), "dd/MM/yyyy", { locale: es })
                        ) : (
                          row[col.key] || "-"
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.tableData.length > 50 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Mostrando 50 de {data.tableData.length} registros
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderChart = () => {
    if (!data.chartData || data.chartData.length === 0) return null;

    const isPieChart = ["medicamentos_prioridad", "analisis_patologia"].includes(reportType);

    if (isPieChart) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribución</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Análisis Gráfico</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <ReportKPICards kpis={data.kpis} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart()}
        <div className="lg:col-span-2">{renderTable()}</div>
      </div>
    </div>
  );
};

export default ReportResults;
