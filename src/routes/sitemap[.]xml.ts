import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// TODO: replace with your project URL once a project name or custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/dashboard", changefreq: "weekly", priority: "0.8" },
          { path: "/pre/extraction", changefreq: "weekly", priority: "0.7" },
          { path: "/pre/planner", changefreq: "weekly", priority: "0.7" },
          { path: "/pre/kitkiq", changefreq: "weekly", priority: "0.7" },
          { path: "/pre/hypotheses", changefreq: "weekly", priority: "0.7" },
          { path: "/pre/lba", changefreq: "weekly", priority: "0.7" },
          { path: "/live/dashboard", changefreq: "weekly", priority: "0.7" },
          { path: "/live/capture", changefreq: "weekly", priority: "0.7" },
          { path: "/live/insights", changefreq: "weekly", priority: "0.7" },
          { path: "/live/kiq", changefreq: "weekly", priority: "0.7" },
          { path: "/live/collab", changefreq: "weekly", priority: "0.7" },
          { path: "/post/synthesis", changefreq: "weekly", priority: "0.7" },
          { path: "/post/endpoints", changefreq: "weekly", priority: "0.7" },
          { path: "/post/summaries", changefreq: "weekly", priority: "0.7" },
          { path: "/post/deliverables", changefreq: "weekly", priority: "0.7" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
