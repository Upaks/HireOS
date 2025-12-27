import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const outputFile = join(rootDir, 'api', 'index.mjs');

console.log(' Bundling API function for Vercel...');
console.log(`   Entry: ${join(rootDir, 'api/index.ts')}`);
console.log(`   Output: ${outputFile}`);

await build({
  entryPoints: [join(rootDir, 'api/index.ts')],
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
  console.error(' Build failed:', error);
  process.exit(1);
});

console.log(` API function bundled successfully to ${outputFile}`);
