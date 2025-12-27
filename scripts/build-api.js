import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { unlink } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('📦 Bundling API function with all server code...');

await build({
  entryPoints: [join(rootDir, 'api/index.ts')],
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

// Delete the TypeScript source file to avoid conflicts with Vercel
// Vercel doesn't allow both .ts and .js files with the same base path
const tsFile = join(rootDir, 'api/index.ts');
try {
  await unlink(tsFile);
  console.log('✅ Removed api/index.ts to avoid Vercel conflicts');
} catch (error) {
  // Ignore if file doesn't exist (already deleted or not present)
  if (error.code !== 'ENOENT') {
    console.warn('⚠️  Warning: Could not delete api/index.ts:', error.message);
  }
}

