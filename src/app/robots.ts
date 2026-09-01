import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * robots.txt - explicitly unblocks Googlebot and every other crawler.
 * The site's marketing pages are fully public (no auth wall, no
 * noindex), so nothing is excluded; the sitemap is advertised so
 * Google can discover every page in one fetch.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "Googlebot",
        allow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
