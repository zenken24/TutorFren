// Lesson flow: Learn -> Try a step -> Teach it back -> Practice -> Mastery check.
import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../../lib/supabase";
import { useStudent } from "../../../lib/session";
import { blockById, label, lessonById, sourceLabel, title } from "../../../lib/textbook";
import { currentLang, num } from "../../../i18n";
import { Btn, Card, Chip, errorKey, Field, Loading, Notice, Row, Screen, T } from "../../../components/ui";
import { OpenInBook, PageCard } from "../../../components/PageCard";
import { Practice } from "../../../components/Practice";
import { VoiceButton } from "../../../components/VoiceButton";

const STEPS = ["learn", "try", "teach", "practice", "check"] as const;
type Verdict = { verdict: string; feedback_for_child: string; follow_up_question?: string | null };

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
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [text, setText] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [followUp, setFollowUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const chunks = useQuery({ queryKey: ["chunks", lesson.id], queryFn: async () => (await client.from("curriculum_chunks").select("content,page_ref").eq("lesson_id", lesson.id).order("pdf_page")).data ?? [] });
  const exercises = lesson.block_ids.map(blockById).filter((b) => b && b.kind === "exercise");
  const openAsk = (q: string) => router.push({ pathname: "/(student)/ask", params: { q, chapter: String(lesson.chapter), k: String(Date.now()) } });
  const bookList = (
    <View className="gap-2"><T>{t("lesson.noItems")}</T>
      <View className="flex-row flex-wrap gap-2">{exercises.map((b) => <Chip key={b!.id} tone="plain" title={`${label(b!, lang)} · ${lang === "bn" ? "পৃ." : "p."} ${num(b!.printed_pages[0])}`} onPress={() => openAsk(`${lang === "bn" ? "পৃষ্ঠা" : "page"} ${b!.printed_pages[0]} ${lang === "bn" ? "অনুশীলন" : "exercise"} ${b!.number}`)} />)}</View>
    </View>
  );
  const checkExplanation = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await callFn<Verdict>(client, "explanation-check", { concept_id: lesson.concept_id, text, language: lang, is_follow_up: followUp });
      setVerdict(r); qc.invalidateQueries({ queryKey: ["mastery"] });
      if (r.verdict === "unsure" && r.follow_up_question && !followUp) { setFollowUp(true); setText(""); } // one gentle follow-up only
    } catch (e) { setErr(t(errorKey(e))); }
    setBusy(false);
  };
  const advance = () => { if (step >= STEPS.length - 1) { setDone(true); qc.invalidateQueries({ queryKey: ["next"] }); } else setStep(step + 1); };
  const name = STEPS[step];

  return (
    <Screen>
      <Row className="justify-between"><View className="flex-1"><T variant="label">{t("ch.chapter", { n: num(lesson.chapter) })}</T><T variant="title">{title(lesson, lang)}</T></View>
        <Chip tone="plain" title={t("common.back")} onPress={() => router.push({ pathname: "/(student)/chapter/[n]", params: { n: String(lesson.chapter) } })} /></Row>
      <Row className="flex-wrap">{STEPS.map((s, i) => <Chip key={s} tone={i === step && !done ? "teal" : "plain"} title={`${num(i + 1)}. ${t(`lesson.${s}`)}`} onPress={() => { setDone(false); setStep(i); }} />)}</Row>

      {done ? <Card><T variant="h">🎉 {t("lesson.finished")}</T><Btn title={t("tab.chapters")} onPress={() => router.push({ pathname: "/(student)/chapter/[n]", params: { n: String(lesson.chapter) } })} /></Card>
      : name === "learn" ? (
        <>
          {chunks.isLoading ? <Loading /> : (chunks.data ?? []).map((c, i) => {
            const [main, ex] = c.content.split("Worked example: ");
            return <Card key={i}><T>{main.replace(`${lesson.title_en}. `, "")}</T>{ex ? <View className="bg-primary-tint rounded-card p-3"><T variant="label" className="text-primary-dark">{t("lesson.example")}</T><T>{ex}</T></View> : null}
              <Chip tone="plain" title={sourceLabel(lang, lesson.chapter, c.page_ref, (x) => num(x))} /></Card>;
          })}
          <PageCard printedPage={lesson.printed_pages[0]} pages={[lesson.printed_pages[0], lesson.printed_pages[1]]} />
          <OpenInBook printedPage={lesson.printed_pages[0]} last={lesson.printed_pages[1]} />
          <Btn title={t("common.continue")} onPress={advance} />
        </>
      ) : name === "teach" ? (
        <Card>
          <T variant="h">{followUp && verdict?.follow_up_question ? verdict.follow_up_question : t("lesson.teachPrompt")}</T>
          {followUp ? <Chip tone="amber" title={t("lesson.followUp")} /> : null}
          {err ? <Notice text={err} /> : null}
          <Field label={t("voice.edit")} value={text} onChangeText={setText} multiline placeholder={t("lesson.teachPlaceholder")} className="min-h-[120px]" textAlignVertical="top" maxLength={1500} />
          <VoiceButton onTranscript={(tr) => setText((x) => (x ? `${x} ${tr}` : tr))} />
          <Btn title={t("lesson.check.btn")} onPress={checkExplanation} loading={busy} disabled={text.trim().length < 3} />
          {verdict && !(followUp && !text && verdict.verdict === "unsure") ? <Notice tone={verdict.verdict.startsWith("correct") ? "teal" : "amber"} text={verdict.feedback_for_child} /> : null}
          {verdict ? <Btn kind="soft" title={t("common.continue")} onPress={advance} /> : <Btn kind="ghost" title={t("common.next")} onPress={advance} />}
        </Card>
      ) : (
        <Practice key={`${lesson.id}-${name}`} conceptId={lesson.concept_id} count={name === "practice" ? 3 : 1} onDone={advance} empty={bookList} />
      )}
    </Screen>
  );
}
