import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  className?: string;
  color?: "primary" | "success" | "warning" | "danger" | "info" | "accent";
}

const colorClasses = {
  primary: "from-primary/20 to-primary/5 border-primary/20",
  success: "from-success/20 to-success/5 border-success/20",
  warning: "from-warning/20 to-warning/5 border-warning/20",
  danger: "from-destructive/20 to-destructive/5 border-destructive/20",
  info: "from-info/20 to-info/5 border-info/20",
  accent: "from-accent/20 to-accent/5 border-accent/20",
};

const iconColors = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
  info: "text-info",
  accent: "text-accent",
};

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel, 
  icon, 
  className,
  color = "primary" 
}: MetricCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className={cn(
      "bg-gradient-to-br border-2 transition-all hover:shadow-lg",
      colorClasses[color],
      className
    )}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {isPositive && <TrendingUp className="h-4 w-4 text-success" />}
                {isNegative && <TrendingDown className="h-4 w-4 text-destructive" />}
                {!isPositive && !isNegative && <Minus className="h-4 w-4 text-muted-foreground" />}
                <span className={cn(
                  "font-medium",
                  isPositive && "text-success",
                  isNegative && "text-destructive"
                )}>
                  {isPositive ? "+" : ""}{change}%
                </span>
                {changeLabel && <span className="text-muted-foreground">{changeLabel}</span>}
              </div>
            )}
          </div>
          {icon && (
            <div className={cn("p-3 rounded-xl bg-background/60", iconColors[color])}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  max?: number;
  color?: "primary" | "success" | "warning" | "danger" | "info" | "accent";
  showValue?: boolean;
}

const progressColors = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-info",
  accent: "bg-accent",
};

export function ProgressBar({ 
  label, 
  value, 
  max = 100, 
  color = "primary",
  showValue = true 
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        {showValue && <span className="text-muted-foreground">{value}/{max}</span>}
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-500", progressColors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title?: string;
  centerLabel?: string;
  centerValue?: string | number;
}

export function DonutChart({ data, title, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let currentAngle = 0;
  
  const segments = data.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...item, startAngle, angle };
  });

  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex items-center gap-6">
        <div className="relative w-32 h-32">
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            {segments.map((segment, i) => {
              const radius = 15.9155;
              const circumference = 2 * Math.PI * radius;
              const strokeDasharray = `${(segment.angle / 360) * circumference} ${circumference}`;
              const strokeDashoffset = -((segment.startAngle / 360) * circumference);
              
              return (
                <circle
                  key={i}
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="4"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              );
            })}
          </svg>
          {(centerLabel || centerValue) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {centerValue && <span className="text-2xl font-bold">{centerValue}</span>}
              {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
            </div>
          )}
        </div>
        <div className="space-y-2 flex-1">
          {data.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface DataTableRowProps {
  data: Record<string, React.ReactNode>;
  columns: { key: string; label: string; width?: string }[];
}

interface DataTableProps {
  columns: { key: string; label: string; width?: string }[];
  rows: Record<string, React.ReactNode>[];
  title?: string;
  emptyMessage?: string;
}

export function DataTable({ columns, rows, title, emptyMessage = "No data available" }: DataTableProps) {
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                {columns.map((col) => (
                  <th 
                    key={col.key}
                    className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    style={{ width: col.width }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i} className="hover:bg-muted/30 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="p-3 text-sm">
                        {row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface FunnelStepProps {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
}

interface FunnelChartProps {
  steps: FunnelStepProps[];
  title?: string;
}

export function FunnelChart({ steps, title }: FunnelChartProps) {
  const maxValue = Math.max(1, ...steps.map(s => s.value));
  
  return (
    <Card>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {steps.map((step, i) => {
          const width = (step.value / maxValue) * 100;
          return (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <div className="flex items-center gap-2">
                  <span>{step.value.toLocaleString()}</span>
                  {step.percentage !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      {step.percentage}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                <div 
                  className="h-full rounded-lg bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                  style={{ 
                    width: `${width}%`,
                    backgroundColor: step.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface TrendSparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function TrendSparkline({ data, color = "hsl(var(--primary))", height = 32 }: TrendSparklineProps) {
  if (data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
