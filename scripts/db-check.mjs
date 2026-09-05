// npm run db:check
//
// Verifies the live Supabase project against what the app expects, using the
// same client library the app uses -- so the sb_publishable_/sb_secret_ key
// formats are exercised exactly as production will exercise them.
//
// Five things get checked, in order of how badly you want to know about them:
//
//   1. **Config.** Are the keys present and the right shape? A DB password
//      pasted into SUPABASE_SECRET_KEY looks fine in an .env file and fails
//      everywhere else.
//   2. **Schema drift.** Every table and column `src/lib/database.types.ts`
//      claims exists, actually exists. `create table if not exists` skips a
//      table that already exists including its new columns, so a project set up
//      against an older schema.sql passes a re-run and still lacks them --
//      see supabase/migrations/README.md.
//   3. **RLS.** The publishable key ships to every browser. If it can INSERT,
//      anyone can forge a listing straight into the database and the owner-only
//      API is decorative. This must say OK before real users touch it, and it
//      is worth re-running after any schema or policy change -- RLS is easy to
//      switch off by accident from the dashboard, and nothing else would
//      notice.
//   4. **Functions.** The atomic write functions exist and are at the version
//      this build needs -- and, critically, that the publishable key *cannot*
//      call them. They are `security definer`, so they bypass RLS by design;
//      Postgres grants EXECUTE to PUBLIC by default and PostgREST exposes every
//      public-schema function as an RPC. Without the explicit revokes in
//      migration 3 they would be a hole straight through the authorisation
//      model, opened by the migration meant to make writes safer.
//   5. **Writes.** The secret key can write, using a probe row that is deleted
//      again.
//
// Exits non-zero if anything required failed, so it can gate a deploy.
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Kept in step with src/lib/database.types.ts, which cannot be imported here
// (it is TypeScript, and this script runs under plain node).
const REQUIRED_SCHEMA_VERSION = 3;

// ---------------------------------------------------------------------------
// What the app expects. Keep in step with src/lib/database.types.ts.
// ---------------------------------------------------------------------------
// A representative subset per table rather than every column: enough to catch a
// project that predates a migration, without turning every additive change into
// a script edit.
const EXPECTED = {
  categories: ['key', 'title', 'is_allowed', 'sort_order'],
  domains: [
    'id',
    'domain_hash',
    'name',
    'owner',
    'fee_paid',
    'is_active',
    'submitted_by',
    'ownership_verified',
    'payment_tx_id',
    'created_at',
  ],
  domain_categories: ['domain_id', 'category_key'],
  votes: ['id', 'domain_id', 'voter', 'payment_tx_id', 'fee_paid', 'created_at'],
  domain_links: ['id', 'domain_id', 'name', 'url', 'position'],
  payment_receipts: ['tx_id', 'purpose', 'payer', 'amount_sompi', 'created_at'],
};

// Reachable only with the secret key: RLS is on with no policy at all.
const SERVER_ONLY = new Set(['payment_receipts']);

