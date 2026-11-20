// Devices: for each child, every phone it is set up on, with a plain-language status:
//   paired (shared phone / own phone, last used) · waiting for a pairing code · removed
// Also: use this phone for the child, child PIN (shared phones), and pairing codes for the child's own phone.
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { callFn } from "../../lib/supabase";
import { useGuardian, useSession } from "../../lib/session";
import { setChildPin } from "../../lib/lock";
import { type GChild, useChildren } from "../../lib/guardian";
import { useStepUp } from "../../components/GuardianGate";
import { GHeader } from "../../components/GuardianMenu";
import { num } from "../../i18n";
import { Btn, Card, Chip, errorKey, Field, Loading, Notice, Row, Screen, Status, T } from "../../components/ui";

type Device = { device_id: string; mode: string; created_at: string; last_seen_at: string | null; revoked_at: string | null };
const day = (iso: string | null) => (iso ? num(iso.slice(0, 10)) : "—");

function ChildDevices({ child }: { child: GChild }) {
  const { t } = useTranslation();
  const { client } = useGuardian();
  const s = useSession();
  const guarded = useStepUp();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [left, setLeft] = useState(0);
  const [pin, setPin] = useState("");
  const devices = useQuery({ queryKey: ["g-devices", child.id], queryFn: async () => ((await client.from("devices").select("device_id,mode,created_at,last_seen_at,revoked_at").eq("student_id", child.id).order("created_at")).data ?? []) as Device[] });
  const onThisPhone = s.children.some((c) => c.id === child.id);
  const active = (devices.data ?? []).filter((d) => !d.revoked_at);

  useEffect(() => {
    if (!code) return;
    const iv = setInterval(() => { const l = Math.max(0, Math.round((Date.parse(code.expires_at) - Date.now()) / 1000)); setLeft(l); if (!l) setCode(null); }, 1000);
    return () => clearInterval(iv);
  }, [code]);
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); setMsg(null); try { await fn(); } catch (e) { if ((e as { code?: string }).code !== "reauth_required") setMsg(t(errorKey(e))); } setBusy(null); };

  if (child.status !== "active") return <Card><T variant="h">{child.nickname}</T><Notice text={t("dash.pending", { name: child.nickname })} /></Card>;
  return (
    <Card>
      <Row className="justify-between"><T variant="h">{child.nickname}</T><Chip tone="plain" title={t(child.device_mode === "shared" ? "child.thisPhone" : "child.ownPhone")} /></Row>
      {msg ? <Notice text={msg} /> : null}
      {devices.isLoading ? <Loading /> : (devices.data ?? []).length === 0 ? (
        <View className="bg-practice-soft rounded-card p-3 gap-1"><Status tone="wait" text={t("dev.none")} /><T variant="small">{t(child.device_mode === "shared" ? "dev.noneShared" : "dev.noneOwn")}</T></View>
      ) : devices.data!.map((d) => {
        const here = d.device_id === s.deviceId;
        return (
          <View key={d.device_id} className={`rounded-card p-3 gap-1 ${d.revoked_at ? "bg-surface-page" : "bg-primary-tint"}`}>
            <Status tone={d.revoked_at ? "off" : "ok"} text={`${t(d.revoked_at ? "dev.removed" : "dev.paired")} · ${t(d.mode === "shared" ? "dev.sharedPhone" : "dev.ownPhone")}${here ? ` (${t("dev.thisOne")})` : ""}`} />
            <T variant="small">{d.revoked_at ? t("dev.removedHelp", { d: day(d.revoked_at) }) : t(d.mode === "shared" ? "dev.pairedShared" : "dev.pairedOwn", { name: child.nickname })}</T>
            <T variant="small">{t("dev.since", { a: day(d.created_at), b: day(d.last_seen_at) })}</T>
            {!d.revoked_at ? <Btn kind="amber" loading={busy === d.device_id} title={t("child.revoke")} onPress={() => run(d.device_id, async () => {
              await guarded(() => callFn(client, "device-revoke", { student_id: child.id, device_id: d.device_id }));
              if (here) await s.removeChild(child.id);
              await devices.refetch();
            })} /> : null}
          </View>
        );
      })}
      {active.length > 0 ? <T variant="small">{t("dev.revokeNote")}</T> : null}

      {onThisPhone ? <Notice tone="teal" text={t("child.enrolled")} /> : (
        <View className="gap-1"><T variant="small">{t("dev.useHereHelp", { name: child.nickname })}</T>
          <Btn kind="soft" loading={busy === "enrol"} title={t("child.useHere")} onPress={() => run("enrol", async () => {
            const tok = await callFn<{ access_token: string; refresh_token: string }>(client, "shared-device-enroll", { student_id: child.id, device_id: s.deviceId });
            await s.enrolChild({ id: child.id, nickname: child.nickname }, tok); await devices.refetch();
          })} /></View>
      )}
      {onThisPhone ? (
        <View className="gap-2"><Field label={t("child.pin")} value={pin} onChangeText={(v) => setPin(v.replace(/[^0-9]/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />
          <T variant="small">{t("child.pinHelp")}</T>
          <Btn kind="ghost" title={t("common.save")} disabled={pin.length !== 0 && pin.length !== 4} onPress={async () => { await setChildPin(child.id, pin || null); setPin(""); setMsg(null); }} /></View>
      ) : null}

      <View className="gap-1"><T variant="small">{t("dev.codeIntro", { name: child.nickname })}</T>
        <Btn kind="soft" loading={busy === "code"} title={t("child.pairCode")} onPress={() => run("code", async () => { setCode(await guarded(() => callFn(client, "pairing-create", { student_id: child.id }))); })} /></View>
      {code ? <View className="items-center gap-1 bg-surface-page rounded-card p-3"><T className="text-4xl font-bold tracking-widest text-primary-dark">{num(code.code)}</T><T variant="small">{t("child.expires", { t: `${num(Math.floor(left / 60))}:${num(String(left % 60).padStart(2, "0"))}` })}</T><T variant="small" className="text-center">{t("child.codeHelp")}</T></View> : null}
    </Card>
  );
}

export default function Devices() {
  const { t } = useTranslation();
  const { child } = useLocalSearchParams<{ child?: string }>();
  const kids = useChildren();
  const list = (kids.data ?? []).filter((c) => !child || c.id === child);
  return (
    <Screen>
      <GHeader title={t("menu.devices")} />
      <T variant="small">{t("dev.intro")}</T>
      {kids.isLoading ? <Loading /> : list.length === 0 ? <T variant="small">{t("g.none")}</T> : list.map((c) => <ChildDevices key={c.id} child={c} />)}
    </Screen>
  );
}
