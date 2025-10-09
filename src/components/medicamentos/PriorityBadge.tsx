import { Badge } from "@/components/ui/badge";

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

const priorityConfig = {
  CRITICA: { label: "CRÍTICA", className: "bg-priority-critical text-white" },
  ALTA: { label: "ALTA", className: "bg-priority-high text-white" },
  MEDIA: { label: "MEDIA", className: "bg-priority-medium text-white" },
  BAJA: { label: "BAJA", className: "bg-priority-low text-white" },
};

export const PriorityBadge = ({ priority, className = "" }: PriorityBadgeProps) => {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.BAJA;
  
  return (
    <Badge className={`${config.className} ${className}`}>
      {config.label}
    </Badge>
  );
};
