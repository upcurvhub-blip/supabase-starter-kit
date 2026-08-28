import { Helmet } from "react-helmet-async";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * Per-page head tags. Every public route should render this with a UNIQUE
 * title + description, otherwise Google shows one boilerplate snippet for
 * every sitelink.
 */
export function PageMeta({
  title,
  description,
  path,
  noindex,
}: {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
}) {
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const url = path ? `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}` : undefined;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {url && <link rel="canonical" href={url} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      {url && <meta property="og:url" content={url} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex,follow" />}
    </Helmet>
  );
}

export default PageMeta;
