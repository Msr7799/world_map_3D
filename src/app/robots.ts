import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://world-map-3-d.vercel.app/sitemap.xml",
    host: "https://world-map-3-d.vercel.app",
  };
}