# Cloudflare Wrangler Reproduction

Linked issue report: https://github.com/cloudflare/workers-sdk/issues/5360

## Issue description

Using [`wrangler.getBindingsProxy`](https://github.com/cloudflare/workers-sdk/pull/5002) to read R2 bucket data, the readable stream will be stuck on big sizes (1MB+) if used with concurrency of 2+ promises. The second stream will never end and Node.js process is stuck. This issue does not happens in production.

## Setup repo

- Clone this repo
- Enable corepack `corepack enable`
- Install dependencies with `pnpm install`
- Tip: If you need to use `pkill -9 node` when server or script is stuck.

## Minimal reproduction 1

- Run [`simple.mjs`](./src/simple.mjs) script using `node ./src/simple.mjs`

## Minimal reproduction 2

- Run [`server.mjs`](./src/server.mjs) with `node ./src/server.mjs`
- Open http://localhost:3030/
- Upload two big images `assets/cat1.jpg` and `assets/cat2.jpg` without reloading page (to avoid early stuck)
- Reload page it will be stuck
- Tip: If you need to restart the server, a `pkill -9 node` might be necessary!
