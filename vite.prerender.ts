import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import { STATIC_ROUTE_META, SITE_ORIGIN } from "./src/lib/seo/staticRoutes";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Emits a copy of index.html per static public route with that route's own
 * title / description / canonical / og tags baked in.
 *
 * Crawlers that don't execute JS (and Google's sitelink snippets) read the
 * static document, so without this every route shares one description.
 */
export function prerenderStaticMeta(): Plugin {
  return {
    name: "upcurv-prerender-static-meta",
    apply: "build",
    closeBundle() {
      const outDir = path.resolve(process.cwd(), "dist");
      const shellPath = path.join(outDir, "index.html");
      if (!fs.existsSync(shellPath)) return;
      const shell = fs.readFileSync(shellPath, "utf8");

      for (const route of STATIC_ROUTE_META) {
        const url = `${SITE_ORIGIN}${route.path === "/" ? "/" : route.path}`;
        let html = shell
          .replace(/<title data-rh="true">[\s\S]*?<\/title>/, `<title data-rh="true">${esc(route.title)}</title>`)
          .replace(
            /<meta data-rh="true" name="description" content="[\s\S]*?">/,
            `<meta data-rh="true" name="description" content="${esc(route.description)}">`,
          )
          .replace(
            /<link data-rh="true" rel="canonical" href="[\s\S]*?" \/>/,
            `<link data-rh="true" rel="canonical" href="${url}" />`,
          )
          .replace(
            /<meta data-rh="true" property="og:url" content="[\s\S]*?">/,
            `<meta data-rh="true" property="og:url" content="${url}">`,
          )
          .replace(
            /<meta data-rh="true" property="og:title" content="[\s\S]*?">/,
            `<meta data-rh="true" property="og:title" content="${esc(route.title)}">`,
          )
          .replace(
            /<meta data-rh="true" property="og:description" content="[\s\S]*?">/,
            `<meta data-rh="true" property="og:description" content="${esc(route.description)}">`,
          );

        if (route.path === "/") {
          fs.writeFileSync(shellPath, html, "utf8");
          continue;
        }
        const dir = path.join(outDir, route.path.replace(/^\//, ""));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
      }
    },
  };
}
