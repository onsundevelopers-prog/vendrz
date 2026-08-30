import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/ESM packages used by the server-side extraction pipeline. They
  // must stay external so their platform-specific binaries and module layout
  // are preserved in the serverless runtime (not mangled by the bundler).
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
