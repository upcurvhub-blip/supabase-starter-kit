import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare, Clock, ArrowRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface Lead {
  id: string;
  buyer_name: string;
  buyer_email?: string;
  buyer_phone?: string;
  product_name?: string;
  message?: string;
  status: string;
  created_at: string;
  lead_score?: number;
}

interface RecentLeadsListProps {
  leads: Lead[];
  onStatusChange?: (id: string, status: string) => void;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  interested: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  lost: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export const RecentLeadsList = ({ leads, onStatusChange }: RecentLeadsListProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Recent Leads</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/seller/leads" className="flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No leads yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leads.slice(0, 5).map((lead) => (
              <div 
                key={lead.id} 
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{lead.buyer_name || "Unknown"}</span>
                    <Badge className={`text-xs ${statusColors[lead.status] || statusColors.new}`}>
                      {lead.status}
                    </Badge>
                    {lead.lead_score && lead.lead_score > 70 && (
                      <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                        🔥 Hot Lead
                      </Badge>
                    )}
                  </div>
                  {lead.product_name && (
                    <p className="text-xs text-muted-foreground">Enquiry for: {lead.product_name}</p>
                  )}
                  {lead.message && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{lead.message}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                    </span>
                    {lead.buyer_phone && (
                      <a href={`tel:${lead.buyer_phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentLeadsList;
