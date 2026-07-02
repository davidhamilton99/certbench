import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/profile",
          "/study-materials/",
          "/certifications/",
          "/community/",
          "/review",
          "/analytics",
          "/pbq",
          "/reference",
          "/upgrade",
          "/admin/",
          "/onboarding",
        ],
      },
    ],
    sitemap: "https://certbench.dev/sitemap.xml",
  };
}
