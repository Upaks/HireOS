import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { unlink } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const sourceFile = join(rootDir, 'api', 'index.ts');
const outputFile = join(rootDir, 'api', 'index.mjs');

console.log('📦 Bundling API function for Vercel...');
console.log(`   Entry: ${sourceFile}`);
console.log(`   Output: ${outputFile}`);

await build({
  entryPoints: [sourceFile],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: outputFile,
  external: [
    // Keep Vercel runtime external
    '@vercel/node',
    // Keep node built-ins external
    'fs', 'path', 'http', 'https', 'url', 'stream', 'util', 'crypto', 
    'dns', 'net', 'tls', 'zlib', 'events', 'buffer', 'process', 'os',
    'querystring', 'child_process', 'cluster', 'dgram', 'readline',
    'repl', 'string_decoder', 'timers', 'tty', 'vm', 'worker_threads',
  ],
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
  sourcemap: false,
  minify: false,
  treeShaking: true,
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});

// Delete the TypeScript source file to avoid conflicts
try {
  await unlink(sourceFile);
  console.log('   Removed source TypeScript file to avoid conflicts');
} catch (error) {
  // Ignore if file doesn't exist
}

console.log(`✅ API function bundled successfully to ${outputFile}`);
