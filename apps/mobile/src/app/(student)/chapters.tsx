import React from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useMastery } from "../../lib/hooks";
import { chapters, title } from "../../lib/textbook";
import { currentLang, num } from "../../i18n";
import { Bar, Card, Row, Screen, T } from "../../components/ui";

export default function Chapters() {
  const { t } = useTranslation();
  const lang = currentLang();
  const mastery = useMastery();
  return (
    <Screen>
      <T variant="title">{t("ch.title")}</T>
      {chapters.map((c) => {
        const avg = c.lessons.reduce((s, l) => s + (mastery.data?.get(l.concept_id)?.mastery ?? 0), 0) / c.lessons.length;
        return (
          <Card key={c.number} label={title(c, lang)} onPress={() => router.push({ pathname: "/(student)/chapter/[n]", params: { n: String(c.number) } })}>
            <T variant="label">{t("ch.chapter", { n: num(c.number) })} · {t("ch.pages", { a: num(c.printed_pages[0]), b: num(c.printed_pages[1]) })}</T>
            <T variant="h">{title(c, lang)}</T>
            <Row><T variant="small" className="w-12">{num(Math.round(avg * 100))}%</T><Row className="flex-1"><Bar value={avg} /></Row></Row>
          </Card>
        );
      })}
    </Screen>
  );
}
