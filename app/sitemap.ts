import type { MetadataRoute } from "next";

// Must match the canonical www host (see metadataBase in app/layout.tsx) —
// the apex domain 308-redirects here, and a sitemap URL that redirects
// gets flagged by Google as a "Redirect error" instead of being indexed.
const baseUrl = "https://www.playqube.org";

export default function sitemap(): MetadataRoute.Sitemap {
  // Only the marketing homepage is public, every other route is behind
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
