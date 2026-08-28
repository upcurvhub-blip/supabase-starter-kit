import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Package, 
  CreditCard, 
  BarChart3, 
  Settings, 
  HelpCircle,
  Megaphone,
  FileText,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  href: string;
  variant?: "default" | "outline" | "secondary";
  description?: string;
}

interface QuickActionsProps {
  role: "seller" | "admin";
}

export const QuickActions = ({ role }: QuickActionsProps) => {
  const sellerActions: QuickAction[] = [
    { label: "Add Product", icon: <Plus className="h-4 w-4" />, href: "/seller/products", variant: "default", description: "List a new product" },
    { label: "Manage Products", icon: <Package className="h-4 w-4" />, href: "/seller/products", variant: "outline", description: "Edit your listings" },
    { label: "View Leads", icon: <Users className="h-4 w-4" />, href: "/seller/leads", variant: "outline", description: "Respond to enquiries" },
    { label: "Analytics", icon: <BarChart3 className="h-4 w-4" />, href: "/seller/analytics", variant: "outline", description: "Track performance" },
    { label: "Upgrade Plan", icon: <CreditCard className="h-4 w-4" />, href: "/seller/subscription", variant: "outline", description: "Get more leads" },
    { label: "Edit Profile", icon: <Settings className="h-4 w-4" />, href: "/seller/profile", variant: "outline", description: "Update business info" },
  ];

  const adminActions: QuickAction[] = [
    { label: "Manage Sellers", icon: <Users className="h-4 w-4" />, href: "/admin/sellers", variant: "default", description: "Approve or manage sellers" },
    { label: "Manage Categories", icon: <Package className="h-4 w-4" />, href: "/admin/categories", variant: "outline", description: "Organize products" },
    { label: "View Leads", icon: <FileText className="h-4 w-4" />, href: "/admin/leads", variant: "outline", description: "Monitor all leads" },
    { label: "Manage Plans", icon: <CreditCard className="h-4 w-4" />, href: "/admin/plans", variant: "outline", description: "Subscription plans" },
    { label: "Platform Settings", icon: <Settings className="h-4 w-4" />, href: "/admin/settings", variant: "outline", description: "Configure platform" },
    { label: "Announcements", icon: <Megaphone className="h-4 w-4" />, href: "/admin/settings", variant: "outline", description: "Send notifications" },
  ];

  const actions = role === "admin" ? adminActions : sellerActions;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {actions.map((action) => (
            <Button 
              key={action.label} 
              variant={action.variant || "outline"} 
              asChild 
              className="h-auto py-3 flex flex-col items-center gap-1"
            >
              <Link to={action.href}>
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
