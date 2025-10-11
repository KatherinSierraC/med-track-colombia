import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ResolverAlertaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (observaciones?: string) => void;
  alertaDescripcion: string;
}

export const ResolverAlertaModal = ({
  open,
  onOpenChange,
  onConfirm,
  alertaDescripcion,
}: ResolverAlertaModalProps) => {
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await onConfirm(observaciones || undefined);
    setLoading(false);
    setObservaciones("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Marcar esta alerta como resuelta?</DialogTitle>
          <DialogDescription>
            {alertaDescripcion}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="observaciones">
            Observaciones sobre la resolución (opcional)
          </Label>
          <Textarea
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: Se realizó pedido al proveedor, se solicitó redistribución, etc."
            rows={3}
            maxLength={300}
          />
          <p className="text-xs text-muted-foreground">
            {observaciones.length}/300 caracteres
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Procesando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
