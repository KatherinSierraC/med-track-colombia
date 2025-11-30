import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import ReportSelector, { ReportType } from "@/components/reportes/ReportSelector";
import ReportConfiguration, { ReportFilters } from "@/components/reportes/ReportConfiguration";
import ReportResults from "@/components/reportes/ReportResults";
import { useReportes } from "@/hooks/useReportes";
import { supabase } from "@/integrations/supabase/client";

const initialFilters: ReportFilters = {
  fechaDesde: undefined,
  fechaHasta: undefined,
  soloMiSede: true,
  sedesSeleccionadas: [],
  prioridades: [],
  estadosStock: [],
  medicamentoId: null,
  tiposMovimiento: [],
  estadosRedistribucion: [],
  tiposAlerta: [],
  estadoAlerta: "todas",
};

const Reportes = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [userSedeId, setUserSedeId] = useState<number | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);
  const { isLoading, reportData, generateReport, setReportData } = useReportes();

  useEffect(() => {
    const fetchUserSede = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: usuario } = await supabase
          .from("usuarios")
          .select("id_sede_principal")
          .eq("id", user.id)
          .maybeSingle();
        
        if (usuario?.id_sede_principal) {
          setUserSedeId(usuario.id_sede_principal);
        }
      }
    };
    fetchUserSede();
  }, []);

  const handleSelectReport = (report: ReportType) => {
    setSelectedReport(report);
    setFilters(initialFilters);
    setReportData(null);
    setHasGenerated(false);
  };

  const handleGenerateReport = () => {
    if (selectedReport) {
      generateReport(selectedReport, filters, userSedeId);
      setHasGenerated(true);
    }
  };

  const handleClearFilters = () => {
    setFilters(initialFilters);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground">
          Genera reportes detallados de movimientos e inventario
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
        {/* Columna Izquierda - Selector */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ReportSelector
            selectedReport={selectedReport}
            onSelectReport={handleSelectReport}
          />
        </div>

        {/* Columna Derecha - Configuración y Resultados */}
        <div className="space-y-6">
          {!selectedReport ? (
            <Card className="p-12">
              <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-6 rounded-full bg-muted">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-foreground">
                    Selecciona un tipo de reporte
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    Elige un tipo de reporte del menú lateral para comenzar a generar
                    informes detallados sobre tu inventario y operaciones.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <ReportConfiguration
                selectedReport={selectedReport}
                filters={filters}
                onFiltersChange={setFilters}
                onGenerateReport={handleGenerateReport}
                onClearFilters={handleClearFilters}
                isLoading={isLoading}
              />

              {hasGenerated && (
                <ReportResults
                  reportType={selectedReport}
                  data={reportData}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reportes;
