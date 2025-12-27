import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('📦 Bundling API function with all server code...');

// Build from the source file in scripts/ directory
// This avoids Vercel seeing both api/index.ts and api/index.js
await build({
  entryPoints: [join(__dirname, 'api-index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: join(rootDir, 'api/index.js'),
  // Bundle everything except node_modules packages
  // Local imports (like ../server/index) will be bundled
  packages: 'external',
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  external: [
    // Keep these external as they're provided by Vercel runtime or are node_modules
    '@vercel/node',
    // vite is only used in development, not in serverless function
    // Mark as external to prevent bundling
    'vite',
    '@vitejs/plugin-react',
    'rollup',
    '@rollup/*',
    // Exclude vite config from bundle
    './vite.config',
    '../vite.config',
  ],
  // Ensure all local code is bundled (not just node_modules are external)
  // By using packages: 'external', only packages in node_modules are external
  // Local imports should be bundled automatically
  logLevel: 'info',
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});

console.log('✅ Bundled to api/index.js');

