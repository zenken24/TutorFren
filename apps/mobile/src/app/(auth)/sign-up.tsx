// Create a GUARDIAN account (separate from log in). Email + password typed twice, or Google.
// The database gives every new non-student account the guardian role (trigger in migration 5).
import React, { useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSession } from "../../lib/session";
import { GoogleButton, OrLine } from "../../components/GoogleButton";
import { Btn, Field, LangToggle, Notice, PasswordField, Row, Screen, T } from "../../components/ui";
import { useFinishGuardianSignIn } from "../../lib/authflow";

export default function SignUp() {
  const { t } = useTranslation();
  const s = useSession();
  const finish = useFinishGuardianSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const problem = password && password.length < 10 ? t("auth.short") : again && password !== again ? t("pw.mismatch") : null;

  const submit = async () => {
    setMsg(null); setBusy(true);
    const captchaToken: string | undefined = undefined; // CAPTCHA hook point
    const { data, error } = await s._guardian.auth.signUp({ email: email.trim(), password, options: { captchaToken } });
    setBusy(false);
    if (error) { setMsg({ text: t("auth.signupFailed") }); return; }
    if (!data.session) { setMsg({ text: t("auth.checkEmail"), ok: true }); return; } // email confirmation is on
    await finish();
  };
  return (
    <Screen>
      <Row className="justify-between"><T variant="title" className="flex-1">{t("auth.signup")}</T><LangToggle /></Row>
      <T variant="small">{t("auth.signupSub")}</T>
      {msg ? <Notice tone={msg.ok ? "teal" : "amber"} text={msg.text} /> : null}
      <GoogleButton client={s._guardian} onDone={finish} onMessage={(m) => setMsg({ text: m })} />
      <OrLine />
      <Field label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <PasswordField label={t("auth.password")} value={password} onChangeText={setPassword} autoComplete="new-password" />
      <PasswordField label={t("pw.again")} value={again} onChangeText={setAgain} autoComplete="new-password" onSubmitEditing={submit} />
      {problem ? <Notice text={problem} /> : null}
      <Btn title={t("auth.signupBtn")} onPress={submit} loading={busy} disabled={!emailOk || password.length < 10 || password !== again} />
      <Btn kind="soft" title={t("auth.toSignin")} onPress={() => router.replace("/(auth)/sign-in")} />
      <Btn kind="ghost" title={t("common.back")} onPress={() => router.replace("/")} />
    </Screen>
  );
}
