import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface StockSuggestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicamentoId: number | null;
  medicamentoNombre: string;
  onSelectSede: (sedeId: number) => void;
}

export const StockSuggestionsModal = ({
  open,
  onOpenChange,
  medicamentoId,
  medicamentoNombre,
  onSelectSede,
}: StockSuggestionsModalProps) => {
  const { data: sedes, isLoading } = useQuery({
    queryKey: ["stock-suggestions", medicamentoId],
    queryFn: async () => {
      if (!medicamentoId) return [];

      const { data, error } = await supabase
        .from("inventario")
        .select(`
          id_sede,
          cantidad_actual,
          fecha_vencimiento,
          lote,
          sedes (
            id,
            nombre,
            ciudad,
            tipo
          )
        `)
        .eq("id_medicamento", medicamentoId)
        .gt("cantidad_actual", 0);

      if (error) throw error;

      // Group by sede and aggregate
      const sedeMap = new Map();
      data.forEach((item: any) => {
        const sedeId = item.id_sede;
        if (sedeMap.has(sedeId)) {
          const current = sedeMap.get(sedeId);
          current.stock_total += item.cantidad_actual;
          current.num_lotes += 1;
          if (
            new Date(item.fecha_vencimiento) <
            new Date(current.fecha_vencimiento_proximo)
          ) {
            current.fecha_vencimiento_proximo = item.fecha_vencimiento;
          }
        } else {
          sedeMap.set(sedeId, {
            ...item.sedes,
            stock_total: item.cantidad_actual,
            num_lotes: 1,
            fecha_vencimiento_proximo: item.fecha_vencimiento,
          });
        }
      });

      return Array.from(sedeMap.values()).sort((a, b) => b.stock_total - a.stock_total);
    },
    enabled: !!medicamentoId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Sedes con Stock Disponible de {medicamentoNombre}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Cargando...</p>
        ) : !sedes || sedes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No hay sedes con stock disponible de este medicamento
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Sede</th>
                  <th className="text-left p-3 font-semibold">Ciudad</th>
                  <th className="text-left p-3 font-semibold">Stock Disponible</th>
                  <th className="text-left p-3 font-semibold">Número de Lotes</th>
                  <th className="text-left p-3 font-semibold">Vencimiento Más Próximo</th>
                  <th className="text-left p-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {sedes.map((sede: any) => (
                  <tr
                    key={sede.id}
                    className={`border-b hover:bg-accent/50 transition-colors ${
                      sede.stock_total > 50 ? "bg-green-50 dark:bg-green-950/20" : ""
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sede.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {sede.tipo}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{sede.ciudad}</td>
                    <td className="p-3">
                      <span className="font-semibold text-lg">{sede.stock_total}</span> unidades
                    </td>
                    <td className="p-3">{sede.num_lotes}</td>
                    <td className="p-3">
                      {format(new Date(sede.fecha_vencimiento_proximo), "dd/MM/yyyy", {
                        locale: es,
                      })}
                    </td>
                    <td className="p-3">
                      <Button
                        size="sm"
                        onClick={() => {
                          onSelectSede(sede.id);
                          onOpenChange(false);
                        }}
                      >
                        Seleccionar Esta Sede
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
