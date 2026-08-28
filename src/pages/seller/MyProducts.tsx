import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidatePublicProductQueries } from "@/lib/queryKeys";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Package, Image, Pencil, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";

const COMMON_SPEC_FIELDS = [
  "Product Type", "Brand", "Material", "Grade / Quality",
  "Packaging Size", "Packaging Type", "Usage / Application", "Color",
  "Weight", "Size / Dimensions", "Country of Origin", "Model Number",
  "Warranty", "Certification", "Shelf Life", "Minimum Order Value",
];

const PAYMENT_METHODS = ["Online Payment", "COD", "Bank Transfer", "UPI", "Business Payment (Credit)"];

type WholesaleTier = { qty: string; price: string };

const EMPTY_FORM = {
  name: "",
  description: "",
  category_id: "",
  // pricing & selling
  selling_mode: "wholesale",
  mrp: "",
  selling_price: "",
  stock_quantity: "",
  min_purchase_qty: "1",
  sku: "",
  stock_availability: "in_stock",
  price_min: "",
  price_max: "",
  price_unit: "Per Piece",
  min_order_quantity: "1",
  moq_unit: "Piece",
  supply_capacity: "",
  lead_time: "",
  min_order_value: "",
  wholesale_tiers: [] as WholesaleTier[],
  // fulfillment
  delivery_available: true,
  delivery_scope: "pan_india",
  delivery_locations: "",
  delivery_time: "",
  pickup_available: false,
  cod_available: false,
  payment_methods: [] as string[],
  images: [] as string[],
  tags: "",
  video_url: "",
  specifications: {} as Record<string, string>,
};

type ProductForm = typeof EMPTY_FORM;

const num = (v: string) => (v !== "" && v != null && !isNaN(parseFloat(v)) ? parseFloat(v) : null);
const int = (v: string) => (v !== "" && v != null && !isNaN(parseInt(v)) ? parseInt(v) : null);

const pricingPayload = (d: ProductForm) => ({
  selling_mode: d.selling_mode,
  mrp: num(d.mrp),
  selling_price: num(d.selling_price),
  stock_quantity: int(d.stock_quantity),
  min_purchase_qty: int(d.min_purchase_qty) || 1,
  sku: d.sku || null,
  stock_availability: d.stock_availability,
  price_min: num(d.price_min),
  price_max: num(d.price_max),
  price_unit: d.price_unit,
  min_order_quantity: int(d.min_order_quantity) || 1,
  moq_unit: d.moq_unit,
  supply_capacity: d.supply_capacity || null,
  lead_time: d.lead_time || null,
  min_order_value: num(d.min_order_value),
  wholesale_tiers: d.wholesale_tiers
    .filter((t) => t.qty && t.price)
    .map((t) => ({ qty: t.qty, price: num(t.price) })),
  delivery_available: d.delivery_available,
  delivery_scope: d.delivery_scope,
  delivery_locations: d.delivery_locations
    ? d.delivery_locations.split(",").map((s) => s.trim()).filter(Boolean)
    : null,
  delivery_time: d.delivery_time || null,
  pickup_available: d.pickup_available,
  cod_available: d.cod_available,
  payment_methods: d.payment_methods.length ? d.payment_methods : null,
});


