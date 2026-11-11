# Cloudflare security Worker

This Worker proxies requests to the existing site origin and adds response
security headers. It does not change request methods, cache headers, response
bodies, or status codes. The content policy is deliberately limited to
`base-uri`, `object-src`, and `frame-ancestors` so the existing inline scripts,
maps, and external assets continue to work.

The Worker is not active until it is deployed to the Cloudflare zone. The
`diadanhvanhoc.com/*` route requires the hostname to remain proxied through
Cloudflare.

## Deploy from GitHub Actions

Add these repository Actions secrets:

- `CLOUDFLARE_API_TOKEN` with permission to edit Workers Scripts and Workers
  Routes, and read the `diadanhvanhoc.com` zone.
- `CLOUDFLARE_ACCOUNT_ID` for the Cloudflare account that owns the zone.

Then run **Deploy Cloudflare security Worker** from the Actions tab. No token or
account ID belongs in this repository.

## Local checks

From this directory, run `npm ci`, `npm test`, and `npm run deploy -- --dry-run`.
