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

## GitHub Pages and CI/CD

Public site: https://bibookss.github.io/
Repository: https://github.com/bibookss/bibookss.github.io

Pushing `main` runs `.github/workflows/deploy.yml`: Node 24, dependency installation, counter/CORS tests, static build validation, then GitHub Pages deployment. Pull requests run checks without deploying. The Pages build publishes `_site/`; no server code or credentials are included.

### Connect the shared counters once

```sh
bash scripts/connect-cloudflare.sh
```

This interactive setup opens Cloudflare, guides account ID and token creation, stores `CLOUDFLARE_API_TOKEN` as a GitHub Actions secret, sets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ENABLED` repository variables, and dispatches the deployment workflow. Enter tokens only at its hidden terminal prompt. The token is not saved in source or a local file. Grant Account permissions Workers Scripts/Edit, D1/Edit, and Account Settings/Read for your selected account.

With that connection, CI creates/reuses the `portfolio-metrics` D1 database, applies pending migrations, deploys the Worker, verifies its endpoint and CORS, then embeds the endpoint into the Pages build. Subsequent pushes redeploy both. The database persists across deployments. These counters are independent of the earlier Sites preview.

Without a Cloudflare connection, the portfolio and controls still work; shared counts display a dash. No requests are sent to a missing Pages backend. `METRICS_API_URL` is an optional repository-variable override when using an already-deployed counter API.

`npm run build:pages` builds the static site; set `METRICS_API_URL` to an HTTPS counter endpoint to enable shared meters. `npm run check:pages` validates the static artifact. The API accepts cross-origin requests only from `https://bibookss.github.io`, alongside its own origin. Update the Worker allowlist and page metadata if changing domains.
