import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('📦 Bundling API function...');

await build({
  entryPoints: [join(rootDir, 'api/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: join(rootDir, 'api/index.js'),
  packages: 'external', // Don't bundle node_modules
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  logLevel: 'info',
}).catch((error) => {
  console.error('❌ Build failed:', error);
  process.exit(1);
});

console.log('✅ API function bundled to api/index.js');

