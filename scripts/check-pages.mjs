import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync('_site/index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  const url = match[1];
  if (/^(?:https?:|mailto:)/.test(url)) continue;
  assert(existsSync('_site/' + url), `Missing Pages asset: ${url}`);
}
const context = { window: {} };
vm.runInNewContext(readFileSync('_site/config.js', 'utf8'), context);
assert.equal(context.window.portfolioConfig.metricsEndpoint, process.env.METRICS_API_URL || '');
assert(existsSync('_site/.nojekyll'));
console.log('Static Pages entrypoint, asset links, and endpoint configuration verified.');
