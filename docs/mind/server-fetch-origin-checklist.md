# Server-fetch origin checklist

Use this when server-rendered code fetches a same-site route or any URL derived from request
metadata. Request headers are attacker-controlled input, not proof of the server's origin.

## 1. Identify the destination

- [ ] Name the exact endpoint the server must reach.
- [ ] Confirm whether the URL is built from `Host`, `Origin`, forwarded headers, query values,
  or another request-controlled field.

## 2. Constrain the origin

- [ ] Allowlist complete known origins, including scheme and host.
- [ ] Keep localhost development exceptions exact and narrow.
- [ ] Send every unknown or malformed value to a fixed safe origin; never interpolate it.

## 3. Verify the boundary

- [ ] Test a cloud metadata address, loopback port, alternate scheme, and attacker domain.
- [ ] Test each supported public and local origin.
- [ ] Inspect the final URL, not only the parser's return value, and do not claim live proxy
  behavior without a deployed reproduction.

Related: [`../MIND.md`](../MIND.md#25-request-headers-are-input-not-origin-authority).
