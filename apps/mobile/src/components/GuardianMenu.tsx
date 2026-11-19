// Guardian header (☰ menu button + title + language) and the slide-in sidebar.
import React, { useEffect, useState } from "react";
import { Animated, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { router, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useGuardian, useSession } from "../lib/session";
import { Text } from "./AppText";
import { Chip, LangToggle, Row, T } from "./ui";

const ITEMS = [
  { href: "/(guardian)", path: "/", icon: "📊", key: "menu.dashboard" },
  { href: "/(guardian)/children", path: "/children", icon: "👧", key: "menu.children" },
  { href: "/(guardian)/devices", path: "/devices", icon: "📱", key: "menu.devices" },
  { href: "/(guardian)/consents", path: "/consents", icon: "✅", key: "menu.consent" },
  { href: "/(guardian)/settings", path: "/settings", icon: "⚙️", key: "menu.settings" },
  { href: "/(guardian)/change-password", path: "/change-password", icon: "🔑", key: "menu.password" },
  { href: "/(guardian)/delete-account", path: "/delete-account", icon: "🗑️", key: "menu.delete" },
] as const;

export function GHeader({ title }: { title: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Row className="justify-between">
        <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel={t("menu.open")} hitSlop={8}
          className="w-12 h-12 rounded-card bg-surface border border-surface-line items-center justify-center active:opacity-70">
          <Text className="text-2xl text-primary-dark">☰</Text>
        </Pressable>
        <T variant="title" className="flex-1 px-3" numberOfLines={1}>{title}</T>
        <LangToggle />
      </Row>
      <Sidebar open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const s = useSession();
  const { client } = useGuardian();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelW = Math.min(320, Math.round(width * 0.82));
  const [x] = useState(() => new Animated.Value(-320));
  const me = useQuery({ queryKey: ["g-me"], queryFn: async () => (await client.auth.getUser()).data.user?.email ?? "" });
  useEffect(() => { Animated.timing(x, { toValue: open ? 0 : -panelW, duration: 200, useNativeDriver: true }).start(); }, [open, panelW, x]);
  const go = (href: string) => { onClose(); router.navigate(href as never); };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} accessibilityLabel={t("common.close")} className="absolute inset-0 bg-black/40" />
      <Animated.View style={{ width: panelW, transform: [{ translateX: x }], paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
        className="absolute left-0 top-0 bottom-0 bg-surface px-4 gap-1 rounded-r-3xl">
        <T variant="title" className="text-primary-dark">TutorFren</T>
        <T variant="small" numberOfLines={1}>{t("menu.signedInAs")} {me.data ?? ""}</T>
        <View className="h-px bg-surface-line my-3" />
        {ITEMS.map((it) => {
          const activeItem = pathname === it.path;
          return (
            <Pressable key={it.key} onPress={() => go(it.href)} accessibilityRole="button" accessibilityLabel={t(it.key)}
              className={`flex-row items-center gap-3 min-h-[52px] px-3 rounded-card ${activeItem ? "bg-primary-soft" : "active:bg-surface-page"}`}>
              <Text className="text-xl">{it.icon}</Text>
              <Text className={`text-base ${activeItem ? "font-bold text-primary-dark" : "font-medium text-ink"}`}>{t(it.key)}</Text>
            </Pressable>
          );
        })}
        <View className="flex-1" />
        <Chip tone="plain" title={`🔒 ${t("g.lockNow")}`} onPress={() => { onClose(); s.setGuardianUnlocked(false); router.replace("/"); }} />
      </Animated.View>
    </Modal>
  );
}