const MyProducts = () => {
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [parentCategoryId, setParentCategoryId] = useState<string>("");
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("seller_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["my-products"],
    queryFn: async () => {
      if (!sellerProfile) return [];
      const { data } = await supabase
        .from("products")
        .select("*, categories(name)")
        .eq("seller_id", sellerProfile.id)
        .order("created_at", { ascending: false });
      const rows = data || [];
      if (rows.length === 0) return rows;
      const { data: viewRows } = await supabase
        .from("product_views")
        .select("product_id")
        .in("product_id", rows.map((p: any) => p.id));
      const counts = (viewRows || []).reduce((acc: Record<string, number>, row: any) => {
        acc[row.product_id] = (acc[row.product_id] || 0) + 1;
        return acc;
      }, {});
      return rows.map((p: any) => ({ ...p, view_count: Math.max(p.view_count || 0, counts[p.id] || 0) }));
    },
    enabled: !!sellerProfile,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const resetForm = () => {
    setFormData({ ...EMPTY_FORM, wholesale_tiers: [], payment_methods: [], images: [], specifications: {} });
    setEditingProduct(null);
    setNewSpecKey("");
    setNewSpecValue("");
  };

  const openEditDialog = (product: any) => {
    setEditingProduct(product);
    const cat = categories?.find((c: any) => c.id === product.category_id);
    setParentCategoryId(cat?.parent_id || product.category_id || "");
    setFormData({
      ...EMPTY_FORM,
      name: product.name || "",
      description: product.description || "",
      category_id: product.category_id || "",
      selling_mode: product.selling_mode || "wholesale",
      mrp: product.mrp?.toString() || "",
      selling_price: product.selling_price?.toString() || "",
      stock_quantity: product.stock_quantity?.toString() || "",
      min_purchase_qty: product.min_purchase_qty?.toString() || "1",
      sku: product.sku || "",
      stock_availability: product.stock_availability || "in_stock",
      price_min: product.price_min?.toString() || "",
      price_max: product.price_max?.toString() || "",
      price_unit: product.price_unit || "Per Piece",
      min_order_quantity: product.min_order_quantity?.toString() || "1",
      moq_unit: product.moq_unit || "Piece",
      supply_capacity: product.supply_capacity || "",
      lead_time: product.lead_time || "",
      min_order_value: product.min_order_value?.toString() || "",
      wholesale_tiers: Array.isArray(product.wholesale_tiers)
        ? product.wholesale_tiers.map((t: any) => ({ qty: String(t.qty ?? t.quantity ?? ""), price: String(t.price ?? "") }))
        : [],
      delivery_available: product.delivery_available !== false,
      delivery_scope: product.delivery_scope || "pan_india",
      delivery_locations: Array.isArray(product.delivery_locations) ? product.delivery_locations.join(", ") : "",
      delivery_time: product.delivery_time || "",
      pickup_available: !!product.pickup_available,
      cod_available: !!product.cod_available,
      payment_methods: Array.isArray(product.payment_methods) ? product.payment_methods : [],
      images: (product.images as string[]) || [],
      tags: (product.tags as string[])?.join(", ") || "",
      video_url: product.video_url || "",
      specifications: (product.specifications as Record<string, string>) || {},
    });
    setOpen(true);
  };

  const addSpecification = () => {
    if (newSpecKey && newSpecValue) {
      setFormData({
        ...formData,
        specifications: {
          ...formData.specifications,
          [newSpecKey]: newSpecValue,
        },
      });
      setNewSpecKey("");
      setNewSpecValue("");
    }
  };

  const removeSpecification = (key: string) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    setFormData({ ...formData, specifications: newSpecs });
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!sellerProfile) throw new Error("Seller profile not found");
      
      const slug = data.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
      const tags = data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : null;
      
      const { data: inserted, error } = await supabase.from("products").insert({
        seller_id: sellerProfile.id,
        name: data.name,
        slug,
        description: data.description || null,
        category_id: data.category_id || null,
        ...pricingPayload(data),
        images: data.images,
        tags,
        video_url: data.video_url || null,
        specifications: Object.keys(data.specifications).length > 0 ? data.specifications : null,
      }).select("id").maybeSingle();
      if (error) throw error;
      const { notifyIndex, triggerProductSeo } = await import("@/lib/notifyIndex");
      if (inserted?.id) {
        notifyIndex({ product_id: inserted.id });
        triggerProductSeo(inserted.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      invalidatePublicProductQueries(queryClient);
      setOpen(false);
      resetForm();
      toast({ title: "Product added successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add product", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!editingProduct) throw new Error("No product selected");
      
      const tags = data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : null;
      
      const { error } = await supabase.from("products").update({
        name: data.name,
        description: data.description || null,
        category_id: data.category_id || null,
        ...pricingPayload(data),
        images: data.images,
        tags,
        video_url: data.video_url || null,
        specifications: Object.keys(data.specifications).length > 0 ? data.specifications : null,
      }).eq("id", editingProduct.id);
      if (error) throw error;
      const { notifyIndex, triggerProductSeo } = await import("@/lib/notifyIndex");
      notifyIndex({ product_id: editingProduct.id });
      triggerProductSeo(editingProduct.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      invalidatePublicProductQueries(queryClient);
      setOpen(false);
      resetForm();
      toast({ title: "Product updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("products").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      invalidatePublicProductQueries(queryClient);
    },
  });

  const handleSubmit = () => {
    if (editingProduct) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const oneTimeUnits = ["Per Piece", "Per Kg", "Per Unit", "Per Box", "Per Set", "Per Meter", "Per Liter", "Per Ton", "Per Dozen", "Per Pack", "Per Hour", "Per Day", "Per Visit", "Per Service", "Per Project", "Per Sq Ft"];
  const recurringUnits = ["Per Month", "Per Quarter", "Per Year", "Per User / Month", "Per License", "Per License / Year"];
  const priceUnits = [...oneTimeUnits, ...recurringUnits];
  const isRecurring = recurringUnits.includes(formData.price_unit);
  const moqUnits = ["Piece", "Pieces", "Kg", "Tons", "Liters", "Meters", "Sets", "Boxes", "Packs", "Dozens", "Units", "Months", "Years", "Users", "Licenses", "Hours", "Visits", "Projects"];

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Products</h1>
            <p className="text-muted-foreground">Manage your product listings</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gradient-accent"><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="flex w-full h-auto justify-start gap-1 overflow-x-auto md:grid md:grid-cols-4">
                  <TabsTrigger value="details" className="shrink-0">Details</TabsTrigger>
                  <TabsTrigger value="pricing" className="shrink-0">Pricing &amp; Selling</TabsTrigger>
                  <TabsTrigger value="specs" className="shrink-0">Specifications</TabsTrigger>
                  <TabsTrigger value="images" className="shrink-0">Images &amp; Media</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Product Name *</Label>
                    <Input
                      placeholder="Enter product name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe your product in detail..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Parent Category *</Label>
                      <Select
                        value={parentCategoryId}
                        onValueChange={(value) => { setParentCategoryId(value); setFormData({ ...formData, category_id: "" }); }}
                      >
                        <SelectTrigger><SelectValue placeholder="Choose parent" /></SelectTrigger>
                        <SelectContent>
                          {categories?.filter((c: any) => !c.parent_id).map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sub Category</Label>
                      <Select
                        value={formData.category_id}
                        onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                        disabled={!parentCategoryId}
                      >
                        <SelectTrigger><SelectValue placeholder={parentCategoryId ? "Choose sub category" : "Pick parent first"} /></SelectTrigger>
                        <SelectContent>
                          {categories?.filter((c: any) => c.parent_id === parentCategoryId).map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                          {parentCategoryId && categories?.filter((c: any) => c.parent_id === parentCategoryId).length === 0 && (
                            <SelectItem value={parentCategoryId}>Use "{categories?.find((c:any)=>c.id===parentCategoryId)?.name}" directly</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tags (comma separated)</Label>
                      <Input
                        placeholder="e.g., organic, premium, export"
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-6 mt-4">
                  <div className="space-y-2">
                    <Label>Selling Mode *</Label>
                    <Select
                      value={formData.selling_mode}
                      onValueChange={(value) => setFormData({ ...formData, selling_mode: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retail">Retail — for individual customers</SelectItem>
                        <SelectItem value="wholesale">Wholesale — for business / bulk buyers</SelectItem>
                        <SelectItem value="both">Retail + Wholesale — supports both</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This decides what individual shoppers and business buyers see on your product page.
                    </p>
                  </div>

                  {(formData.selling_mode === "retail" || formData.selling_mode === "both") && (
                    <div className="rounded-lg border p-4 space-y-4">
                      <h4 className="font-semibold text-sm">Retail pricing</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>MRP (₹)</Label>
                          <Input type="number" placeholder="18000" value={formData.mrp}
                            onChange={(e) => setFormData({ ...formData, mrp: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Selling Price (₹)</Label>
                          <Input type="number" placeholder="16999" value={formData.selling_price}
                            onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Price Unit</Label>
                          <Select value={formData.price_unit}
                            onValueChange={(value) => setFormData({ ...formData, price_unit: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {priceUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Stock Quantity</Label>
                          <Input type="number" placeholder="25" value={formData.stock_quantity}
                            onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Minimum Purchase Qty</Label>
                          <Input type="number" placeholder="1" value={formData.min_purchase_qty}
                            onChange={(e) => setFormData({ ...formData, min_purchase_qty: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>SKU</Label>
                          <Input placeholder="JF-SOFA-001" value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Availability</Label>
                          <Select value={formData.stock_availability}
                            onValueChange={(value) => setFormData({ ...formData, stock_availability: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in_stock">In stock</SelectItem>
                              <SelectItem value="limited">Limited stock</SelectItem>
                              <SelectItem value="made_to_order">Made to order</SelectItem>
                              <SelectItem value="out_of_stock">Out of stock</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {(formData.selling_mode === "wholesale" || formData.selling_mode === "both") && (
                    <div className="rounded-lg border p-4 space-y-4">
                      <h4 className="font-semibold text-sm">Wholesale pricing</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Price From (₹)</Label>
                          <Input type="number" placeholder="16500" value={formData.price_min}
                            onChange={(e) => setFormData({ ...formData, price_min: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Price To (₹)</Label>
                          <Input type="number" placeholder="18000" value={formData.price_max}
                            onChange={(e) => setFormData({ ...formData, price_max: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Price Unit</Label>
                          <Select value={formData.price_unit}
                            onValueChange={(value) => setFormData({ ...formData, price_unit: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {priceUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>MOQ</Label>
                          <Input type="number" placeholder="10" value={formData.min_order_quantity}
                            onChange={(e) => setFormData({ ...formData, min_order_quantity: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>MOQ Unit</Label>
                          <Select value={formData.moq_unit}
                            onValueChange={(value) => setFormData({ ...formData, moq_unit: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {moqUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Minimum Order Value (₹)</Label>
                          <Input type="number" placeholder="50000" value={formData.min_order_value}
                            onChange={(e) => setFormData({ ...formData, min_order_value: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Supply Capacity</Label>
                          <Input placeholder="500 / month" value={formData.supply_capacity}
                            onChange={(e) => setFormData({ ...formData, supply_capacity: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Lead Time</Label>
                          <Input placeholder="7–15 days" value={formData.lead_time}
                            onChange={(e) => setFormData({ ...formData, lead_time: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Wholesale Price Tiers (optional)</Label>
                          <Button type="button" variant="outline" size="sm"
                            onClick={() => setFormData({ ...formData, wholesale_tiers: [...formData.wholesale_tiers, { qty: "", price: "" }] })}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add tier
                          </Button>
                        </div>
                        {formData.wholesale_tiers.map((tier, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Input placeholder="10–24" value={tier.qty}
                              onChange={(e) => {
                                const next = [...formData.wholesale_tiers];
                                next[i] = { ...next[i], qty: e.target.value };
                                setFormData({ ...formData, wholesale_tiers: next });
                              }} />
                            <Input type="number" placeholder="18000" value={tier.price}
                              onChange={(e) => {
                                const next = [...formData.wholesale_tiers];
                                next[i] = { ...next[i], price: e.target.value };
                                setFormData({ ...formData, wholesale_tiers: next });
                              }} />
                            <Button type="button" variant="ghost" size="icon"
                              onClick={() => setFormData({ ...formData, wholesale_tiers: formData.wholesale_tiers.filter((_, j) => j !== i) })}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg border p-4 space-y-4">
                    <h4 className="font-semibold text-sm">Fulfillment</h4>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="delivery-available">Delivery available</Label>
                      <Switch id="delivery-available" checked={formData.delivery_available}
                        onCheckedChange={(v) => setFormData({ ...formData, delivery_available: v })} />
                    </div>
                    {formData.delivery_available && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Delivery Scope</Label>
                          <Select value={formData.delivery_scope}
                            onValueChange={(value) => setFormData({ ...formData, delivery_scope: value })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pan_india">Pan India</SelectItem>
                              <SelectItem value="selected">Selected locations</SelectItem>
                              <SelectItem value="local">Local delivery</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Delivery Locations</Label>
                          <Input placeholder="Coimbatore, Chennai" value={formData.delivery_locations}
                            onChange={(e) => setFormData({ ...formData, delivery_locations: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Delivery Time</Label>
                          <Input placeholder="3–7 days" value={formData.delivery_time}
                            onChange={(e) => setFormData({ ...formData, delivery_time: e.target.value })} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pickup-available">Pickup available</Label>
                      <Switch id="pickup-available" checked={formData.pickup_available}
                        onCheckedChange={(v) => setFormData({ ...formData, pickup_available: v })} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="cod-available">Cash on delivery (COD)</Label>
                      <Switch id="cod-available" checked={formData.cod_available}
                        onCheckedChange={(v) => setFormData({ ...formData, cod_available: v })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Methods</Label>
                      <div className="flex flex-wrap gap-2">
                        {PAYMENT_METHODS.map((m) => {
                          const active = formData.payment_methods.includes(m);
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                payment_methods: active
                                  ? formData.payment_methods.filter((x) => x !== m)
                                  : [...formData.payment_methods, m],
                              })}
                              className={`rounded-full border px-3 py-1 text-xs transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/40"}`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="specs" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Common Specifications</Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Fill the fields relevant to your product. Buyers filter and compare using these.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {COMMON_SPEC_FIELDS.map((field) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs">{field}</Label>
                            <Input
                              placeholder={`Enter ${field.toLowerCase()}`}
                              value={formData.specifications[field] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData((prev) => {
                                  const specs = { ...prev.specifications };
                                  if (val) specs[field] = val; else delete specs[field];
                                  return { ...prev, specifications: specs };
                                });
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="mb-2 block">Add Custom Specification</Label>

                    <div className="flex gap-2">
                      <Input
                        placeholder="Specification name (e.g., Color, Weight)"
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                      />
                      <Input
                        placeholder="Value (e.g., Red, 500g)"
                        value={newSpecValue}
                        onChange={(e) => setNewSpecValue(e.target.value)}
                      />
                      <Button type="button" onClick={addSpecification} disabled={!newSpecKey || !newSpecValue}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    </div>


                    {Object.keys(formData.specifications).length > 0 && (
                      <div className="space-y-2">
                        <Label>Added Specifications</Label>
                        <div className="grid gap-2">
                          {Object.entries(formData.specifications).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                              <div>
                                <span className="font-medium">{key}:</span>
                                <span className="ml-2 text-muted-foreground">{value}</span>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeSpecification(key)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-sm text-muted-foreground">
                      Add specifications like Material, Size, Color, Weight, Packaging, etc.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="images" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Product Images (up to 5)</Label>
                    <ImageUpload
                      images={formData.images}
                      onImagesChange={(images) => setFormData({ ...formData, images })}
                      maxImages={5}
                      seoName={formData.name}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Video URL (YouTube/Vimeo)</Label>
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Add a product demo or showcase video
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="flex-1">
                  Cancel
                </Button>
                <Button
                  className="flex-1 gradient-accent"
                  onClick={handleSubmit}
                  disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-video bg-muted" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-6">Add your first product to start receiving leads</p>
              <Button onClick={() => setOpen(true)} className="gradient-accent">
                <Plus className="h-4 w-4 mr-2" /> Add Your First Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products?.map((product: any) => (
              <Card key={product.id} className="overflow-hidden group">
                <div className="aspect-video bg-muted relative">
                  {product.images && (product.images as string[])[0] ? (
                    <img
                      src={(product.images as string[])[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => openEditDialog(product)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">{product.categories?.name}</p>
                    </div>
                    <Switch
                      checked={product.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: product.id, is_active: checked })}
                    />
                  </div>
                  {product.price_min && (
                    <p className="font-semibold text-primary">
                      ₹{product.price_min.toLocaleString()} - ₹{product.price_max?.toLocaleString()}
                      <span className="text-xs text-muted-foreground font-normal ml-1">{product.price_unit}</span>
                    </p>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="h-4 w-4" /> {product.view_count || 0} views
                    </span>
                    <span>MOQ: {product.min_order_quantity} {product.moq_unit}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyProducts;
