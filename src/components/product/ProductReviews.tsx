import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { ListSkeleton } from "@/components/ui/loading-states";
import { useToast } from "@/hooks/use-toast";
import { useDeviceId } from "@/hooks/useDeviceId";
import { Loader2, MessageSquare, Star } from "lucide-react";

interface ProductReviewsProps {
  productId: string;
  sellerId: string;
  productName?: string;
}

export function ProductReviews({ productId, sellerId, productName }: ProductReviewsProps) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();
  const deviceId = useDeviceId();
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, title, review, guest_name, created_at, is_verified, buyer_id")
        .eq("product_id", productId)
        .eq("is_visible", true)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!productId,
    staleTime: 60_000,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error("Please select a rating");
      if (name.trim().length < 2) throw new Error("Please enter your name");
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("reviews").insert({
        product_id: productId,
        seller_id: sellerId,
        buyer_id: user?.id ?? null,
        guest_name: name.trim(),
        device_id: deviceId,
        rating,
        title: title.trim() || null,
        review: body.trim() || null,
        is_visible: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Review posted", description: "Thanks for sharing your experience." });
      setRating(0); setTitle(""); setBody(""); setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    },
    onError: (e: any) => toast({ title: "Could not post review", description: e.message, variant: "destructive" }),
  });

  const count = reviews?.length || 0;
  const avg = count ? reviews!.reduce((a, r: any) => a + r.rating, 0) / count : 0;

  return (
    <Card id="reviews">
      <CardContent className="p-4 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-accent" />
              Ratings & Reviews
            </h2>
            {count > 0 ? (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-bold">{avg.toFixed(1)}</span>
                <StarRating rating={Math.round(avg)} readonly size="sm" />
                <span className="text-sm text-muted-foreground">({count})</span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                No reviews yet — be the first to review {productName || "this product"}.
              </p>
            )}
          </div>
          <Button variant={showForm ? "outline" : "default"} onClick={() => setShowForm((s) => !s)}>
            {showForm ? "Cancel" : "Write a review"}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-lg border p-4 space-y-4 animate-fade-in">
            <div className="space-y-2">
              <Label>Your rating *</Label>
              <StarRating rating={rating} onRatingChange={setRating} size="lg" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rev-name">Your name *</Label>
                <Input id="rev-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ramesh K." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rev-title">Title</Label>
                <Input id="rev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summarise your experience" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rev-body">Your review</Label>
              <Textarea id="rev-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Quality, packaging, delivery, value for money…" />
            </div>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending || rating === 0}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post review
            </Button>
            <p className="text-xs text-muted-foreground">No account needed. Reviews are public.</p>
          </div>
        )}

        {isLoading ? (
          <ListSkeleton rows={3} />
        ) : count > 0 ? (
          <div className="space-y-4">
            {reviews!.map((r: any) => (
              <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{r.guest_name || "Verified buyer"}</span>
                    {r.buyer_id && <Badge variant="outline" className="text-[10px]">Registered</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <StarRating rating={r.rating} readonly size="sm" />
                {r.title && <p className="font-medium mt-1.5 text-sm">{r.title}</p>}
                {r.review && <p className="text-sm text-muted-foreground mt-1">{r.review}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No reviews yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
