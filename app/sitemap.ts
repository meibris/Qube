import type { MetadataRoute } from "next";

const baseUrl = "https://playqube.org";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the marketing homepage is public — every other route is behind
  // Clerk auth (see middleware.ts isPublicRoute), so search engines can't
  // reach them and they don't belong in the sitemap.
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
  ];
}
