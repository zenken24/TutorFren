import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSession } from "../../../lib/session";
import { useMastery } from "../../../lib/hooks";
import { allLessons, chapters, title } from "../../../lib/textbook";
import { currentLang, num, setLanguage } from "../../../i18n";
import { Bar, Btn, Card, Chip, Row, Screen, T } from "../../../components/ui";
import { useVoiceConsent } from "../../../components/VoiceButton";

export default function Me() {
  const { t, i18n } = useTranslation();
  const s = useSession();
  const lang = currentLang();
  const mastery = useMastery();
  const voice = useVoiceConsent();
  const rows = allLessons.map((l) => ({ l, m: mastery.data?.get(l.concept_id) })).filter((x) => x.m && x.m.evidence_count > 0);
  const strengths = rows.filter((x) => x.m!.mastery >= 0.8), practise = rows.filter((x) => x.m!.mastery < 0.8).sort((a, b) => a.m!.mastery - b.m!.mastery);
  const go = (id: string) => router.push({ pathname: "/(student)/lesson/[id]", params: { id } });
  return (
    <Screen>
      <T variant="title">{s.activeChild?.nickname}</T>
      <Card><T variant="h">{t("me.strengths")}</T>{strengths.length ? <View className="flex-row flex-wrap gap-2">{strengths.map((x) => <Chip key={x.l.id} title={title(x.l, lang)} onPress={() => go(x.l.id)} />)}</View> : <T variant="small">{t("me.none")}</T>}</Card>
      <Card><T variant="h">{t("me.practise")}</T>{practise.length ? <View className="flex-row flex-wrap gap-2">{practise.map((x) => <Chip key={x.l.id} tone="amber" title={title(x.l, lang)} onPress={() => go(x.l.id)} />)}</View> : <T variant="small">{t("me.none")}</T>}</Card>
      <Card><T variant="h">{t("me.byChapter")}</T>
        {chapters.map((c) => { const avg = c.lessons.reduce((a, l) => a + (mastery.data?.get(l.concept_id)?.mastery ?? 0), 0) / c.lessons.length; return (
          <View key={c.number} className="gap-1"><Row className="justify-between"><T variant="small" className="flex-1">{num(c.number)}. {title(c, lang)}</T><T variant="small">{num(Math.round(avg * 100))}%</T></Row><Bar value={avg} /></View>); })}
      </Card>
      <Card><T variant="h">{t("me.language")}</T><Row><Chip tone={i18n.language !== "en" ? "teal" : "plain"} title="বাংলা" onPress={() => setLanguage("bn")} /><Chip tone={i18n.language === "en" ? "teal" : "plain"} title="English" onPress={() => setLanguage("en")} /></Row></Card>
      <Card><T variant="h">{t("me.voice")}</T><T variant="small">{t(voice.data ? "voice.on" : "voice.off")}</T></Card>
      <Btn kind="ghost" title={t("s.switch")} onPress={() => { s.switchUser(); router.replace("/"); }} />
    </Screen>
  );
}
