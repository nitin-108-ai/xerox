let esbuild;
try {
  esbuild = await import('esbuild');
} catch {
  try {
    esbuild = await import('./backend/node_modules/esbuild/lib/main.js');
  } catch {
    esbuild = await import('./frontend/node_modules/esbuild/lib/main.js');
  }
}

console.log('Bundling serverless functions with esbuild JS API...');
try {
  await esbuild.build({
    entryPoints: ['api_src/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    target: 'node20',
    outfile: 'api/index.js',
  });
  console.log('Successfully bundled api/index.js!');
} catch (err) {
  console.error('Failed to bundle serverless API:', err);
  process.exit(1);
}
