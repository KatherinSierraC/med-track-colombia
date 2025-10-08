import { Card } from "@/components/ui/card";

const Alertas = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Alertas</h1>
        <p className="text-muted-foreground">
          Monitorea alertas de vencimientos, desabastecimiento y stock crítico
        </p>
      </div>

      <Card className="p-8 text-center text-muted-foreground">
        <p className="text-lg">Módulo en desarrollo</p>
        <p className="text-sm mt-2">Próximamente disponible</p>
      </Card>
    </div>
  );
};

export default Alertas;
