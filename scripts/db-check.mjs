// npm run db:check
//
// Verifies the live Supabase connection using the same client library the app
// uses, so the sb_publishable_/sb_secret_ key formats are exercised exactly as
// production will.
//
// The important assertion is the third one: the publishable key ships to every
// browser, so if it can INSERT, anyone can forge a listing directly into the
// database and the owner-only API is decorative. That check must say OK before
// this is exposed to real users, and it is worth re-running after any change to
// the schema or its policies -- RLS is easy to disable by accident from the
// dashboard, and nothing else in the stack would notice.
//
// Writes a single probe row with the secret key and deletes it again.
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = readFileSync('.env.local', 'utf8');
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm'))?.[1] ?? '').trim();

const url = get('NEXT_PUBLIC_SUPABASE_URL');
const pub = get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const sec = get('SUPABASE_SECRET_KEY');

const anon = createClient(url, pub, { auth: { persistSession: false } });
const admin = createClient(url, sec, { auth: { persistSession: false } });

const line = (label, ok, detail) =>
  console.log(`  ${ok ? 'OK   ' : 'FAIL '} ${label.padEnd(38)} ${detail ?? ''}`);

console.log('\n--- READ (anon / publishable key) ---');
{
  const { error } = await anon.from('categories').select('key').limit(1);
  if (!error) line('read categories', true, 'table exists and is readable');
  else if (error.code === 'PGRST205') line('read categories', false, 'table missing (schema not run)');
  else line('read categories', false, `${error.code}: ${error.message}`);
}

console.log('\n--- READ (secret key) ---');
{
  const { error } = await admin.from('domains').select('name').limit(1);
  if (!error) line('read domains', true, 'table exists and is readable');
  else if (error.code === 'PGRST205') line('read domains', false, 'table missing (schema not run)');
  else line('read domains', false, `${error.code}: ${error.message}`);
}

console.log('\n--- WRITE (anon key) — this MUST fail; RLS is the whole security model ---');
{
  const { error } = await anon.from('domains').insert({
    domain_hash: '1',
    name: 'rls-probe-should-never-persist.kas',
    owner: 'kaspa:probe',
  });
  if (!error) line('anon insert blocked', false, 'INSERT SUCCEEDED — RLS IS NOT PROTECTING WRITES');
  else if (error.code === 'PGRST205') line('anon insert blocked', false, 'inconclusive — table missing');
  else if (error.code === '42501' || /row-level security/i.test(error.message))
    line('anon insert blocked', true, `refused by RLS (${error.code})`);
  else line('anon insert blocked', true, `refused: ${error.code}: ${error.message}`);
}

console.log('\n--- WRITE (secret key) — should succeed, then be cleaned up ---');
{
  const probe = 'zz-write-probe-' + Date.now() + '.kas';
  const { data, error } = await admin
    .from('domains')
    .insert({ domain_hash: String(Date.now()), name: probe, owner: 'kaspa:probe' })
    .select('id')
    .single();

  if (error) {
    if (error.code === 'PGRST205') line('secret insert', false, 'inconclusive — table missing');
    else line('secret insert', false, `${error.code}: ${error.message}`);
  } else {
    line('secret insert', true, `wrote row id=${data.id}`);
    const { error: delError } = await admin.from('domains').delete().eq('id', data.id);
    line('probe row cleaned up', !delError, delError ? delError.message : 'deleted');
  }
}

console.log('');
