// Supabase clients. Tokens live ONLY in expo-secure-store (Android Keystore / iOS Keychain).
// One client per identity (guardian, each child), each with its own storage key.
import "react-native-url-polyfill/auto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";

const CHUNK = 1800; // SecureStore values should stay under ~2 KB; sessions are larger, so they are chunked
const k = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, "_");
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const n = Number(await SecureStore.getItemAsync(`${k(key)}.n`));
    if (!n) return null;
    let out = "";
    for (let i = 0; i < n; i++) out += (await SecureStore.getItemAsync(`${k(key)}.${i}`)) ?? "";
    return out || null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const old = Number(await SecureStore.getItemAsync(`${k(key)}.n`)) || 0;
    const n = Math.ceil(value.length / CHUNK);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${k(key)}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    for (let i = n; i < old; i++) await SecureStore.deleteItemAsync(`${k(key)}.${i}`);
    await SecureStore.setItemAsync(`${k(key)}.n`, String(n));
  },
  async removeItem(key: string): Promise<void> {
    const n = Number(await SecureStore.getItemAsync(`${k(key)}.n`)) || 0;
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${k(key)}.${i}`);
    await SecureStore.deleteItemAsync(`${k(key)}.n`);
  },
};
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "missing-anon-key";

export function makeClient(storageKey: string): SupabaseClient {
  return createClient(SUPABASE_URL, ANON, {
    auth: { storage: secureStorage, storageKey, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
  });
}
export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
/** Call an Edge Function with this identity's token. Errors carry the server's generic code. */
export async function callFn<T = any>(client: SupabaseClient | null, name: string, body: unknown): Promise<T> {
  const token = client ? (await client.auth.getSession()).data.session?.access_token : undefined;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { apikey: ANON, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(isForm ? {} : { "Content-Type": "application/json" }) },
      body: isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? "something_went_wrong");
  return data as T;
}