let failures = 0;
const line = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'OK   ' : 'FAIL '} ${label.padEnd(40)} ${detail ?? ''}`);
};
const warn = (label, detail) => console.log(`  WARN  ${label.padEnd(40)} ${detail ?? ''}`);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
let env = '';
try {
  env = readFileSync('.env.local', 'utf8');
} catch {
  console.error('\nNo .env.local found. Copy .env.example and fill it in.\n');
  process.exit(1);
}

const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm'))?.[1] ?? '').trim();

const url = get('NEXT_PUBLIC_SUPABASE_URL');
const pub =
  get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') || get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const sec = get('SUPABASE_SECRET_KEY') || get('SUPABASE_SERVICE_ROLE_KEY');

console.log('\n--- CONFIG ---');
line('NEXT_PUBLIC_SUPABASE_URL', Boolean(url), url || 'missing');
line('publishable key', Boolean(pub), pub ? `${pub.slice(0, 16)}…` : 'missing');
line('secret key', Boolean(sec), sec ? `${sec.slice(0, 12)}…` : 'missing');

// The two key formats Supabase issues. A short opaque string here is almost
// always the database password, which will fail every request with a confusing
// error rather than an obviously wrong one.
if (sec && !/^(sb_secret_|eyJ)/.test(sec)) {
  line(
    'secret key looks like a key',
    false,
    'expected sb_secret_… or a JWT — is this the DB password?'
  );
}

if (!url || !pub || !sec) {
  console.error('\nCannot continue without all three values.\n');
  process.exit(1);
}

// supabase-js flattens every transport failure to `TypeError: fetch failed` and
// drops the cause. The usual culprit on a developer machine is TLS-intercepting
// antivirus or a corporate proxy: Node rejects the intercepted certificate chain
// while the browser, which trusts the OS store, works fine. Name it rather than
// leaving the next person to rediscover it.
const explainTransport = (message = '') =>
  /fetch failed/i.test(message)
    ? [
        '',
        '        ^ likely TLS interception (antivirus / corporate proxy). Node rejects the',
        '          intercepted certificate chain while the browser, which trusts the OS store,',
        '          works fine. Set NODE_EXTRA_CA_CERTS to its root certificate, or run node',
        '          with --use-system-ca, then re-run.',
      ].join('\n')
    : '';

const anon = createClient(url, pub, { auth: { persistSession: false } });
const admin = createClient(url, sec, { auth: { persistSession: false } });

// ---------------------------------------------------------------------------
// Schema drift
// ---------------------------------------------------------------------------
// Selecting a column that does not exist is an error naming that column, which
// makes the failure specific enough to act on. `limit(0)` keeps no rows moving.
console.log('\n--- SCHEMA (secret key) ---');
for (const [table, columns] of Object.entries(EXPECTED)) {
  const { error } = await admin.from(table).select(columns.join(', ')).limit(0);

  if (!error) {
    line(table, true, `${columns.length} expected columns present`);
    continue;
  }
  if (error.code === 'PGRST205') {
    line(table, false, 'table missing — run supabase/schema.sql');
    continue;
  }
  if (error.code === '42703' || /column .* does not exist/i.test(error.message)) {
    line(table, false, `${error.message} — see supabase/migrations/README.md`);
    continue;
  }
  line(table, false, `${error.code}: ${error.message}${explainTransport(error.message)}`);
}

{
  const { error } = await admin.from('domain_vote_counts').select('domain_hash, votes').limit(0);
  line('domain_vote_counts (view)', !error, error ? `${error.code}: ${error.message}` : 'present');
}

// ---------------------------------------------------------------------------
// Public reads
// ---------------------------------------------------------------------------
console.log('\n--- READ (anon / publishable key) ---');
for (const table of Object.keys(EXPECTED)) {
  const { error } = await anon.from(table).select('*').limit(1);

  if (SERVER_ONLY.has(table)) {
    // A missing table refuses reads too, and that is not evidence of anything.
    // Reporting it as a pass would mean the strongest privacy check in this
    // script goes green precisely when nothing has been set up.
    if (error?.code === 'PGRST205') {
      line(`${table} not publicly readable`, false, 'inconclusive — table missing');
    } else if (error) {
      line(`${table} not publicly readable`, true, `refused (${error.code})`);
    } else {
      // No policy at all means reads succeed but return nothing, rather than
      // being refused. What matters is that no row comes back.
      line(`${table} not publicly readable`, true, 'no rows visible to the anon key');
    }
    continue;
  }

  if (!error) line(`read ${table}`, true, 'readable');
  else if (error.code === 'PGRST205') line(`read ${table}`, false, 'table missing');
  else line(`read ${table}`, false, `${error.code}: ${error.message}`);
}

// ---------------------------------------------------------------------------
// RLS
// ---------------------------------------------------------------------------
console.log('\n--- WRITE (anon key) — every one of these MUST fail ---');
const anonProbes = [
  ['domains', { domain_hash: '1', name: 'rls-probe-never-persists.kas', owner: 'kaspa:probe' }],
  ['votes', { domain_id: 1, voter: 'kaspa:probe' }],
  ['domain_links', { domain_id: 1, name: 'probe', url: 'https://example.com' }],
  ['categories', { key: 'rls-probe', title: 'probe' }],
  ['payment_receipts', { tx_id: 'probe', purpose: 'vote', payer: 'kaspa:probe', amount_sompi: '1' }],
];

for (const [table, row] of anonProbes) {
  const { error } = await anon.from(table).insert(row);
  if (!error) {
    line(`anon insert into ${table} blocked`, false, 'INSERT SUCCEEDED — RLS IS NOT PROTECTING WRITES');
  } else if (error.code === 'PGRST205') {
    line(`anon insert into ${table} blocked`, false, 'inconclusive — table missing');
  } else if (error.code === '42501' || /row-level security/i.test(error.message)) {
    line(`anon insert into ${table} blocked`, true, `refused by RLS (${error.code})`);
  } else {
    // Refused for another reason (a foreign key, say). Still refused, but it
    // does not prove RLS did it -- say so rather than claiming a clean pass.
    warn(`anon insert into ${table}`, `refused, but by ${error.code}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Atomic write functions
