import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, Package, Store, MessageSquare, FileText, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
  trend?: "up" | "down" | "neutral";
}

const StatCard = ({ title, value, change, icon, color, trend }: StatCardProps) => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {trend === "up" && <TrendingUp className="h-3 w-3 text-green-500" />}
              {trend === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
              <span className={`text-xs ${trend === "up" ? "text-green-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"}`}>
                {change > 0 && "+"}{change}% this month
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

interface AdminStatsGridProps {
  stats: {
    totalUsers: number;
    totalSellers: number;
    pendingSellers: number;
    totalProducts: number;
    totalLeads: number;
    totalRequirements: number;
    activeSubscriptions: number;
    revenue: number;
  };
}

export const AdminStatsGrid = ({ stats }: AdminStatsGridProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Total Users"
        value={stats.totalUsers.toLocaleString()}
        change={12}
        trend="up"
        icon={<Users className="h-5 w-5 text-white" />}
        color="bg-blue-500"
      />
      <StatCard
        title="Active Sellers"
        value={stats.totalSellers}
        change={8}
        trend="up"
        icon={<Store className="h-5 w-5 text-white" />}
        color="bg-green-500"
      />
      <StatCard
        title="Pending Approvals"
        value={stats.pendingSellers}
        icon={<AlertTriangle className="h-5 w-5 text-white" />}
        color="bg-yellow-500"
      />
      <StatCard
        title="Total Products"
        value={stats.totalProducts.toLocaleString()}
        change={15}
        trend="up"
        icon={<Package className="h-5 w-5 text-white" />}
        color="bg-purple-500"
      />
      <StatCard
        title="Total Leads"
        value={stats.totalLeads.toLocaleString()}
        change={22}
        trend="up"
        icon={<MessageSquare className="h-5 w-5 text-white" />}
        color="bg-pink-500"
      />
      <StatCard
        title="Requirements"
        value={stats.totalRequirements}
        change={5}
        trend="up"
        icon={<FileText className="h-5 w-5 text-white" />}
        color="bg-indigo-500"
      />
      <StatCard
        title="Subscriptions"
        value={stats.activeSubscriptions}
        change={18}
        trend="up"
        icon={<CreditCard className="h-5 w-5 text-white" />}
        color="bg-teal-500"
      />
      <StatCard
        title="Revenue"
        value={`₹${stats.revenue.toLocaleString()}`}
        change={25}
        trend="up"
        icon={<TrendingUp className="h-5 w-5 text-white" />}
        color="bg-emerald-500"
      />
    </div>
  );
};

export default AdminStatsGrid;
