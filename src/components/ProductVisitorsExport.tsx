import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";

interface Visitor {
  id: string;
  created_at: string;
  view_duration: number | null;
  user_id: string | null;
  session_id: string | null;
  profiles?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  product?: {
    name: string;
    category?: { name: string } | null;
  };
}

interface ProductVisitorsExportProps {
  visitors: Visitor[];
  categories?: { id: string; name: string }[];
  products?: { id: string; name: string; category_id: string | null }[];
  onFilter?: (categoryId: string | null, productId: string | null) => void;
}

export function ProductVisitorsExport({
  visitors,
  categories = [],
  products = [],
  onFilter,
}: ProductVisitorsExportProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedProduct("all");
    onFilter?.(value === "all" ? null : value, null);
  };

  const handleProductChange = (value: string) => {
    setSelectedProduct(value);
    onFilter?.(
      selectedCategory === "all" ? null : selectedCategory,
      value === "all" ? null : value
    );
  };

  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter(p => p.category_id === selectedCategory);

  const formatDuration = (seconds: number | null) => {
    if (!seconds || seconds === 0) return "< 1s";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "Time",
      "Product",
      "Category",
      "Visitor Name",
      "Email",
      "Phone",
      "Duration",
      "Type"
    ];

    const rows = visitors.map(v => [
      format(new Date(v.created_at), "yyyy-MM-dd"),
      format(new Date(v.created_at), "HH:mm:ss"),
      v.product?.name || "N/A",
      v.product?.category?.name || "N/A",
      v.profiles?.full_name || "Anonymous",
      v.profiles?.email || "-",
      v.profiles?.phone || "-",
      formatDuration(v.view_duration),
      v.user_id ? "Registered" : "Anonymous"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `visitors_${format(new Date(), "yyyy-MM-dd_HHmmss")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const registeredCount = visitors.filter(v => v.user_id).length;
  const anonymousCount = visitors.filter(v => !v.user_id).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Category:</span>
          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Product:</span>
          <Select value={selectedProduct} onValueChange={handleProductChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              {filteredProducts.map(prod => (
                <SelectItem key={prod.id} value={prod.id}>
                  {prod.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              {registeredCount} Registered
            </Badge>
            <Badge variant="outline" className="bg-muted">
              {anonymousCount} Anonymous
            </Badge>
          </div>
          
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold">{visitors.length}</p>
          <p className="text-sm text-muted-foreground">Total Visits</p>
        </div>
        <div className="p-4 rounded-lg bg-success/10 text-center">
          <p className="text-2xl font-bold text-success">{registeredCount}</p>
          <p className="text-sm text-muted-foreground">Registered Users</p>
        </div>
        <div className="p-4 rounded-lg bg-muted/50 text-center">
          <p className="text-2xl font-bold">{anonymousCount}</p>
          <p className="text-sm text-muted-foreground">Anonymous</p>
        </div>
        <div className="p-4 rounded-lg bg-primary/10 text-center">
          <p className="text-2xl font-bold text-primary">
            {visitors.length > 0 
              ? Math.round((registeredCount / visitors.length) * 100) 
              : 0}%
          </p>
          <p className="text-sm text-muted-foreground">Conversion Rate</p>
        </div>
      </div>
    </div>
  );
}
