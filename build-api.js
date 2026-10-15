import { execSync } from 'child_process';
import fs from 'fs';

console.log('Bundling serverless functions with esbuild...');
try {
  const out = execSync(
    'npx -y esbuild "api_src/index.ts" --bundle --platform=node --format=esm --packages=external --target=node20 --outfile="api/index.js"',
    { stdio: 'pipe' }
  );
  if (out) console.log(out.toString());
  console.log('Successfully bundled api/index.js!');
} catch (err) {
  console.error('Failed to bundle serverless API:', err.stderr ? err.stderr.toString() : err.message);
  process.exit(1);
}
