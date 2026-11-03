import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { localDatabase } from './local-db.mjs';

const DB = localDatabase('.sites-runtime/counters.sqlite');
// Rebuild per request during local editing; production serves the packaged Worker.
createServer(async (req, res) => {
  try {
    execFileSync(process.execPath, ['scripts/build.mjs'], { stdio: 'ignore' });
    const module = await import('data:text/javascript;base64,' + readFileSync('dist/server/index.js').toString('base64'));
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method, headers: req.headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks),
    });
    const response = await module.default.fetch(request, { DB, LOCAL: true });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error.message);
    res.writeHead(500).end('Local server error');
  }
}).listen(4173, '0.0.0.0', () => console.log('Local: http://localhost:4173 (LAN access enabled). Local metrics are separate from the hosted counters.'));
