// "I'm a student": the child's own phone redeems the guardian's one-time 6-digit code.
import React, { useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { callFn } from "../../lib/supabase";
import { useSession } from "../../lib/session";
import { Btn, errorKey, Field, LangToggle, Notice, Row, Screen, T } from "../../components/ui";

export default function Pair() {
  const { t } = useTranslation();
  const s = useSession();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await callFn<{ access_token: string; refresh_token: string; student_id: string }>(null, "pairing-redeem", { code, device_id: s.deviceId });
      await s.enrolChild({ id: r.student_id, nickname: name.trim() || "—" }, r);
      setCode(""); // the code is never stored
      router.replace("/");
    } catch (e) {
      setMsg(t((e as { code?: string }).code === "invalid_code" ? "pair.bad" : errorKey(e)));
    }
    setBusy(false);
  };
  return (
    <Screen>
      <Row className="justify-between"><T variant="title">{t("pair.title")}</T><LangToggle /></Row>
      <T variant="small">{t("pair.help")}</T>
      {msg ? <Notice text={msg} /> : null}
      <Field label={t("pair.name")} value={name} onChangeText={setName} maxLength={30} />
      <Field label={t("pair.title")} value={code} onChangeText={(v) => setCode(v.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d))).replace(/[^0-9]/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} className="text-2xl tracking-widest text-center" />
      <Btn title={t("pair.go")} onPress={go} loading={busy} disabled={code.length !== 6} />
      <Btn kind="ghost" title={t("common.back")} onPress={() => router.replace("/")} />
    </Screen>
  );
}
