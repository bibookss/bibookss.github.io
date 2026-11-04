import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const endpoint = process.env.METRICS_API_URL || '';
if (endpoint && new URL(endpoint).protocol !== 'https:') throw new Error('METRICS_API_URL must use HTTPS');
rmSync('_site', { recursive: true, force: true });
mkdirSync('_site', { recursive: true });
cpSync('web', '_site', { recursive: true });
writeFileSync('_site/config.js', `window.portfolioConfig = ${JSON.stringify({ metricsEndpoint: endpoint })};\n`);
writeFileSync('_site/.nojekyll', '');
const html = readFileSync('_site/index.html', 'utf8').replace(
  /<meta property="og:url" content="[^"]*">/,
  '<meta property="og:url" content="https://bibookss.github.io/">'
);
writeFileSync('_site/index.html', html);
console.log(`Built GitHub Pages site${endpoint ? ' with shared metrics' : '; counters await Cloudflare setup'}.`);
