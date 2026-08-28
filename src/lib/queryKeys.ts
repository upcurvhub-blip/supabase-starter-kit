import { dropPersistedQueries } from "@/lib/queryCachePersist";

const PRODUCT_PREFIXES = [
  "product",
  "related-products",
  "seller-more-products",
  "products",
  "search-products",
  "seller-products",
  "category",
  "directory",
];

const SERVICE_PREFIXES = [
  "service",
  "service-seller",
  "more-services",
  "services",
  "related-services",
  "search-services",
];

export const publicQueryKeys = {
  product: (slug?: string) => ["product", slug] as const,
  service: (slug?: string) => ["service", slug] as const,
};

function invalidate(queryClient: { invalidateQueries: (filters: any) => unknown }, prefixes: string[]) {
  // Drop the persisted copy first so a reload cannot resurrect stale content.
  dropPersistedQueries(prefixes);
  return queryClient.invalidateQueries({
    predicate: (query: { queryKey: readonly unknown[] }) => prefixes.includes(String(query.queryKey[0])),
    refetchType: "all",
  });
}

export function invalidatePublicProductQueries(queryClient: { invalidateQueries: (filters: any) => unknown }) {
  return invalidate(queryClient, PRODUCT_PREFIXES);
}

export function invalidatePublicServiceQueries(queryClient: { invalidateQueries: (filters: any) => unknown }) {
  return invalidate(queryClient, SERVICE_PREFIXES);
}
