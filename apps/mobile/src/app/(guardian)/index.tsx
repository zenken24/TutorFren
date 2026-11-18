// Guardian home: children list. Shows profile rows only (nickname, class, status) - no learning data.
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useGuardian, useSession } from "../../lib/session";
import { num } from "../../i18n";
import { Btn, Card, Chip, LangToggle, Loading, Row, Screen, T } from "../../components/ui";

export default function Children() {
  const { t } = useTranslation();
  const { client } = useGuardian();
  const s = useSession();
  const q = useQuery({ queryKey: ["g-children"], queryFn: async () => (await client.from("students").select("id,nickname,grade,status,device_mode").order("created_at")).data ?? [] });
  return (
    <Screen>
      <Row className="justify-between"><T variant="title">{t("g.children")}</T><Row><LangToggle /><Chip tone="plain" title={`🔒 ${t("g.lockNow")}`} onPress={() => { s.setGuardianUnlocked(false); router.replace("/"); }} /></Row></Row>
      {q.isLoading ? <Loading /> : (q.data ?? []).length === 0 ? <T variant="small">{t("g.none")}</T> : q.data!.map((c) => (
        <Card key={c.id} label={c.nickname} onPress={() => router.push({ pathname: c.status === "active" ? "/(guardian)/child" : "/(guardian)/consent", params: { id: c.id, name: c.nickname, mode: c.device_mode } })}>
          <Row className="justify-between">
            <View><T variant="h">{c.nickname}</T><T variant="small">{t("add.grade")} {num(c.grade)} · {t(c.device_mode === "shared" ? "child.thisPhone" : "child.ownPhone")}</T></View>
            <Chip tone={c.status === "active" ? "teal" : "amber"} title={t(c.status === "active" ? "g.active" : "g.pending")} />
          </Row>
        </Card>
      ))}
      <Btn title={`＋ ${t("g.add")}`} onPress={() => router.push("/(guardian)/add-child")} />
      <Btn kind="ghost" title={t("g.settings")} onPress={() => router.push("/(guardian)/settings")} />
    </Screen>
  );
}
