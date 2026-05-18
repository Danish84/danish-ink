import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Slot } from "./summarize";

export type DigestStatus = "success" | "error";

export type SaveDigestInput = {
  date: string;
  slot: Slot;
  content: string | null;
  status: DigestStatus;
  error_msg?: string | null;
};

export type SavedDigest = SaveDigestInput & {
  id: string;
  generated_at: string;
};

export function createServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "createServiceClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function saveDigest(
  input: SaveDigestInput,
  client: SupabaseClient = createServiceClient(),
): Promise<SavedDigest> {
  const { data, error } = await client.from("summaries").upsert(
    {
      date: input.date,
      slot: input.slot,
      content: input.content,
      status: input.status,
      error_msg: input.error_msg ?? null,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "date,slot" },
  ).select("id, date, slot, content, status, error_msg, generated_at")
    .single();
  if (error) {
    throw new Error(`saveDigest: ${error.message}`);
  }
  return data as SavedDigest;
}

export async function hasSuccessfulDigest(
  input: Pick<SaveDigestInput, "date" | "slot">,
  client: SupabaseClient = createServiceClient(),
): Promise<boolean> {
  const { data, error } = await client
    .from("summaries")
    .select("id")
    .eq("date", input.date)
    .eq("slot", input.slot)
    .eq("status", "success")
    .maybeSingle();

  if (error) {
    throw new Error(`hasSuccessfulDigest: ${error.message}`);
  }
  return Boolean(data);
}
