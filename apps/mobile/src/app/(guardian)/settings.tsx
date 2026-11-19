// Settings: language, guardian lock PIN, export a child's data, privacy notice, sign out.
import React, { useState } from "react";
import { TextInput as RNTextInput } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { callFn } from "../../lib/supabase";
import { useGuardian, useSession } from "../../lib/session";
import { setGuardianPin } from "../../lib/lock";
import { useChildren } from "../../lib/guardian";
import { setLanguage, num } from "../../i18n";
import { useStepUp } from "../../components/GuardianGate";
import { GHeader } from "../../components/GuardianMenu";
import { Btn, Card, Chip, errorKey, Field, Notice, Row, Screen, T } from "../../components/ui";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const s = useSession();
  const { client } = useGuardian();
  const guarded = useStepUp();
  const kids = useChildren();
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);
  const [exported, setExported] = useState<{ name: string; json: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const exportFor = async (id: string, name: string) => {
    setBusy(id); setMsg(null);
    try { const d = await guarded(() => callFn<Record<string, unknown[]>>(client, "account-export", { student_id: id })); setExported({ name, json: JSON.stringify(d, null, 1) }); }
    catch (e) { if ((e as { code?: string }).code !== "reauth_required") setMsg(t(errorKey(e))); }
    setBusy(null);
  };
  return (
    <Screen>
      <GHeader title={t("g.settings")} />
      <Card><T variant="h">{t("set.language")}</T>
        <Row><Chip tone={i18n.language !== "en" ? "teal" : "plain"} title="বাংলা" onPress={() => setLanguage("bn")} /><Chip tone={i18n.language === "en" ? "teal" : "plain"} title="English" onPress={() => setLanguage("en")} /></Row>
      </Card>
      <Card><T variant="h">{t("set.lock")}</T><T variant="small">{t("lock.setupHelp")}</T>
        <Field label={t("lock.pin")} value={pin} onChangeText={(v) => { setSaved(false); setPin(v.replace(/[^0-9]/g, "").slice(0, 6)); }} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <Btn kind="soft" title={t("set.changePin")} disabled={pin.length !== 6} onPress={async () => { await setGuardianPin(pin); setPin(""); setSaved(true); }} />
        {saved ? <Notice tone="teal" text={t("common.done")} /> : null}
      </Card>
      <Card><T variant="h">{t("child.export")}</T><T variant="small">{t("set.exportHelp")}</T>
        {msg ? <Notice text={msg} /> : null}
        <Row className="flex-wrap">{(kids.data ?? []).map((c) => <Btn key={c.id} kind="ghost" loading={busy === c.id} title={c.nickname} onPress={() => exportFor(c.id, c.nickname)} />)}</Row>
        {exported ? <><Notice tone="teal" text={t("child.exported", { n: num((exported.json.match(/"id"/g) ?? []).length) })} />
          <RNTextInput value={exported.json} multiline editable={false} selectTextOnFocus style={{ maxHeight: 160, fontSize: 11, color: "#4B6468", backgroundColor: "#F3F7F6", borderRadius: 12, padding: 8 }} /></> : null}
      </Card>
      <Card><T variant="h">{t("set.privacy")}</T><T variant="small">{t("set.privacyText")}</T></Card>
      <Btn kind="amber" title={t("set.signout")} onPress={async () => { await s.signOutGuardian(); router.replace("/"); }} />
    </Screen>
  );
}
