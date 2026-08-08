import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/audit/", "/unsubscribe"],
    },
    sitemap: "https://smileaimarketing.com/sitemap.xml",
  };
}
