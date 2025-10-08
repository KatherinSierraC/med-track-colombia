import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface InventarioItem {
  id: number;
  lote: string;
  cantidad_actual: number;
  fecha_vencimiento: string;
  medicamentos: {
    nombre: string;
    concentracion: string;
    presentacion: string;
    principio_activo: string;
    categorias_patologias: {
      nivel_prioridad: string;
    };
  };
  sedes: {
    nombre: string;
  };
}

const Inventario = () => {
  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventario();
  }, []);

  const loadInventario = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventario")
      .select(`
        *,
        medicamentos(
          nombre,
          concentracion,
          presentacion,
          principio_activo,
          categorias_patologias(nivel_prioridad)
        ),
        sedes(nombre)
      `)
      .order("id", { ascending: false });

    if (data && !error) {
      setInventario(data as any);
    }
    setLoading(false);
  };

  const filteredInventario = inventario.filter((item) => {
    const searchLower = busqueda.toLowerCase();
    return (
      item.medicamentos?.nombre?.toLowerCase().includes(searchLower) ||
      item.medicamentos?.principio_activo?.toLowerCase().includes(searchLower) ||
      item.sedes?.nombre?.toLowerCase().includes(searchLower) ||
      item.lote?.toLowerCase().includes(searchLower)
    );
  });

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "CRITICA":
        return "bg-[#dc2626] text-white";
      case "ALTA":
        return "bg-[#ea580c] text-white";
      case "MEDIA":
        return "bg-[#f59e0b] text-white";
      case "BAJA":
        return "bg-[#10b981] text-white";
      default:
        return "bg-secondary";
    }
  };

  const getStockColor = (cantidad: number) => {
    if (cantidad < 10) return "bg-red-100 text-red-800";
    if (cantidad <= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getDiasVencer = (fecha: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const dias = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return dias;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Inventario</h1>
        <p className="text-muted-foreground">Vista consolidada de todas las sedes</p>
      </div>

      {/* Barra de búsqueda */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, principio activo, sede o lote..."
            className="pl-10"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </Card>

      {/* Tabla de inventario */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4 font-semibold">Medicamento</th>
                <th className="text-left p-4 font-semibold">Principio Activo</th>
                <th className="text-left p-4 font-semibold">Sede</th>
                <th className="text-left p-4 font-semibold">Lote</th>
                <th className="text-left p-4 font-semibold">Cantidad</th>
                <th className="text-left p-4 font-semibold">F. Vencimiento</th>
                <th className="text-left p-4 font-semibold">Prioridad</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : filteredInventario.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center p-8 text-muted-foreground">
                    No se encontraron resultados
                  </td>
                </tr>
              ) : (
                filteredInventario.map((item) => {
                  const diasVencer = getDiasVencer(item.fecha_vencimiento);
                  const proximoVencer = diasVencer <= 30;

                  return (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="font-medium">
                          {item.medicamentos?.nombre} {item.medicamentos?.concentracion}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.medicamentos?.presentacion}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{item.medicamentos?.principio_activo}</td>
                      <td className="p-4 text-sm">{item.sedes?.nombre}</td>
                      <td className="p-4 text-sm font-mono">{item.lote}</td>
                      <td className="p-4">
                        <Badge className={getStockColor(item.cantidad_actual)}>
                          {item.cantidad_actual}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className={proximoVencer ? "text-red-600 font-medium" : ""}>
                          {new Date(item.fecha_vencimiento).toLocaleDateString("es-CO")}
                        </div>
                        {proximoVencer && (
                          <Badge variant="destructive" className="text-xs mt-1">
                            Próximo a vencer
                          </Badge>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge
                          className={getPrioridadColor(
                            item.medicamentos?.categorias_patologias?.nivel_prioridad
                          )}
                        >
                          {item.medicamentos?.categorias_patologias?.nivel_prioridad}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Inventario;
