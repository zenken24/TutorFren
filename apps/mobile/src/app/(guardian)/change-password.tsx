// Change the guardian's password: current password is checked first, new one entered twice.
// Google-only accounts have no TutorFren password - they are told to manage it with Google.
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useGuardian } from "../../lib/session";
import { GHeader } from "../../components/GuardianMenu";
import { Btn, Card, Loading, Notice, PasswordField, Screen, T } from "../../components/ui";

export default function ChangePassword() {
  const { t } = useTranslation();
  const { client } = useGuardian();
  const me = useQuery({ queryKey: ["g-me-full"], queryFn: async () => (await client.auth.getUser()).data.user });
  const [cur, setCur] = useState(""), [next, setNext] = useState(""), [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const hasPassword = (me.data?.identities ?? []).some((i) => i.provider === "email");
  const problem = next && next.length < 10 ? t("auth.short") : again && next !== again ? t("pw.mismatch") : next && next === cur ? t("pw.same") : null;

  const submit = async () => {
    setBusy(true); setMsg(null);
    const email = me.data?.email ?? "";
    const check = await client.auth.signInWithPassword({ email, password: cur });
    if (check.error) { setBusy(false); setMsg({ text: t("pw.wrongCurrent") }); return; }
    const { error } = await client.auth.updateUser({ password: next });
    setBusy(false);
    if (error) { setMsg({ text: t("pw.failed") }); return; }
    setCur(""); setNext(""); setAgain(""); setMsg({ text: t("pw.done"), ok: true });
  };
  return (
    <Screen>
      <GHeader title={t("menu.password")} />
      {me.isLoading ? <Loading /> : !hasPassword ? (
        <Card><T variant="h">{t("pw.googleTitle")}</T><T variant="small">{t("pw.googleHelp")}</T></Card>
      ) : (
        <Card>
          <T variant="small">{t("pw.intro")}</T>
          {msg ? <Notice tone={msg.ok ? "teal" : "amber"} text={msg.text} /> : null}
          <PasswordField label={t("pw.current")} value={cur} onChangeText={setCur} autoComplete="current-password" />
          <PasswordField label={t("pw.new")} value={next} onChangeText={setNext} autoComplete="new-password" />
          <PasswordField label={t("pw.again")} value={again} onChangeText={setAgain} autoComplete="new-password" onSubmitEditing={submit} />
          {problem ? <Notice text={problem} /> : null}
          <Btn title={t("pw.save")} onPress={submit} loading={busy} disabled={!cur || next.length < 10 || next !== again || next === cur} />
        </Card>
      )}
    </Screen>
  );
}
