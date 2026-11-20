// Guardian dashboard: welcome, child picker, activity heatmap (day granularity), progress pie + chapter bars.
// All learning data comes from the aggregated guardian-summary function - never raw answers or transcripts.
import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { callFn } from "../../lib/supabase";
import { useGuardian } from "../../lib/session";
import { type Summary, useChildren } from "../../lib/guardian";
import { chapters as bookChapters } from "../../lib/textbook";
import { currentLang, num } from "../../i18n";
import { GHeader } from "../../components/GuardianMenu";
import { OpenChild } from "../../components/OpenChild";
import { ChapterBars, COLORS, Donut, Heatmap } from "../../components/charts";
import { Btn, Card, Chip, Loading, Notice, Row, Screen, T } from "../../components/ui";

export default function Dashboard() {
  const { t } = useTranslation();
  const { client } = useGuardian();
  const lang = currentLang();
  const params = useLocalSearchParams<{ child?: string }>();
  const kids = useChildren();
  // a chip tap wins until the screen is opened again for a different child
  const [pick, setPick] = useState<{ from?: string; id: string } | null>(null);
  const setSel = (id: string) => setPick({ from: params.child, id });
  const selId = pick && pick.from === params.child ? pick.id : params.child;
  const list = kids.data ?? [];
  const child = list.find((c) => c.id === selId) ?? list.find((c) => c.status === "active") ?? list[0];

  const consent = useQuery({
    queryKey: ["g-consents", child?.id], enabled: !!child,
    queryFn: async () => ((await client.from("consents").select("scope").eq("student_id", child!.id).is("revoked_at", null)).data ?? []).map((r) => r.scope as string),
  });
  const canView = child?.status === "active" && (consent.data ?? []).includes("guardian_view");
  const summary = useQuery({ queryKey: ["g-summary", child?.id], enabled: !!child && canView, retry: false, queryFn: () => callFn<Summary>(client, "guardian-summary", { student_id: child!.id }) });

  const chapterTitle = (n: number) => { const c = bookChapters.find((x) => x.number === n); return `${num(n)}. ${c ? (lang === "bn" ? c.title_bn : c.title_en) : ""}`; };
  const names = (xs?: { title_en: string; title_bn: string }[]) => (xs ?? []).map((c) => (lang === "bn" ? c.title_bn : c.title_en));
  const s = summary.data;
  const total = s ? s.totals.mastered + s.totals.in_progress + s.totals.not_started : 0;

  return (
    <Screen>
      <GHeader title={t("dash.title")} />
      <T variant="title" className="text-primary-dark">{t("dash.welcome")}</T>

      {kids.isLoading ? <Loading /> : list.length === 0 ? (
        <Card><T>{t("g.none")}</T><Btn icon="plus" title={t("g.add")} onPress={() => router.push("/(guardian)/add-child")} /></Card>
      ) : (
        <>
          {list.length > 1 ? (
            <View className="flex-row flex-wrap gap-2">
              {list.map((c) => <Chip key={c.id} tone={c.id === child?.id ? "teal" : "plain"} title={c.nickname} onPress={() => setSel(c.id)} />)}
            </View>
          ) : null}

          {child ? <OpenChild key={child.id} child={child} /> : null}

          {child && child.status !== "active" ? (
            <Card><Notice text={t("dash.pending", { name: child.nickname })} />
              <Btn title={t("dash.giveConsent")} onPress={() => router.push({ pathname: "/(guardian)/consent", params: { id: child.id, name: child.nickname, mode: child.device_mode } })} /></Card>
          ) : child && consent.isSuccess && !canView ? (
            <Card><Notice text={t("child.noView")} /><Btn kind="soft" title={t("menu.consent")} onPress={() => router.push({ pathname: "/(guardian)/consents", params: { child: child.id } })} /></Card>
          ) : summary.isLoading || consent.isLoading ? <Loading /> : s ? (
            <>
              <Card>
                <T variant="h">{t("dash.activeTitle", { name: child!.nickname })}</T>
                <Heatmap days={s.active_days} />
              </Card>

              <T variant="title">{t("child.summary")}</T>
              <Row className="gap-3 items-stretch">
                <Card className="flex-1 items-center justify-center"><T variant="title" className="text-primary-dark">{num(s.totals.mastered)}</T><T variant="small" className="text-center">{t("child.mastered")}</T></Card>
                <Card className="flex-1 items-center justify-center"><T variant="title" className="text-practice-text">{num(s.totals.in_progress)}</T><T variant="small" className="text-center">{t("dash.inProgress")}</T></Card>
                <Card className="flex-1 items-center justify-center"><T variant="title" className="text-info-text">{num(s.sessions_this_week)}</T><T variant="small" className="text-center">{t("child.sessions")}</T></Card>
              </Row>

              <Card>
                <T variant="h">{t("dash.pieTitle")}</T>
                <Donut center={`${num(total ? Math.round((s.totals.mastered / total) * 100) : 0)}%`} sub={t("dash.pieCenter")}
                  parts={[
                    { label: t("child.mastered"), value: s.totals.mastered, color: COLORS.mastered },
                    { label: t("dash.inProgress"), value: s.totals.in_progress, color: COLORS.progress },
                    { label: t("dash.notStarted"), value: s.totals.not_started, color: COLORS.notStarted },
                  ]} />
              </Card>

              <Card>
                <T variant="h">{t("dash.barTitle")}</T>
                <Row className="gap-3 flex-wrap">
                  <Row className="gap-1"><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS.mastered }} /><T variant="small">{t("child.mastered")}</T></Row>
                  <Row className="gap-1"><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS.progress }} /><T variant="small">{t("dash.inProgress")}</T></Row>
                  <Row className="gap-1"><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: COLORS.notStarted }} /><T variant="small">{t("dash.notStarted")}</T></Row>
                </Row>
                <ChapterBars rows={s.chapters.map((c) => ({ ...c, label: chapterTitle(c.chapter) }))} />
              </Card>

              <Card>
                <T variant="h">{t("child.gaps")}</T>
                {names(s.gaps).length ? <View className="flex-row flex-wrap gap-2">{names(s.gaps).map((x) => <Chip key={x} tone="amber" title={x} />)}</View> : <T variant="small">{t("child.nothing")}</T>}
                <T variant="h">{t("child.suggested")}</T>
                {names(s.suggested_practice).length ? <View className="flex-row flex-wrap gap-2">{names(s.suggested_practice).map((x) => <Chip key={x} tone="amber" title={x} />)}</View> : <T variant="small">{t("child.nothing")}</T>}
              </Card>
              <Notice tone="blue" text={t("dash.privacyNote")} />
            </>
          ) : <Notice text={t("common.error")} />}
        </>
      )}
    </Screen>
  );
}
