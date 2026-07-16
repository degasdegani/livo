import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    // Upload de avatar via Server Action (FormData). O default do Next é 1MB,
    // que barra fotos de celular mesmo após a compressão client-side.
    serverActions: { bodySizeLimit: "10mb" },
    // staleTimes.dynamic = 0 desabilita o Client Router Cache para segmentos
    // dinâmicos (como o layout do dashboard, que lê sessão/billing a cada
    // requisição). Sem isso, navegação por clique dentro do dashboard não
    // reexecutava o Server Component do layout, permitindo acesso mesmo após
    // o trial expirar — só um hard refresh forçava a checagem de billing.
    staleTimes: {
      dynamic: 0,
    },
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
