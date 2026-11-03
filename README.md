# Albert Perez's portfolio

A text-first portfolio with pixel plumbing, theme and animation valves, and shared activity gauges.

## Local preview

Requires Node 24+.

```sh
npm install
npm run dev
```

Open http://localhost:4173. Phones on the same network can use the Mac's LAN address. Local counters persist in ignored `.sites-runtime/counters.sqlite`, separate from production.

## Source

- `web/index.html`: content and gauges.
- `web/styles.css`: layout, themes, and responsive artwork.
- `web/script.js`: canvas pipes and independent valves.
- `web/metrics.js`: page loads and valve clicks.
- `web/assets/`: resume PDF and favicon.
- `worker/index.js`: embedded asset delivery and metrics API.
- `db/schema.ts`: database schema. Run `npm run db:generate` after schema changes, and commit generated migrations.

## Counters

Shared page loads (not unique visitors) and explicit theme/animation valve clicks. No visitor identity, IP address, or event history is stored. Automatic theme restoration and motion preferences don't count as valve clicks. Dials expand their ranges as counts grow; the numeric reading is exact. Failed requests display an unavailable message.

## Build and test

```sh
npm run build
npm test
```

The production Worker embeds all assets in `dist/server/index.js`, with no runtime dependencies. Sites provisions the D1 `DB` binding from `.openai/hosting.json` and applies committed Drizzle migrations. Keep the existing Site ID and audience when publishing. `dist/` is generated and ignored.

The canvas is decorative. Controls support keyboard input and reduced motion. Content, project disclosure, and resume links work without JavaScript.

Resume-based content; the warehouse's unavailable source URL is replaced by inline architecture details. Design references: https://kevinamparado.com/ and https://www.nemaas.com/. Original code and pixel illustration.
