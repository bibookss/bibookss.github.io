import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ensureSubdomain } from './cloudflare-subdomain.mjs';

test('creates a subdomain after Cloudflare reports the first-time missing-subdomain error', async () => {
  const calls = [];
  const error = Object.assign(new Error('You do not have a workers.dev subdomain. Please go to the Workers & Pages landing page.'), {
    errors: [{ message: 'You do not have a workers.dev subdomain. Please go to the Workers & Pages landing page.' }],
  });
  const api = async (route, options = {}) => {
    calls.push([route, options]);
    if (!options.method) throw error;
    return { subdomain: 'portfolio-example' };
  };
  assert.equal(await ensureSubdomain(api, 'portfolio-example'), 'portfolio-example');
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1].method, 'PUT');
  assert.deepEqual(JSON.parse(calls[1][1].body), { subdomain: 'portfolio-example' });
});

test('preserves an existing account subdomain without creating one', async () => {
  let calls = 0;
  assert.equal(await ensureSubdomain(async () => {
    calls++; return { subdomain: 'existing' };
  }, 'new'), 'existing');
  assert.equal(calls, 1);
});

test('does not treat permission errors as an unregistered subdomain', async () => {
  const error = Object.assign(new Error('Authentication error'), { errors: [{ message: 'Authentication error' }] });
  let calls = 0;
  await assert.rejects(ensureSubdomain(async () => { calls++; throw error; }, 'new'), error);
  assert.equal(calls, 1);
});

test('propagates subdomain creation failures', async () => {
  const error = new Error('Subdomain unavailable');
  await assert.rejects(ensureSubdomain(async (route, options) => {
    if (options?.method === 'PUT') throw error;
    return { subdomain: null };
  }, 'taken'), error);
});
