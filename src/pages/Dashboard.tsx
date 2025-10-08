import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Package, AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalMedicamentos: 0,
    medicamentosCriticos: 0,
    proximosVencer: 0,
    redistribucionesPendientes: 0,
  });

  const [stockPorSede, setStockPorSede] = useState<any[]>([]);
  const [distribucionPrioridad, setDistribucionPrioridad] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // KPI 1: Total de medicamentos
    const { count: totalCount } = await supabase
      .from("inventario")
      .select("*", { count: "exact", head: true });

    // KPI 2: Medicamentos críticos
    const { data: criticosData } = await supabase
      .from("inventario")
      .select(`
        id,
        cantidad_actual,
        medicamentos!inner(
          id_categoria_patologia,
          categorias_patologias!inner(nivel_prioridad)
        )
      `)
      .lt("cantidad_actual", 10);

    const criticos = criticosData?.filter((item: any) => {
      const prioridad = item.medicamentos?.categorias_patologias?.nivel_prioridad;
      return (prioridad === "CRITICA" || prioridad === "ALTA") && item.cantidad_actual < 10;
    }).length || 0;

    // KPI 3: Próximos a vencer
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);
    const { count: vencerCount } = await supabase
      .from("inventario")
      .select("*", { count: "exact", head: true })
      .lte("fecha_vencimiento", fechaLimite.toISOString().split("T")[0]);

    // KPI 4: Redistribuciones pendientes
    const { count: redistCount } = await supabase
      .from("redistribuciones")
      .select("*", { count: "exact", head: true })
      .eq("estado", "solicitada");

    setStats({
      totalMedicamentos: totalCount || 0,
      medicamentosCriticos: criticos,
      proximosVencer: vencerCount || 0,
      redistribucionesPendientes: redistCount || 0,
    });

    // Gráfico 1: Stock por sede
    const { data: stockData } = await supabase
      .from("inventario")
      .select(`
        id_sede,
        cantidad_actual,
        sedes(nombre)
      `);

    const stockAgrupado = stockData?.reduce((acc: any, item: any) => {
      const sedeName = item.sedes?.nombre || "Sin sede";
      if (!acc[sedeName]) {
        acc[sedeName] = 0;
      }
      acc[sedeName] += item.cantidad_actual || 0;
      return acc;
    }, {});

    const stockChart = Object.entries(stockAgrupado || {}).map(([nombre, total]) => ({
      nombre,
      total,
    }));

    setStockPorSede(stockChart);

    // Gráfico 2: Distribución por prioridad
    const { data: prioridadData } = await supabase
      .from("inventario")
      .select(`
        id_medicamento,
        medicamentos!inner(
          id_categoria_patologia,
          categorias_patologias!inner(nivel_prioridad)
        )
      `);

    const prioridadAgrupada = prioridadData?.reduce((acc: any, item: any) => {
      const prioridad = item.medicamentos?.categorias_patologias?.nivel_prioridad || "BAJA";
      if (!acc[prioridad]) {
        acc[prioridad] = 0;
      }
      acc[prioridad] += 1;
      return acc;
    }, {});

    const prioridadChart = Object.entries(prioridadAgrupada || {}).map(([name, value]) => ({
      name,
      value,
    }));

    setDistribucionPrioridad(prioridadChart);
  };

  const COLORS = {
    CRITICA: "#dc2626",
    ALTA: "#ea580c",
    MEDIA: "#f59e0b",
    BAJA: "#10b981",
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Medicamentos</p>
              <p className="text-3xl font-bold text-primary">{stats.totalMedicamentos}</p>
            </div>
            <Package className="h-12 w-12 text-primary/20" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-[#dc2626]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Medicamentos Críticos</p>
              <p className="text-3xl font-bold text-[#dc2626]">{stats.medicamentosCriticos}</p>
            </div>
            <AlertTriangle className="h-12 w-12 text-[#dc2626]/20" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-[#f59e0b]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Próximos a Vencer</p>
              <p className="text-3xl font-bold text-[#f59e0b]">{stats.proximosVencer}</p>
            </div>
            <Calendar className="h-12 w-12 text-[#f59e0b]/20" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-[#ea580c]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Redistribuciones Pendientes
              </p>
              <p className="text-3xl font-bold text-[#ea580c]">
                {stats.redistribucionesPendientes}
              </p>
            </div>
            <RefreshCw className="h-12 w-12 text-[#ea580c]/20" />
          </div>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Stock por Sede</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stockPorSede}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distribución por Prioridad</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={distribucionPrioridad}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label
              >
                {distribucionPrioridad.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.name as keyof typeof COLORS]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
