import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertaCard } from "@/components/alertas/AlertaCard";
import { ResolverAlertaModal } from "@/components/alertas/ResolverAlertaModal";
import { useAlertas } from "@/hooks/useAlertas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CheckCircle2, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Alertas = () => {
  const {
    alertasMiSede,
    alertasTodasSedes,
    alertasResueltas,
    statsMiSede,
    statsGlobales,
    statsResueltas,
    loading,
    resolverAlerta,
  } = useAlertas();

  const [resolverModalOpen, setResolverModalOpen] = useState(false);
  const [alertaSeleccionada, setAlertaSeleccionada] = useState<number | null>(null);
  const [alertaDescripcion, setAlertaDescripcion] = useState("");

  const handleResolveClick = (alertaId: number, descripcion: string) => {
    setAlertaSeleccionada(alertaId);
    setAlertaDescripcion(descripcion);
    setResolverModalOpen(true);
  };

  const handleConfirmResolve = async (observaciones?: string) => {
    if (alertaSeleccionada) {
      await resolverAlerta(alertaSeleccionada, observaciones);
      setAlertaSeleccionada(null);
    }
  };

  const formatHorasResolucion = (horas?: number) => {
    if (!horas) return "-";
    if (horas < 24) return `${horas} horas`;
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    return `${dias} días, ${horasRestantes} horas`;
  };

  const getColorHorasResolucion = (horas?: number) => {
    if (!horas) return "";
    if (horas < 24) return "text-green-600";
    if (horas <= 72) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alertas</h1>
          <p className="text-muted-foreground">
            Monitorea alertas de vencimientos, desabastecimiento y stock crítico
          </p>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Alertas</h1>
        <p className="text-muted-foreground">
          Monitorea alertas de vencimientos, desabastecimiento y stock crítico
        </p>
      </div>

      <Tabs defaultValue="mi-sede" className="space-y-6">
        <TabsList>
          <TabsTrigger value="mi-sede">Mi Sede</TabsTrigger>
          <TabsTrigger value="todas-sedes">Todas las Sedes</TabsTrigger>
          <TabsTrigger value="resueltas">Resueltas</TabsTrigger>
        </TabsList>

        {/* TAB 1: MI SEDE */}
        <TabsContent value="mi-sede" className="space-y-6">
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Alertas</p>
                  <p className="text-2xl font-bold">{statsMiSede.total}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Alertas Críticas</p>
                  <p className="text-2xl font-bold text-red-600">{statsMiSede.criticas}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-yellow-500">
              <div className="flex items-center gap-2">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Vencimiento Próximo</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {statsMiSede.vencimientoProximo}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-8 h-8 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Desabastecimientos</p>
                  <p className="text-2xl font-bold text-red-600">
                    {statsMiSede.desabastecimientos}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Lista de Alertas */}
          <div className="space-y-4">
            {alertasMiSede.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-600">
                      ¡Excelente! No hay alertas activas en tu sede
                    </h3>
                    <p className="text-muted-foreground mt-2">
                      Tu inventario está en buen estado
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              alertasMiSede.map((alerta) => (
                <AlertaCard
                  key={alerta.id}
                  alerta={alerta}
                  onResolve={() => handleResolveClick(alerta.id, alerta.descripcion)}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB 2: TODAS LAS SEDES */}
        <TabsContent value="todas-sedes" className="space-y-6">
          {/* Estadísticas Globales */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Activas</p>
                  <p className="text-2xl font-bold">{statsGlobales.total}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-red-500">
              <div>
                <p className="text-sm text-muted-foreground">CRÍTICA</p>
                <p className="text-2xl font-bold text-red-600">{statsGlobales.criticas}</p>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-orange-500">
              <div>
                <p className="text-sm text-muted-foreground">ALTA</p>
                <p className="text-2xl font-bold text-orange-600">{statsGlobales.altas}</p>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-yellow-500">
              <div>
                <p className="text-sm text-muted-foreground">MEDIA</p>
                <p className="text-2xl font-bold text-yellow-600">{statsGlobales.medias}</p>
              </div>
            </Card>

            <Card className="p-4 border-l-4 border-green-500">
              <div>
                <p className="text-sm text-muted-foreground">BAJA</p>
                <p className="text-2xl font-bold text-green-600">{statsGlobales.bajas}</p>
              </div>
            </Card>
          </div>

          {/* Tabla de Alertas */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Días Activa</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertasTodasSedes.map((alerta) => (
                  <TableRow
                    key={alerta.id}
                    className="border-l-4"
                    style={{
                      borderLeftColor:
                        alerta.nivel_prioridad === "CRITICA" ? "#dc2626" :
                        alerta.nivel_prioridad === "ALTA" ? "#ea580c" :
                        alerta.nivel_prioridad === "MEDIA" ? "#ca8a04" : "#16a34a"
                    }}
                  >
                    <TableCell>
                      <Badge variant="outline">{alerta.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      {alerta.medicamento_nombre} {alerta.medicamento_concentracion}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          alerta.nivel_prioridad === "CRITICA" ? "bg-red-600" :
                          alerta.nivel_prioridad === "ALTA" ? "bg-orange-600" :
                          alerta.nivel_prioridad === "MEDIA" ? "bg-yellow-600" : "bg-green-600"
                        }
                      >
                        {alerta.nivel_prioridad}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {alerta.sede_nombre} ({alerta.sede_ciudad})
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {alerta.descripcion}
                    </TableCell>
                    <TableCell>
                      {format(new Date(alerta.fecha_generada), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <span className={
                        (alerta.dias_activa || 0) > 7 ? "text-red-600 font-bold" :
                        (alerta.dias_activa || 0) > 3 ? "text-yellow-600" : ""
                      }>
                        {alerta.dias_activa} días
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveClick(alerta.id, alerta.descripcion)}
                      >
                        ✅ Resolver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* TAB 3: RESUELTAS */}
        <TabsContent value="resueltas" className="space-y-6">
          {/* Estadísticas de Resueltas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Resueltas</p>
                  <p className="text-2xl font-bold">{statsResueltas.total}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Tiempo Promedio</p>
                  <p className="text-lg font-bold">
                    {statsResueltas.promedioHoras > 0
                      ? formatHorasResolucion(Math.round(statsResueltas.promedioHoras))
                      : "-"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabla de Alertas Resueltas */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Generada</TableHead>
                  <TableHead>Resuelta</TableHead>
                  <TableHead>Tiempo Resolución</TableHead>
                  <TableHead>Resuelto Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertasResueltas.map((alerta) => (
                  <TableRow key={alerta.id} className="bg-muted/30">
                    <TableCell>
                      <Badge variant="outline">{alerta.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      {alerta.medicamento_nombre} {alerta.medicamento_concentracion}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{alerta.nivel_prioridad}</Badge>
                    </TableCell>
                    <TableCell>
                      {alerta.sede_nombre} ({alerta.sede_ciudad})
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {alerta.descripcion}
                    </TableCell>
                    <TableCell>
                      {format(new Date(alerta.fecha_generada), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {alerta.fecha_resolucion
                        ? format(new Date(alerta.fecha_resolucion), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <span className={getColorHorasResolucion(alerta.horas_resolucion)}>
                        {formatHorasResolucion(alerta.horas_resolucion)}
                      </span>
                    </TableCell>
                    <TableCell>{alerta.resuelto_por || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <ResolverAlertaModal
        open={resolverModalOpen}
        onOpenChange={setResolverModalOpen}
        onConfirm={handleConfirmResolve}
        alertaDescripcion={alertaDescripcion}
      />
    </div>
  );
};

export default Alertas;
