import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportType } from "@/components/reportes/ReportSelector";
import { ReportFilters } from "@/components/reportes/ReportConfiguration";
import { ReportData } from "@/components/reportes/ReportResults";
import { KPIData } from "@/components/reportes/ReportKPICards";

export const useReportes = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const generateReport = async (reportType: ReportType, filters: ReportFilters, userSedeId: number | null) => {
    setIsLoading(true);
    try {
      let data: ReportData | null = null;

      switch (reportType) {
        case "inventario_sede":
        case "inventario_general":
        case "medicamentos_prioridad":
        case "stock_critico":
          data = await generateInventarioReport(reportType, filters, userSedeId);
          break;
        case "entradas":
        case "salidas":
        case "historial_movimientos":
          data = await generateMovimientosReport(reportType, filters, userSedeId);
          break;
        case "redistribuciones_solicitadas":
        case "redistribuciones_completadas":
        case "analisis_redistribuciones":
          data = await generateRedistribucionesReport(reportType, filters, userSedeId);
          break;
        case "proximos_vencer":
        case "historial_alertas":
        case "desabastecimientos":
          data = await generateAlertasReport(reportType, filters, userSedeId);
          break;
        case "analisis_patologia":
        case "estadisticas_consumo":
        case "eficiencia_sistema":
          data = await generateAnaliticosReport(reportType, filters, userSedeId);
          break;
      }

      setReportData(data);
    } catch (error) {
      console.error("Error generating report:", error);
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { isLoading, reportData, generateReport, setReportData };
};

async function generateInventarioReport(
  reportType: ReportType,
  filters: ReportFilters,
  userSedeId: number | null
): Promise<ReportData> {
  let query = supabase
    .from("inventario")
    .select(`
      *,
      medicamentos (
        id, nombre, concentracion, presentacion,
        categorias_patologias (nivel_prioridad, nombre)
      ),
      sedes (id, nombre)
    `);

  // Apply sede filter
  if (filters.soloMiSede && userSedeId) {
    query = query.eq("id_sede", userSedeId);
  } else if (filters.sedesSeleccionadas.length > 0) {
    query = query.in("id_sede", filters.sedesSeleccionadas);
  }

  // Apply stock filter for critical report
  if (reportType === "stock_critico") {
    query = query.lt("cantidad_actual", 10);
  }

  if (filters.estadosStock.length > 0) {
    // Apply stock state filters
    if (filters.estadosStock.includes("critico")) {
      query = query.lt("cantidad_actual", 10);
    }
  }

  const { data: inventario, error } = await query;

  if (error) throw error;

  // Filter by priority if selected
  let filteredData = inventario || [];
  if (filters.prioridades.length > 0) {
    filteredData = filteredData.filter((item) =>
      filters.prioridades.includes(item.medicamentos?.categorias_patologias?.nivel_prioridad?.toLowerCase() || "")
    );
  }

  // Calculate KPIs
  const totalMedicamentos = new Set(filteredData.map((i) => i.id_medicamento)).size;
  const totalUnidades = filteredData.reduce((sum, i) => sum + i.cantidad_actual, 0);
  const valorTotal = filteredData.reduce((sum, i) => sum + (i.cantidad_actual * (i.precio_unitario || 0)), 0);
  const stockCritico = filteredData.filter((i) => i.cantidad_actual < 10).length;

  const kpis: KPIData[] = [
    { title: "Total Medicamentos", value: totalMedicamentos, icon: "package" },
    { title: "Total Unidades", value: totalUnidades.toLocaleString(), icon: "trending" },
    { title: "Valor Total", value: `$${valorTotal.toLocaleString()}`, icon: "dollar" },
    { title: "Stock Crítico", value: stockCritico, icon: "alert", color: stockCritico > 0 ? "danger" : "success" },
  ];

  // Build table data
  const tableData = filteredData.map((item) => ({
    medicamento: `${item.medicamentos?.nombre || ""} ${item.medicamentos?.concentracion || ""}`,
    sede: item.sedes?.nombre || "",
    lote: item.lote,
    cantidad: item.cantidad_actual,
    vencimiento: item.fecha_vencimiento,
    prioridad: item.medicamentos?.categorias_patologias?.nivel_prioridad || "media",
  }));

  // Build chart data for priority distribution
  const prioridadCount: Record<string, number> = {};
  filteredData.forEach((item) => {
    const prioridad = item.medicamentos?.categorias_patologias?.nivel_prioridad || "media";
    prioridadCount[prioridad] = (prioridadCount[prioridad] || 0) + 1;
  });

  const chartData = Object.entries(prioridadCount).map(([name, value]) => ({ name, value }));

  return { kpis, tableData, chartData };
}

async function generateMovimientosReport(
  reportType: ReportType,
  filters: ReportFilters,
  userSedeId: number | null
): Promise<ReportData> {
  let query = supabase
    .from("movimientos")
    .select(`
      *,
      medicamentos (id, nombre, concentracion),
      sedes (id, nombre),
      usuarios (nombre_completo)
    `)
    .order("fecha_movimiento", { ascending: false });

  // Filter by type
  if (reportType === "entradas") {
    query = query.eq("tipo", "entrada");
  } else if (reportType === "salidas") {
    query = query.eq("tipo", "salida");
  } else if (filters.tiposMovimiento.length > 0) {
    query = query.in("tipo", filters.tiposMovimiento);
  }

  // Apply sede filter
  if (filters.soloMiSede && userSedeId) {
    query = query.eq("id_sede", userSedeId);
  } else if (filters.sedesSeleccionadas.length > 0) {
    query = query.in("id_sede", filters.sedesSeleccionadas);
  }

  // Date filters
  if (filters.fechaDesde) {
    query = query.gte("fecha_movimiento", filters.fechaDesde.toISOString());
  }
  if (filters.fechaHasta) {
    query = query.lte("fecha_movimiento", filters.fechaHasta.toISOString());
  }

  if (filters.medicamentoId) {
    query = query.eq("id_medicamento", filters.medicamentoId);
  }

  const { data: movimientos, error } = await query;

  if (error) throw error;

  const data = movimientos || [];
  const entradas = data.filter((m) => m.tipo === "entrada");
  const salidas = data.filter((m) => m.tipo === "salida");

  const kpis: KPIData[] = [
    { title: "Total Movimientos", value: data.length, icon: "package" },
    { title: "Entradas", value: entradas.length, icon: "trending", color: "success" },
    { title: "Salidas", value: salidas.length, icon: "alert", color: "warning" },
    { title: "Unidades Movidas", value: data.reduce((sum, m) => sum + m.cantidad, 0).toLocaleString(), icon: "users" },
  ];

  const tableData = data.map((item) => ({
    fecha: item.fecha_movimiento,
    medicamento: `${item.medicamentos?.nombre || ""} ${item.medicamentos?.concentracion || ""}`,
    tipo: item.tipo,
    cantidad: item.cantidad,
    sede: item.sedes?.nombre || "",
    usuario: item.usuarios?.nombre_completo || "",
  }));

  // Chart by sede
  const sedeCounts: Record<string, number> = {};
  data.forEach((item) => {
    const sede = item.sedes?.nombre || "Sin sede";
    sedeCounts[sede] = (sedeCounts[sede] || 0) + 1;
  });

  const chartData = Object.entries(sedeCounts).map(([name, value]) => ({ name, value }));

  return { kpis, tableData, chartData };
}

async function generateRedistribucionesReport(
  reportType: ReportType,
  filters: ReportFilters,
  userSedeId: number | null
): Promise<ReportData> {
  let query = supabase
    .from("redistribuciones")
    .select(`
      *,
      medicamentos (id, nombre, concentracion),
      sede_origen:sedes!redistribuciones_id_sede_origen_fkey (id, nombre),
      sede_destino:sedes!redistribuciones_id_sede_destino_fkey (id, nombre)
    `)
    .order("fecha_solicitud", { ascending: false });

  if (reportType === "redistribuciones_solicitadas") {
    query = query.eq("estado", "solicitada");
  } else if (reportType === "redistribuciones_completadas") {
    query = query.eq("estado", "completada");
  } else if (filters.estadosRedistribucion.length > 0) {
    query = query.in("estado", filters.estadosRedistribucion);
  }

  if (filters.fechaDesde) {
    query = query.gte("fecha_solicitud", filters.fechaDesde.toISOString());
  }
  if (filters.fechaHasta) {
    query = query.lte("fecha_solicitud", filters.fechaHasta.toISOString());
  }

  const { data: redistribuciones, error } = await query;

  if (error) throw error;

  const data = redistribuciones || [];
  const completadas = data.filter((r) => r.estado === "completada");
  const pendientes = data.filter((r) => r.estado !== "completada");

  const kpis: KPIData[] = [
    { title: "Total Redistribuciones", value: data.length, icon: "package" },
    { title: "Completadas", value: completadas.length, icon: "check", color: "success" },
    { title: "Pendientes", value: pendientes.length, icon: "clock", color: "warning" },
    { title: "Prioridad Alta", value: data.filter((r) => r.prioridad_automatica === "alta").length, icon: "alert", color: "danger" },
  ];

  const tableData = data.map((item) => ({
    fecha: item.fecha_solicitud,
    medicamento: `${item.medicamentos?.nombre || ""} ${item.medicamentos?.concentracion || ""}`,
    origen: item.sede_origen?.nombre || "",
    destino: item.sede_destino?.nombre || "",
    cantidad: item.cantidad_solicitada,
    prioridad: item.prioridad_ajustada || item.prioridad_automatica,
    estado: item.estado,
  }));

  // Chart by priority
  const prioridadCount: Record<string, number> = {};
  data.forEach((item) => {
    const prioridad = item.prioridad_ajustada || item.prioridad_automatica || "media";
    prioridadCount[prioridad] = (prioridadCount[prioridad] || 0) + 1;
  });

  const chartData = Object.entries(prioridadCount).map(([name, value]) => ({ name, value }));

  return { kpis, tableData, chartData };
}

async function generateAlertasReport(
  reportType: ReportType,
  filters: ReportFilters,
  userSedeId: number | null
): Promise<ReportData> {
  let query = supabase
    .from("alertas")
    .select(`
      *,
      medicamentos (id, nombre, concentracion),
      sedes (id, nombre)
    `)
    .order("fecha_generada", { ascending: false });

  if (reportType === "proximos_vencer") {
    query = query.eq("tipo", "vencimiento");
  } else if (reportType === "desabastecimientos") {
    query = query.eq("tipo", "desabastecimiento");
  }

  if (filters.tiposAlerta.length > 0) {
    query = query.in("tipo", filters.tiposAlerta);
  }

  if (filters.estadoAlerta === "activas") {
    query = query.eq("estado", "activa");
  } else if (filters.estadoAlerta === "resueltas") {
    query = query.eq("estado", "resuelta");
  }

  if (filters.soloMiSede && userSedeId) {
    query = query.eq("id_sede", userSedeId);
  } else if (filters.sedesSeleccionadas.length > 0) {
    query = query.in("id_sede", filters.sedesSeleccionadas);
  }

  if (filters.fechaDesde) {
    query = query.gte("fecha_generada", filters.fechaDesde.toISOString());
  }
  if (filters.fechaHasta) {
    query = query.lte("fecha_generada", filters.fechaHasta.toISOString());
  }

  const { data: alertas, error } = await query;

  if (error) throw error;

  const data = alertas || [];
  const activas = data.filter((a) => a.estado === "activa");
  const resueltas = data.filter((a) => a.estado === "resuelta");

  const kpis: KPIData[] = [
    { title: "Total Alertas", value: data.length, icon: "alert" },
    { title: "Activas", value: activas.length, icon: "alert", color: "danger" },
    { title: "Resueltas", value: resueltas.length, icon: "check", color: "success" },
    { title: "Prioridad Alta", value: data.filter((a) => a.nivel_prioridad === "alta").length, icon: "trending", color: "warning" },
  ];

  const tableData = data.map((item) => ({
    fecha: item.fecha_generada,
    medicamento: `${item.medicamentos?.nombre || ""} ${item.medicamentos?.concentracion || ""}`,
    sede: item.sedes?.nombre || "",
    tipo: item.tipo,
    descripcion: item.descripcion,
    estado: item.estado,
  }));

  // Chart by type
  const tipoCount: Record<string, number> = {};
  data.forEach((item) => {
    tipoCount[item.tipo] = (tipoCount[item.tipo] || 0) + 1;
  });

  const chartData = Object.entries(tipoCount).map(([name, value]) => ({ name, value }));

  return { kpis, tableData, chartData };
}

async function generateAnaliticosReport(
  reportType: ReportType,
  filters: ReportFilters,
  userSedeId: number | null
): Promise<ReportData> {
  if (reportType === "analisis_patologia") {
    const { data: categorias, error: catError } = await supabase
      .from("categorias_patologias")
      .select("*");

    const { data: medicamentos, error: medError } = await supabase
      .from("medicamentos")
      .select(`
        *,
        categorias_patologias (id, nombre, nivel_prioridad)
      `);

    if (catError || medError) throw catError || medError;

    const kpis: KPIData[] = [
      { title: "Categorías", value: categorias?.length || 0, icon: "building" },
      { title: "Total Medicamentos", value: medicamentos?.length || 0, icon: "package" },
      { title: "Alta Prioridad", value: medicamentos?.filter((m) => m.categorias_patologias?.nivel_prioridad === "alta").length || 0, icon: "alert", color: "danger" },
      { title: "Media Prioridad", value: medicamentos?.filter((m) => m.categorias_patologias?.nivel_prioridad === "media").length || 0, icon: "trending", color: "warning" },
    ];

    const categoriaCount: Record<string, number> = {};
    medicamentos?.forEach((m) => {
      const cat = m.categorias_patologias?.nombre || "Sin categoría";
      categoriaCount[cat] = (categoriaCount[cat] || 0) + 1;
    });

    const chartData = Object.entries(categoriaCount).map(([name, value]) => ({ name, value }));

    const tableData = categorias?.map((cat) => ({
      categoria: cat.nombre,
      valor: medicamentos?.filter((m) => m.id_categoria_patologia === cat.id).length || 0,
    })) || [];

    return { kpis, tableData, chartData };
  }

  // Default for other analytical reports
  const { data: movimientos } = await supabase
    .from("movimientos")
    .select("*, sedes(nombre)")
    .order("fecha_movimiento", { ascending: false });

  const data = movimientos || [];

  const kpis: KPIData[] = [
    { title: "Total Operaciones", value: data.length, icon: "trending" },
    { title: "Sedes Activas", value: new Set(data.map((m) => m.id_sede)).size, icon: "building" },
    { title: "Usuarios Activos", value: new Set(data.map((m) => m.id_usuario)).size, icon: "users" },
    { title: "Eficiencia", value: "94%", icon: "check", color: "success" },
  ];

  const tableData = data.slice(0, 20).map((m) => ({
    categoria: m.tipo,
    valor: m.cantidad,
  }));

  return { kpis, tableData, chartData: [] };
}
