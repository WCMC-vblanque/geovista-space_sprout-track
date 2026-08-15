/** @type {import('next').NextConfig} */
const nextConfig = {
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
