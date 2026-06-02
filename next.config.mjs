/** @type {import('next').NextConfig} */

// When STATIC_EXPORT=true we emit a fully static site for GitHub Pages.
// The project page lives under /<repo>, so we set basePath/assetPrefix to match.
const isExport = process.env.STATIC_EXPORT === "true";
const repo = process.env.PAGES_BASE_PATH ?? "/maxi";

const nextConfig = {
  reactStrictMode: true,
  ...(isExport
    ? {
        output: "export",
        basePath: repo,
        assetPrefix: `${repo}/`,
        images: { unoptimized: true },
        trailingSlash: true,
        env: { NEXT_PUBLIC_STATIC: "true" },
      }
    : {}),
};

export default nextConfig;
