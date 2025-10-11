import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Alerta {
  id: number;
  tipo: string;
  nivel_prioridad: string;
  descripcion: string;
  fecha_generada: string;
  estado: string;
  fecha_resolucion?: string;
  id_usuario_resolucion?: string;
  id_medicamento: number;
  id_sede: number;
  medicamento_nombre?: string;
  medicamento_concentracion?: string;
  medicamento_presentacion?: string;
  sede_nombre?: string;
  sede_ciudad?: string;
  lote?: string;
  cantidad_actual?: number;
  fecha_vencimiento?: string;
  resuelto_por?: string;
  horas_resolucion?: number;
  dias_activa?: number;
}

export interface AlertasStats {
  total: number;
  criticas: number;
  vencimientoProximo: number;
  desabastecimientos: number;
}

export const useAlertas = () => {
  const [alertasMiSede, setAlertasMiSede] = useState<Alerta[]>([]);
  const [alertasTodasSedes, setAlertasTodasSedes] = useState<Alerta[]>([]);
  const [alertasResueltas, setAlertasResueltas] = useState<Alerta[]>([]);
  const [statsMiSede, setStatsMiSede] = useState<AlertasStats>({
    total: 0,
    criticas: 0,
    vencimientoProximo: 0,
    desabastecimientos: 0,
  });
  const [statsGlobales, setStatsGlobales] = useState({
    total: 0,
    criticas: 0,
    altas: 0,
    medias: 0,
    bajas: 0,
  });
  const [statsResueltas, setStatsResueltas] = useState({
    total: 0,
    promedioHoras: 0,
    usuarioActivo: "",
    tipoFrecuente: "",
  });
  const [loading, setLoading] = useState(true);

  const loadAlertasMiSede = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from("usuarios")
        .select("id_sede_principal")
        .eq("id", user.id)
        .single();

      if (!usuario?.id_sede_principal) return;

      const { data, error } = await supabase
        .from("alertas")
        .select(`
          *,
          medicamentos (nombre, concentracion, presentacion),
          sedes (nombre, ciudad),
          inventario (lote, cantidad_actual, fecha_vencimiento)
        `)
        .eq("id_sede", usuario.id_sede_principal)
        .eq("estado", "activa")
        .order("nivel_prioridad", { ascending: false })
        .order("fecha_generada", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((alerta: any) => ({
        ...alerta,
        medicamento_nombre: alerta.medicamentos?.nombre,
        medicamento_concentracion: alerta.medicamentos?.concentracion,
        medicamento_presentacion: alerta.medicamentos?.presentacion,
        sede_nombre: alerta.sedes?.nombre,
        sede_ciudad: alerta.sedes?.ciudad,
        lote: alerta.inventario?.[0]?.lote,
        cantidad_actual: alerta.inventario?.[0]?.cantidad_actual,
        fecha_vencimiento: alerta.inventario?.[0]?.fecha_vencimiento,
      })) || [];

      setAlertasMiSede(formattedData);

      // Calcular estadísticas
      const stats: AlertasStats = {
        total: formattedData.length,
        criticas: formattedData.filter((a: any) => a.nivel_prioridad === "CRITICA").length,
        vencimientoProximo: formattedData.filter((a: any) => a.tipo === "vencimiento").length,
        desabastecimientos: formattedData.filter((a: any) => a.tipo === "desabastecimiento").length,
      };
      setStatsMiSede(stats);
    } catch (error) {
      console.error("Error al cargar alertas de mi sede:", error);
      toast.error("Error al cargar alertas");
    }
  };

  const loadAlertasTodasSedes = async () => {
    try {
      const { data, error } = await supabase
        .from("alertas")
        .select(`
          *,
          medicamentos (nombre, concentracion, presentacion),
          sedes (nombre, ciudad)
        `)
        .eq("estado", "activa")
        .order("nivel_prioridad", { ascending: false })
        .order("fecha_generada", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((alerta: any) => ({
        ...alerta,
        medicamento_nombre: alerta.medicamentos?.nombre,
        medicamento_concentracion: alerta.medicamentos?.concentracion,
        medicamento_presentacion: alerta.medicamentos?.presentacion,
        sede_nombre: alerta.sedes?.nombre,
        sede_ciudad: alerta.sedes?.ciudad,
        dias_activa: Math.floor(
          (new Date().getTime() - new Date(alerta.fecha_generada).getTime()) / (1000 * 60 * 60 * 24)
        ),
      })) || [];

      setAlertasTodasSedes(formattedData);

      // Calcular estadísticas globales
      const stats = {
        total: formattedData.length,
        criticas: formattedData.filter((a: any) => a.nivel_prioridad === "CRITICA").length,
        altas: formattedData.filter((a: any) => a.nivel_prioridad === "ALTA").length,
        medias: formattedData.filter((a: any) => a.nivel_prioridad === "MEDIA").length,
        bajas: formattedData.filter((a: any) => a.nivel_prioridad === "BAJA").length,
      };
      setStatsGlobales(stats);
    } catch (error) {
      console.error("Error al cargar alertas de todas las sedes:", error);
      toast.error("Error al cargar alertas");
    }
  };

  const loadAlertasResueltas = async () => {
    try {
      const { data, error } = await supabase
        .from("alertas")
        .select(`
          *,
          medicamentos (nombre, concentracion),
          sedes (nombre, ciudad),
          usuarios!alertas_id_usuario_resolucion_fkey (nombre_completo)
        `)
        .eq("estado", "resuelta")
        .order("fecha_resolucion", { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((alerta: any) => {
        const horasResolucion = alerta.fecha_resolucion && alerta.fecha_generada
          ? Math.floor(
              (new Date(alerta.fecha_resolucion).getTime() - 
               new Date(alerta.fecha_generada).getTime()) / (1000 * 60 * 60)
            )
          : 0;

        return {
          ...alerta,
          medicamento_nombre: alerta.medicamentos?.nombre,
          medicamento_concentracion: alerta.medicamentos?.concentracion,
          sede_nombre: alerta.sedes?.nombre,
          sede_ciudad: alerta.sedes?.ciudad,
          resuelto_por: alerta.usuarios?.nombre_completo,
          horas_resolucion: horasResolucion,
        };
      }) || [];

      setAlertasResueltas(formattedData);

      // Calcular estadísticas de resueltas
      const total = formattedData.length;
      const promedioHoras = total > 0
        ? formattedData.reduce((sum: number, a: any) => sum + (a.horas_resolucion || 0), 0) / total
        : 0;

      setStatsResueltas({
        total,
        promedioHoras,
        usuarioActivo: "",
        tipoFrecuente: "",
      });
    } catch (error) {
      console.error("Error al cargar alertas resueltas:", error);
      toast.error("Error al cargar alertas resueltas");
    }
  };

  const resolverAlerta = async (alertaId: number, observaciones?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuario no autenticado");
        return false;
      }

      const { error } = await supabase
        .from("alertas")
        .update({
          estado: "resuelta",
          fecha_resolucion: new Date().toISOString(),
          id_usuario_resolucion: user.id,
        })
        .eq("id", alertaId);

      if (error) throw error;

      toast.success("Alerta marcada como resuelta");
      
      // Recargar alertas
      await loadAlertasMiSede();
      await loadAlertasTodasSedes();
      await loadAlertasResueltas();
      
      return true;
    } catch (error) {
      console.error("Error al resolver alerta:", error);
      toast.error("Error al resolver la alerta");
      return false;
    }
  };

  const getAlertaDetalle = async (alertaId: number) => {
    try {
      const { data, error } = await supabase
        .from("alertas")
        .select(`
          *,
          medicamentos (
            nombre, 
            concentracion, 
            presentacion, 
            principio_activo,
            categorias_patologias (nombre, nivel_prioridad)
          ),
          sedes (nombre, ciudad, tipo),
          inventario (lote, cantidad_actual, fecha_vencimiento, proveedor)
        `)
        .eq("id", alertaId)
        .single();

      if (error) throw error;

      return {
        ...data,
        medicamento: data.medicamentos,
        sede: data.sedes,
        inventario: data.inventario?.[0],
      };
    } catch (error) {
      console.error("Error al obtener detalle de alerta:", error);
      toast.error("Error al cargar detalles");
      return null;
    }
  };

  const getSedesConStock = async (medicamentoId: number, sedeExcluir: number) => {
    try {
      const { data, error } = await supabase
        .from("inventario")
        .select(`
          id_sede,
          cantidad_actual,
          sedes (nombre, ciudad)
        `)
        .eq("id_medicamento", medicamentoId)
        .neq("id_sede", sedeExcluir)
        .gt("cantidad_actual", 0);

      if (error) throw error;

      const agrupado = data?.reduce((acc: any, item: any) => {
        const sedeId = item.id_sede;
        if (!acc[sedeId]) {
          acc[sedeId] = {
            sede: item.sedes?.nombre,
            ciudad: item.sedes?.ciudad,
            stock: 0,
          };
        }
        acc[sedeId].stock += item.cantidad_actual;
        return acc;
      }, {});

      return Object.values(agrupado || {})
        .sort((a: any, b: any) => b.stock - a.stock)
        .slice(0, 3);
    } catch (error) {
      console.error("Error al obtener sedes con stock:", error);
      return [];
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([
        loadAlertasMiSede(),
        loadAlertasTodasSedes(),
        loadAlertasResueltas(),
      ]);
      setLoading(false);
    };
    load();
  }, []);

  return {
    alertasMiSede,
    alertasTodasSedes,
    alertasResueltas,
    statsMiSede,
    statsGlobales,
    statsResueltas,
    loading,
    resolverAlerta,
    getAlertaDetalle,
    getSedesConStock,
    reloadAlertas: async () => {
      await Promise.all([
        loadAlertasMiSede(),
        loadAlertasTodasSedes(),
        loadAlertasResueltas(),
      ]);
    },
  };
};
