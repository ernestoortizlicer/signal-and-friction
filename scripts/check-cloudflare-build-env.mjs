if (process.env.CF_PAGES !== '1') {
  console.log('[cloudflare-build-env-preflight] SKIPPED (not running in Cloudflare Pages)');
  process.exit(0);
}

const rawPublicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const rawServerUrl = process.env.SUPABASE_URL ?? '';
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const publicUrl = rawPublicUrl.trim();
const serverUrl = rawServerUrl.trim();
const anonKey = rawAnonKey.trim();

const supabaseUrlPattern = /^https:\/\/([a-z0-9]{20})\.supabase\.co$/;
const publicUrlMatch = publicUrl.match(supabaseUrlPattern);
const serverUrlMatch = serverUrl.match(supabaseUrlPattern);
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
const isProduction = branch === 'main';
const isPreview = branch !== '(unset)' && !isProduction;
const productionSupabaseRef = 'tsaarsuuclvkjsgjcmoj';

const publicRef = publicUrlMatch?.[1] ?? null;
const serverRef = serverUrlMatch?.[1] ?? null;
const anonRef = payload?.ref ?? null;

const report = {
  cf_pages_branch: branch,
  cf_pages_commit_sha: process.env.CF_PAGES_COMMIT_SHA ?? '(unset)',
  deployment_class: isProduction ? 'production' : isPreview ? 'preview' : 'unknown',
  public_supabase_url_present: rawPublicUrl.length > 0,
  public_supabase_url_trimmed_changed: rawPublicUrl !== publicUrl,
  public_supabase_url_ref: publicRef,
  server_supabase_url_present: rawServerUrl.length > 0,
  server_supabase_url_trimmed_changed: rawServerUrl !== serverUrl,
  server_supabase_url_ref: serverRef,
  public_and_server_supabase_refs_match: Boolean(publicRef && serverRef && publicRef === serverRef),
  production_public_points_to_expected_supabase: Boolean(isProduction && publicRef === productionSupabaseRef),
  production_server_points_to_expected_supabase: Boolean(isProduction && serverRef === productionSupabaseRef),
  preview_public_points_to_production_supabase: Boolean(isPreview && publicRef === productionSupabaseRef),
  preview_server_points_to_production_supabase: Boolean(isPreview && serverRef === productionSupabaseRef),
  anon_key_present: rawAnonKey.length > 0,
  anon_key_trimmed_changed: rawAnonKey !== anonKey,
  anon_key_length: anonKey.length,
  anon_key_prefix_valid: anonKey.startsWith('eyJ'),
  anon_key_segments: segments.length,
  anon_key_payload_decodable: payload !== null,
  anon_key_role: payload?.role ?? null,
  anon_key_ref: anonRef,
  production_anon_key_points_to_expected_supabase: Boolean(isProduction && anonRef === productionSupabaseRef),
  preview_anon_key_points_to_production_supabase: Boolean(isPreview && anonRef === productionSupabaseRef),
};

console.log('[cloudflare-build-env-preflight]');
console.log(JSON.stringify(report, null, 2));

const errors = [];
if (!publicUrlMatch) errors.push('NEXT_PUBLIC_SUPABASE_URL is absent or malformed.');
if (!serverUrlMatch) errors.push('SUPABASE_URL is absent or malformed. Server-side Functions must not rely on a production fallback.');

if (isProduction && publicRef !== productionSupabaseRef) {
  errors.push(`Production NEXT_PUBLIC_SUPABASE_URL must target Supabase project ${productionSupabaseRef}, got ${publicRef ?? '(invalid)'}.`);
}
if (isProduction && serverRef !== productionSupabaseRef) {
  errors.push(`Production SUPABASE_URL must target Supabase project ${productionSupabaseRef}, got ${serverRef ?? '(invalid)'}.`);
}
if (isPreview && publicRef === productionSupabaseRef) {
  errors.push('Preview deployment points NEXT_PUBLIC_SUPABASE_URL at the production Supabase project.');
}
if (isPreview && serverRef === productionSupabaseRef) {
  errors.push('Preview deployment points SUPABASE_URL at the production Supabase project.');
}
if (publicRef && serverRef && publicRef !== serverRef) {
  errors.push(`Public Supabase ref (${publicRef}) does not match server-side Supabase ref (${serverRef}).`);
}

if (!anonKey) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is absent from the build environment.');
if (anonKey && !anonKey.startsWith('eyJ')) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY does not start with eyJ.');
if (anonKey && segments.length !== 3) errors.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY has ${segments.length} JWT segments instead of 3.`);
if (anonKey && segments.length === 3 && !payload) errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY JWT payload is not decodable JSON.');
if (payload?.role && payload.role !== 'anon') errors.push(`NEXT_PUBLIC_SUPABASE_ANON_KEY role is ${payload.role}, expected anon.`);
if (isProduction && anonRef !== productionSupabaseRef) {
  errors.push(`Production deployment anon key must belong to Supabase project ${productionSupabaseRef}, got ${anonRef ?? '(invalid)'}.`);
}
if (isPreview && anonRef === productionSupabaseRef) {
  errors.push('Preview deployment anon key belongs to the production Supabase project.');
}
if (publicRef && anonRef && publicRef !== anonRef) {
  errors.push(`Public Supabase URL project ref (${publicRef}) does not match anon-key project ref (${anonRef}).`);
}
if (serverRef && anonRef && serverRef !== anonRef) {
  errors.push(`Server-side Supabase URL project ref (${serverRef}) does not match anon-key project ref (${anonRef}).`);
}

if (errors.length) {
  console.error('[cloudflare-build-env-preflight] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('[cloudflare-build-env-preflight] PASSED');
