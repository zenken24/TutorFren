// Today: one adaptive "next step" with its reason, continue-lesson, exam countdown, weekly ring.
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { callFn } from "../../../lib/supabase";
import { useStudent } from "../../../lib/session";
import { useMastery } from "../../../lib/hooks";
import { lessonByConcept, title } from "../../../lib/textbook";
import { currentLang, num } from "../../../i18n";
import { Icon } from "../../../components/Icon";
import { Btn, Card, Chip, errorKey, Loading, MasteryBadge, Notice, Ring, Row, Screen, T, type BadgeKind } from "../../../components/ui";

interface Next { concept_id: string; lesson_id: string; chapter: number; title: string; action: string; reason: string; badge: BadgeKind }
export default function Today() {
  const { t, i18n } = useTranslation();
  const { client, child } = useStudent();
  const lang = currentLang();
  const next = useQuery({ queryKey: ["next", child.id, i18n.language], queryFn: () => callFn<Next>(client, "tutor-turn", { mode: "next", language: lang }) });
  const mastery = useMastery();
  const exam = useQuery({ queryKey: ["exam", child.id], queryFn: async () => (await client.from("exam_plans").select("exam_name,exam_date").gte("exam_date", new Date().toISOString().slice(0, 10)).order("exam_date").limit(1)).data?.[0] ?? null });
  const week = useQuery({ queryKey: ["week", child.id], queryFn: async () => (await client.from("concept_mastery").select("concept_id", { count: "exact", head: true }).gte("updated_at", new Date(Date.now() - 7 * 864e5).toISOString())).count ?? 0 });
  const inProgress = [...(mastery.data?.values() ?? [])].filter((m) => m.evidence_count > 0 && m.mastery < 0.8).sort((a, b) => b.mastery - a.mastery)[0];
  const cont = inProgress ? lessonByConcept(inProgress.concept_id) : undefined;
  const days = exam.data ? Math.round((Date.parse(exam.data.exam_date) - Date.parse(new Date().toISOString().slice(0, 10))) / 864e5) : null;
  const goal = 5, done = Math.min(goal, week.data ?? 0);
  return (
    <Screen>
      <T variant="title">{t("today.hi", { name: child.nickname })}</T>
      <Card className="bg-primary-tint border-primary-soft">
        <T variant="label" className="text-primary-dark">{t("today.next")}</T>
        {next.isLoading ? <Loading /> : next.data ? (
          <>
            <T variant="title">{next.data.title}</T>
            <Row><Chip title={t(`action.${next.data.action}`)} /><MasteryBadge kind={next.data.badge} /></Row>
            <T>{next.data.reason}</T>
            <Btn title={t("today.start")} onPress={() => router.push({ pathname: "/(student)/lesson/[id]", params: { id: next.data!.lesson_id } })} />
          </>
        ) : <><Notice text={t(errorKey(next.error))} /><Btn kind="soft" title={t("common.retry")} onPress={() => next.refetch()} /></>}
      </Card>
      {cont && cont.id !== next.data?.lesson_id ? (
        <Card onPress={() => router.push({ pathname: "/(student)/lesson/[id]", params: { id: cont.id } })} label={t("today.continue")}>
          <T variant="label">{t("today.continue")}</T><T variant="h">{title(cont, lang)}</T>
        </Card>
      ) : null}
      {exam.data && days !== null ? (
        <Card onPress={() => router.navigate("/(student)/exams")} label={t("exam.title")} className="border-hot bg-hot-soft">
          <Row className="justify-between"><View className="flex-1"><T variant="label">{t("exam.title")}</T><T variant="h">{t("today.exam", { name: exam.data.exam_name, n: num(days) })}</T></View><Icon name="calendar" size={30} color="#6B5A00" /></Row>
        </Card>
      ) : null}
      <Card>
        <Row className="gap-4">
          <Ring value={done / goal}><T variant="h">{num(done)}/{num(goal)}</T></Ring>
          <View className="flex-1"><T variant="h">{t("today.week")}</T><T variant="small">{t("today.weekSub", { n: num(done), m: num(goal) })}</T></View>
        </Row>
      </Card>
    </Screen>
  );
}
