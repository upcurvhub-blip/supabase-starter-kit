import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Building2, Clock, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingSeller {
  id: string;
  business_name: string;
  city?: string;
  state?: string;
  created_at: string;
  user_email?: string;
  business_type?: string;
}

interface PendingApprovalsCardProps {
  sellers: PendingSeller[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isLoading?: boolean;
}

export const PendingApprovalsCard = ({ sellers, onApprove, onReject, isLoading }: PendingApprovalsCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Pending Seller Approvals
            {sellers.length > 0 && (
              <Badge variant="destructive" className="rounded-full">
                {sellers.length}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {sellers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Check className="h-10 w-10 mx-auto mb-2 text-green-500" />
            <p>All caught up! No pending approvals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sellers.slice(0, 5).map((seller) => (
              <div 
                key={seller.id} 
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{seller.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {seller.city}{seller.state && `, ${seller.state}`}
                    </p>
                    {seller.business_type && (
                      <Badge variant="outline" className="mt-1 text-xs">{seller.business_type}</Badge>
                    )}
                    <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      Applied {formatDistanceToNow(new Date(seller.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => onReject(seller.id)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => onApprove(seller.id)}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingApprovalsCard;
