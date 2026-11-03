// The build embeds the site's assets into this Worker; no asset service is needed.
const json = (value, status = 200) => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store' },
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/metrics') {
      if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
      if (!env.DB) return json({ error: 'Counters unavailable' }, 503);
      try {
        if (request.method === 'POST') {
          // Only a visit or a physical control click increments a counter.
          if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) {
            return json({ error: 'Invalid origin' }, 403);
          }
          let body;
          try { body = await request.json(); } catch { return json({ error: 'Invalid event' }, 400); }
          if (!['visits', 'valves'].includes(body?.event)) return json({ error: 'Invalid event' }, 400);
          await env.DB.prepare(
            'INSERT INTO counters (name, value) VALUES (?, 1) ON CONFLICT(name) DO UPDATE SET value = value + 1'
          ).bind(body.event).run();
        }
        const { results } = await env.DB.prepare('SELECT name, value FROM counters').all();
        const counts = { visits: 0, valves: 0 };
        for (const row of results) if (row.name in counts) counts[row.name] = row.value;
        return json({ ...counts, preview: Boolean(env.LOCAL) });
      } catch {
        return json({ error: 'Counters unavailable' }, 503);
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
