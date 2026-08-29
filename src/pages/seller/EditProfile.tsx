import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Building2, Save, Upload, X, Camera, Globe, MapPin, Calendar, Users, BadgeIndianRupee, FileText, Award, Package, Phone, Mail, Images } from "lucide-react";
import { GalleryManager } from "@/components/seller/GalleryManager";
import { StateCitySelect } from "@/components/StateCitySelect";

const EditProfile = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [newNiche, setNewNiche] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newExportCountry, setNewExportCountry] = useState("");
  const [formData, setFormData] = useState({
    business_name: "",
    business_type: "",
    business_category: "",
    description: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    website: "",
    gst_number: "",
    pan_number: "",
    employee_count: "",
    annual_turnover: "",
    established_year: "",
    logo_url: "",
    banner_url: "",
    phone: "",
    email: "",
    whatsapp: "",
    niches: [] as string[],
    certifications: [] as string[],
    export_countries: [] as string[],
    payment_modes: [] as string[],
    manufacturing_capacity: "",
    quality_standards: [] as string[],
    brand_names: [] as string[],
    social_links: {} as Record<string, string>,
  });

  // Fetch categories for business category dropdown
  const { data: categories } = useQuery({
    queryKey: ["categories-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug")
        .eq("is_active", true)
        .is("parent_id", null)
        .order("name");
      return data || [];
    },
  });

  const { data: sellerProfile, isLoading } = useQuery({
    queryKey: ["seller-profile-edit"],
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

  useEffect(() => {
    if (sellerProfile) {
      setFormData({
        business_name: sellerProfile.business_name || "",
        business_type: sellerProfile.business_type || "",
        business_category: sellerProfile.business_category || "",
        description: sellerProfile.description || "",
        address: sellerProfile.address || "",
        city: sellerProfile.city || "",
        state: sellerProfile.state || "",
        pincode: sellerProfile.pincode || "",
        country: sellerProfile.country || "India",
        website: sellerProfile.website || "",
        gst_number: sellerProfile.gst_number || "",
        pan_number: sellerProfile.pan_number || "",
        employee_count: sellerProfile.employee_count || "",
        annual_turnover: sellerProfile.annual_turnover || "",
        established_year: sellerProfile.established_year?.toString() || "",
        logo_url: sellerProfile.logo_url || "",
        banner_url: sellerProfile.banner_url || "",
        phone: sellerProfile.phone || "",
        email: sellerProfile.email || "",
        whatsapp: sellerProfile.whatsapp || "",
        niches: (sellerProfile.niches as string[]) || [],
        certifications: (sellerProfile.certifications as string[]) || [],
        export_countries: (sellerProfile.export_countries as string[]) || [],
        payment_modes: (sellerProfile.payment_modes as string[]) || [],
        manufacturing_capacity: sellerProfile.manufacturing_capacity || "",
        quality_standards: (sellerProfile.quality_standards as string[]) || [],
        brand_names: (sellerProfile.brand_names as string[]) || [],
        social_links: (sellerProfile.social_links as Record<string, string>) || {},
      });
    }
  }, [sellerProfile]);

  const updateProfile = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!sellerProfile) throw new Error("No profile found");
      const { error } = await supabase
        .from("seller_profiles")
        .update({
          business_name: data.business_name,
          business_type: data.business_type,
          business_category: data.business_category || null,
          description: data.description,
          address: data.address,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          country: data.country,
          website: data.website,
          gst_number: data.gst_number || null,
          pan_number: data.pan_number || null,
          employee_count: data.employee_count || null,
          annual_turnover: data.annual_turnover || null,
          established_year: data.established_year ? parseInt(data.established_year) : null,
          logo_url: data.logo_url || null,
          banner_url: data.banner_url || null,
          phone: data.phone || null,
          email: data.email || null,
          whatsapp: data.whatsapp || null,
          niches: data.niches,
          certifications: data.certifications,
          export_countries: data.export_countries,
          payment_modes: data.payment_modes,
          manufacturing_capacity: data.manufacturing_capacity || null,
          quality_standards: data.quality_standards,
          brand_names: data.brand_names,
          social_links: data.social_links,
        })
        .eq("id", sellerProfile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-profile-edit"] });
      toast({ title: "Profile updated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating profile", description: error.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (file: File, type: "logo" | "banner") => {
    if (!sellerProfile) return;
    setUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${sellerProfile.id}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("seller-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("seller-assets")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      const { data: { publicUrl } } = supabase.storage
        .from("seller-assets")
        .getPublicUrl(fileName);

      const displayUrl = !signedError && signedData?.signedUrl ? signedData.signedUrl : publicUrl;

      if (type === "logo") {
        setFormData({ ...formData, logo_url: displayUrl });
      } else {
        setFormData({ ...formData, banner_url: displayUrl });
      }

      toast({ title: `${type === "logo" ? "Logo" : "Banner"} uploaded!` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addToArray = (field: keyof typeof formData, value: string, setFn: (v: string) => void) => {
    if (value.trim() && Array.isArray(formData[field])) {
      const arr = formData[field] as string[];
      if (!arr.includes(value.trim())) {
        setFormData({ ...formData, [field]: [...arr, value.trim()] });
      }
      setFn("");
    }
  };

  const removeFromArray = (field: keyof typeof formData, value: string) => {
    if (Array.isArray(formData[field])) {
      setFormData({ ...formData, [field]: (formData[field] as string[]).filter(v => v !== value) });
    }
  };

  const businessTypes = [
    "Manufacturer", "Wholesaler", "Distributor", "Retailer", 
    "Service Provider", "Exporter", "Importer", "Trading Company", "OEM/ODM"
  ];

  const employeeCounts = ["1-10", "11-50", "51-200", "201-500", "500+"];
  
  const turnovers = [
    "Below ₹10 Lakh", "₹10 Lakh - ₹50 Lakh", "₹50 Lakh - ₹1 Crore",
    "₹1 Crore - ₹5 Crore", "₹5 Crore - ₹25 Crore", "₹25 Crore - ₹100 Crore", "Above ₹100 Crore"
  ];

  const indianStates = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Chandigarh", "Puducherry"
  ];

  const paymentModeOptions = ["Cash", "UPI", "NEFT/RTGS", "Cheque", "Credit Card", "Letter of Credit", "PayPal", "Western Union"];
  const qualityStandardOptions = ["ISO 9001", "ISO 14001", "ISO 22000", "CE Certified", "FDA Approved", "GMP Certified", "FSSAI", "BIS", "HACCP"];

  if (isLoading) {
    return (
      <DashboardLayout role="seller">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="seller">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Edit Business Profile</h1>
          <p className="text-muted-foreground">Update your business information and branding</p>
        </div>

        {/* Banner & Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Images</CardTitle>
            <CardDescription>Upload your business logo and banner image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Banner */}
            <div>
              <Label className="mb-2 block">Banner Image (1200x300 recommended)</Label>
              <div className="relative h-40 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border">
                {formData.banner_url ? (
                  <>
                    <img src={formData.banner_url} alt="Banner" className="w-full h-full object-cover" />
                    <Button
                      size="icon" variant="destructive"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setFormData({ ...formData, banner_url: "" })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm text-muted-foreground">Click to upload banner</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "banner")}
                      disabled={uploading}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Logo */}
            <div>
              <Label className="mb-2 block">Business Logo (Square, 400x400 recommended)</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-32 h-32 bg-muted rounded-lg overflow-hidden border-2 border-dashed border-border">
                  {formData.logo_url ? (
                    <>
                      <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
                      <Button
                        size="icon" variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => setFormData({ ...formData, logo_url: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <Camera className="h-6 w-6 text-muted-foreground mb-1" />
                      <span className="text-xs text-muted-foreground">Upload Logo</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "logo")}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Your logo will be displayed on your profile and products.</p>
                  <p>Use a square image for best results.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="business">Business Details</TabsTrigger>
                <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                <TabsTrigger value="gallery"><Images className="h-4 w-4 mr-1" /> Gallery</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Business Name *</Label>
                    <Input
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                      placeholder="Your Business Name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Business Type <span className="text-xs text-muted-foreground font-normal">(select all that apply)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {businessTypes.map((type) => {
                        const selected = (formData.business_type || "")
                          .split(",").map((t) => t.trim()).filter(Boolean);
                        const isOn = selected.includes(type);
                        return (
                          <button
                            key={type}
                            type="button"
                            aria-pressed={isOn}
                            onClick={() => {
                              const next = isOn
                                ? selected.filter((t) => t !== type)
                                : [...selected, type];
                              setFormData({ ...formData, business_type: next.join(", ") });
                            }}
                            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                              isOn
                                ? "border-primary bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:border-primary hover:text-primary"
                            }`}
                          >
                            {type}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>


                <div className="space-y-2">
                  <Label>Business Category</Label>
                  <Select value={formData.business_category} onValueChange={(value) => setFormData({ ...formData, business_category: value })}>
                    <SelectTrigger><SelectValue placeholder="Select primary category" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.slug}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><FileText className="h-4 w-4" /> Business Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your business, products, and services..."
                    rows={4}
                  />
                </div>

                {/* Niches */}
                <div className="space-y-2">
                  <Label>Specializations / Niches</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newNiche}
                      onChange={(e) => setNewNiche(e.target.value)}
                      placeholder="e.g., Industrial Valves, Medical Equipment"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('niches', newNiche, setNewNiche))}
                    />
                    <Button type="button" onClick={() => addToArray('niches', newNiche, setNewNiche)}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.niches.map((niche) => (
                      <Badge key={niche} variant="secondary" className="gap-1">
                        {niche}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray('niches', niche)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Brand Names */}
                <div className="space-y-2">
                  <Label>Brand Names</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newBrandName}
                      onChange={(e) => setNewBrandName(e.target.value)}
                      placeholder="Your brand names"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('brand_names', newBrandName, setNewBrandName))}
                    />
                    <Button type="button" onClick={() => addToArray('brand_names', newBrandName, setNewBrandName)}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.brand_names.map((brand) => (
                      <Badge key={brand} variant="outline" className="gap-1">
                        {brand}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray('brand_names', brand)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> Website</Label>
                  <Input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://www.yourwebsite.com"
                  />
                </div>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone Number</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Business Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@yourbusiness.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number</Label>
                  <Input
                    type="tel"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Social Links</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      value={formData.social_links.linkedin || ""}
                      onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, linkedin: e.target.value } })}
                      placeholder="LinkedIn URL"
                    />
                    <Input
                      value={formData.social_links.facebook || ""}
                      onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, facebook: e.target.value } })}
                      placeholder="Facebook URL"
                    />
                    <Input
                      value={formData.social_links.instagram || ""}
                      onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, instagram: e.target.value } })}
                      placeholder="Instagram URL"
                    />
                    <Input
                      value={formData.social_links.twitter || ""}
                      onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, twitter: e.target.value } })}
                      placeholder="Twitter URL"
                    />
                    <Input
                      value={formData.social_links.youtube || ""}
                      onChange={(e) => setFormData({ ...formData, social_links: { ...formData.social_links, youtube: e.target.value } })}
                      placeholder="YouTube channel URL"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Location Tab */}
              <TabsContent value="location" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full business address"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <StateCitySelect
                      state={formData.state}
                      city={formData.city}
                      onStateChange={(state) => setFormData((p: any) => ({ ...p, state }))}
                      onCityChange={(city) => setFormData((p: any) => ({ ...p, city }))}
                    />
                  </div>


                  <div className="space-y-2">
                    <Label>Pincode</Label>
                    <Input
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="Pincode"
                      maxLength={6}
                    />
                  </div>
                </div>

                {/* Export Countries */}
                <div className="space-y-2">
                  <Label>Export Countries</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newExportCountry}
                      onChange={(e) => setNewExportCountry(e.target.value)}
                      placeholder="e.g., USA, UK, Germany"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('export_countries', newExportCountry, setNewExportCountry))}
                    />
                    <Button type="button" onClick={() => addToArray('export_countries', newExportCountry, setNewExportCountry)}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.export_countries.map((country) => (
                      <Badge key={country} variant="secondary" className="gap-1">
                        {country}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray('export_countries', country)} />
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Business Details Tab */}
              <TabsContent value="business" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>GST Number</Label>
                    <Input
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <Input
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                      placeholder="AAAAA0000A"
                      maxLength={10}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Established Year</Label>
                    <Input
                      type="number"
                      value={formData.established_year}
                      onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
                      placeholder="2010"
                      min={1900}
                      max={new Date().getFullYear()}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Number of Employees</Label>
                    <Select value={formData.employee_count} onValueChange={(value) => setFormData({ ...formData, employee_count: value })}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {employeeCounts.map((count) => (
                          <SelectItem key={count} value={count}>{count}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><BadgeIndianRupee className="h-4 w-4" /> Annual Turnover</Label>
                    <Select value={formData.annual_turnover} onValueChange={(value) => setFormData({ ...formData, annual_turnover: value })}>
                      <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                      <SelectContent>
                        {turnovers.map((turnover) => (
                          <SelectItem key={turnover} value={turnover}>{turnover}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Accepted Payment Modes</Label>
                  <div className="flex flex-wrap gap-2">
                    {paymentModeOptions.map((mode) => (
                      <Badge
                        key={mode}
                        variant={formData.payment_modes.includes(mode) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (formData.payment_modes.includes(mode)) {
                            removeFromArray('payment_modes', mode);
                          } else {
                            setFormData({ ...formData, payment_modes: [...formData.payment_modes, mode] });
                          }
                        }}
                      >
                        {mode}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Capabilities Tab */}
              <TabsContent value="capabilities" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Package className="h-4 w-4" /> Manufacturing Capacity</Label>
                  <Input
                    value={formData.manufacturing_capacity}
                    onChange={(e) => setFormData({ ...formData, manufacturing_capacity: e.target.value })}
                    placeholder="e.g., 10,000 units/month"
                  />
                </div>

                {/* Certifications */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Award className="h-4 w-4" /> Certifications</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      placeholder="Add certification"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('certifications', newCertification, setNewCertification))}
                    />
                    <Button type="button" onClick={() => addToArray('certifications', newCertification, setNewCertification)}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.certifications.map((cert) => (
                      <Badge key={cert} variant="secondary" className="gap-1">
                        <Award className="h-3 w-3" />
                        {cert}
                        <X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray('certifications', cert)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Quality Standards */}
                <div className="space-y-2">
                  <Label>Quality Standards</Label>
                  <div className="flex flex-wrap gap-2">
                    {qualityStandardOptions.map((standard) => (
                      <Badge
                        key={standard}
                        variant={formData.quality_standards.includes(standard) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (formData.quality_standards.includes(standard)) {
                            removeFromArray('quality_standards', standard);
                          } else {
                            setFormData({ ...formData, quality_standards: [...formData.quality_standards, standard] });
                          }
                        }}
                      >
                        {standard}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Gallery Tab */}
              <TabsContent value="gallery" className="mt-6">
                {sellerProfile ? (
                  <GalleryManager sellerId={sellerProfile.id} seoName={formData.business_name} />
                ) : (
                  <p className="text-sm text-muted-foreground">Save your profile first to enable the gallery.</p>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end mt-6 pt-6 border-t">
              <Button
                onClick={() => updateProfile.mutate(formData)}
                disabled={updateProfile.isPending || !formData.business_name}
                className="gradient-accent"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default EditProfile;