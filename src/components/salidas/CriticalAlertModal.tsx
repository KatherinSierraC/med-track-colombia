import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CriticalAlertModalProps {
  open: boolean;
  onClose: () => void;
  medicamentoNombre: string;
  sedeNombre: string;
  cantidadRestante: number;
}

export const CriticalAlertModal = ({
  open,
  onClose,
  medicamentoNombre,
  sedeNombre,
  cantidadRestante,
}: CriticalAlertModalProps) => {
  const navigate = useNavigate();

  const handleRedistribucion = () => {
    navigate("/redistribuciones");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <DialogTitle className="text-destructive">⚠️ ALERTA CRÍTICA</DialogTitle>
          </div>
          <DialogDescription>
            Stock crítico detectado
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertDescription className="text-sm">
            El medicamento <strong>{medicamentoNombre}</strong> ha llegado a nivel crítico en{" "}
            <strong>{sedeNombre}</strong>. Quedan solo <strong>{cantidadRestante}</strong>{" "}
            {cantidadRestante === 1 ? "unidad" : "unidades"}.
          </AlertDescription>
        </Alert>

        <p className="text-sm text-muted-foreground">
          Se recomienda solicitar redistribución inmediata para evitar desabastecimiento.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Entendido
          </Button>
          <Button variant="destructive" onClick={handleRedistribucion}>
            Solicitar Redistribución Ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
