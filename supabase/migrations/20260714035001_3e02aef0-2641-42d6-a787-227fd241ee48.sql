-- Grants for enquiry + intent tracking (missing Data-API grants was the root cause)
GRANT INSERT ON public.leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

GRANT INSERT ON public.buyer_intent_signals TO anon;
GRANT SELECT, INSERT ON public.buyer_intent_signals TO authenticated;
GRANT ALL ON public.buyer_intent_signals TO service_role;

GRANT INSERT ON public.product_views TO anon;
GRANT SELECT, INSERT ON public.product_views TO authenticated;
GRANT ALL ON public.product_views TO service_role;

GRANT INSERT ON public.intent_scores TO anon;
GRANT SELECT, INSERT ON public.intent_scores TO authenticated;
GRANT ALL ON public.intent_scores TO service_role;

-- Guarded sweep: ensure every public base table is reachable by authenticated + service_role
DO $$
DECLARE
    tbl record;
    has_priv boolean;
BEGIN
    FOR tbl IN
        SELECT c.relname AS table_name
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE c.relkind = 'r'
           AND n.nspname = 'public'
    LOOP
        SELECT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
             WHERE grantee = 'authenticated' AND table_schema = 'public' AND table_name = tbl.table_name
               AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) INTO has_priv;
        IF NOT has_priv THEN
            EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
        END IF;

        SELECT EXISTS (
            SELECT 1 FROM information_schema.role_table_grants
             WHERE grantee = 'service_role' AND table_schema = 'public' AND table_name = tbl.table_name
               AND privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
        ) INTO has_priv;
        IF NOT has_priv THEN
            EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
        END IF;
    END LOOP;
END;
$$;