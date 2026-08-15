/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack spawns concurrent build workers by default; on a memory-
  // constrained host (e.g. Alwaysdata staging) that concurrency is what
  // gets the build worker SIGKILLed by the OOM killer, not V8's own heap
  // (NODE_OPTIONS=--max-old-space-size has no effect on Turbopack, which
  // is a separate Rust process). Cap it via LOW_MEMORY_BUILD=1 in .env.
  ...(process.env.LOW_MEMORY_BUILD === '1' ? { experimental: { cpus: 1 } } : {}),

  // Opt-in only: set NEXT_OUTPUT_MODE=standalone in a site's .env to produce
  // a pruned .next/standalone bundle (own node_modules, ~tens of MB instead
  // of the full ~1GB+ tree) for low-resource hosts. Off by default so prod
  // keeps its current deploy shape until this has proven out on staging.
  // See documentation/Admin-Documentation/alwaysdata-deployment.md.
  ...(process.env.NEXT_OUTPUT_MODE === 'standalone' ? { output: 'standalone' } : {}),

  // Prisma's query engine binaries (.node files) aren't plain JS imports, so
  // Next's file tracer can miss them when pruning node_modules for a
  // standalone build. Explicitly include both generated clients.
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/.prisma/client/**/*',
      './node_modules/.prisma/log-client/**/*',
    ],
  },
};

module.exports = nextConfig;
