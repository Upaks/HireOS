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
  packages: 'external', // Don't bundle any node_modules packages
  external: [
    // Keep Vercel runtime external
    '@vercel/node',
    // Keep node built-ins external (already handled by platform: 'node')
    // Frontend build tools that might be accidentally imported
    'vite', '@vitejs/*', 'lightningcss', '@babel/*', 'babel-*',
    'autoprefixer', 'postcss', 'tailwindcss', '@tailwindcss/*',
    'react', 'react-dom', 'react/jsx-runtime', '@radix-ui/*',
    // Vite plugins
    '@replit/*', '@tailwindcss/vite',
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

console.log(`✅ API function bundled successfully to ${outputFile}`);
