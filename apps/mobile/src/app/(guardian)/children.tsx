// Children: profile rows only (nickname, class, phone type, status) - no learning data here.
import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useChildren } from "../../lib/guardian";
import { useSession } from "../../lib/session";
import { num } from "../../i18n";
import { GHeader } from "../../components/GuardianMenu";
import { Btn, Card, Chip, Loading, Row, Screen, T } from "../../components/ui";

export default function Children() {
  const { t } = useTranslation();
  const s = useSession();
  const kids = useChildren();
  return (
    <Screen>
      <GHeader title={t("menu.children")} />
      {kids.isLoading ? <Loading /> : (kids.data ?? []).length === 0 ? <T variant="small">{t("g.none")}</T> : kids.data!.map((c) => (
        <Card key={c.id} label={c.nickname} onPress={() => c.status === "active"
          ? router.navigate({ pathname: "/(guardian)", params: { child: c.id } })
          : router.push({ pathname: "/(guardian)/consent", params: { id: c.id, name: c.nickname, mode: c.device_mode } })}>
          <Row className="justify-between">
            <View className="flex-1">
              <T variant="h">{c.nickname}</T>
              <T variant="small">{t("add.grade")} {num(c.grade)} · {t(c.device_mode === "shared" ? "child.thisPhone" : "child.ownPhone")}</T>
              {s.children.some((x) => x.id === c.id) ? <T variant="small" className="text-primary-dark">✓ {t("child.enrolled")}</T> : null}
            </View>
            <Chip tone={c.status === "active" ? "teal" : "amber"} title={t(c.status === "active" ? "g.active" : "g.pending")} />
          </Row>
          <T variant="small">{t(c.status === "active" ? "children.tapActive" : "children.tapPending")}</T>
        </Card>
      ))}
      <Btn title={`＋ ${t("g.add")}`} onPress={() => router.push("/(guardian)/add-child")} />
    </Screen>
  );
}
