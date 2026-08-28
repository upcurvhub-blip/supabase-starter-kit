import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FunnelStage {
  name: string;
  count: number;
  color: string;
}

interface LeadsFunnelProps {
  stages: FunnelStage[];
  totalLeads: number;
}

export const LeadsFunnel = ({ stages, totalLeads }: LeadsFunnelProps) => {
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Lead Pipeline</CardTitle>
          <Badge variant="outline">{totalLeads} Total</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, index) => {
          const width = Math.max((stage.count / maxCount) * 100, 10);
          const conversionRate = index > 0 && stages[index - 1].count > 0 
            ? ((stage.count / stages[index - 1].count) * 100).toFixed(0)
            : null;
          
          return (
            <div key={stage.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{stage.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{stage.count}</span>
                  {conversionRate && (
                    <span className="text-xs text-muted-foreground">({conversionRate}%)</span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-muted rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${width}%`, backgroundColor: stage.color }}
                >
                  {width > 20 && (
                    <span className="text-xs font-medium text-white">{stage.count}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="pt-4 border-t mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Conversion</span>
            <span className="font-bold text-green-600">
              {stages.length > 0 && stages[0].count > 0 
                ? ((stages[stages.length - 1]?.count || 0) / stages[0].count * 100).toFixed(1)
                : 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadsFunnel;
