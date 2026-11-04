import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { ensureSubdomain } from './cloudflare-subdomain.mjs';

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!/^[a-f0-9]{32}$/i.test(account || '') || !token) throw new Error('Cloudflare account ID and API token are required');
const base = `https://api.cloudflare.com/client/v4/accounts/${account}`;
async function api(route, options = {}) {
  const response = await fetch(base + route, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw Object.assign(new Error(`Cloudflare ${route}: ${data.errors?.map(e => e.message).join('; ') || response.status}`), {
      errors: data.errors, status: response.status,
    });
  }
  return data.result;
}

const databases = await api('/d1/database?name=portfolio-metrics');
let database = databases.find(item => item.name === 'portfolio-metrics');
if (!database) database = await api('/d1/database', { method: 'POST', body: JSON.stringify({ name: 'portfolio-metrics', primary_location_hint: 'apac' }) });
console.log('Checking workers.dev registration; new accounts may take a minute to become ready.');
const subdomain = await ensureSubdomain(api, `bibookss-portfolio-${account.slice(0, 6)}`);
console.log(`Using workers.dev subdomain: ${subdomain}`);
const endpoint = `https://portfolio-metrics.${subdomain}.workers.dev/api/metrics`;
mkdirSync('.sites-runtime', { recursive: true });
const config = path.resolve('.sites-runtime/wrangler.json');
writeFileSync(config, JSON.stringify({
  name: 'portfolio-metrics',
  account_id: account,
  main: path.resolve('dist/server/index.js'),
  compatibility_date: '2026-11-01',
  workers_dev: true,
  vars: { ALLOWED_ORIGIN: 'https://bibookss.github.io' },
  d1_databases: [{ binding: 'DB', database_name: database.name, database_id: database.uuid, migrations_dir: path.resolve('drizzle') }],
}, null, 2));
const wrangler = path.resolve('node_modules/wrangler/bin/wrangler.js');
function run(args) {
  execFileSync(process.execPath, [wrangler, ...args, '--config', config], {
    stdio: 'inherit', env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
  });
}
run(['d1', 'migrations', 'apply', 'portfolio-metrics', '--remote']);
run(['deploy']);
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(endpoint, { headers: { Origin: 'https://bibookss.github.io' } });
    const counts = await response.json();
    if (response.ok && Number.isSafeInteger(counts.visits) && response.headers.get('Access-Control-Allow-Origin') === 'https://bibookss.github.io') {
      ready = true; break;
    }
  } catch {}
  await new Promise(resolve => setTimeout(resolve, 3000));
}
if (!ready) throw new Error('Counter deployment completed but its public endpoint did not pass verification');
console.log(`Verified shared counters: ${endpoint}`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `metrics_url=${endpoint}\n`);
