import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const assets = {};
function collect(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(file);
    else assets['/' + path.relative('web', file).split(path.sep).join('/')] = {
      type: types[path.extname(file)] || 'application/octet-stream',
      body: readFileSync(file).toString('base64'),
    };
  }
}
collect('web');
mkdirSync('dist/server', { recursive: true });
mkdirSync('dist/.openai', { recursive: true });
writeFileSync('dist/server/index.js', `const assets = ${JSON.stringify(assets)};\n${readFileSync('worker/index.js', 'utf8')}`);
writeFileSync('dist/.openai/hosting.json', readFileSync('.openai/hosting.json'));
console.log(`Built Worker with ${Object.keys(assets).length} embedded assets.`);
