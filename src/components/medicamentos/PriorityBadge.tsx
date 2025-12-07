/**
 * @file PriorityBadge.tsx
 * @description Componente que muestra una insignia visual para indicar el nivel de prioridad
 * de un medicamento o alerta. Utiliza colores distintivos para cada nivel de prioridad.
 */

import { Badge } from "@/components/ui/badge";

/**
 * Props para el componente PriorityBadge
 * @interface PriorityBadgeProps
 * @property {string} priority - Nivel de prioridad: "CRITICA" | "ALTA" | "MEDIA" | "BAJA"
 * @property {string} [className] - Clases CSS adicionales opcionales
 */
interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

/**
 * Configuración de estilos y etiquetas para cada nivel de prioridad
 * - CRITICA: Rojo intenso - Requiere atención inmediata
 * - ALTA: Naranja - Prioridad elevada
 * - MEDIA: Amarillo - Prioridad moderada
 * - BAJA: Verde - Sin urgencia
 */
const priorityConfig = {
  CRITICA: { label: "CRÍTICA", className: "bg-priority-critical text-white" },
  ALTA: { label: "ALTA", className: "bg-priority-high text-white" },
  MEDIA: { label: "MEDIA", className: "bg-priority-medium text-white" },
  BAJA: { label: "BAJA", className: "bg-priority-low text-white" },
};

/**
 * Componente PriorityBadge
 * 
 * Renderiza una insignia (badge) con el color y texto correspondiente
 * al nivel de prioridad especificado. Si la prioridad no es válida,
 * utiliza la configuración de "BAJA" por defecto.
 * 
 * @example
 * // Uso básico
 * <PriorityBadge priority="CRITICA" />
 * 
 * @example
 * // Con clases adicionales
 * <PriorityBadge priority="ALTA" className="ml-2" />
 * 
 * @param {PriorityBadgeProps} props - Props del componente
 * @returns {JSX.Element} Insignia estilizada con el nivel de prioridad
 */
export const PriorityBadge = ({ priority, className = "" }: PriorityBadgeProps) => {
  // Obtener configuración según prioridad, con fallback a BAJA
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.BAJA;
  
  return (
    <Badge className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
};
