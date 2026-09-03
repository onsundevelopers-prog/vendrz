import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't walk upward and pick up a
  // stray package-lock.json from a parent directory (warns and can break
  // dependency resolution on deploy hosts).
  turbopack: {
    root: path.dirname(import.meta.dirname),
  },

  // Native/ESM packages used by the server-side extraction pipeline. They
  // must stay external so their platform-specific binaries and module layout
  // are preserved in the serverless runtime (not mangled by the bundler).
  serverExternalPackages: ["pdfjs-dist", "@napi-rs/canvas"],

  // pdf.mjs loads pdf.worker.mjs via a `webpackIgnore`/`@vite-ignore` dynamic
  // import that Next.js's file tracer cannot see, so on Vercel the worker gets
  // snipped from the serverless bundle and every PDF extraction fails with
  // "Cannot find module ... pdf.worker.mjs". Force the worker (and its source
  // map) into the trace so the deployed /api/extract function can resolve it.
  outputFileTracingIncludes: {
    "/api/extract": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
};

export default nextConfig;
