// Student mode: five tabs. Everything in here uses ONLY the active child's client (useStudent()).
import React from "react";
import { View } from "react-native";
import { Text } from "../../components/AppText";
import { Redirect, router, Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useSession } from "../../lib/session";
import { Chip, LangToggle, T } from "../../components/ui";

function Header() {
  const { t } = useTranslation();
  const s = useSession();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 6 }} className="px-4 pb-2 bg-surface border-b border-surface-line flex-row items-center justify-between">
      <T variant="h" numberOfLines={1} className="flex-1">{s.activeChild?.nickname}</T>
      <View className="flex-row gap-2"><LangToggle /><Chip tone="plain" title={t("s.switch")} onPress={() => { s.switchUser(); router.replace("/"); }} /></View>
    </View>
  );
}
function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) { return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{glyph}</Text>; }
const icon = (glyph: string) => function Icon({ focused }: { focused: boolean }) { return <TabIcon glyph={glyph} focused={focused} />; };
export default function StudentLayout() {
  const { t } = useTranslation();
  const s = useSession();
  if (!s.activeChild) return <Redirect href="/" />;
  return (
    <Tabs screenOptions={{ header: () => <Header />, tabBarActiveTintColor: "#0F766E", tabBarInactiveTintColor: "#4B6468", tabBarStyle: { height: 68, paddingBottom: 10, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 12, fontFamily: "NotoSansBengali_500Medium" } }}>
      <Tabs.Screen name="index" options={{ title: t("tab.today"), tabBarIcon: icon("🏠") }} />
      <Tabs.Screen name="chapters" options={{ title: t("tab.chapters"), tabBarIcon: icon("📘") }} />
      <Tabs.Screen name="ask" options={{ title: t("tab.ask"), tabBarIcon: icon("💬") }} />
      <Tabs.Screen name="exams" options={{ title: t("tab.exams"), tabBarIcon: icon("🗓️") }} />
      <Tabs.Screen name="me" options={{ title: t("tab.me"), tabBarIcon: icon("⭐") }} />
      <Tabs.Screen name="chapter/[n]" options={{ href: null }} />
      <Tabs.Screen name="lesson/[id]" options={{ href: null }} />
    </Tabs>
  );
}
