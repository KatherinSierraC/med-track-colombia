import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useMedicamentos = () => {
  return useQuery({
    queryKey: ["medicamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicamentos")
        .select("id, nombre, concentracion, presentacion")
        .order("nombre");

      if (error) throw error;
      return data;
    },
  });
};

export const useMedicamentoWithPriority = (medicamentoId: number | null) => {
  return useQuery({
    queryKey: ["medicamento-priority", medicamentoId],
    queryFn: async () => {
      if (!medicamentoId) return null;

      const { data, error } = await supabase
        .from("medicamentos")
        .select(`
          *,
          categorias_patologias (
            nivel_prioridad,
            nombre
          )
        `)
        .eq("id", medicamentoId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!medicamentoId,
  });
};

export const useMedicamentosWithStock = () => {
  return useQuery({
    queryKey: ["medicamentos-with-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medicamentos")
        .select(`
          id, 
          nombre, 
          concentracion, 
          presentacion,
          inventario!inner(cantidad_actual)
        `)
        .gt("inventario.cantidad_actual", 0)
        .order("nombre");

      if (error) throw error;
      
      // Get unique medications
      const uniqueMeds = data.reduce((acc: any[], curr) => {
        if (!acc.find(m => m.id === curr.id)) {
          acc.push(curr);
        }
        return acc;
      }, []);
      
      return uniqueMeds;
    },
  });
};
