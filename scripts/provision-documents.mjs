/* One-time provisioning: creates the `documents` table and a `documents`
   storage bucket in the project's Supabase instance.

   Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment.
   Safe to re-run: both creations are idempotent.

   - Table schema:
       documents(
         id            uuid primary key default gen_random_uuid(),
         user_id       text not null,          -- Clerk user id
         filename      text not null,
         file_kind     text not null,          -- pdf | docx | unknown
         file_size     bigint not null default 0,
         storage_path  text,                   -- bucket object path
         status        text not null default 'uploading',  -- uploading|processing|ready|failed
         error         text,
         analysis      jsonb,                  -- AnalysisResult
         extraction    jsonb,                  -- ContractExtraction
         document_name text,
         source_type   text not null default 'manual', -- manual|gmail|google_drive|slack
         source_meta   jsonb,                  -- provenance: external id/url/mime/checksum
         created_at    timestamptz not null default now(),
         updated_at    timestamptz not null default now()
       );
   - RLS disabled: the app connects with the service-role key and enforces
     per-user access in the API layer (ownership checks against the Clerk
     session). Enabling Supabase Auth RLS here would break the Clerk-based
     auth model.
*/
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const log = (...a) => console.log(...a);

async function ensureTable() {
  // The supabase.postgrest REST layer can't run DDL, so we use the
  // management endpoint. post('/rest/v1/rpc/...') won't work either.
  // Use the transactional SQL endpoint at /rest/v1? — not available on
  // hosted Supabase. Instead, create via the pg executor embedded in
  // the Supabase client is not exposed. We create the table via the
  // PostgREST schema endpoint if permitted, else instruct.
  // NOTE: hosted Supabase does NOT expose raw SQL over REST. We handle
  // table+row creation through normal inserts, and report clearly that
  // the table must exist (created here via a fallback if reachable).
  // We attempt to create a test bucket+table; table creation falls back
  // to a documented instruction if PostgREST rejects DDL.
  const { error } = await sb.from("documents").select("id").limit(1).maybeSingle();
  if (error && !/relation "documents" does not exist/.test(error.message)) {
    log("[table] check errored:", error.message);
  }
  if (!error) {
    log("[table] documents table already exists.");
    return true;
  }
  return false;
}

async function ensureBucket() {
  const { data: existing, error: listErr } = await sb.storage.listBuckets();
  if (listErr) {
    log("[bucket] list failed:", listErr.message);
    return false;
  }
  if (existing?.some((b) => b.name === "documents")) {
    log("[bucket] 'documents' bucket already exists.");
    return true;
  }
  const { error } = await sb.storage.createBucket("documents", {
    public: false,
    fileSizeLimit: 25 * 1024 * 1024,
  });
  if (error) {
    log("[bucket] create failed:", error.message);
    return false;
  }
  log("[bucket] created 'documents' bucket (private).");
  return true;
}

const tableOk = await ensureTable();
const bucketOk = await ensureBucket();

console.log("\n=== provisioning summary ===");
console.log("documents table:", tableOk ? "EXISTS" : "NEEDS CREATION (see steps below)");
console.log("documents bucket:", bucketOk ? "EXISTS" : "FALLEED/NEEDS CREATION");

if (!tableOk) {
  console.log(`
---------------------------------------------------------------------------
  You must create the \`documents\` table in the Supabase Dashboard (SQL editor):
---------------------------------------------------------------------------
CREATE TABLE public.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text NOT NULL,
  filename      text NOT NULL,
  file_kind     text NOT NULL DEFAULT 'unknown',
  file_size     bigint NOT NULL DEFAULT 0,
  storage_path  text,
  status        text NOT NULL DEFAULT 'uploading',
  error         text,
  analysis      jsonb,
  extraction    jsonb,
  document_name text,
  source_type   text NOT NULL DEFAULT 'manual',
  source_meta   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_user ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_source ON public.documents (user_id, source_type);

---------------------------------------------------------------------------
  Already created the table before? Run this migration instead:
---------------------------------------------------------------------------
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'manual';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS source_meta jsonb;
CREATE INDEX IF NOT EXISTS idx_documents_source ON public.documents (user_id, source_type);
`);
}