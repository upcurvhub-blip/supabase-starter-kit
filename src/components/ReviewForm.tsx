import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/StarRating";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare } from "lucide-react";

interface ReviewFormProps {
  sellerId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ sellerId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const submitReview = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please login to submit a review");
      if (rating === 0) throw new Error("Please select a rating");

      const { error } = await supabase.from("reviews").insert({
        buyer_id: user.id,
        seller_id: sellerId,
        rating,
        title: title.trim() || null,
        review: review.trim() || null,
        is_visible: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Review submitted!", description: "Thank you for your feedback." });
      setRating(0);
      setTitle("");
      setReview("");
      queryClient.invalidateQueries({ queryKey: ["seller-reviews", sellerId] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Write a Review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Your Rating *</Label>
          <StarRating rating={rating} onRatingChange={setRating} size="lg" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-title">Review Title</Label>
          <Input
            id="review-title"
            placeholder="Summarize your experience"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-text">Your Review</Label>
          <Textarea
            id="review-text"
            placeholder="Share details of your experience with this seller..."
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
          />
        </div>

        <Button 
          onClick={() => submitReview.mutate()} 
          disabled={submitReview.isPending || rating === 0}
          className="w-full"
        >
          {submitReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Review
        </Button>
      </CardContent>
    </Card>
  );
}