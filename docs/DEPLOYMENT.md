# Hosting and deployment portability

Madar Al Bayan is a full-stack application: its browser interface depends on server routes, source assets, a private database, model access and optional transactional email. This guide distinguishes the existing demonstration from independent deployment paths. Preparing configuration is not evidence that a new host has been deployed or tested.

## Choose a path that matches the runtime

| Target | Fit with this public release | Work required |
|:---|:---|:---|
| Existing Sites demonstration | The currently published reference deployment | Managed through its existing Site; this repository intentionally omits its production project identity |
| Independent Cloudflare Workers + D1 | Closest match to the implementation's existing runtime and database bindings | Your own Worker, D1 database, `ASSETS` binding, secrets, authorized content, origin and acceptance tests |
| Vercel or Netlify | Requires an application/runtime adaptation; not a verified one-click deployment | Replace Worker-specific imports/bindings, adapt server rendering, database access and static-source reads, then test API routes and sessions |
| Render, Railway, Fly.io, a VPS or a container host | Possible engineering port to a supported server runtime; no production image is supplied here | A Node-compatible server/adapter, persistent database, source storage, secrets and operational configuration |
| GitHub Pages or a static-file-only host | Can present repository documentation or a separate landing page | Cannot execute the current search, admin, database and mail API routes by itself |

This compatibility assessment is based on the code's use of `cloudflare:workers`, D1 prepared statements, the Vinext Worker handler and an `ASSETS` binding. It is not a claim of certification by any hosting provider.

## Independent Cloudflare deployment

The public package includes [`prepare-cloudflare.mjs`](../scripts/prepare-cloudflare.mjs), which prepares a configuration from the built Worker. It does not create a paid resource, log in, modify the existing Site or publish anything automatically.

### 1. Prepare your account and content

Complete [Getting started](GETTING_STARTED.md), then authenticate to **your own** Cloudflare account and create a database:

```bash
pnpm exec wrangler login
pnpm exec wrangler d1 create madar-al-bayan
```

Record the database ID actually returned by Cloudflare. Do not use the placeholder ID in `wrangler.local.jsonc`. For an initial trial, use the documented starter import; installing the source does not include the production corpus.

### 2. Build and prepare the Worker configuration

```bash
pnpm typecheck
pnpm test:contracts
pnpm build
pnpm deploy:prepare --database-id YOUR_REAL_D1_UUID --database-name madar-al-bayan --worker-name madar-al-bayan
```

Replace `YOUR_REAL_D1_UUID` with the returned ID. The helper validates the ID and writes `dist/server/wrangler.production.json`. It preserves built assets, binds them as `ASSETS`, configures D1 as `DB`, and points migrations at the repository's `drizzle` directory. Generated deployment files stay outside Git.

Review that configuration before continuing. The Worker name selects a new independent application; do not point it at a production service you intend to preserve.

### 3. Apply the private database schema

```bash
pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.production.json
```

This command changes the selected remote database. Confirm the target and retain backups when applying migrations to an existing installation. The repository's schema migrations do not include beneficiary messages or production records.

### 4. Upload to an isolated Worker and configure secrets

```bash
pnpm exec wrangler deploy --config dist/server/wrangler.production.json
pnpm exec wrangler secret put OPENAI_API_KEY --config dist/server/wrangler.production.json
pnpm exec wrangler secret put OPENAI_MODEL --config dist/server/wrangler.production.json
pnpm exec wrangler secret put ADMIN_USERNAME --config dist/server/wrangler.production.json
pnpm exec wrangler secret put ADMIN_PASSWORD_HASH --config dist/server/wrangler.production.json
pnpm exec wrangler secret put RESEND_API_KEY --config dist/server/wrangler.production.json
pnpm exec wrangler secret put MAIL_FROM --config dist/server/wrangler.production.json
```

Each secret command prompts for the value. Generate the administrator hash locally with `pnpm admin:hash`; never paste credentials into a GitHub file. Set only services you intend to enable. The initial upload is not a completed operational launch: semantic search, administration and mail depend on the subsequent configuration and tests.

Set `ADMIN_DISPLAY_NAME` if desired. Update `lib/site-info.ts` to your verified public URL and contact configuration before a final build so email/contact links lead to your deployment. Changing secrets does not grant model access or verify a sending domain.

### 5. Test before directing visitors to it

Verify the landing page, a source-backed question, source links and all enabled languages. Then test administrator sign-in, a synthetic question submission and receipt of a reply at a mailbox you control. Check the configured model with a free question; direct introductory lookups alone do not exercise semantic reasoning. Inspect source assets as well as live publisher access.

Use HTTPS. Confirm session cookie behavior, origin checks, source connectivity and database persistence. Add a custom domain only after the independent Worker behaves correctly. A domain is separate from model, email and database configuration.

## Authentication boundary on other hosts

The original Sites environment supplies trusted hosting identity. An independent server cannot treat incoming `oai-authenticated-*` headers as authentication. The public Worker wrapper strips those headers in production. Its primary `/admin` workflow uses its own configured administrator session.

Legacy committee/case routes that depend on hosting identity require a real identity adapter before use on another host. Do not expose a local mock identity to the Internet or treat changing a header as signing in.

## Porting to Node-oriented platforms

Moving the Git repository is straightforward; replacing the runtime interfaces is the substantive work. A port should address these boundaries explicitly:

| Code boundary | Required replacement or verification |
|:---|:---|
| `db/index.ts` and D1 SQL calls | A persistent database adapter with equivalent prepared statements, transactions, migrations and concurrency behavior |
| `cloudflare:workers` imports | Server environment/secret access compatible with the destination runtime |
| `publisher-assets.ts` and `ASSETS` | Safe reads from the destination's immutable content store or bundled server assets |
| `build/sites-worker.ts` and Vinext build | A supported server request handler and build/deployment adapter |
| Hosting identity | Verified authentication middleware, or disabled legacy hosting-only routes |
| Admin cookies and request validation | HTTPS, correct origin handling and secure session persistence |
| Model and publisher requests | Network egress, request deadlines, concurrency and account entitlements |
| Resend delivery | Server-side credentials, verified sender and durable send-state handling |

Resend and the OpenAI API are called over HTTPS, so their service roles can remain the same after a runtime port. No Vercel, Netlify, Docker or VPS deployment is claimed as completed in this release.

## Official platform guidance

- [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)
- [D1 databases and bindings](https://developers.cloudflare.com/d1/get-started/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

For the mail service, use [Email and services](EMAIL_AND_SERVICES.md). For the AI model's role and limits, use [AI design](AI_DESIGN.md).
