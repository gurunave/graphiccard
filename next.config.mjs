/** @type {import('next').NextConfig} */

// GitHub Pages serves this project site from /graphiccard, so the production
// build needs a basePath. Dev runs at the root for convenience.
const isProd = process.env.NODE_ENV === "production";
const basePath = isProd ? "/graphiccard" : "";

const nextConfig = {
  output: "export",
  basePath,
  // Pages has no server to rewrite extensionless URLs, so emit /compare/index.html.
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
