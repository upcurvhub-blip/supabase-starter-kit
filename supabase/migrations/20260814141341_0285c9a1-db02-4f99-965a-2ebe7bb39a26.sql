-- 1. Reviews: allow anonymous/public reviews
ALTER TABLE public.reviews ALTER COLUMN buyer_id DROP NOT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS device_id text;

GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

DROP POLICY IF EXISTS "Anyone can submit a review" ON public.reviews;
CREATE POLICY "Anyone can submit a review"
ON public.reviews FOR INSERT TO anon, authenticated
WITH CHECK (
  rating BETWEEN 1 AND 5
  AND (
    (buyer_id IS NULL AND coalesce(length(btrim(guest_name)), 0) > 1)
    OR buyer_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews(product_id) WHERE product_id IS NOT NULL;

-- 2. Chat conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  guest_name text,
  guest_phone text,
  device_id text,
  subject text,
  last_message text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  seller_unread integer NOT NULL DEFAULT 0,
  buyer_unread integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT TO authenticated
USING (buyer_id = auth.uid() OR public.is_seller_profile_owner(seller_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers can start conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (buyer_id = auth.uid() OR public.is_seller_profile_owner(seller_id, auth.uid()));

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (buyer_id = auth.uid() OR public.is_seller_profile_owner(seller_id, auth.uid()));

CREATE INDEX IF NOT EXISTS conversations_seller_idx ON public.conversations(seller_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conversations_buyer_idx ON public.conversations(buyer_id, last_message_at DESC);

-- 3. Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('buyer','seller','system')),
  sender_id uuid,
  body text NOT NULL,
  attachment_url text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (c.buyer_id = _user_id OR public.is_seller_profile_owner(c.seller_id, _user_id))
  )
$$;

CREATE POLICY "Participants can read messages"
ON public.messages FOR SELECT TO authenticated
USING (public.can_access_conversation(conversation_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (public.can_access_conversation(conversation_id, auth.uid()) AND length(btrim(body)) > 0);

CREATE POLICY "Participants can mark messages read"
ON public.messages FOR UPDATE TO authenticated
USING (public.can_access_conversation(conversation_id, auth.uid()));

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id, created_at);

-- 4. Keep conversation summary fresh
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = left(NEW.body, 200),
      last_message_at = NEW.created_at,
      updated_at = now(),
      seller_unread = CASE WHEN NEW.sender_role = 'buyer' THEN seller_unread + 1 ELSE seller_unread END,
      buyer_unread = CASE WHEN NEW.sender_role = 'seller' THEN buyer_unread + 1 ELSE buyer_unread END
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_touch_conversation ON public.messages;
CREATE TRIGGER messages_touch_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- 5. Realtime
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;