/** @type {import('next').NextConfig} */
// Static export so the Python server can serve the built site at /next/* without
// needing a Node runtime. The /api/* endpoints stay on the Python server — Next
// is purely the UI layer for this app.
const nextConfig = {
  output: "export",
  // Each Next page becomes /name/index.html so URLs work without trailing-slash redirects.
  trailingSlash: true,
  // Build into out/ (the default for `output: 'export'`). Python server reads from there.
  distDir: ".next",
  // The Vite app already owns "/" — Next sits under /next so both can coexist while we
  // experiment. Flip basePath off (and update the server) once we're ready to promote.
  basePath: "/next",
  assetPrefix: "/next",
  // No image optimization (would require a Node runtime). Plain <img> works fine.
  images: { unoptimized: true },
  // Don't lint during build — keep `pnpm lint` as the explicit gate.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
