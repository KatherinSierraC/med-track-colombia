import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRedistribuciones = (filters?: {
  prioridad?: string;
  estado?: string;
  sedeOrigen?: number;
  sedeDestino?: number;
}) => {
  return useQuery({
    queryKey: ["redistribuciones", filters],
    queryFn: async () => {
      let query = supabase
        .from("redistribuciones")
        .select(`
          *,
          medicamentos (
            id,
            nombre,
            concentracion,
            presentacion
          ),
          sede_origen:sedes!redistribuciones_id_sede_origen_fkey (
            id,
            nombre,
            ciudad
          ),
          sede_destino:sedes!redistribuciones_id_sede_destino_fkey (
            id,
            nombre,
            ciudad
          ),
          solicitante:usuarios!redistribuciones_id_solicitante_fkey (
            id,
            nombre_completo
          )
        `)
        .order("fecha_solicitud", { ascending: false });

      if (filters?.prioridad && filters.prioridad !== "Todas") {
        query = query.or(`prioridad_automatica.eq.${filters.prioridad},prioridad_ajustada.eq.${filters.prioridad}`);
      }

      if (filters?.estado && filters.estado !== "Todas") {
        query = query.eq("estado", filters.estado);
      }

      if (filters?.sedeOrigen) {
        query = query.eq("id_sede_origen", filters.sedeOrigen);
      }

      if (filters?.sedeDestino) {
        query = query.eq("id_sede_destino", filters.sedeDestino);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
};

export const useRedistribucionStats = () => {
  return useQuery({
    queryKey: ["redistribucion-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("redistribuciones")
        .select("id, estado, prioridad_automatica, prioridad_ajustada");

      if (error) throw error;

      const total = data.length;
      const pendientes = data.filter((r) => r.estado === "solicitada").length;
      const completadas = data.filter((r) => r.estado === "completada").length;
      const criticasPendientes = data.filter(
        (r) =>
          r.estado === "solicitada" &&
          (r.prioridad_ajustada === "CRITICA" || r.prioridad_automatica === "CRITICA")
      ).length;

      return { total, pendientes, completadas, criticasPendientes };
    },
  });
};

export const useRedistribucionDetails = (id: number | null) => {
  return useQuery({
    queryKey: ["redistribucion-details", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("redistribuciones")
        .select(`
          *,
          medicamentos (
            id,
            nombre,
            concentracion,
            presentacion,
            principio_activo,
            categorias_patologias (
              nombre,
              nivel_prioridad
            )
          ),
          sede_origen:sedes!redistribuciones_id_sede_origen_fkey (
            id,
            nombre,
            ciudad,
            tipo
          ),
          sede_destino:sedes!redistribuciones_id_sede_destino_fkey (
            id,
            nombre,
            ciudad,
            tipo
          ),
          solicitante:usuarios!redistribuciones_id_solicitante_fkey (
            id,
            nombre_completo,
            email,
            sedes (
              nombre
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Get current stock in origin
      const { data: stockData } = await supabase
        .from("inventario")
        .select("cantidad_actual")
        .eq("id_medicamento", data.id_medicamento)
        .eq("id_sede", data.id_sede_origen);

      const stockActual = stockData?.reduce((sum, item) => sum + item.cantidad_actual, 0) || 0;

      return { ...data, stockActual };
    },
    enabled: !!id,
  });
};

export const useCreateRedistribucion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id_medicamento: number;
      id_sede_origen: number;
      id_sede_destino: number;
      cantidad_solicitada: number;
      prioridad_automatica: string;
      prioridad_ajustada?: string;
      justificacion_prioridad?: string;
      motivo: string;
      cantidad_pacientes_afectados?: number;
      id_solicitante: string;
    }) => {
      // Get optimal lot from origin
      const { data: lotData, error: lotError } = await supabase
        .from("inventario")
        .select("lote, cantidad_actual, fecha_vencimiento")
        .eq("id_medicamento", data.id_medicamento)
        .eq("id_sede", data.id_sede_origen)
        .gte("cantidad_actual", data.cantidad_solicitada)
        .order("fecha_vencimiento", { ascending: true })
        .limit(1)
        .single();

      let lote = lotData?.lote;

      if (lotError || !lote) {
        // Get first available lot
        const { data: firstLot } = await supabase
          .from("inventario")
          .select("lote")
          .eq("id_medicamento", data.id_medicamento)
          .eq("id_sede", data.id_sede_origen)
          .gt("cantidad_actual", 0)
          .order("fecha_vencimiento", { ascending: true })
          .limit(1)
          .single();

        lote = firstLot?.lote;
      }

      // Create redistribution
      const { data: redistribucion, error: redistError } = await supabase
        .from("redistribuciones")
        .insert({
          id_medicamento: data.id_medicamento,
          id_sede_origen: data.id_sede_origen,
          id_sede_destino: data.id_sede_destino,
          cantidad_solicitada: data.cantidad_solicitada,
          lote,
          prioridad_automatica: data.prioridad_automatica,
          prioridad_ajustada: data.prioridad_ajustada || null,
          justificacion_prioridad: data.justificacion_prioridad || null,
          estado: "solicitada",
          id_solicitante: data.id_solicitante,
          motivo: data.motivo,
          cantidad_pacientes_afectados: data.cantidad_pacientes_afectados || null,
        })
        .select()
        .single();

      if (redistError) throw redistError;

      // Create critical alert if needed
      const prioridadFinal = data.prioridad_ajustada || data.prioridad_automatica;
      if (prioridadFinal === "CRITICA") {
        const { data: infoData } = await supabase
          .from("redistribuciones")
          .select(`
            medicamentos (nombre),
            sede_origen:sedes!redistribuciones_id_sede_origen_fkey (nombre),
            sede_destino:sedes!redistribuciones_id_sede_destino_fkey (nombre)
          `)
          .eq("id", redistribucion.id)
          .single();

        if (infoData) {
          await supabase.from("alertas").insert({
            tipo: "critico",
            id_medicamento: data.id_medicamento,
            id_sede: data.id_sede_destino,
            nivel_prioridad: "CRITICA",
            descripcion: `🚨 Solicitud CRÍTICA de redistribución: ${infoData.medicamentos.nombre} desde ${infoData.sede_origen.nombre} hacia ${infoData.sede_destino.nombre} - ${data.cantidad_solicitada} unidades`,
            estado: "activa",
          });
        }
      }

      return { redistribucion, prioridadFinal };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redistribuciones"] });
      queryClient.invalidateQueries({ queryKey: ["redistribucion-stats"] });
    },
  });
};

export const useCompleteRedistribucion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      redistribucionId: number;
      cantidadAprobada: number;
      observaciones?: string;
      userId: string;
    }) => {
      const { redistribucionId, cantidadAprobada, observaciones, userId } = params;

      // Get redistribution details
      const { data: redistribucion, error: redistError } = await supabase
        .from("redistribuciones")
        .select("*")
        .eq("id", redistribucionId)
        .single();

      if (redistError) throw redistError;

      // Verify stock in origin
      const { data: stockData } = await supabase
        .from("inventario")
        .select("cantidad_actual")
        .eq("id_medicamento", redistribucion.id_medicamento)
        .eq("id_sede", redistribucion.id_sede_origen);

      const totalStock = stockData?.reduce((sum, item) => sum + item.cantidad_actual, 0) || 0;

      if (totalStock < cantidadAprobada) {
        throw new Error("Stock insuficiente en sede origen");
      }

      // Update redistribution status
      await supabase
        .from("redistribuciones")
        .update({
          estado: "completada",
          fecha_completado: new Date().toISOString(),
        })
        .eq("id", redistribucionId);

      // Get lot with sufficient stock
      const { data: lotData, error: lotError } = await supabase
        .from("inventario")
        .select("*")
        .eq("id_medicamento", redistribucion.id_medicamento)
        .eq("id_sede", redistribucion.id_sede_origen)
        .gte("cantidad_actual", cantidadAprobada)
        .order("fecha_vencimiento", { ascending: true })
        .limit(1)
        .single();

      if (lotError) throw new Error("No hay lote con stock suficiente");

      // Update origin inventory
      await supabase
        .from("inventario")
        .update({
          cantidad_actual: lotData.cantidad_actual - cantidadAprobada,
        })
        .eq("id", lotData.id);

      // Check if lot exists in destination
      const { data: destLot } = await supabase
        .from("inventario")
        .select("id, cantidad_actual")
        .eq("id_medicamento", redistribucion.id_medicamento)
        .eq("id_sede", redistribucion.id_sede_destino)
        .eq("lote", lotData.lote)
        .single();

      if (destLot) {
        // Update existing lot in destination
        await supabase
          .from("inventario")
          .update({
            cantidad_actual: destLot.cantidad_actual + cantidadAprobada,
          })
          .eq("id", destLot.id);
      } else {
        // Create new lot in destination
        await supabase.from("inventario").insert({
          id_medicamento: redistribucion.id_medicamento,
          id_sede: redistribucion.id_sede_destino,
          lote: lotData.lote,
          cantidad_actual: cantidadAprobada,
          fecha_vencimiento: lotData.fecha_vencimiento,
          fecha_ingreso: new Date().toISOString().split("T")[0],
          proveedor: lotData.proveedor,
          precio_unitario: lotData.precio_unitario,
        });
      }

      // Get sede names for movements
      const { data: sedeOrigen } = await supabase
        .from("sedes")
        .select("nombre")
        .eq("id", redistribucion.id_sede_origen)
        .single();

      const { data: sedeDestino } = await supabase
        .from("sedes")
        .select("nombre")
        .eq("id", redistribucion.id_sede_destino)
        .single();

      // Create movement records
      await supabase.from("movimientos").insert([
        {
          tipo: "salida",
          id_medicamento: redistribucion.id_medicamento,
          id_sede: redistribucion.id_sede_origen,
          cantidad: cantidadAprobada,
          lote: lotData.lote,
          id_usuario: userId,
          observaciones: `Redistribución #${redistribucionId} hacia ${sedeDestino?.nombre}${observaciones ? ` - ${observaciones}` : ""}`,
        },
        {
          tipo: "entrada",
          id_medicamento: redistribucion.id_medicamento,
          id_sede: redistribucion.id_sede_destino,
          cantidad: cantidadAprobada,
          lote: lotData.lote,
          id_usuario: userId,
          observaciones: `Redistribución #${redistribucionId} desde ${sedeOrigen?.nombre}${observaciones ? ` - ${observaciones}` : ""}`,
        },
      ]);

      // Resolve related alerts
      await supabase
        .from("alertas")
        .update({
          estado: "resuelta",
          fecha_resolucion: new Date().toISOString(),
          id_usuario_resolucion: userId,
        })
        .eq("id_medicamento", redistribucion.id_medicamento)
        .eq("id_sede", redistribucion.id_sede_destino)
        .in("tipo", ["desabastecimiento", "stock_minimo"])
        .eq("estado", "activa");

      // Check if origin stock is now critical
      const newStock = lotData.cantidad_actual - cantidadAprobada;
      if (newStock < 10 && newStock > 0) {
        const { data: medData } = await supabase
          .from("medicamentos")
          .select("nombre, categorias_patologias(nivel_prioridad)")
          .eq("id", redistribucion.id_medicamento)
          .single();

        await supabase.from("alertas").insert({
          tipo: "stock_minimo",
          id_medicamento: redistribucion.id_medicamento,
          id_sede: redistribucion.id_sede_origen,
          nivel_prioridad: medData?.categorias_patologias?.nivel_prioridad || "BAJA",
          descripcion: `Stock bajo después de redistribución: ${medData?.nombre} en ${sedeOrigen?.nombre}`,
          estado: "activa",
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["redistribuciones"] });
      queryClient.invalidateQueries({ queryKey: ["redistribucion-stats"] });
      queryClient.invalidateQueries({ queryKey: ["redistribucion-details"] });
    },
  });
};
