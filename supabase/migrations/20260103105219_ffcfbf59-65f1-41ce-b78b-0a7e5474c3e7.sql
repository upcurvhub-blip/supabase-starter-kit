-- Create product_views table for tracking who visited products
CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  view_duration INTEGER DEFAULT 0, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_product_views_product ON public.product_views(product_id);
CREATE INDEX idx_product_views_user ON public.product_views(user_id);
CREATE INDEX idx_product_views_created ON public.product_views(created_at DESC);

-- Policies
-- Anyone can insert a view
CREATE POLICY "Anyone can insert product views" 
ON public.product_views 
FOR INSERT 
WITH CHECK (true);

-- Sellers can view visits to their own products
CREATE POLICY "Sellers can view visits to their products" 
ON public.product_views 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM products p
    JOIN seller_profiles sp ON p.seller_id = sp.id
    WHERE p.id = product_views.product_id 
    AND sp.user_id = auth.uid()
  )
);

-- Admins can view all product visits
CREATE POLICY "Admins can view all product visits" 
ON public.product_views 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Create storage bucket for seller avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('seller-assets', 'seller-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for seller-assets bucket
CREATE POLICY "Anyone can view seller assets" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'seller-assets');

CREATE POLICY "Authenticated users can upload seller assets" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'seller-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own seller assets" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'seller-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own seller assets" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'seller-assets' AND auth.uid() IS NOT NULL);