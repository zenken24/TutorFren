// SessionProvider: separate SecureStore keys and separate Supabase clients for the guardian and for
// each enrolled child. Student screens get ONLY the active child's client (useStudent);
// guardian screens ONLY the guardian client (useGuardian). The last child is never auto-opened.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { makeClient } from "./supabase";
import { resetLock, setChildPin } from "./lock";

export interface ChildEntry { id: string; nickname: string }
interface Ctx {
  ready: boolean;
  children: ChildEntry[];
  guardianSignedIn: boolean;
  guardianUnlocked: boolean;
  activeChild: ChildEntry | null;
  deviceId: string;
  /** internal - use the hooks below */
  _guardian: SupabaseClient;
  _student: SupabaseClient | null;
  enrolChild(entry: ChildEntry, tokens: { access_token: string; refresh_token: string }): Promise<void>;
  selectChild(id: string, entry?: ChildEntry): Promise<boolean>;
  switchUser(): void;
  removeChild(id: string): Promise<void>;
  renameChild(id: string, nickname: string): Promise<void>;
  setGuardianUnlocked(v: boolean): void;
  refreshGuardian(): Promise<void>;
  signOutGuardian(): Promise<void>;
}
const SessionContext = createContext<Ctx | null>(null);
const REG = "tf.children", DEV = "tf.device";
const studentKey = (id: string) => `tf.student.${id}`;

export function SessionProvider({ children: kids }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [guardian] = useState(() => makeClient("tf.guardian"));
  const [studentClients] = useState(() => new Map<string, SupabaseClient>());
  const [ready, setReady] = useState(false);
  const [list, setList] = useState<ChildEntry[]>([]);
  const [guardianSignedIn, setGuardianSignedIn] = useState(false);
  const [guardianUnlocked, setUnlocked] = useState(false);
  const [active, setActive] = useState<ChildEntry | null>(null);
  const [deviceId, setDeviceId] = useState("");
  // ids of the signed-in guardian's children (from the database). The phone's saved list can hold children
  // of another account that used this phone before; only this guardian's children are shown.
  // (loaded below once guardianSignedIn is known)

  const clientFor = useCallback((id: string) => {
    let c = studentClients.get(id);
    if (!c) { c = makeClient(studentKey(id)); studentClients.set(id, c); }
    return c;
  }, [studentClients]);
  const save = useCallback(async (next: ChildEntry[]) => { setList(next); await SecureStore.setItemAsync(REG, JSON.stringify(next)); }, []);

  useEffect(() => {
    (async () => {
      let d = await SecureStore.getItemAsync(DEV);
      if (!d) { d = Crypto.randomUUID(); await SecureStore.setItemAsync(DEV, d); }
      setDeviceId(d);
      try { setList(JSON.parse((await SecureStore.getItemAsync(REG)) ?? "[]")); } catch { setList([]); }
      setGuardianSignedIn(!!(await guardian.auth.getSession()).data.session);
      setReady(true);
    })();
    const sub = guardian.auth.onAuthStateChange((_e, s) => setGuardianSignedIn(!!s));
    return () => sub.data.subscription.unsubscribe();
  }, [guardian]);
  const mineQ = useQuery({
    queryKey: ["g-mine"], enabled: guardianSignedIn, staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await guardian.from("students").select("id");
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.id as string));
    },
  });
  const mine = guardianSignedIn ? mineQ.data ?? null : null;
  const loadMine = useCallback(async () => { await qc.invalidateQueries({ queryKey: ["g-mine"] }); }, [qc]);
  // signed in: this guardian's children only (unknown yet -> show none). Signed out: the children set up here.
  const visible = useMemo(() => (guardianSignedIn ? (mine ? list.filter((x) => mine.has(x.id)) : []) : list), [guardianSignedIn, mine, list]);

  const value = useMemo<Ctx>(() => ({
    ready, children: visible, guardianSignedIn, guardianUnlocked, activeChild: active, deviceId,
    _guardian: guardian, _student: active ? clientFor(active.id) : null,
    async enrolChild(entry, tokens) {
      const c = clientFor(entry.id);
      const { error } = await c.auth.setSession(tokens);
      if (error) throw error;
      await save([...list.filter((x) => x.id !== entry.id), entry]);
      loadMine().catch(() => {});
    },
    async selectChild(id, fallback) {
      setUnlocked(false); // handing the phone over always locks guardian mode first
      qc.clear(); // never keep another user's cached data in memory
      const entry = list.find((x) => x.id === id) ?? fallback; // fallback: a child enrolled a moment ago
      if (!entry) return false;
      const c = clientFor(id);
      const { data } = await c.auth.getSession();
      if (!data.session) return false; // revoked or expired: the guardian must enrol again
      // ask the server too: a saved login can belong to an account that was deleted or reset
      const { error } = await c.auth.getUser();
      if (error && (error.status === 401 || error.status === 403 || /not.?found|invalid/i.test(error.message))) {
        await c.auth.signOut({ scope: "local" }).catch(() => {});
        await save(list.filter((x) => x.id !== id));
        return false;
      }
      setActive(entry);
      return true;
    },
    switchUser() { qc.clear(); setActive(null); setUnlocked(false); },
    async removeChild(id) {
      await clientFor(id).auth.signOut({ scope: "local" }).catch(() => {});
      studentClients.delete(id);
      await setChildPin(id, null);
      if (active?.id === id) setActive(null);
      await save(list.filter((x) => x.id !== id));
    },
    async renameChild(id, nickname) { await save(list.map((x) => (x.id === id ? { ...x, nickname } : x))); },
    setGuardianUnlocked(v) { if (v) { qc.clear(); setActive(null); } setUnlocked(v); },
    async refreshGuardian() { const on = !!(await guardian.auth.getSession()).data.session; setGuardianSignedIn(on); if (on) await loadMine().catch(() => {}); },
    async signOutGuardian() { qc.clear(); setUnlocked(false); await guardian.auth.signOut({ scope: "local" }).catch(() => {}); await resetLock(); setGuardianSignedIn(false); },
  }), [ready, list, visible, loadMine, guardianSignedIn, guardianUnlocked, active, deviceId, guardian, clientFor, save, qc, studentClients]);

  return <SessionContext.Provider value={value}>{kids}</SessionContext.Provider>;
}
export function useSession() {
  const c = useContext(SessionContext);
  if (!c) throw new Error("SessionProvider missing");
  return c;
}
/** Student screens: the active child's client only. */
export function useStudent() {
  const s = useSession();
  if (!s.activeChild || !s._student) throw new Error("no_active_student");
  return { client: s._student, child: s.activeChild };
}
/** Guardian screens: the guardian client only, and only while guardian mode is unlocked. */
export function useGuardian() {
  const s = useSession();
  if (!s.guardianUnlocked) throw new Error("guardian_locked");
  return { client: s._guardian };
}
