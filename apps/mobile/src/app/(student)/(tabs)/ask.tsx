// Ask: curriculum-grounded tutor chat with TEXTBOOK LOOKUP. "Exercise 5 question 3" -> the exact page
// card, then step-by-step hints for that question. The chat lives in memory only (not saved on the phone).
import React, { useCallback, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { TextInput } from "../../../components/AppText";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { callFn } from "../../../lib/supabase";
import { useStudent } from "../../../lib/session";
import { currentLang, num } from "../../../i18n";
import { Btn, Chip, errorKey, T } from "../../../components/ui";
import { PageCard } from "../../../components/PageCard";
import { VoiceButton } from "../../../components/VoiceButton";

interface Cand { block_id: string; kind: string; chapter: number; label: string; question: number | null; sub: string | null; printed_page: number; pdf_pages: number[]; question_text: string | null; source_label: string }
type Lookup = { status: "resolved"; match: Cand; candidates: Cand[] } | { status: "ambiguous"; candidates: Cand[] } | { status: "not_found"; parsed: unknown; nearest: Cand[] };
type Msg =
  | { id: number; who: "me" | "tutor"; text: string; sources?: { label: string }[]; unsure?: boolean }
  | { id: number; who: "page"; cand: Cand }
  | { id: number; who: "chips"; text: string; cands: Cand[] };
const candTitle = (c: Cand) => `${c.label}${c.question ? ` · ${num(c.question)}` : ""}${c.sub ? ` (${c.sub})` : ""} · ${currentLang() === "bn" ? "পৃ." : "p."} ${num(c.printed_page)}`;

export default function Ask() {
  const { t } = useTranslation();
  const { client } = useStudent();
  const params = useLocalSearchParams<{ q?: string; chapter?: string; k?: string }>();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<Cand | null>(null);
  const idRef = useRef(1);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const handled = useRef<string | null>(null);
  const add = (m: Record<string, unknown>) => setMsgs((x) => [...x, { ...m, id: idRef.current++ } as Msg]);

  const tutor = useCallback(async (message: string, cand: Cand | null, history: Msg[]) => {
    const hist = history.filter((m): m is Extract<Msg, { who: "me" | "tutor" }> => m.who === "me" || m.who === "tutor").slice(-6).map((m) => ({ role: m.who === "me" ? "student" : "tutor", text: m.text.slice(0, 800) }));
    try {
      const r = await callFn<{ message: string; unsure: boolean; source_refs: { label: string }[] }>(client, "tutor-turn", {
        mode: "ask", language: currentLang(), message, history: hist,
        ...(cand && !cand.block_id.startsWith("page-") ? { textbook: { block_id: cand.block_id, question: cand.question, sub: cand.sub } } : {}),
      });
      add({ who: "tutor", text: r.message, sources: r.source_refs, unsure: r.unsure });
    } catch (e) { add({ who: "tutor", text: t(errorKey(e)) }); }
  }, [client, t]);

  const pick = useCallback(async (cand: Cand, original: string, history: Msg[]) => {
    setBusy(true); setTopic(cand);
    add({ who: "page", cand });
    await tutor(original, cand, history);
    setBusy(false);
  }, [tutor]);

  const send = useCallback(async (raw: string, chapter?: number) => {
    const text = raw.trim();
    if (!text || busy) return;
    setInput(""); setBusy(true);
    const history = msgs;
    add({ who: "me", text });
    try {
      const looksLikeRef = /\d|[০-৯]/.test(text);
      const r = looksLikeRef ? await callFn<Lookup>(client, "textbook-lookup", { text, language: currentLang(), ...(chapter ? { context: { chapter } } : topic ? { context: { chapter: topic.chapter, printed_page: topic.printed_page } } : {}) }) : null;
      if (r?.status === "resolved") { setTopic(r.match); add({ who: "tutor", text: t("ask.found") }); add({ who: "page", cand: r.match }); await tutor(text, r.match, history); }
      else if (r?.status === "ambiguous") add({ who: "chips", text: t("ask.which"), cands: r.candidates });
      else if (r?.status === "not_found" && r.parsed && !topic) add(r.nearest.length ? { who: "chips", text: t("ask.notFound"), cands: r.nearest } : { who: "tutor", text: t("ask.notFoundPlain") });
      else await tutor(text, topic, history);
    } catch (e) { add({ who: "tutor", text: t(errorKey(e)) }); }
    setBusy(false);
  }, [busy, client, msgs, t, topic, tutor]);

  // opened from a chapter / lesson with a ready-made reference
  useEffect(() => {
    if (params.q && params.k && handled.current !== params.k) { handled.current = params.k; setTopic(null); send(params.q, params.chapter ? Number(params.chapter) : undefined); }
  }, [params.q, params.k, params.chapter, send]);

  const lastMeText = [...msgs].reverse().map((m) => (m.who === "me" ? m.text : null)).find((x) => x !== null) ?? "";
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} className="flex-1 bg-surface-page" contentContainerClassName="p-4 gap-3" onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
        <View className="self-start max-w-[88%] bg-surface rounded-card p-3 border border-surface-line"><T>{t("ask.hello")}</T></View>
        {msgs.map((m) => m.who === "page" ? (
          <PageCard key={m.id} printedPage={m.cand.printed_page} title={candTitle(m.cand)} subtitle={m.cand.question_text} />
        ) : m.who === "chips" ? (
          <View key={m.id} className="gap-2"><View className="self-start max-w-[88%] bg-surface rounded-card p-3 border border-surface-line"><T>{m.text}</T></View>
            <View className="flex-row flex-wrap gap-2">{m.cands.map((c) => <Chip key={c.block_id + c.printed_page} title={candTitle(c)} onPress={() => pick(c, lastMeText, msgs)} />)}</View></View>
        ) : (
          <View key={m.id} className={`max-w-[88%] rounded-card p-3 gap-2 ${m.who === "me" ? "self-end bg-primary" : "self-start bg-surface border border-surface-line"}`}>
            <T className={m.who === "me" ? "text-white" : ""}>{m.text}</T>
            {m.sources?.length ? <View className="flex-row flex-wrap gap-1">{m.sources.map((s, i) => <Chip key={i} tone="blue" title={s.label} />)}</View> : null}
            {m.unsure ? <T variant="small" className="text-practice-text">{t("ask.teacher")}</T> : null}
          </View>
        ))}
        {busy ? <T variant="small">{t("ask.thinking")}</T> : null}
      </ScrollView>
      <View className="p-3 gap-2 bg-surface border-t border-surface-line">
        {topic ? <View className="flex-row"><Chip tone="teal" title={`${candTitle(topic)}  ×`} onPress={() => setTopic(null)} /></View> : null}
        <View className="flex-row gap-2 items-end">
          <TextInput value={input} onChangeText={setInput} multiline placeholder={t("ask.placeholder")} placeholderTextColor="#8FA6AD" accessibilityLabel={t("ask.title")} maxLength={800}
            className="flex-1 min-h-[52px] max-h-32 bg-surface-page border border-surface-line rounded-card px-4 py-3 text-base font-sans text-ink" />
          <Btn title={t("common.send")} onPress={() => send(input)} disabled={!input.trim() || busy} />
        </View>
        <VoiceButton onTranscript={(tr) => setInput((x) => (x ? `${x} ${tr}` : tr))} />
      </View>
    </KeyboardAvoidingView>
  );
}
