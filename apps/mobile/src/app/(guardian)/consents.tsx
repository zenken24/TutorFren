// Consent management: per child, each permission with a plain explanation of what it allows, what is
// stored, and what happens when it is off. Changes need a recent sign-in (server step-up).
import React, { useState } from "react";
import { Switch, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../lib/supabase";
import { useGuardian } from "../../lib/session";
import { type GChild, useChildren } from "../../lib/guardian";
import { useStepUp } from "../../components/GuardianGate";
import { GHeader } from "../../components/GuardianMenu";
import { num } from "../../i18n";
import { Card, Chip, errorKey, Loading, Notice, Row, Screen, T } from "../../components/ui";
import { CONSENT_VERSION, SCOPES } from "./consent";

function ChildConsents({ child }: { child: GChild }) {
  const { t } = useTranslation();
  const { client } = useGuardian();
  const guarded = useStepUp();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const consents = useQuery({ queryKey: ["g-consent-rows", child.id], queryFn: async () => (await client.from("consents").select("scope,text_version,granted_at").eq("student_id", child.id).is("revoked_at", null)).data ?? [] });
  const row = (sc: string) => (consents.data ?? []).find((c) => c.scope === sc);
  const toggle = async (sc: string, v: boolean) => {
    setBusy(sc); setMsg(null);
    try {
      await guarded(() => callFn(client, "consent", { student_id: child.id, text_version: CONSENT_VERSION, scopes: { [sc]: v } }));
      await consents.refetch();
      for (const k of ["g-consents", "g-summary", "g-children"]) qc.invalidateQueries({ queryKey: [k] });
    } catch (e) { if ((e as { code?: string }).code !== "reauth_required") setMsg(t(errorKey(e))); }
    setBusy(null);
  };
  return (
    <Card>
      <Row className="justify-between"><T variant="h">{child.nickname}</T><Chip tone={child.status === "active" ? "teal" : "amber"} title={t(child.status === "active" ? "g.active" : "g.pending")} /></Row>
      {msg ? <Notice text={msg} /> : null}
      {consents.isLoading ? <Loading /> : SCOPES.map((sc) => {
        const r = row(sc);
        return (
          <View key={sc} className="border-t border-surface-line pt-3 gap-1">
            <Row className="justify-between">
              <T className="flex-1 font-bold">{t(`consent.${sc}`)}</T>
              <Switch accessibilityLabel={t(`consent.${sc}`)} value={!!r} disabled={busy === sc || (sc === "core_learning" && !!r)} trackColor={{ true: "#035B7B" }} onValueChange={(v) => toggle(sc, v)} />
            </Row>
            <T variant="small" className="text-ink">{t(`cons.${sc}.what`)}</T>
            <T variant="small">• {t(`cons.${sc}.stored`)}</T>
            <T variant="small">• {t(`cons.${sc}.off`)}</T>
            <T variant="small" className={r ? "text-primary-dark" : ""}>{r ? t("consent.granted", { date: num(r.granted_at.slice(0, 10)), v: num(r.text_version.replace(/^v/, "")) }) : t("cons.notGiven")}</T>
          </View>
        );
      })}
    </Card>
  );
}

export default function Consents() {
  const { t } = useTranslation();
  const { child } = useLocalSearchParams<{ child?: string }>();
  const kids = useChildren();
  const list = (kids.data ?? []).filter((c) => !child || c.id === child);
  return (
    <Screen>
      <GHeader title={t("menu.consent")} />
      <T variant="small">{t("cons.intro")}</T>
      {kids.isLoading ? <Loading /> : list.length === 0 ? <T variant="small">{t("g.none")}</T> : list.map((c) => <ChildConsents key={c.id} child={c} />)}
    </Screen>
  );
}
