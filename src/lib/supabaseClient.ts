// src/lib/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Domain } from "@/types/db"; // if you generated via CLI

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// If you generated `Database`, type-create client:
export const supabase: SupabaseClient<Domain> = createClient<Domain>(
  supabaseUrl,
  supabaseAnon
);
