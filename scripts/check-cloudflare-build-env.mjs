if (process.env.CF_PAGES !== '1') {
  console.log('[cloudflare-build-env-preflight] SKIPPED (not running in Cloudflare Pages)');
  process.exit(0);
}

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const url = rawUrl.trim();
const anonKey = rawAnonKey.trim();

const urlMatch = url.match(/^https:\/\/([a-z0-9]{20})\.supabase\.co$/);
const segments = anonKey ? anonKey.split('.') : [];

let payload = null;
if (segments.length === 3) {
  try {
    payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
  } catch {
    payload = null;
  }
}

const branch = process.env.CF_PAGES_BRANCH ?? '(unset)';
const isPreview = branch !== '(unset)' && branch !== 'main';
const productionSupabaseRef = 'tsaarsuuclvkjsgjcmoj';

const report = {
  cf_pages_branch: branch,
  cf_pages_commit_sha: process.env.CF_PAGES_COMMIT_SHA ?? '(unset)',
  deployment_class: isPreview ? 'preview' : 'production_or_unknown',
  supabase_url_present: rawUrl.length > 0,
  supabase_url_trimmed_changed: rawUrl !== url,
  supabase_url_ref: urlMatch?.[1] ?? null,
  preview_points_to_production_supabase: Boolean(isPreview && urlMatch?.[1] === productionSupabaseRef),
  anon_key_present: rawAnonKey.length > 0,
  anon_key_trimmed_changed: rawAnonKey !== anonKey,
  anon_key_length: anonKey.length,
  anon_key_prefix_valid: anonKey.startsWith('eyJ'),
  anon_key_segments: segments.length,
  anon_key_payload_decodable: payload !== null,
  anon_key_role: payload?.role ?? null,
  anon_key_ref: payload?.ref ?? null,
  preview_anon_key_points_to_production_supabase: Boolean(isPreview && payload?.ref === productionSupabaseRef),
};

console.log('[cloudflare-build-env-preflight]');
console.log(JSON.stringify(report, null, 2));

const errors = [];
if (!urlMatch) errors.push('NEXT_PUBLIC_SUPABASE_URL is absent or malformed.');
if (isPreview && urlMatch?.[1] === productionSupabaseRef) {
  errors.push('Preview deployment points NEXT_PUBLIC_SUPABASE_URL at the production Supabase project.');
}
if (!anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is absent from the build environment.');
if (anonKey && !anonKey.startsWith('eyJ')) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY does not start with eyJ.');
if (anonKey && segments.length !== 3) errors.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY has ${segments.length} JWT segments instead of 3.`);
if (anonKey && segments.length === 3 && !payload) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY JWT payload is not decodable JSON.');
if (payload?.role && payload.role !== 'anon') errors.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY role is ${payload.role}, expected anon.`);
if (isPreview && payload?.ref === productionSupabaseRef) {
  errors.push('Preview deployment anon key belongs to the production Supabase project.');
}
if (urlMatch?.[1] && payload?.ref && urlMatch[1] !== payload.ref) {
  errors.push(`Supabase URL project ref (${urlMatch[1]}) does not match anon-key project ref (${payload.ref}).`);
}

if (errors.length) {
  console.error('[cloudflare-build-env-preflight] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[cloudflare-build-env-preflight] PASSED');
