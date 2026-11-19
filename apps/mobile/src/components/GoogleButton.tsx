// "Continue with Google" for GUARDIANS (children never sign in with Google).
// Flow: Supabase gives the Google URL -> in-app browser -> Google -> Supabase -> back to the app with a
// one-time code -> exchanged for a session (PKCE). Turned on by EXPO_PUBLIC_GOOGLE_AUTH=1 once Google
// credentials are configured in Supabase (see docs/NEXT_STEPS.md, "Google sign-in").
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { Text } from "./AppText";
import { Loading } from "./ui";

WebBrowser.maybeCompleteAuthSession();
export const googleEnabled = process.env.EXPO_PUBLIC_GOOGLE_AUTH === "1";

export async function googleSignIn(client: SupabaseClient): Promise<"ok" | "cancel" | "error" | "off"> {
  if (!googleEnabled) return "off";
  const redirectTo = Linking.createURL("auth-callback");
  const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: "select_account" } } });
  if (error || !data?.url) return "error";
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== "success") return "cancel";
  const { queryParams } = Linking.parse(res.url);
  const code = typeof queryParams?.code === "string" ? queryParams.code : null;
  if (code) return (await client.auth.exchangeCodeForSession(code)).error ? "error" : "ok";
  // implicit-flow fallback: tokens in the #fragment
  const frag = new URLSearchParams(res.url.split("#")[1] ?? "");
  const access_token = frag.get("access_token"), refresh_token = frag.get("refresh_token");
  if (access_token && refresh_token) return (await client.auth.setSession({ access_token, refresh_token })).error ? "error" : "ok";
  return "error";
}

export function GoogleButton({ client, onDone, onMessage }: { client: SupabaseClient; onDone: () => void | Promise<void>; onMessage: (m: string) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const r = await googleSignIn(client).catch(() => "error" as const);
    setBusy(false);
    if (r === "ok") await onDone();
    else if (r === "off") onMessage(t("auth.googleOff"));
    else if (r === "error") onMessage(t("auth.googleFailed"));
  };
  return (
    <Pressable onPress={go} disabled={busy} accessibilityRole="button" accessibilityLabel={t("auth.google")}
      className="min-h-[52px] px-5 rounded-card flex-row items-center justify-center gap-3 bg-surface border border-surface-line active:opacity-80">
      {busy ? <Loading /> : (
        <>
          <View className="w-7 h-7 rounded-full bg-white border border-surface-line items-center justify-center"><Text className="text-base font-bold" style={{ color: "#4285F4" }}>G</Text></View>
          <Text className="text-base font-bold text-ink">{t("auth.google")}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Divider: ──── or ──── */
export function OrLine() {
  const { t } = useTranslation();
  return <View className="flex-row items-center gap-3"><View className="flex-1 h-px bg-surface-line" /><Text className="text-sm text-ink-soft">{t("auth.or")}</Text><View className="flex-1 h-px bg-surface-line" /></View>;
}
