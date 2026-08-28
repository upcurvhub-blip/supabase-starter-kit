import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SellerImageUploadProps {
  type: "logo" | "banner";
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  sellerId: string;
  /** Business name — used to build an SEO-friendly file name. */
  seoName?: string;
}

export function SellerImageUpload({ type, currentUrl, onUpload, sellerId, seoName }: SellerImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Supabase
      const fileExt = file.name.split(".").pop();
      const slug = (seoName || type)
        .toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || type;
      const fileName = `${sellerId}/${slug}-${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("seller-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from("seller-assets")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      const { data: { publicUrl } } = supabase.storage
        .from("seller-assets")
        .getPublicUrl(fileName);

      onUpload(!signedError && signedData?.signedUrl ? signedData.signedUrl : publicUrl);
      toast({ title: "Uploaded!", description: `${type === "logo" ? "Logo" : "Cover image"} updated successfully` });
    } catch (error: any) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {type === "logo" ? (
        <div className="flex items-center gap-4">
          <div 
            className={cn(
              "w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors",
              preview ? "border-transparent" : "border-muted-foreground/30"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : preview ? (
              <img src={preview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
            )}
          </div>
          <div className="space-y-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {preview ? "Change Logo" : "Upload Logo"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">Recommended: 200x200px, max 5MB</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div 
            className={cn(
              "w-full h-32 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors relative",
              preview ? "border-transparent" : "border-muted-foreground/30"
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : preview ? (
              <>
                <img src={preview} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Upload className="h-8 w-8 text-white" />
                </div>
              </>
            ) : (
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload cover image</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Recommended: 1200x300px, max 5MB</p>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="text-destructive"
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}