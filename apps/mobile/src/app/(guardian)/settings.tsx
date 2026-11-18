import React, { useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSession } from "../../lib/session";
import { setGuardianPin } from "../../lib/lock";
import { setLanguage } from "../../i18n";
import { Btn, Card, Chip, Field, Notice, Row, Screen, T } from "../../components/ui";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const s = useSession();
  const [pin, setPin] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <Screen>
      <Row className="justify-between"><T variant="title">{t("g.settings")}</T><Chip tone="plain" title={t("common.back")} onPress={() => router.back()} /></Row>
      <Card><T variant="h">{t("set.language")}</T>
        <Row><Chip tone={i18n.language !== "en" ? "teal" : "plain"} title="বাংলা" onPress={() => setLanguage("bn")} /><Chip tone={i18n.language === "en" ? "teal" : "plain"} title="English" onPress={() => setLanguage("en")} /></Row>
      </Card>
      <Card><T variant="h">{t("set.lock")}</T><T variant="small">{t("lock.setupHelp")}</T>
        <Field label={t("lock.pin")} value={pin} onChangeText={(v) => { setSaved(false); setPin(v.replace(/[^0-9]/g, "").slice(0, 6)); }} keyboardType="number-pad" secureTextEntry maxLength={6} />
        <Btn kind="soft" title={t("set.changePin")} disabled={pin.length !== 6} onPress={async () => { await setGuardianPin(pin); setPin(""); setSaved(true); }} />
        {saved ? <Notice tone="teal" text={t("common.done")} /> : null}
      </Card>
      <Card><T variant="h">{t("set.privacy")}</T><T variant="small">{t("set.privacyText")}</T></Card>
      <Btn kind="amber" title={t("set.signout")} onPress={async () => { await s.signOutGuardian(); router.replace("/"); }} />
    </Screen>
  );
}
