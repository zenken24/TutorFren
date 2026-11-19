// Guardian LOG IN (email + password, or Google). Creating an account is a separate page (sign-up.tsx).
// Error messages are generic: they never reveal whether an email exists.
// CAPTCHA hook point: pass `options.captchaToken` once Turnstile/hCaptcha is enabled in Supabase Auth.
import React, { useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSession } from "../../lib/session";
import { useFinishGuardianSignIn } from "../../lib/authflow";
import { GoogleButton, OrLine } from "../../components/GoogleButton";
import { Btn, Field, LangToggle, Notice, PasswordField, Row, Screen, T } from "../../components/ui";

export default function SignIn() {
  const { t } = useTranslation();
  const s = useSession();
  const finish = useFinishGuardianSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null); setBusy(true);
    const captchaToken: string | undefined = undefined; // CAPTCHA hook point
    const { error } = await s._guardian.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } });
    setBusy(false);
    if (error) { setMsg(t("auth.failed")); return; }
    await finish();
  };
  return (
    <Screen>
      <Row className="justify-between"><T variant="title" className="flex-1">{t("auth.signin")}</T><LangToggle /></Row>
      <T variant="small">{t("auth.signinSub")}</T>
      {msg ? <Notice text={msg} /> : null}
      <GoogleButton client={s._guardian} onDone={finish} onMessage={setMsg} />
      <OrLine />
      <Field label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <PasswordField label={t("auth.passwordPlain")} value={password} onChangeText={setPassword} autoComplete="current-password" onSubmitEditing={submit} />
      <Btn title={t("auth.signinBtn")} onPress={submit} loading={busy} disabled={!email.trim() || !password} />
      <Btn kind="soft" title={t("auth.toSignup")} onPress={() => router.replace("/(auth)/sign-up")} />
      <Btn kind="ghost" title={t("common.back")} onPress={() => router.replace("/")} />
    </Screen>
  );
}
