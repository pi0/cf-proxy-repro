# Cloudflare Wrangler Reproduction

Reprodction with R2 Bucket streaming and [`wrangler.getBindingsProxy`](https://github.com/cloudflare/workers-sdk/pull/5002).

## Steps

- Clone this repo
- Enable corepack `corepack enable`
- Install dependencies with `pnpm install`
- Run server with `pnpm start` or `node ./server.mjs`
- Open http://localhost:3030/
- Upload two big images `assets/cat1.jpg` and `assets/cat2.jpg` without reloading page
- Reload page it will be stuck
- Tip: If you need to restart the server, a `pkill -9 node` might be necessary!
