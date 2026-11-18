// Chapter detail: lessons as a path with mastery badges (nothing is locked) + the book's exercises.
import React from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { badgeOf, useMastery } from "../../../lib/hooks";
import { blocks, chapters, label, title } from "../../../lib/textbook";
import { currentLang, num } from "../../../i18n";
import { Card, Chip, MasteryBadge, Row, Screen, T } from "../../../components/ui";

export default function Chapter() {
  const { t } = useTranslation();
  const { n } = useLocalSearchParams<{ n: string }>();
  const lang = currentLang();
  const mastery = useMastery();
  const ch = chapters.find((c) => c.number === Number(n)) ?? chapters[0];
  const recommended = ch.lessons.find((l) => badgeOf(mastery.data?.get(l.concept_id)) !== "mastered");
  const sets = blocks.filter((b) => b.chapter === ch.number && (b.kind === "let_us_do" || b.kind === "let_us_try"));
  const inline = blocks.filter((b) => b.chapter === ch.number && b.kind === "exercise");
  const ask = (q: string) => router.push({ pathname: "/(student)/ask", params: { q, chapter: String(ch.number), k: String(Date.now()) } });
  const pg = lang === "bn" ? "পৃষ্ঠা" : "page";
  return (
    <Screen>
      <Row className="justify-between"><View className="flex-1"><T variant="label">{t("ch.chapter", { n: num(ch.number) })}</T><T variant="title">{title(ch, lang)}</T></View><Chip tone="plain" title={t("common.back")} onPress={() => router.push("/(student)/chapters")} /></Row>
      <T variant="h">{t("ch.lessons")}</T>
      {ch.lessons.map((l, i) => (
        <Row key={l.id} className="items-stretch">
          <View className="items-center w-8"><View className={`w-8 h-8 rounded-full items-center justify-center ${badgeOf(mastery.data?.get(l.concept_id)) === "mastered" ? "bg-primary" : "bg-primary-soft"}`}><T className={`font-bold ${badgeOf(mastery.data?.get(l.concept_id)) === "mastered" ? "text-white" : "text-primary-dark"}`}>{num(i + 1)}</T></View>{i < ch.lessons.length - 1 ? <View className="w-0.5 flex-1 bg-surface-line" /> : null}</View>
          <View className="flex-1 pb-3">
            <Card label={title(l, lang)} onPress={() => router.push({ pathname: "/(student)/lesson/[id]", params: { id: l.id } })} className={recommended?.id === l.id ? "border-primary" : ""}>
              {recommended?.id === l.id ? <Chip title={`★ ${t("ch.recommended")}`} /> : null}
              <T variant="h">{title(l, lang)}</T>
              <Row className="justify-between"><MasteryBadge kind={badgeOf(mastery.data?.get(l.concept_id))} /><T variant="small">{t("ch.pages", { a: num(l.printed_pages[0]), b: num(l.printed_pages[1]) })}</T></Row>
            </Card>
          </View>
        </Row>
      ))}
      <T variant="h">{t("ch.exercises")}</T>
      {sets.map((b) => (
        <Card key={b.id}>
          <T variant="h">{label(b, lang)}</T>
          <T variant="small">{t("ch.pages", { a: num(b.printed_pages[0]), b: num(b.printed_pages[b.printed_pages.length - 1]) })} · {t("ch.questions", { n: num(b.questions.length) })}</T>
          <View className="flex-row flex-wrap gap-2">{b.questions.map((q) => <Chip key={q.number} tone="plain" title={num(q.number)} onPress={() => ask(`${pg} ${q.printed_page} ${lang === "bn" ? "প্রশ্ন" : "question"} ${q.number}`)} />)}</View>
        </Card>
      ))}
      <Card>
        <View className="flex-row flex-wrap gap-2">{inline.map((b) => <Chip key={b.id} tone="plain" title={`${label(b, lang)} · ${lang === "bn" ? "পৃ." : "p."} ${num(b.printed_pages[0])}`} onPress={() => ask(`${pg} ${b.printed_pages[0]} ${lang === "bn" ? "অনুশীলন" : "exercise"} ${b.number}`)} />)}</View>
      </Card>
    </Screen>
  );
}
