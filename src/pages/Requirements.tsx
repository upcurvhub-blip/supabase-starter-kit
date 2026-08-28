import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceLayout } from "@/components/layouts/MarketplaceLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  MapPin, 
  Calendar, 
  IndianRupee, 
  Package,
  Search,
  Filter,
  Users,
  Clock,
  Building2,
} from "lucide-react";
import { PageMeta } from "@/components/seo/PageMeta";
import { ListSkeleton } from "@/components/ui/loading-states";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Requirements() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Fetch open requirements
  const { data: requirements, isLoading } = useQuery({
    queryKey: ["public-requirements", categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from("requirements")
        .select(`
          *,
          categories(id, name, slug),
          profiles!requirements_buyer_id_fkey(full_name, avatar_url)
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);

      if (categoryFilter !== "all") {
        query = query.eq("category_id", categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch categories for filter
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const filteredRequirements = requirements?.filter((req) =>
    searchQuery
      ? req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const statusColors: Record<string, string> = {
    open: "bg-success/10 text-success border-success/20",
    in_progress: "bg-info/10 text-info border-info/20",
    fulfilled: "bg-primary/10 text-primary border-primary/20",
    closed: "bg-muted text-muted-foreground",
    expired: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <MarketplaceLayout>
      <PageMeta title="Live Buyer Requirements & RFQs" description="Browse live buyer requirements and RFQs posted by Indian businesses. Sellers can respond with quotes in minutes and win new orders." path="/requirements" />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Buyer Requirements</h1>
            <p className="text-muted-foreground">
              Browse active requirements from buyers looking for suppliers
            </p>
          </div>
          <Button asChild className="gradient-accent">
            <Link to="/post-requirement">
              <FileText className="h-4 w-4 mr-2" />
              Post Your Requirement
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-64">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{requirements?.length || 0}</div>
                <div className="text-xs text-muted-foreground">Open Requirements</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Users className="h-5 w-5 text-success" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {new Set(requirements?.map((r) => r.buyer_id)).size || 0}
                </div>
                <div className="text-xs text-muted-foreground">Active Buyers</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Package className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {categories?.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Categories</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <div className="text-2xl font-bold">24h</div>
                <div className="text-xs text-muted-foreground">Avg Response</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requirements List */}
        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : filteredRequirements && filteredRequirements.length > 0 ? (
          <div className="grid gap-4">
            {filteredRequirements.map((req: any) => (
              <Card key={req.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Buyer Info */}
                    <div className="flex items-center gap-3 md:w-48 shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {req.profiles?.avatar_url ? (
                          <img 
                            src={req.profiles.avatar_url} 
                            alt="" 
                            className="w-full h-full rounded-full object-cover" 
                          />
                        ) : (
                          <Building2 className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{req.profiles?.full_name || "Anonymous"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(req.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Requirement Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="font-semibold text-lg">{req.title}</h3>
                        <Badge className={statusColors[req.status || "open"]}>
                          {req.status || "open"}
                        </Badge>
                      </div>
                      
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {req.description}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        {req.categories && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Package className="h-4 w-4" />
                            <span>{req.categories.name}</span>
                          </div>
                        )}
                        {req.quantity && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">{req.quantity}</span>
                            <span>{req.quantity_unit || "Units"}</span>
                          </div>
                        )}
                        {(req.budget_min || req.budget_max) && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <IndianRupee className="h-4 w-4" />
                            <span>
                              {req.budget_min?.toLocaleString()}
                              {req.budget_max && ` - ${req.budget_max.toLocaleString()}`}
                            </span>
                          </div>
                        )}
                        {req.location && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{req.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-4 w-4" />
                          <span>{req.response_count || 0} responses</span>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="md:w-32 shrink-0">
                      <Button className="w-full" size="sm">
                        Send Quote
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Requirements Found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Be the first to post a requirement"}
              </p>
              <Button asChild>
                <Link to="/post-requirement">Post Requirement</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MarketplaceLayout>
  );
}