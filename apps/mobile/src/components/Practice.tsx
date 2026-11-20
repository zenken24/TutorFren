// Practice runner: asks the server for the next item (adaptive), hints before answers.
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { callFn } from "../lib/supabase";
import { useStudent } from "../lib/session";
import { currentLang, num } from "../i18n";
import { Btn, Card, errorKey, Field, Loading, Notice, T } from "./ui";

interface Next { concept_id: string; action: string; reason: string; item: { id: string; prompt: string; hint_count: number } | null }
export function Practice({ conceptId, count, onDone, empty, difficulty }: { conceptId: string; count: number; onDone: () => void; empty?: React.ReactNode; difficulty?: 1 | 2 | 3 }) {
  const { t } = useTranslation();
  const { client } = useStudent();
  const qc = useQueryClient();
  const [n, setN] = useState(1);
  const [next, setNext] = useState<Next | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [hints, setHints] = useState<string[]>([]);
  const [fb, setFb] = useState<{ tone: "lime" | "amber"; text: string; advance?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchNext = useCallback(async () => {
    try { setNext(await callFn<Next>(client, "tutor-turn", { mode: "next", language: currentLang(), concept_id: conceptId, ...(difficulty ? { difficulty } : {}) })); }
    catch (e) { setErr(t(errorKey(e))); }
    setLoading(false);
  }, [client, conceptId, difficulty, t]);
  const load = () => { setLoading(true); setAnswer(""); setHints([]); setFb(null); setErr(null); fetchNext(); };
  // eslint-disable-next-line react-hooks/set-state-in-effect -- state is set only after the request resolves
  useEffect(() => { fetchNext(); }, [fetchNext]);

  const submit = async () => {
    if (!next?.item || !answer.trim()) return;
    setBusy(true);
    try {
      const r = await callFn<{ correct: boolean; next_hint: string | null; reveal_answer: string | null }>(client, "tutor-turn", { mode: "answer", language: currentLang(), item_id: next.item.id, answer, hints_used: hints.length });
      qc.invalidateQueries({ queryKey: ["mastery"] });
      if (r.correct) setFb({ tone: "lime", text: t("p.correct"), advance: true });
      else if (r.next_hint) { setHints((h) => [...h, r.next_hint!]); setFb({ tone: "amber", text: t("p.tryAgain") }); }
      else if (r.reveal_answer) setFb({ tone: "amber", text: t("p.answerIs", { a: r.reveal_answer }), advance: true });
      else setFb({ tone: "amber", text: t("p.tryAgain") });
    } catch (e) { setErr(t(errorKey(e))); }
    setBusy(false);
  };
  const advance = () => { if (n >= count) onDone(); else { setN(n + 1); load(); } };

  if (loading) return <Loading />;
  if (err) return <Card><Notice text={err} /><Btn kind="soft" title={t("common.retry")} onPress={load} /></Card>;
  if (!next?.item) return <Card>{empty ?? <T>{t("p.none")}</T>}<Btn title={t("common.continue")} onPress={onDone} /></Card>;
  return (
    <Card>
      <T variant="small">{t("p.of", { i: num(n), n: num(count) })} · {next.reason}</T>
      <T variant="h" className="text-xl">{next.item.prompt}</T>
      {hints.map((h, i) => <Notice key={i} tone="blue" text={`${t("p.hint")} ${num(i + 1)}: ${h}`} />)}
      {fb ? <Notice tone={fb.tone} text={fb.text} /> : null}
      {fb?.advance ? <Btn title={t("common.next")} onPress={advance} /> : (
        <View className="gap-2">
          <Field label={t("p.answer")} value={answer} onChangeText={setAnswer} keyboardType="default" autoCapitalize="none" onSubmitEditing={submit} />
          <Btn title={t("lesson.check.btn")} onPress={submit} loading={busy} disabled={!answer.trim()} />
        </View>
      )}
    </Card>
  );
}
