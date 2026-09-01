import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * sitemap.xml - lists every public, indexable page. Dynamic pages
 * (dashboard, review results, processing) are behind auth or session
 * state and are intentionally excluded.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = [
    { path: "/", priority: 1, changefreq: "weekly" as const },
    { path: "/audit", priority: 0.9, changefreq: "weekly" as const },
    { path: "/upload", priority: 0.8, changefreq: "monthly" as const },
    { path: "/privacy", priority: 0.3, changefreq: "yearly" as const },
  ];
  return pages.map((p) => ({
    url: `${SITE.url}${p.path}`,
    lastModified: now,
    changeFrequency: p.changefreq,
    priority: p.priority,
  }));
}
