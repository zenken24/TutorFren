// Guardian sign-in / sign-up (email + password). Error messages are generic: they never reveal
// whether an email exists. CAPTCHA hook point: pass `options.captchaToken` once Turnstile/hCaptcha
// is enabled in Supabase Auth (see README).
import React, { useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSession } from "../../lib/session";
import { resetLock } from "../../lib/lock";
import { Btn, Field, LangToggle, Notice, Row, Screen, T } from "../../components/ui";

export default function SignIn() {
  const { t } = useTranslation();
  const s = useSession();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    if (password.length < 10) { setMsg(t("auth.short")); return; }
    setBusy(true);
    const captchaToken: string | undefined = undefined; // CAPTCHA hook point
    if (mode === "up") {
      const { data } = await s._guardian.auth.signUp({ email: email.trim(), password, options: { captchaToken } });
      if (!data.session) { setBusy(false); setMsg(t("auth.checkEmail")); setMode("in"); return; }
    } else {
      const { error } = await s._guardian.auth.signInWithPassword({ email: email.trim(), password, options: { captchaToken } });
      if (error) { setBusy(false); setMsg(t("auth.failed")); return; }
    }
    await resetLock();
    await s.refreshGuardian();
    s.setGuardianUnlocked(true); // a fresh password sign-in counts as unlocking
    setBusy(false);
    router.replace("/(guardian)");
  };
  return (
    <Screen>
      <Row className="justify-between"><T variant="title">{t(mode === "in" ? "auth.signin" : "auth.signup")}</T><LangToggle /></Row>
      {msg ? <Notice text={msg} /> : null}
      <Field label={t("auth.email")} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label={t("auth.password")} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={submit} />
      <Btn title={t(mode === "in" ? "auth.signin" : "auth.signup")} onPress={submit} loading={busy} disabled={!email || !password} />
      <Btn kind="ghost" title={t(mode === "in" ? "auth.toSignup" : "auth.toSignin")} onPress={() => setMode(mode === "in" ? "up" : "in")} />
      <Btn kind="ghost" title={t("common.back")} onPress={() => router.replace("/")} />
    </Screen>
  );
}