// ---------------------------------------------------------------------------
console.log('\n--- FUNCTIONS ---');
// Whether the functions exist at all. The permission checks below are only
// meaningful if they do -- see the note there.
let functionsExist = false;
{
  const { data, error } = await admin.rpc('kaspadomains_schema_version');
  if (error) {
    line(
      'schema version',
      false,
      error.code === 'PGRST202'
        ? 'missing — apply supabase/migrations/0003_atomic_writes.sql'
        : `${error.code}: ${error.message}${explainTransport(error.message)}`
    );
  } else {
    const found = Number(data ?? 0);
    functionsExist = found >= REQUIRED_SCHEMA_VERSION;
    line(`schema version ${found}`, functionsExist, `need >= ${REQUIRED_SCHEMA_VERSION}`);
  }
}

// The write functions are `security definer`: they run with the owner's rights
// and bypass RLS. Postgres grants EXECUTE to PUBLIC by default and PostgREST
// exposes every public-schema function as an RPC endpoint, so without the
// explicit revokes in migration 3 the browser-visible key could call
// create_listing directly -- a hole straight through the authorisation model,
// opened by the migration that was supposed to make writes safer. This is the
// check that proves the revokes landed.
console.log('\n--- FUNCTION PERMISSIONS (anon) — every one MUST fail ---');
for (const [fn, args] of [
  ['create_listing', {
    p_domain_hash: '1', p_name: 'rpc-probe-never-persists.kas', p_owner: 'kaspa:probe',
    p_submitted_by: 'kaspa:probe', p_fee_paid: '0', p_payment_tx_id: 'rpc-probe',
    p_payer: 'kaspa:probe', p_categories: ['other'],
  }],
  ['record_vote', {
    p_name: 'rpc-probe-never-persists.kas', p_voter: 'kaspa:probe',
    p_fee_paid: '0', p_payment_tx_id: 'rpc-probe-2',
  }],
  ['replace_domain_categories', { p_name: 'rpc-probe-never-persists.kas', p_categories: ['other'] }],
  ['replace_domain_links', { p_name: 'rpc-probe-never-persists.kas', p_links: [] }],
]) {
  const { error } = await anon.rpc(fn, args);
  if (!error) {
    line(`anon rpc ${fn} blocked`, false, 'CALL SUCCEEDED — THE PUBLIC KEY CAN BYPASS RLS');
  } else if (error.code === 'PGRST202') {
    // "Not found" is what a correctly revoked function looks like -- PostgREST
    // hides functions the calling role cannot execute -- but it is also what a
    // function that was never created looks like. Those are not the same
    // result, and calling the second one a pass would mean this check goes
    // green precisely when nothing has been set up. Only treat it as a pass if
    // the admin probe above proved the functions actually exist.
    if (functionsExist) {
      line(`anon rpc ${fn} blocked`, true, 'exists, but not exposed to the anon role');
    } else {
      line(`anon rpc ${fn} blocked`, false, 'inconclusive — the function does not exist yet');
    }
  } else if (error.code === '42501' || /permission denied/i.test(error.message)) {
    line(`anon rpc ${fn} blocked`, true, `permission denied (${error.code})`);
  } else {
    warn(`anon rpc ${fn}`, `refused, but by ${error.code}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Server writes
// ---------------------------------------------------------------------------
console.log('\n--- WRITE (secret key) — should succeed, then clean up ---');
{
  const probe = 'zz-write-probe-' + Date.now() + '.kas';
  const { data, error } = await admin
    .from('domains')
    .insert({ domain_hash: String(Date.now()), name: probe, owner: 'kaspa:probe' })
    .select('id')
    .single();

  if (error) {
    line('secret insert', false, error.code === 'PGRST205' ? 'inconclusive — table missing' : `${error.code}: ${error.message}`);
  } else {
    line('secret insert', true, `wrote row id=${data.id}`);
    const { error: delError } = await admin.from('domains').delete().eq('id', data.id);
    line('probe row cleaned up', !delError, delError ? delError.message : 'deleted');
  }
}

console.log(
  failures === 0
    ? '\nAll checks passed.\n'
    : `\n${failures} check${failures === 1 ? '' : 's'} failed. See above.\n`
);

process.exit(failures === 0 ? 0 : 1);
