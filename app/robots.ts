import type { MetadataRoute } from "next";

// Only the marketing homepage is public (see middleware.ts isPublicRoute);
// every other route sits behind Clerk auth and 404s for signed-out
// visitors, including crawlers, so there's nothing worth indexing there.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/learn", "/units", "/leaderboard", "/quests", "/shop",
        "/map", "/map-3", "/map-budget", "/map-invest", "/map-loans",
        "/lesson", "/play", "/profile", "/admin",
      ],
    },
    sitemap: "https://www.playqube.org/sitemap.xml",
  };
}
