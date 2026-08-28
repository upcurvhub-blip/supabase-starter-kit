create extension if not exists vector;

alter table public.products
  add column if not exists search_embedding halfvec(3072),
  add column if not exists embedding_updated_at timestamptz;

create index if not exists products_search_embedding_idx
  on public.products using hnsw (search_embedding halfvec_cosine_ops);

create or replace function public.match_products(
  query_embedding halfvec(3072),
  match_count int default 24,
  p_city text default null
)
returns table (
  id uuid,
  name text,
  slug text,
  short_description text,
  price numeric,
  currency text,
  unit text,
  primary_image_url text,
  category_id uuid,
  seller_id uuid,
  seller_business_name text,
  seller_city text,
  seller_slug text,
  similarity real
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.name,
    p.slug,
    p.short_description,
    p.price,
    p.currency,
    p.unit,
    p.primary_image_url,
    p.category_id,
    p.seller_id,
    coalesce(sp.business_name, sp.company_name) as seller_business_name,
    sp.city as seller_city,
    sp.slug as seller_slug,
    ((1 - (p.search_embedding <=> query_embedding))
      + case
          when p_city is not null and lower(coalesce(sp.city, '')) = lower(p_city) then 0.05
          else 0
        end)::real as similarity
  from public.products p
  join public.seller_profiles sp on sp.id = p.seller_id
  where p.is_active = true
    and sp.status = 'approved'
    and p.search_embedding is not null
  order by p.search_embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_products(halfvec, int, text) to anon, authenticated;