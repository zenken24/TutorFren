// Versioned consent (per-scope toggles) + child assent. After consent: shared phone -> enrol this
// device; own phone -> go to the child's page to issue a pairing code.
import React, { useState } from "react";
import { Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../lib/supabase";
import { useGuardian, useSession } from "../../lib/session";
import { useStepUp } from "../../components/GuardianGate";
import { Btn, Card, errorKey, Notice, Row, Screen, T } from "../../components/ui";

export const CONSENT_VERSION = "v1";
export const SCOPES = ["core_learning", "voice_input", "guardian_view", "pilot_research"] as const;
export default function Consent() {
  const { t } = useTranslation();
  const { id, name, mode } = useLocalSearchParams<{ id: string; name: string; mode: string }>();
  const { client } = useGuardian();
  const s = useSession();
  const guarded = useStepUp();
  const qc = useQueryClient();
  const [scopes, setScopes] = useState({ core_learning: true, voice_input: false, guardian_view: true, pilot_research: false });
  const [assent, setAssent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await guarded(() => callFn(client, "consent", { student_id: id, text_version: CONSENT_VERSION, scopes, child_assent: assent }));
      if (mode === "shared") {
        const tok = await callFn<{ access_token: string; refresh_token: string }>(client, "shared-device-enroll", { student_id: id, device_id: s.deviceId });
        await s.enrolChild({ id, nickname: name }, tok);
      }
      qc.invalidateQueries({ queryKey: ["g-children"] });
      router.replace(mode === "shared" ? { pathname: "/(guardian)", params: { child: id } } : { pathname: "/(guardian)/devices", params: { child: id } }); // own phone: get a pairing code next
    } catch (e) { setMsg(t(errorKey(e))); }
    setBusy(false);
  };
  return (
    <Screen>
      <T variant="title">{t("consent.title")} · {name}</T>
      <T variant="small">{t("consent.version", { v: CONSENT_VERSION })}</T>
      {msg ? <Notice text={msg} /> : null}
      {SCOPES.map((sc) => (
        <Card key={sc}>
          <Row className="justify-between"><T variant="h" className="flex-1">{t(`consent.${sc}`)}</T>
            <Switch accessibilityLabel={t(`consent.${sc}`)} value={scopes[sc]} disabled={sc === "core_learning"} onValueChange={(v) => setScopes({ ...scopes, [sc]: v })} trackColor={{ true: "#035B7B" }} /></Row>
          <T variant="small">{t(`cons.${sc}.what`)}</T>
          <T variant="small">• {t(`cons.${sc}.stored`)}</T>
        </Card>
      ))}
      <Card>
        <Row className="justify-between"><View className="flex-1"><T>{t("consent.assent", { name })}</T></View><Switch accessibilityLabel="assent" value={assent} onValueChange={setAssent} trackColor={{ true: "#035B7B" }} /></Row>
      </Card>
      <Btn title={t("consent.agree")} onPress={save} loading={busy} disabled={!assent} />
      <Btn kind="ghost" title={t("common.cancel")} onPress={() => router.back()} />
    </Screen>
  );
}
