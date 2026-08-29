/* ------------------------------------------------------------------ */
/*  Supabase - server-side persistence.                                */
/*                                                                     */
/*  Clerk owns authentication; Supabase (Postgres) stores each user's  */
/*  workspace data so it survives browsers, devices and logouts.       */
/*  This module is server-only: it uses the service-role key, which    */
/*  must NEVER be exposed to the browser.                              */
/*                                                                     */
/*  Env:                                                               */
/*    SUPABASE_URL             - e.g. https://<ref>.supabase.co        */
/*    SUPABASE_SERVICE_ROLE_KEY - the secret (sb_secret_...) key       */
/* ------------------------------------------------------------------ */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.SUPABASE_URL?.trim() &&
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!.trim(),
      process.env.SUPABASE_SERVICE_ROLE_KEY!.trim(),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return client;
}

/** Schema: user_data(user_id text pk, data jsonb, updated_at timestamptz). */
const USER_DATA_TABLE = "user_data";

export async function loadUserData(userId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await getSupabase()
    .from(USER_DATA_TABLE)
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error(`[supabase] loadUserData failed for ${userId}:`, error.message);
    return null;
  }
  return (data?.data as Record<string, unknown> | undefined) ?? null;
}

export async function saveUserData(
  userId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  const { error } = await getSupabase()
    .from(USER_DATA_TABLE)
    .upsert(
      { user_id: userId, data, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  if (error) {
    console.error(`[supabase] saveUserData failed for ${userId}:`, error.message);
    return false;
  }
  return true;
}
