import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localDatabase } from './local-db.mjs';

const { default: worker } = await import('data:text/javascript;base64,' + readFileSync('dist/server/index.js').toString('base64'));
test('shared counters increment atomically and reject invalid events', async () => {
  const DB = localDatabase();
  const request = (event) => new Request('https://portfolio.example/api/metrics', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event }),
  });
  try {
    let response = await worker.fetch(new Request('https://portfolio.example/api/metrics'), { DB });
    assert.deepEqual(await response.json(), { visits: 0, valves: 0, preview: false });
    await Promise.all(Array.from({ length: 20 }, () => worker.fetch(request('visits'), { DB })));
    await worker.fetch(request('valves'), { DB });
    response = await worker.fetch(new Request('https://portfolio.example/api/metrics'), { DB });
    assert.deepEqual(await response.json(), { visits: 20, valves: 1, preview: false });
    assert.equal((await worker.fetch(request('not-a-counter'), { DB })).status, 400);
    assert.equal((await worker.fetch(new Request('https://portfolio.example/api/metrics', { method: 'POST', body: '{' }), { DB })).status, 400);
    assert.equal((await worker.fetch(request('visits'), {})).status, 503);
    assert.equal((await worker.fetch(new Request('https://portfolio.example/'), { DB })).status, 200);
    assert.match((await worker.fetch(new Request('https://portfolio.example/assets/albert-perez-resume.pdf'), { DB })).headers.get('Content-Type'), /pdf/);
  } finally { DB.close(); }
});
