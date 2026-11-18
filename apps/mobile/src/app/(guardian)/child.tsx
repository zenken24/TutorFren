// One child, guardian view: AGGREGATED summary only (guardian_summary), devices, consent, pairing,
// export and delete. There is deliberately no screen for transcripts or activity timelines.
import React, { useEffect, useState } from "react";
import { Switch, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../lib/supabase";
import { useGuardian, useSession } from "../../lib/session";
import { setChildPin } from "../../lib/lock";
import { useStepUp } from "../../components/GuardianGate";
import { currentLang, num } from "../../i18n";
import { Btn, Card, Chip, errorKey, Field, Loading, Notice, Row, Screen, T } from "../../components/ui";
import { CONSENT_VERSION, SCOPES } from "./consent";

type Concept = { concept_id: string; title_en: string; title_bn: string };
function List({ title, items, tone, empty }: { title: string; items: string[] | null; tone: "teal" | "amber"; empty: string }) {
  return <View className="gap-1"><T variant="label">{title}</T>{items ? <View className="flex-row flex-wrap gap-2">{items.map((x) => <Chip key={x} tone={tone} title={x} />)}</View> : <T variant="small">{empty}</T>}</View>;
}
type Summary = { mastered: Concept[]; gaps: Concept[]; suggested_practice: Concept[]; sessions_this_week: number };
export default function Child() {
  const { t } = useTranslation();
  const { id, name, mode } = useLocalSearchParams<{ id: string; name: string; mode: string }>();
  const { client } = useGuardian();
  const s = useSession();
  const guarded = useStepUp();
  const qc = useQueryClient();
  const lang = currentLang();
  const [msg, setMsg] = useState<string | null>(null);
  const [code, setCode] = useState<{ code: string; expires_at: string } | null>(null);
  const [left, setLeft] = useState(0);
  const [pin, setPin] = useState("");
  const [del, setDel] = useState<0 | 1 | 2>(0);
  const [delText, setDelText] = useState("");
  const [exported, setExported] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const consents = useQuery({ queryKey: ["g-consents", id], queryFn: async () => (await client.from("consents").select("scope,text_version,granted_at").eq("student_id", id).is("revoked_at", null)).data ?? [] });
  const active = (sc: string) => (consents.data ?? []).find((c) => c.scope === sc);
  const summary = useQuery({ queryKey: ["g-summary", id], enabled: !!active("guardian_view"), retry: false, queryFn: () => callFn<Summary>(client, "guardian-summary", { student_id: id }) });
  const devices = useQuery({ queryKey: ["g-devices", id], queryFn: async () => (await client.from("devices").select("device_id,mode,last_seen_at,revoked_at").eq("student_id", id).order("created_at")).data ?? [] });
  const onThisPhone = s.children.some((c) => c.id === id);

  useEffect(() => {
    if (!code) return;
    const iv = setInterval(() => { const l = Math.max(0, Math.round((Date.parse(code.expires_at) - Date.now()) / 1000)); setLeft(l); if (!l) setCode(null); }, 1000);
    return () => clearInterval(iv);
  }, [code]);
  const run = async (key: string, fn: () => Promise<void>) => { setBusy(key); setMsg(null); try { await fn(); } catch (e) { if ((e as { code?: string }).code !== "reauth_required") setMsg(t(errorKey(e))); } setBusy(null); };
  const names = (xs?: Concept[]) => (xs?.length ? xs.map((c) => (lang === "bn" ? c.title_bn : c.title_en)) : null);
  return (
    <Screen>
      <Row className="justify-between"><T variant="title">{name}</T><Chip tone="plain" title={t("common.back")} onPress={() => router.replace("/(guardian)")} /></Row>
      {msg ? <Notice text={msg} /> : null}

      <Card>
        <T variant="h">{t("child.summary")}</T>
        {!active("guardian_view") ? <T variant="small">{t("child.noView")}</T> : summary.isLoading ? <Loading /> : summary.data ? (
          <>
            <List empty={t("child.nothing")} title={t("child.mastered")} items={names(summary.data.mastered)} tone="teal" />
            <List empty={t("child.nothing")} title={t("child.gaps")} items={names(summary.data.gaps)} tone="amber" />
            <List empty={t("child.nothing")} title={t("child.suggested")} items={names(summary.data.suggested_practice)} tone="amber" />
            <T variant="label">{t("child.sessions")}: {num(summary.data.sessions_this_week)}</T>
          </>
        ) : <T variant="small">{t("common.error")}</T>}
      </Card>

      <Card>
        <T variant="h">{t("child.devices")}</T>
        {(devices.data ?? []).map((d) => (
          <Row key={d.device_id} className="justify-between">
            <T variant="small">{t(d.mode === "shared" ? "child.thisPhone" : "child.ownPhone")}{d.last_seen_at ? ` · ${d.last_seen_at.slice(0, 10)}` : ""}</T>
            {d.revoked_at ? <Chip tone="plain" title={t("child.revoked")} /> : <Chip tone="amber" title={t("child.revoke")} onPress={() => run("revoke", async () => { await callFn(client, "device-revoke", { student_id: id, device_id: d.device_id }); if (d.device_id === s.deviceId) await s.removeChild(id); devices.refetch(); })} />}
          </Row>
        ))}
        {onThisPhone ? <Notice tone="teal" text={t("child.enrolled")} /> : (
          <Btn kind="soft" loading={busy === "enrol"} title={t("child.useHere")} onPress={() => run("enrol", async () => {
            const tok = await callFn<{ access_token: string; refresh_token: string }>(client, "shared-device-enroll", { student_id: id, device_id: s.deviceId });
            await s.enrolChild({ id, nickname: name }, tok); devices.refetch();
          })} />
        )}
        {mode !== "shared" || !onThisPhone ? null : (
          <View className="gap-2"><Field label={t("child.pin")} value={pin} onChangeText={(v) => setPin(v.replace(/[^0-9]/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} />
            <T variant="small">{t("child.pinHelp")}</T>
            <Btn kind="ghost" title={t("common.save")} disabled={pin.length !== 0 && pin.length !== 4} onPress={async () => { await setChildPin(id, pin || null); setPin(""); setMsg(t("common.done")); }} /></View>
        )}
        <Btn kind="soft" loading={busy === "code"} title={t("child.pairCode")} onPress={() => run("code", async () => { setCode(await guarded(() => callFn(client, "pairing-create", { student_id: id }))); })} />
        {code ? <View className="items-center gap-1"><T className="text-4xl font-bold tracking-widest text-primary-dark">{num(code.code)}</T><T variant="small">{t("child.expires", { t: `${num(Math.floor(left / 60))}:${num(String(left % 60).padStart(2, "0"))}` })}</T><T variant="small" className="text-center">{t("child.codeHelp")}</T></View> : null}
      </Card>

      <Card>
        <T variant="h">{t("consent.title")}</T>
        {SCOPES.map((sc) => { const a = active(sc); return (
          <Row key={sc} className="justify-between">
            <View className="flex-1"><T>{t(`consent.${sc}`)}</T><T variant="small">{a ? t("consent.granted", { date: a.granted_at.slice(0, 10), v: a.text_version.replace(/^v/, "") }) : "—"}</T></View>
            <Switch accessibilityLabel={t(`consent.${sc}`)} value={!!a} disabled={busy === sc} trackColor={{ true: "#0F766E" }}
              onValueChange={(v) => run(sc, async () => { await guarded(() => callFn(client, "consent", { student_id: id, text_version: CONSENT_VERSION, scopes: { [sc]: v } })); await consents.refetch(); qc.invalidateQueries({ queryKey: ["g-summary", id] }); qc.invalidateQueries({ queryKey: ["g-children"] }); })} />
          </Row>); })}
      </Card>

      <Card>
        <Btn kind="ghost" loading={busy === "export"} title={t("child.export")} onPress={() => run("export", async () => { const d = await guarded(() => callFn<Record<string, unknown[]>>(client, "account-export", { student_id: id })); setExported(JSON.stringify(d, null, 1)); })} />
        {exported ? <><Notice tone="teal" text={t("child.exported", { n: num((exported.match(/"id"/g) ?? []).length) })} /><TextInput value={exported} multiline editable={false} selectTextOnFocus className="max-h-40 text-xs text-ink-soft bg-surface-page rounded-card p-2" /></> : null}
        {del === 0 ? <Btn kind="amber" title={t("child.delete")} onPress={() => setDel(1)} /> : del === 1 ? (
          <><Notice text={t("child.delete1", { name })} /><Row><Btn className="flex-1" kind="ghost" title={t("common.cancel")} onPress={() => setDel(0)} /><Btn className="flex-1" kind="amber" title={t("common.continue")} onPress={() => setDel(2)} /></Row></>
        ) : (
          <><Field label={t("child.delete2")} value={delText} onChangeText={setDelText} autoCapitalize="characters" />
            <Row><Btn className="flex-1" kind="ghost" title={t("common.cancel")} onPress={() => { setDel(0); setDelText(""); }} />
              <Btn className="flex-1" kind="amber" loading={busy === "delete"} disabled={delText !== "DELETE"} title={t("child.delete")} onPress={() => run("delete", async () => {
                await guarded(() => callFn(client, "account-delete", { student_id: id, confirm: "DELETE" }));
                await s.removeChild(id); qc.invalidateQueries({ queryKey: ["g-children"] }); router.replace("/(guardian)");
              })} /></Row></>
        )}
      </Card>
    </Screen>
  );
}
