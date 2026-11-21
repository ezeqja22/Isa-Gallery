import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir:
    process.env.GALLERY_AUDIT_BUILD === "1" ? ".next-performance" : ".next",
  async headers() {
    return [
      {
        source:
          "/optimized/:asset((?:texture|geometry)-[a-f0-9]+\\.(?:webp|jpg|png|bin))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
