import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, ChevronRight, FolderTree, Tag, Image as ImageIcon, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ImageUpload";

const ManageCategories = () => {
  const [open, setOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
    parent_id: "",
    image_url: "",
    is_service: false,
    related_keywords: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*, parent:parent_id(name)")
        .order("display_order")
        .order("name");
      return data || [];
    },
  });

  const parentCategories = categories?.filter(c => !c.parent_id) || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const kw = data.related_keywords.split(",").map(s => s.trim()).filter(Boolean);
      const { data: inserted, error } = await supabase.from("categories").insert({
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/\s+/g, "-"),
        description: data.description || null,
        icon: data.icon || null,
        parent_id: data.parent_id || null,
        image_url: data.image_url || null,
        level: data.parent_id ? 2 : 1,
        is_service: data.is_service,
        related_keywords: kw,
      }).select("id").maybeSingle();
      if (error) throw error;
      const { notifyIndex } = await import("@/lib/notifyIndex");
      if (inserted?.id) notifyIndex({ category_id: inserted.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setOpen(false);
      resetForm();
      toast({ title: "Category created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const kw = data.related_keywords.split(",").map(s => s.trim()).filter(Boolean);
      const { error } = await supabase.from("categories").update({
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        icon: data.icon || null,
        parent_id: data.parent_id || null,
        image_url: data.image_url || null,
        is_service: data.is_service,
        related_keywords: kw,
      }).eq("id", id);
      if (error) throw error;
      const { notifyIndex } = await import("@/lib/notifyIndex");
      notifyIndex({ category_id: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      setOpen(false);
      setEditingCategory(null);
      resetForm();
      toast({ title: "Category updated successfully" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("categories").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast({ title: "Category deleted" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", slug: "", description: "", icon: "", parent_id: "", image_url: "", is_service: false, related_keywords: "" });
  };

  const openEditDialog = (category: any) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      icon: category.icon || "",
      parent_id: category.parent_id || "",
      image_url: category.image_url || "",
      is_service: !!category.is_service,
      related_keywords: Array.isArray(category.related_keywords) ? category.related_keywords.join(", ") : "",
    });
    setOpen(true);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manage Categories</h1>
            <p className="text-muted-foreground">Create and manage product categories and niches</p>
          </div>
          <div className="flex gap-2">
            <ClassifyServicesButton />
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingCategory(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Category Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  placeholder="Slug (auto-generated if empty)"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
                <Input
                  placeholder="Icon (e.g., Package, Cpu, Factory)"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
                <Select
                  value={formData.parent_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parent_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Parent Category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level Category)</SelectItem>
                    {parentCategories.filter(c => !editingCategory || c.id !== editingCategory.id).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium"><ImageIcon className="h-4 w-4" /> Category Image</div>
                  <ImageUpload
                    images={formData.image_url ? [formData.image_url] : []}
                    onImagesChange={(imgs) => setFormData({ ...formData, image_url: imgs[0] || "" })}
                    maxImages={1}
                    folder="categories"
                    seoName={formData.name}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <div className="text-sm font-medium">Mark as Service</div>
                    <p className="text-xs text-muted-foreground">Enable if this category represents a service (e.g. AC Fitting, Plumbing). Services auto-appear on related product pages.</p>
                  </div>
                  <Switch
                    checked={formData.is_service}
                    onCheckedChange={(v) => setFormData({ ...formData, is_service: v })}
                  />
                </div>
                <Input
                  placeholder="Related keywords (comma-separated, e.g. ac, air conditioner, split ac)"
                  value={formData.related_keywords}
                  onChange={(e) => setFormData({ ...formData, related_keywords: e.target.value })}
                />
                <Button
                  className="w-full"
                  onClick={() => {
                    if (editingCategory) {
                      updateMutation.mutate({ id: editingCategory.id, data: formData });
                    } else {
                      createMutation.mutate(formData);
                    }
                  }}
                  disabled={!formData.name}
                >
                  {editingCategory ? "Update" : "Create"} Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>


        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <FolderTree className="h-4 w-4" /> All Categories
            </TabsTrigger>
            <TabsTrigger value="parent" className="gap-2">
              <Tag className="h-4 w-4" /> Parent Categories
            </TabsTrigger>
            <TabsTrigger value="niches" className="gap-2">
              <ChevronRight className="h-4 w-4" /> Niches / Subcategories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Categories</CardTitle>
                <CardDescription>Complete list of all categories and subcategories</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories?.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {category.level === 2 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              {category.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                          <TableCell>
                            {category.parent?.name ? (
                              <Badge variant="outline">{category.parent.name}</Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              <Badge variant={category.level === 1 ? "default" : "secondary"}>
                                Level {category.level}
                              </Badge>
                              {category.is_service && (
                                <Badge className="bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-0">Service</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={category.is_active}
                              onCheckedChange={(checked) => toggleActive.mutate({ id: category.id, is_active: checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => openEditDialog(category)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(category.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="parent">
            <Card>
              <CardHeader>
                <CardTitle>Parent Categories</CardTitle>
                <CardDescription>Top-level categories for product organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {parentCategories.map((category) => {
                    const subcategories = categories?.filter(c => c.parent_id === category.id) || [];
                    return (
                      <Card key={category.id} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEditDialog(category)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">{category.slug}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground mb-2">
                            {subcategories.length} subcategories
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {subcategories.slice(0, 5).map(sub => (
                              <Badge key={sub.id} variant="secondary" className="text-xs">
                                {sub.name}
                              </Badge>
                            ))}
                            {subcategories.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{subcategories.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="niches">
            <Card>
              <CardHeader>
                <CardTitle>Niches / Subcategories</CardTitle>
                <CardDescription>Specialized subcategories within parent categories</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Niche Name</TableHead>
                      <TableHead>Parent Category</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories?.filter(c => c.level === 2).map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{category.parent?.name || "-"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={(checked) => toggleActive.mutate({ id: category.id, is_active: checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(category)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(category.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

function ClassifyServicesButton() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();
  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-service-categories");
      if (error) throw error;
      toast({ title: `Classified ${data.updated}/${data.total} categories` });
      qc.invalidateQueries({ queryKey: ["admin-categories"] });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  return (
    <Button variant="outline" onClick={run} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
      AI-classify services
    </Button>
  );
}

export default ManageCategories;

