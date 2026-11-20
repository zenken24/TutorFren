// Student mode tabs. Everything in here uses ONLY the active child's client (useStudent()).
import React from "react";
import { View } from "react-native";
import { router, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useSession } from "../../../lib/session";
import { Icon, type IconName } from "../../../components/Icon";
import { Chip, LangToggle, T } from "../../../components/ui";

function Header() {
  const { t } = useTranslation();
  const s = useSession();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6 }} className="px-4 pb-2 bg-surface border-b border-surface-line flex-row items-center justify-between">
      <T variant="h" numberOfLines={1} className="flex-1">{s.activeChild?.nickname}</T>
      <View className="flex-row gap-2 items-center"><LangToggle /><Chip tone="plain" title={t("s.switch")} onPress={() => { s.switchUser(); router.replace("/"); }} /></View>
    </View>
  );
}
const icon = (name: IconName) => function TabIcon({ focused }: { focused: boolean }) { return <Icon name={name} size={24} color={focused ? "#035B7B" : "#4A6670"} />; };
export default function StudentTabs() {
  const { t } = useTranslation();
  return (
    <Tabs screenOptions={{ header: () => <Header />, tabBarInactiveTintColor: "#4A6670", tabBarStyle: { height: 74, paddingBottom: 10, paddingTop: 8 }, tabBarLabelStyle: { fontSize: 12, lineHeight: 18, fontFamily: "NotoSansBengali_500Medium" }, tabBarActiveTintColor: "#024560" }}>
      <Tabs.Screen name="index" options={{ title: t("tab.today"), tabBarIcon: icon("home") }} />
      <Tabs.Screen name="chapters" options={{ title: t("tab.chapters"), tabBarIcon: icon("book") }} />
      <Tabs.Screen name="ask" options={{ title: t("tab.ask"), tabBarIcon: icon("chat") }} />
      <Tabs.Screen name="exams" options={{ title: t("tab.exams"), tabBarIcon: icon("calendar") }} />
      <Tabs.Screen name="me" options={{ title: t("tab.me"), tabBarIcon: icon("user") }} />
    </Tabs>
  );
}
