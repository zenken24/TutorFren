// Lesson flow:
//   1 Learn          the idea one step at a time with pictures, then 2 worked examples (LearnSteps)
//   2 Try            one EASY problem
//   3 Practice       3 adaptive problems   } both REQUIRED to complete the lesson
//   4 Mastery check  1 harder problem      }
import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../../lib/supabase";
import { useStudent } from "../../../lib/session";
import { blockById, label, lessonById, sourceLabel, title } from "../../../lib/textbook";
import { currentLang, num } from "../../../i18n";
import { Btn, Card, Chip, Loading, Notice, Row, Screen, T } from "../../../components/ui";
import { OpenInBook, PageCard } from "../../../components/PageCard";
import { Practice } from "../../../components/Practice";
import { LearnSteps, type LessonContent } from "../../../components/LearnSteps";

const STEPS = ["learn", "try", "practice", "check"] as const;
type Step = (typeof STEPS)[number];

export default function Lesson() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LessonFlow key={id} id={id} />; // a new lesson starts with fresh state
}
function LessonFlow({ id }: { id: string }) {
  const { t } = useTranslation();
  const { client } = useStudent();
  const qc = useQueryClient();
  const lang = currentLang();
  const lesson = lessonById(id) ?? lessonById("c1-l1")!;
  const [step, setStep] = useState<Step>("learn");
  const [done, setDone] = useState<Set<Step>>(new Set());

  // step-by-step content (also prepares this lesson's practice problems on the server)
  const content = useQuery({ queryKey: ["lesson-content", lesson.id, lang], staleTime: Infinity, retry: 1, queryFn: () => callFn<LessonContent>(client, "lesson-content", { lesson_id: lesson.id, language: lang }) });
  const chunks = useQuery({ queryKey: ["chunks", lesson.id], enabled: content.isError, queryFn: async () => (await client.from("curriculum_chunks").select("content,page_ref").eq("lesson_id", lesson.id).order("pdf_page")).data ?? [] });
  const ready = !content.isLoading; // practice waits until the problems exist

  const exercises = lesson.block_ids.map(blockById).filter((b) => b && b.kind === "exercise");
  const openAsk = (q: string) => router.navigate({ pathname: "/(student)/ask", params: { q, chapter: String(lesson.chapter), k: String(Date.now()) } });
  const bookList = (
    <View className="gap-2"><T>{t("lesson.noItems")}</T>
      <View className="flex-row flex-wrap gap-2">{exercises.map((b) => <Chip key={b!.id} tone="plain" title={`${label(b!, lang)} · ${lang === "bn" ? "পৃ." : "p."} ${num(b!.printed_pages[0])}`} onPress={() => openAsk(`${lang === "bn" ? "পৃষ্ঠা" : "page"} ${b!.printed_pages[0]} ${lang === "bn" ? "অনুশীলন" : "exercise"} ${b!.number}`)} />)}</View>
    </View>
  );
  const complete = done.has("practice") && done.has("check");
  const finish = (s: Step) => {
    const next = new Set(done); next.add(s); setDone(next);
    const i = STEPS.indexOf(s);
    if (next.has("practice") && next.has("check")) qc.invalidateQueries({ queryKey: ["next"] });
    else if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };

  return (
    <Screen>
      <Row className="justify-between items-start">
        <View className="flex-1"><T variant="label">{t("ch.chapter", { n: num(lesson.chapter) })}</T><T variant="title">{title(lesson, lang)}</T></View>
        <Chip tone="plain" title={t("common.back")} onPress={() => (router.canGoBack() ? router.back() : router.navigate({ pathname: "/(student)/chapter/[n]", params: { n: String(lesson.chapter) } }))} />
      </Row>
      <View className="flex-row flex-wrap gap-2">
        {STEPS.map((s, i) => <Chip key={s} tone={s === step && !complete ? "teal" : done.has(s) ? "good" : "plain"} title={`${num(i + 1)}. ${t(`lesson.${s}`)}`} onPress={() => setStep(s)} />)}
      </View>

      {complete ? (
        <Card className="border-good">
          <T variant="h">{t("lesson.finished")}</T>
          <T variant="small">{t("lesson.finishedSub")}</T>
          <Btn title={t("tab.chapters")} onPress={() => router.navigate({ pathname: "/(student)/chapter/[n]", params: { n: String(lesson.chapter) } })} />
        </Card>
      ) : step === "learn" ? (
        <>
          {content.isLoading ? <Card><Loading /><T variant="small" className="text-center">{t("lesson.preparing")}</T></Card>
          : content.data ? <LearnSteps content={content.data} onDone={() => finish("learn")} />
          : (
            <>
              <Notice text={t("lesson.contentError")} />
              {/* the page summaries exist only in English: never show them in Bangla mode (the Bangla book page is below) */}
              {(lang === "en" ? chunks.data ?? [] : []).map((c, i) => {
                const [main, ex] = c.content.split("Worked example: ");
                return <Card key={i}><T>{main.replace(`${lesson.title_en}. `, "")}</T>{ex ? <View className="bg-primary-tint rounded-card p-3"><T variant="label" className="text-primary-dark">{t("lesson.example")}</T><T>{ex}</T></View> : null}
                  <Chip tone="blue" title={sourceLabel(lang, lesson.chapter, c.page_ref, (x) => num(x))} /></Card>;
              })}
              <Btn title={t("lesson.toTry")} onPress={() => finish("learn")} />
            </>
          )}
          <PageCard printedPage={lesson.printed_pages[0]} pages={[lesson.printed_pages[0], lesson.printed_pages[1]]} />
          <OpenInBook printedPage={lesson.printed_pages[0]} last={lesson.printed_pages[1]} />
        </>
      ) : !ready ? (
        <Card><Loading /><T variant="small" className="text-center">{t("lesson.preparing")}</T></Card>
      ) : step === "try" ? (
        <>
          <T variant="small">{t("lesson.tryIntro")}</T>
          <Practice key={`${lesson.id}-try-${lang}`} conceptId={lesson.concept_id} count={1} difficulty={1} onDone={() => finish("try")} empty={bookList} />
        </>
      ) : step === "practice" ? (
        <>
          <T variant="small">{t("lesson.practiceIntro")}</T>
          <Practice key={`${lesson.id}-practice-${lang}`} conceptId={lesson.concept_id} count={3} onDone={() => finish("practice")} empty={bookList} />
        </>
      ) : (
        <>
          <T variant="small">{t("lesson.checkIntro")}</T>
          <Practice key={`${lesson.id}-check-${lang}`} conceptId={lesson.concept_id} count={1} difficulty={3} onDone={() => finish("check")} empty={bookList} />
          {done.has("check") && !done.has("practice") ? <Card><Notice text={t("lesson.needBoth")} /><Btn kind="soft" title={t("lesson.practice")} onPress={() => setStep("practice")} /></Card> : null}
        </>
      )}
      {!complete && step !== "learn" && done.has("practice") && !done.has("check") && step !== "check" ? <Card><Notice text={t("lesson.needBoth")} /><Btn kind="soft" title={t("lesson.check")} onPress={() => setStep("check")} /></Card> : null}
    </Screen>
  );
}
