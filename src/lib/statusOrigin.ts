const PUBLIC_HOSTS = new Set(['kaspadomains.com', 'www.kaspadomains.com']);
const LOCAL_HOSTS = new Set(['localhost:3000', '127.0.0.1:3000']);

/** Resolve a safe same-origin base for the server-rendered status fetch. */
export function statusOrigin(hostHeader: string): string {
  const host = hostHeader.trim().toLowerCase();
  if (LOCAL_HOSTS.has(host)) return `http://${host}`;
  if (PUBLIC_HOSTS.has(host)) return 'https://kaspadomains.com';
  return 'https://kaspadomains.com';
}
