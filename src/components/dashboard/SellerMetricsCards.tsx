import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Package, Eye, MessageSquare, Star, Clock, Target, Zap } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const MetricCard = ({ title, value, change, changeLabel, icon, color = "primary", subtitle }: MetricCardProps) => {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4" style={{ borderLeftColor: `hsl(var(--${color}))` }}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            {icon}
          </div>
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
            {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
            <span className={`text-xs font-medium ${isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-muted-foreground'}`}>
              {isPositive && '+'}{change}% {changeLabel || 'vs last month'}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface SellerMetricsCardsProps {
  totalProducts: number;
  totalLeads: number;
  leadsThisMonth: number;
  leadsLimit: number;
  totalViews: number;
  conversionRate: number;
  responseRate: number;
  avgResponseTime: number;
  trustScore: number;
  viewsChange?: number;
  conversionChange?: number;
}

export const SellerMetricsCards = ({
  totalProducts,
  totalLeads,
  leadsThisMonth,
  leadsLimit,
  totalViews,
  conversionRate,
  responseRate,
  avgResponseTime,
  trustScore,
  viewsChange,
  conversionChange,
}: SellerMetricsCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <MetricCard
        title="Total Products"
        value={totalProducts}
        icon={<Package className="h-5 w-5 text-primary" />}
        color="primary"
      />
      <MetricCard
        title="Total Leads"
        value={totalLeads}
        icon={<Users className="h-5 w-5 text-blue-500" />}
        color="blue"
        subtitle={`${leadsThisMonth}/${leadsLimit} this month`}
      />
      <MetricCard
        title="Product Views"
        value={totalViews.toLocaleString()}
        icon={<Eye className="h-5 w-5 text-purple-500" />}
        color="purple"
        change={viewsChange}
      />
      <MetricCard
        title="Conversion Rate"
        value={`${conversionRate.toFixed(1)}%`}
        icon={<Target className="h-5 w-5 text-green-500" />}
        color="green"
        change={conversionChange}
      />
      <MetricCard
        title="Trust Score"
        value={trustScore}
        icon={<Star className="h-5 w-5 text-yellow-500" />}
        color="yellow"
        subtitle="out of 100"
      />
    </div>
  );
};

export default SellerMetricsCards;
