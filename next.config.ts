import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    // Upload de avatar via Server Action (FormData). O default do Next é 1MB,
    // que barra fotos de celular mesmo após a compressão client-side.
    serverActions: { bodySizeLimit: "10mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "",
  project: process.env.SENTRY_PROJECT ?? "livo-web",
  // Suppress build output when Sentry org/project are not configured
  silent: true,
});
