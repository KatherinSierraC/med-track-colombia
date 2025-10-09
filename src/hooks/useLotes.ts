import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export const useLotesDisponibles = (medicamentoId: number | null, sedeId: number | null) => {
  return useQuery({
    queryKey: ["lotes-disponibles", medicamentoId, sedeId],
    queryFn: async () => {
      if (!medicamentoId || !sedeId) return [];

      const { data, error } = await supabase
        .from("inventario")
        .select("lote, cantidad_actual, fecha_vencimiento")
        .eq("id_medicamento", medicamentoId)
        .eq("id_sede", sedeId)
        .gt("cantidad_actual", 0)
        .order("fecha_vencimiento", { ascending: true }); // FEFO

      if (error) throw error;

      return data.map((item) => ({
        ...item,
        dias_vencer: differenceInDays(new Date(item.fecha_vencimiento), new Date()),
      }));
    },
    enabled: !!medicamentoId && !!sedeId,
  });
};
