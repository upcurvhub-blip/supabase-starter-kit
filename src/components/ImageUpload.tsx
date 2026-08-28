import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  bucket?: string;
  folder?: string;
  /** SEO base name for uploaded files (e.g., product/category name). Files become "<slug>-1.jpg" for higher image-search ranking. */
  seoName?: string;
}

function slugifyName(s: string) {
  return (s || "image")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80) || "image";
}

export function ImageUpload({
  images,
  onImagesChange,
  maxImages = 5,
  bucket = "product-images",
  folder = "products",
  seoName,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (file: File, index: number): Promise<string | null> => {
    const fileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
    const base = slugifyName(seoName || file.name.replace(/\.[^.]+$/, ""));
    const suffix = `${Date.now().toString(36)}-${index}`;
    const fileName = `${folder}/${base}-${suffix}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, { cacheControl: "3600", upsert: false, contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return null;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 60 * 60 * 24 * 365);

    if (!signedError && signedData?.signedUrl) {
      return signedData.signedUrl;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum images reached",
        description: `You can only upload up to ${maxImages} images`,
        variant: "destructive",
      });
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    
    // Validate file types
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const invalidFiles = filesToUpload.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload only JPG, PNG, WebP, or GIF images",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB each)
    const oversizedFiles = filesToUpload.filter((f) => f.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Each image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const startIndex = images.length;
      const uploadPromises = filesToUpload.map((file, i) => uploadFile(file, startIndex + i));
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((url): url is string => url !== null);

      if (successfulUploads.length > 0) {
        onImagesChange([...images, ...successfulUploads]);
        toast({
          title: "Images uploaded",
          description: `${successfulUploads.length} image(s) uploaded successfully`,
        });
      }

      if (successfulUploads.length < filesToUpload.length) {
        toast({
          title: "Some uploads failed",
          description: "Please try uploading failed images again",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, [images]);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border",
          uploading && "opacity-50 pointer-events-none"
        )}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading || images.length >= maxImages}
        />
        <div className="text-center">
          {uploading ? (
            <Loader2 className="h-10 w-10 mx-auto text-muted-foreground animate-spin" />
          ) : (
            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
          )}
          <p className="mt-2 text-sm font-medium">
            {uploading ? "Uploading..." : "Drag & drop images or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP or GIF. Max 5MB each. {images.length}/{maxImages} images
          </p>
        </div>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(index)}
              >
                <X className="h-3 w-3" />
              </Button>
              {index === 0 && (
                <span className="absolute bottom-1 left-1 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Primary
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
