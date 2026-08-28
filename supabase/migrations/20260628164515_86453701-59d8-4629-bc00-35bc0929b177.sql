
ALTER TABLE public.seller_profiles ALTER COLUMN company_name DROP NOT NULL;
ALTER TABLE public.seller_profiles ALTER COLUMN slug DROP NOT NULL;

-- Remove duplicate FK to subscription_plans; keep only plan_id but renamed to subscription_plan_id
ALTER TABLE public.seller_profiles DROP COLUMN IF EXISTS subscription_plan_id;
ALTER TABLE public.seller_profiles RENAME COLUMN plan_id TO subscription_plan_id;
