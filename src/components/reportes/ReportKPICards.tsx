import { Card, CardContent } from "@/components/ui/card";
import { Package, TrendingUp, AlertTriangle, Clock, DollarSign, Building2, Users, CheckCircle } from "lucide-react";

export interface KPIData {
  title: string;
  value: string | number;
  icon: "package" | "trending" | "alert" | "clock" | "dollar" | "building" | "users" | "check";
  color?: "default" | "success" | "warning" | "danger";
}

interface ReportKPICardsProps {
  kpis: KPIData[];
}

const iconMap = {
  package: Package,
  trending: TrendingUp,
  alert: AlertTriangle,
  clock: Clock,
  dollar: DollarSign,
  building: Building2,
  users: Users,
  check: CheckCircle,
};

const colorMap = {
  default: "text-primary",
  success: "text-green-600",
  warning: "text-yellow-600",
  danger: "text-destructive",
};

const ReportKPICards = ({ kpis }: ReportKPICardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, index) => {
        const Icon = iconMap[kpi.icon];
        const colorClass = colorMap[kpi.color || "default"];

        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{kpi.title}</p>
                  <p className={`text-2xl font-bold ${colorClass}`}>{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg bg-muted`}>
                  <Icon className={`h-5 w-5 ${colorClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ReportKPICards;
