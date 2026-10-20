import fs from 'fs';
import path from 'path';

let esbuild = null;
try {
  esbuild = await import('esbuild');
} catch {
  try {
    esbuild = await import('./backend/node_modules/esbuild/lib/main.js');
  } catch {
    try {
      esbuild = await import('./frontend/node_modules/esbuild/lib/main.js');
    } catch {
      esbuild = null;
    }
  }
}

if (!esbuild) {
  if (fs.existsSync('api/index.js') && fs.statSync('api/index.js').size > 1000) {
    console.log('[build-api] esbuild not available, using existing pre-bundled api/index.js.');
    process.exit(0);
  } else {
    console.error('[build-api] esbuild not available and no pre-bundled api/index.js found.');
    process.exit(1);
  }
}

console.log('Bundling serverless functions with esbuild JS API...');
try {
  if (!fs.existsSync('api')) {
    fs.mkdirSync('api', { recursive: true });
  }

  await esbuild.build({
    entryPoints: ['api_src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    outfile: 'api/index.js',
    nodePaths: ['./backend/node_modules', './frontend/node_modules', './node_modules'],
    banner: {
      js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);"
    },
  });
  console.log('Successfully bundled api/index.js!');

  // Create Vercel catch-all API route handler
  fs.writeFileSync('api/[...path].js', "export { default } from './index.js';\n");
  console.log('Successfully created api/[...path].js!');

  // Copy PGlite binaries to api folder if available
  const possiblePgliteDirs = [
    './node_modules/@electric-sql/pglite/dist',
    './backend/node_modules/@electric-sql/pglite/dist',
    './frontend/node_modules/@electric-sql/pglite/dist'
  ];

  for (const dir of possiblePgliteDirs) {
    const dataFile = path.join(dir, 'pglite.data');
    const wasmFile = path.join(dir, 'pglite.wasm');
    if (fs.existsSync(dataFile) && fs.existsSync(wasmFile)) {
      try {
        fs.copyFileSync(dataFile, 'api/pglite.data');
        fs.copyFileSync(wasmFile, 'api/pglite.wasm');
        console.log(`Copied pglite binaries from ${dir} to api/`);
        break;
      } catch (copyErr) {
        console.warn('Could not copy pglite binaries:', copyErr);
      }
    }
  }
} catch (err) {
  console.error('Failed to bundle serverless API:', err);
  process.exit(1);
}
