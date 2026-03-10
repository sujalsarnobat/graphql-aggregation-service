#!/usr/bin/env ts-node
/**
 * Healthcheck script — verifies all services are running and healthy.
 * Run with:  npx ts-node scripts/healthcheck.ts
 */

const services = [
  { name: 'User Service',     url: 'http://localhost:3001/health' },
  { name: 'Order Service',    url: 'http://localhost:3002/health' },
  { name: 'Product Service',  url: 'http://localhost:3003/health' },
  { name: 'GraphQL Gateway',  url: 'http://localhost:4000/health' },
];

const TIMEOUT_MS = 5000;

async function checkService(name: string, url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.json() as { status?: string };
    const ok = res.ok && body.status === 'ok';
    const icon = ok ? '✅' : '❌';
    console.log(`${icon}  ${name.padEnd(20)} ${url}  →  HTTP ${res.status}  status=${body.status}`);
    return ok;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`❌  ${name.padEnd(20)} ${url}  →  ${msg}`);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log('\n🔍  GraphQL Aggregation Service — Health Check\n');
  console.log('─'.repeat(72));

  const results = await Promise.all(
    services.map(({ name, url }) => checkService(name, url)),
  );

  const allOk = results.every(Boolean);
  console.log('─'.repeat(72));

  if (allOk) {
    console.log('\n✅  All services are healthy!\n');
    process.exit(0);
  } else {
    const failed = results.filter((r) => !r).length;
    console.log(`\n❌  ${failed} service(s) are unhealthy. Check logs.\n`);
    process.exit(1);
  }
}

main();
