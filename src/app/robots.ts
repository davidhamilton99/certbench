import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/profile", "/study-materials/", "/practice/", "/community/", "/cheat-sheets/", "/upgrade"],
      },
    ],
    sitemap: "https://certbench.dev/sitemap.xml",
  };
}
