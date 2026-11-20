// Exam planner: structure in (no uploads) -> workbook weighted to weak concepts + day-by-day routine.
import React, { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../../lib/supabase";
import { useStudent } from "../../../lib/session";
import { chapters, title } from "../../../lib/textbook";
import { currentLang, num } from "../../../i18n";
import { Btn, Card, Chip, errorKey, Field, Loading, Notice, Row, Screen, T } from "../../../components/ui";

interface Plan { exam_name: string; exam_date: string; workbook: { item_id: string; concept: string; chapter: number; marks: number; prompt: string }[]; routine: { date: string; focus: string; concepts: string[]; read_from_book: string[] }[] }
const digits = (s: string) => s.replace(/[০-৯]/g, (d) => String("০১২৩৪৫৬৭৮৯".indexOf(d)));
export default function Exams() {
  const { t } = useTranslation();
  const { client, child } = useStudent();
  const qc = useQueryClient();
  const lang = currentLang();
  const saved = useQuery({ queryKey: ["exam-plan", child.id], queryFn: async () => ((await client.from("exam_plans").select("exam_name,exam_date,workbook,routine").order("created_at", { ascending: false }).limit(1)).data?.[0] ?? null) as Plan | null });
  const [form, setForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [marks, setMarks] = useState("50");
  const [short, setShort] = useState("10");
  const [long, setLong] = useState("4");
  const [chs, setChs] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const make = async () => {
    const d = digits(date.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || !chs.length || !name.trim()) { setMsg(t("exam.bad")); return; }
    setBusy(true); setMsg(null);
    try {
      await callFn(client, "exam-planner", { exam_name: name.trim(), exam_date: d, total_marks: Number(digits(marks)) || 50, chapters: chs, language: lang, question_pattern: { short: Number(digits(short)) || 0, long: Number(digits(long)) || 0 } });
      await qc.invalidateQueries({ queryKey: ["exam-plan", child.id] }); qc.invalidateQueries({ queryKey: ["exam", child.id] }); setForm(false);
    } catch (e) { setMsg(t((e as { status?: number }).status === 400 ? "exam.bad" : errorKey(e))); }
    setBusy(false);
  };
  const plan = saved.data;
  if (saved.isLoading) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <T variant="title">{t("exam.title")}</T>
      {form || !plan ? (
        <>
          {msg ? <Notice text={msg} /> : null}
          <Field label={t("exam.name")} value={name} onChangeText={setName} maxLength={80} />
          <Field label={t("exam.date")} value={date} onChangeText={setDate} placeholder="2026-12-10" autoCapitalize="none" />
          <Row><View className="flex-1"><Field label={t("exam.marks")} value={marks} onChangeText={setMarks} keyboardType="number-pad" /></View><View className="flex-1"><Field label={t("exam.short")} value={short} onChangeText={setShort} keyboardType="number-pad" /></View><View className="flex-1"><Field label={t("exam.long")} value={long} onChangeText={setLong} keyboardType="number-pad" /></View></Row>
          <T variant="label">{t("exam.chapters")}</T>
          <View className="flex-row flex-wrap gap-2">{chapters.map((c) => <Chip key={c.number} tone={chs.includes(c.number) ? "teal" : "plain"} title={`${num(c.number)}. ${title(c, lang)}`} onPress={() => setChs(chs.includes(c.number) ? chs.filter((x) => x !== c.number) : [...chs, c.number])} />)}</View>
          <Btn title={t("exam.make")} onPress={make} loading={busy} />
          {plan ? <Btn kind="ghost" title={t("common.cancel")} onPress={() => setForm(false)} /> : null}
        </>
      ) : (
        <>
          <Card className="bg-primary-tint"><T variant="h">{plan.exam_name}</T><T variant="small">{num(plan.exam_date)}</T></Card>
          <T variant="h">{t("exam.routine")}</T>
          {plan.routine.map((d) => (
            <Card key={d.date}><Row className="justify-between"><T variant="label">{num(d.date)}</T><Chip tone={d.focus === "weak_concepts" ? "amber" : "teal"} title={t(`focus.${d.focus}`)} /></Row>
              {d.concepts.slice(0, 4).map((c) => <T key={c}>• {c}</T>)}
              {d.read_from_book?.length ? <T variant="small">{t("exam.read")}: {d.read_from_book.join(", ")}</T> : null}</Card>
          ))}
          <T variant="h">{t("exam.workbook")}</T>
          {plan.workbook.map((w, i) => <Card key={w.item_id}><Row className="justify-between"><T variant="label">{num(i + 1)}. {w.concept}</T><T variant="small">{t("exam.marksN", { n: num(w.marks) })}</T></Row><T variant="h">{w.prompt}</T></Card>)}
          <Btn kind="soft" title={t("exam.new")} onPress={() => setForm(true)} />
        </>
      )}
    </Screen>
  );
}
