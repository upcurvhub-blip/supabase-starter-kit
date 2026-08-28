import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MessageSquare, TrendingUp, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

interface Product {
  id: string;
  name: string;
  slug: string;
  image?: string;
  views: number;
  enquiries: number;
  conversion_rate: number;
  is_active: boolean;
}

interface TopProductsTableProps {
  products: Product[];
}

export const TopProductsTable = ({ products }: TopProductsTableProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Top Performing Products</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/seller/products">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Enquiries</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.slice(0, 5).map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden shrink-0">
                      {product.image ? (
                        <img src={product.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">N/A</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link 
                        to={`/product/${product.slug}`} 
                        className="font-medium text-sm hover:text-primary truncate block"
                      >
                        {product.name}
                      </Link>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Eye className="h-3 w-3 text-muted-foreground" />
                    <span>{product.views.toLocaleString()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    <span>{product.enquiries}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className={`h-3 w-3 ${product.conversion_rate > 5 ? 'text-green-500' : 'text-muted-foreground'}`} />
                    <span className={product.conversion_rate > 5 ? 'text-green-600 font-medium' : ''}>
                      {product.conversion_rate.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={product.is_active ? "default" : "secondary"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default TopProductsTable;
