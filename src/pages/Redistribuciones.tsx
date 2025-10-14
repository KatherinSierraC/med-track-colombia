import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriorityBadge } from "@/components/medicamentos/PriorityBadge";
import { StockSuggestionsModal } from "@/components/redistribuciones/StockSuggestionsModal";
import { RedistributionDetailsModal } from "@/components/redistribuciones/RedistributionDetailsModal";
import { useMedicamentos, useMedicamentoWithPriority } from "@/hooks/useMedicamentos";
import { useSedes, useSedesWithStock } from "@/hooks/useSedes";
import { useRedistribuciones, useRedistribucionStats, useCreateRedistribucion } from "@/hooks/useRedistribuciones";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Eye, AlertCircle, Lightbulb, ChevronDown } from "lucide-react";

const Redistribuciones = () => {
  const [activeTab, setActiveTab] = useState("solicitar");
  
  // Form state
  const [selectedMedicamento, setSelectedMedicamento] = useState<number | null>(null);
  const [sedeOrigen, setSedeOrigen] = useState<number | null>(null);
  const [sedeDestino, setSedeDestino] = useState<number | null>(null);
  const [cantidad, setCantidad] = useState<number>(0);
  const [justificacion, setJustificacion] = useState("");
  const [pacientesAfectados, setPacientesAfectados] = useState<number | undefined>();
  const [modificarPrioridad, setModificarPrioridad] = useState(false);
  const [nuevaPrioridad, setNuevaPrioridad] = useState<string>("");
  const [justificacionPrioridad, setJustificacionPrioridad] = useState("");
  
  // Modal states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedRedistribucion, setSelectedRedistribucion] = useState<number | null>(null);
  
  // Filters for Tab 2
  const [filterPrioridad, setFilterPrioridad] = useState("Todas");
  const [filterEstado, setFilterEstado] = useState("Todas");
  const [filterSedeOrigen, setFilterSedeOrigen] = useState<number | undefined>();
  const [filterSedeDestino, setFilterSedeDestino] = useState<number | undefined>();
  
  // Hooks
  const { data: medicamentos } = useMedicamentos();
  const { data: medicamentoInfo } = useMedicamentoWithPriority(selectedMedicamento);
  const { data: sedesConStock } = useSedesWithStock(selectedMedicamento);
  const { data: sedes } = useSedes();
  const { data: stats } = useRedistribucionStats();
  const { data: redistribuciones } = useRedistribuciones({
    prioridad: filterPrioridad,
    estado: filterEstado,
    sedeOrigen: filterSedeOrigen,
    sedeDestino: filterSedeDestino,
  });
  const createMutation = useCreateRedistribucion();
  
  const prioridadAuto = medicamentoInfo?.categorias_patologias?.nivel_prioridad;
  const requiresJustification = prioridadAuto === "CRITICA" || prioridadAuto === "ALTA";
  
  const handleSubmit = async () => {
    try {
      // Validations
      if (!selectedMedicamento || !sedeOrigen || !sedeDestino || !cantidad || !justificacion.trim()) {
        toast.error("❌ Por favor complete todos los campos obligatorios");
        return;
      }
      
      if (sedeOrigen === sedeDestino) {
        toast.error("❌ La sede de origen y destino no pueden ser la misma");
        return;
      }
      
      if (requiresJustification && !justificacion.trim()) {
        toast.error("❌ La justificación médica es obligatoria para medicamentos de prioridad CRÍTICA y ALTA");
        return;
      }
      
      if (modificarPrioridad && !justificacionPrioridad.trim()) {
        toast.error("❌ Debe justificar el cambio de prioridad");
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");
      
      const result = await createMutation.mutateAsync({
        id_medicamento: selectedMedicamento,
        id_sede_origen: sedeOrigen,
        id_sede_destino: sedeDestino,
        cantidad_solicitada: cantidad,
        prioridad_automatica: prioridadAuto || "BAJA",
        prioridad_ajustada: modificarPrioridad ? nuevaPrioridad : undefined,
        justificacion_prioridad: modificarPrioridad ? justificacionPrioridad : undefined,
        motivo: justificacion,
        cantidad_pacientes_afectados: pacientesAfectados,
        id_solicitante: user.id,
      });
      
      toast.success(`✅ Solicitud de redistribución enviada exitosamente`);
      toast.info(`📋 Número de solicitud: #${result.redistribucion.id}`);
      
      if (result.prioridadFinal === "CRITICA") {
        toast.error("⚠️ Se generó una alerta crítica para esta solicitud");
      }
      
      // Reset form
      setSelectedMedicamento(null);
      setSedeOrigen(null);
      setSedeDestino(null);
      setCantidad(0);
      setJustificacion("");
      setPacientesAfectados(undefined);
      setModificarPrioridad(false);
      setNuevaPrioridad("");
      setJustificacionPrioridad("");
      
      // Switch to Tab 2
      setActiveTab("ver");
    } catch (error: any) {
      toast.error(error.message || "Error al crear la solicitud");
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Redistribuciones</h1>
        <p className="text-muted-foreground">Solicita y gestiona redistribuciones entre sedes</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="solicitar">Solicitar Redistribución</TabsTrigger>
          <TabsTrigger value="ver">Ver Todas las Redistribuciones</TabsTrigger>
        </TabsList>
        
        <TabsContent value="solicitar" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Solicitar Redistribución</h2>
            
            <div className="space-y-4">
              {/* Campo 1: Medicamento */}
              <div>
                <Label htmlFor="medicamento">Medicamento *</Label>
                <Select value={selectedMedicamento?.toString()} onValueChange={(v) => setSelectedMedicamento(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un medicamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicamentos?.map((med) => (
                      <SelectItem key={med.id} value={med.id.toString()}>
                        {med.nombre} {med.concentracion} {med.presentacion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {medicamentoInfo && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={prioridadAuto || "BAJA"} />
                      <span className="text-sm">
                        Prioridad automática: {prioridadAuto} ({medicamentoInfo.categorias_patologias?.nombre})
                      </span>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSuggestions(true)}
                      className="gap-2"
                    >
                      <Lightbulb className="h-4 w-4" />
                      Sugerir Sedes con Disponibilidad
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Campo 2: Sede Origen */}
              <div>
                <Label htmlFor="sede-origen">Sede Origen *</Label>
                <Select
                  value={sedeOrigen?.toString()}
                  onValueChange={(v) => setSedeOrigen(Number(v))}
                  disabled={!selectedMedicamento}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedMedicamento ? "Primero seleccione un medicamento" : "Seleccione sede origen"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sedesConStock?.map((sede: any) => (
                      <SelectItem key={sede.id} value={sede.id.toString()}>
                        {sede.nombre} - {sede.ciudad} | Stock: {sede.stock_total}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedMedicamento && sedesConStock?.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-1">⚠️ No hay sedes con stock disponible de este medicamento</p>
                )}
              </div>
              
              {/* Campo 3: Sede Destino */}
              <div>
                <Label htmlFor="sede-destino">Sede Destino *</Label>
                <Select value={sedeDestino?.toString()} onValueChange={(v) => setSedeDestino(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione sede destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedes?.filter(s => s.id !== sedeOrigen).map((sede) => (
                      <SelectItem key={sede.id} value={sede.id.toString()}>
                        {sede.nombre} - {sede.ciudad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Campo 4: Cantidad */}
              <div>
                <Label htmlFor="cantidad">Cantidad Solicitada *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min={1}
                  placeholder="Cantidad a redistribuir"
                  value={cantidad || ""}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                />
              </div>
              
              {/* Campo 5: Justificación */}
              <div>
                <Label htmlFor="justificacion">Justificación Médica *</Label>
                <Textarea
                  id="justificacion"
                  placeholder="Explique por qué se necesita esta redistribución..."
                  rows={4}
                  maxLength={1000}
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                />
                {requiresJustification && (
                  <p className="text-sm text-red-600 mt-1">* Campo obligatorio para medicamentos de prioridad CRÍTICA y ALTA</p>
                )}
              </div>
              
              {/* Campo 6: Pacientes Afectados */}
              <div>
                <Label htmlFor="pacientes">Número Estimado de Pacientes Afectados</Label>
                <Input
                  id="pacientes"
                  type="number"
                  min={1}
                  placeholder="Ej: 10"
                  value={pacientesAfectados || ""}
                  onChange={(e) => setPacientesAfectados(Number(e.target.value) || undefined)}
                />
                <p className="text-xs text-muted-foreground mt-1">Ayuda a priorizar la redistribución</p>
              </div>
              
              {/* Modificar Prioridad */}
              <Collapsible open={modificarPrioridad} onOpenChange={setModificarPrioridad}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="gap-2 w-full justify-start">
                    <Checkbox checked={modificarPrioridad} />
                    Modificar prioridad manualmente en casos excepcionales
                    <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${modificarPrioridad ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-4 pl-6">
                  <div>
                    <Label>Nueva Prioridad *</Label>
                    <Select value={nuevaPrioridad} onValueChange={setNuevaPrioridad}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione nueva prioridad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CRITICA">CRÍTICA</SelectItem>
                        <SelectItem value="ALTA">ALTA</SelectItem>
                        <SelectItem value="MEDIA">MEDIA</SelectItem>
                        <SelectItem value="BAJA">BAJA</SelectItem>
                      </SelectContent>
                    </Select>
                    {prioridadAuto && (
                      <p className="text-sm text-muted-foreground mt-1">Prioridad actual: {prioridadAuto}</p>
                    )}
                  </div>
                  
                  <div>
                    <Label>Justificación del Cambio de Prioridad *</Label>
                    <Textarea
                      placeholder="OBLIGATORIO: Explique en detalle por qué es necesario modificar la prioridad..."
                      rows={3}
                      maxLength={500}
                      value={justificacionPrioridad}
                      onChange={(e) => setJustificacionPrioridad(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{justificacionPrioridad.length}/500</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={handleSubmit} disabled={createMutation.isPending} className="flex-1">
                  {createMutation.isPending ? "Enviando..." : "Enviar Solicitud de Redistribución"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelectedMedicamento(null);
                    setSedeOrigen(null);
                    setSedeDestino(null);
                    setCantidad(0);
                    setJustificacion("");
                    setPacientesAfectados(undefined);
                    setModificarPrioridad(false);
                    setNuevaPrioridad("");
                    setJustificacionPrioridad("");
                  }}
                >
                  Limpiar Formulario
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="ver" className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-3xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs">📊 Redistribuciones</p>
            </Card>
            <Card className="p-4 border-yellow-200">
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.pendientes || 0}</p>
              <p className="text-xs">⏳ En proceso</p>
            </Card>
            <Card className="p-4 border-green-200">
              <p className="text-sm text-muted-foreground">Completadas</p>
              <p className="text-3xl font-bold text-green-600">{stats?.completadas || 0}</p>
              <p className="text-xs">✅ Finalizadas</p>
            </Card>
            <Card className={`p-4 ${(stats?.criticasPendientes || 0) > 0 ? "border-red-500 bg-red-50 dark:bg-red-950/20" : ""}`}>
              <p className="text-sm text-muted-foreground">Críticas Pendientes</p>
              <p className="text-3xl font-bold text-red-600">{stats?.criticasPendientes || 0}</p>
              <p className="text-xs">🚨 Urgentes</p>
            </Card>
          </div>
          
          {/* Filters */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Prioridad</Label>
                <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    <SelectItem value="CRITICA">CRÍTICA</SelectItem>
                    <SelectItem value="ALTA">ALTA</SelectItem>
                    <SelectItem value="MEDIA">MEDIA</SelectItem>
                    <SelectItem value="BAJA">BAJA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    <SelectItem value="solicitada">Solicitada</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sede Origen</Label>
                <Select value={filterSedeOrigen?.toString() || "all"} onValueChange={(v) => setFilterSedeOrigen(v === "all" ? undefined : Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {sedes?.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id.toString()}>{sede.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sede Destino</Label>
                <Select value={filterSedeDestino?.toString() || "all"} onValueChange={(v) => setFilterSedeDestino(v === "all" ? undefined : Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {sedes?.map((sede) => (
                      <SelectItem key={sede.id} value={sede.id.toString()}>{sede.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setFilterPrioridad("Todas");
                setFilterEstado("Todas");
                setFilterSedeOrigen(undefined);
                setFilterSedeDestino(undefined);
              }}
            >
              Limpiar Filtros
            </Button>
          </Card>
          
          {/* Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Solicitud</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Sede Origen</TableHead>
                  <TableHead>Sede Destino</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redistribuciones?.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>#{r.id}</TableCell>
                    <TableCell>{r.medicamentos.nombre} {r.medicamentos.concentracion}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={r.prioridad_ajustada || r.prioridad_automatica} />
                    </TableCell>
                    <TableCell>{r.sede_origen.nombre} ({r.sede_origen.ciudad})</TableCell>
                    <TableCell>{r.sede_destino.nombre} ({r.sede_destino.ciudad})</TableCell>
                    <TableCell>{r.cantidad_solicitada} unidades</TableCell>
                    <TableCell>
                      <Badge variant={r.estado === "completada" ? "default" : "secondary"}>
                        {r.estado === "completada" ? "Completada" : "Solicitada"}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(r.fecha_solicitud), "dd/MM/yyyy HH:mm", { locale: es })}</TableCell>
                    <TableCell>{r.solicitante.nombre_completo}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedRedistribucion(r.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
      
      <StockSuggestionsModal
        open={showSuggestions}
        onOpenChange={setShowSuggestions}
        medicamentoId={selectedMedicamento}
        medicamentoNombre={medicamentoInfo?.nombre || ""}
        onSelectSede={(sedeId) => setSedeOrigen(sedeId)}
      />
      
      <RedistributionDetailsModal
        open={!!selectedRedistribucion}
        onOpenChange={(open) => !open && setSelectedRedistribucion(null)}
        redistribucionId={selectedRedistribucion}
      />
    </div>
  );
};

export default Redistribuciones;
