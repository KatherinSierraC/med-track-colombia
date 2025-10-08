import { Card } from "@/components/ui/card";

const Salidas = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Registro de Salidas</h1>
        <p className="text-muted-foreground">
          Registra la dispensación de medicamentos a pacientes
        </p>
      </div>

      <Card className="p-8 text-center text-muted-foreground">
        <p className="text-lg">Módulo en desarrollo</p>
        <p className="text-sm mt-2">Próximamente disponible</p>
      </Card>
    </div>
  );
};

export default Salidas;
