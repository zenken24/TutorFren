// Learn step: the idea one small step at a time (Back / Next), then the worked examples, each shown step by step.
import React, { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { num } from "../i18n";
import { LessonVisual, type Visual } from "./LessonVisual";
import { Btn, Card, Chip, Row, T } from "./ui";

export interface LearnStep { title: string; text: string; visual?: Visual }
export interface LessonContent { intro: string; steps: LearnStep[]; examples: { problem: string; steps: LearnStep[]; answer: string }[] }

type Page = { kind: "step"; step: LearnStep; i: number } | { kind: "example"; ex: LessonContent["examples"][number]; i: number };

export function LearnSteps({ content, onDone }: { content: LessonContent; onDone: () => void }) {
  const { t } = useTranslation();
  const pages: Page[] = [
    ...content.steps.map((step, i) => ({ kind: "step" as const, step, i })),
    ...content.examples.map((ex, i) => ({ kind: "example" as const, ex, i })),
  ];
  const [p, setP] = useState(0);
  const page = pages[p];
  const last = p === pages.length - 1;
  return (
    <View className="gap-3">
      {p === 0 && content.intro ? <T>{content.intro}</T> : null}
      <Row className="justify-center gap-1.5">
        {pages.map((x, i) => <View key={i} className={`h-2 rounded-full ${i === p ? "w-6 bg-primary" : i < p ? "w-2 bg-good" : "w-2 bg-surface-line"}`} />)}
      </Row>
      {page?.kind === "step" ? (
        <Card>
          <T variant="label">{t("lesson.stepOf", { i: num(page.i + 1), n: num(content.steps.length) })}</T>
          <T variant="h">{page.step.title}</T>
          <T>{page.step.text}</T>
          <LessonVisual v={page.step.visual} />
        </Card>
      ) : page?.kind === "example" ? (
        <Card className="border-primary">
          <Chip tone="blue" title={t("lesson.exampleN", { n: num(page.i + 1) })} />
          <T variant="h">{page.ex.problem}</T>
          {page.ex.steps.map((s, i) => (
            <View key={i} className="gap-2 border-t border-surface-line pt-3">
              <T className="font-bold">{num(i + 1)}. {s.title}</T>
              <T>{s.text}</T>
              <LessonVisual v={s.visual} />
            </View>
          ))}
          <View className="bg-lime-soft rounded-card p-3"><T className="font-bold text-lime-text">{t("lesson.answer")}: {page.ex.answer}</T></View>
        </Card>
      ) : null}
      <Row className="gap-3">
        <Btn className="flex-1" kind="ghost" title={t("common.back")} disabled={p === 0} onPress={() => setP(p - 1)} />
        <Btn className="flex-1" title={last ? t("lesson.toTry") : t("common.next")} onPress={() => (last ? onDone() : setP(p + 1))} />
      </Row>
    </View>
  );
}
