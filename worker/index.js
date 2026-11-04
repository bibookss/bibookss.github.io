// The build embeds the site's assets into this Worker; no asset service is needed.
const json = (value, status = 200, origin = '') => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store', ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}) },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/metrics') {
      const origin = request.headers.get('Origin');
      const allowed = origin === url.origin || origin === env.ALLOWED_ORIGIN;
      const reply = (value, status = 200) => json(value, status, allowed ? origin : '');
      if (request.method === 'OPTIONS') {
        if (!allowed) return reply({ error: 'Invalid origin' }, 403);
        return new Response(null, { status: 204, headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400', Vary: 'Origin',
        } });
      }
      if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed' }, 405);
      if (!env.DB) return reply({ error: 'Counters unavailable' }, 503);
      try {
        if (request.method === 'POST') {
          // Only a visit or a physical control click increments a counter.
          if (origin && !allowed) {
            return reply({ error: 'Invalid origin' }, 403);
          }
          let body;
          try { body = await request.json(); } catch { return reply({ error: 'Invalid event' }, 400); }
          if (!['visits', 'valves'].includes(body?.event)) return reply({ error: 'Invalid event' }, 400);
          await env.DB.prepare(
            'INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1'
          ).bind(body.event).run();
        }
        const { results } = await env.DB.prepare('SELECT name, value FROM counters').all();
        const counts = { visits: 0, valves: 0 };
        for (const row of results) if (row.name in counts) counts[row.name] = row.value;
        return reply({ ...counts, preview: Boolean(env.LOCAL) });
      } catch {
        return reply({ error: 'Counters unavailable' }, 503);
      }
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname];
    if (!asset) return new Response('Not found', { status: 404 });
    const bytes = Uint8Array.from(atob(asset.body), c => c.charCodeAt(0));
    return new Response(request.method === 'HEAD' ? null : bytes, {
      headers: { 'Content-Type': asset.type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' },
    });
  },
};
