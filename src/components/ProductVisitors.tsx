import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Clock, User, Lock, Package } from "lucide-react";

interface ProductVisitorsProps {
  sellerId: string;
}

export function ProductVisitors({ sellerId }: ProductVisitorsProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // Check if viewer data is enabled
  const { data: viewerDataEnabled } = useQuery({
    queryKey: ["viewer-data-setting"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "enable_viewer_data_for_sellers")
        .single();
      return data?.value === true || data?.value === "true";
    },
  });

  // Fetch seller's products
  const { data: products } = useQuery({
    queryKey: ["seller-products-list", sellerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
    enabled: !!sellerId && viewerDataEnabled === true,
  });

  // Fetch visitors for selected product
  const { data: visitors, isLoading } = useQuery({
    queryKey: ["product-visitors", sellerId, selectedProduct],
    queryFn: async () => {
      let query = supabase
        .from("product_views")
        .select(`
          id,
          product_id,
          user_id,
          session_id,
          view_duration,
          created_at,
          products!inner(id, name, seller_id),
          profiles:user_id(id, full_name, email, phone)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (selectedProduct !== "all") {
        query = query.eq("product_id", selectedProduct);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filter by seller_id on client side (products inner join ensures this)
      return data?.filter(v => v.products?.seller_id === sellerId) || [];
    },
    enabled: !!sellerId && viewerDataEnabled === true,
  });

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!viewerDataEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Product Visitors
          </CardTitle>
          <CardDescription>This feature is not enabled by the platform administrator</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Visitor data access is currently disabled.</p>
            <p className="text-sm">Contact the platform admin to enable this feature.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Product Visitors
            </CardTitle>
            <CardDescription>See who visited your products</CardDescription>
          </div>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Loading visitors...</div>
        ) : visitors && visitors.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Visited At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.map((visitor) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      {visitor.profiles ? (
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {visitor.profiles.full_name || "Unknown"}
                          </div>
                          {visitor.profiles.email && (
                            <div className="text-sm text-muted-foreground">{visitor.profiles.email}</div>
                          )}
                          {visitor.profiles.phone && (
                            <div className="text-sm text-muted-foreground">{visitor.profiles.phone}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>Anonymous Visitor</span>
                          <Badge variant="outline" className="text-xs">
                            {visitor.session_id?.slice(0, 8)}...
                          </Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {visitor.products?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDuration(visitor.view_duration || 0)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(visitor.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No visitors yet for the selected product(s).</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}