import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSedes = () => {
  return useQuery({
    queryKey: ["sedes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sedes")
        .select("id, nombre, ciudad")
        .eq("activo", true)
        .order("nombre");

      if (error) throw error;
      return data;
    },
  });
};

export const useSedesWithStock = (medicamentoId: number | null) => {
  return useQuery({
    queryKey: ["sedes-with-stock", medicamentoId],
    queryFn: async () => {
      if (!medicamentoId) return [];

      const { data, error } = await supabase
        .from("inventario")
        .select(`
          id_sede,
          cantidad_actual,
          sedes (
            id,
            nombre,
            ciudad
          )
        `)
        .eq("id_medicamento", medicamentoId)
        .gt("cantidad_actual", 0);

      if (error) throw error;

      // Group by sede and sum quantities
      const sedeMap = new Map();
      data.forEach((item: any) => {
        const sedeId = item.id_sede;
        if (sedeMap.has(sedeId)) {
          sedeMap.get(sedeId).stock_total += item.cantidad_actual;
        } else {
          sedeMap.set(sedeId, {
            id: item.sedes.id,
            nombre: item.sedes.nombre,
            ciudad: item.sedes.ciudad,
            stock_total: item.cantidad_actual,
          });
        }
      });

      return Array.from(sedeMap.values());
    },
    enabled: !!medicamentoId,
  });
};
