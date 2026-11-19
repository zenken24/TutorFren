// Textbook page card + full-screen viewer (pinch to zoom, swipe/arrow to the next page, language toggle).
// Images come from the private bucket through short-lived signed URLs returned by `textbook-lookup`.
import React, { useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { runOnJS } from "react-native-worklets";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { callFn, reachable } from "../lib/supabase";
import { useStudent } from "../lib/session";
import { currentLang, type Lang, num } from "../i18n";
import { Btn, Card, Chip, Loading, Row, T } from "./ui";

type Urls = { bn?: string; en?: string };
/** signed URLs for one printed page (both languages) */
export function usePage(printedPage: number | null) {
  const { client, child } = useStudent();
  return useQuery({
    queryKey: ["page", child.id, printedPage], enabled: printedPage !== null, staleTime: 8 * 60_000, gcTime: 9 * 60_000,
    queryFn: async () => {
      const r = await callFn<{ pages: Record<string, Urls> }>(client, "textbook-lookup", { text: `page ${printedPage}`, language: currentLang() });
      const u = r.pages[String(printedPage! + 7)] ?? {};
      return { bn: reachable(u.bn), en: reachable(u.en) };
    },
  });
}
function Zoomable({ uri, onSwipe }: { uri: string; onSwipe: (dir: number) => void }) {
  const scale = useSharedValue(1), saved = useSharedValue(1), tx = useSharedValue(0), ty = useSharedValue(0), sx = useSharedValue(0), sy = useSharedValue(0);
  const pinch = Gesture.Pinch().onUpdate((e) => { scale.value = Math.max(1, Math.min(4, saved.value * e.scale)); })
    .onEnd(() => { saved.value = scale.value; if (scale.value === 1) { tx.value = withTiming(0); ty.value = withTiming(0); sx.value = 0; sy.value = 0; } });
  const pan = Gesture.Pan().minPointers(1).onUpdate((e) => { if (scale.value > 1) { tx.value = sx.value + e.translationX; ty.value = sy.value + e.translationY; } })
    .onEnd((e) => {
      if (scale.value <= 1 && Math.abs(e.translationX) > 70 && Math.abs(e.translationY) < 80) runOnJS(onSwipe)(e.translationX < 0 ? 1 : -1); // swipe to next / previous page
      sx.value = tx.value; sy.value = ty.value;
    });
  const dbl = Gesture.Tap().numberOfTaps(2).onEnd(() => { const z = scale.value > 1 ? 1 : 2.5; scale.value = withTiming(z); saved.value = z; if (z === 1) { tx.value = withTiming(0); ty.value = withTiming(0); sx.value = 0; sy.value = 0; } });
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }] }));
  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, dbl)}>
      <Animated.View style={[{ flex: 1 }, style]}><Image source={{ uri }} style={{ flex: 1 }} contentFit="contain" accessibilityLabel="textbook page" /></Animated.View>
    </GestureDetector>
  );
}
type ViewerProps = { visible: boolean; onClose: () => void; startPage: number; minPage?: number; maxPage?: number };
export function PageViewer(p: ViewerProps) {
  return p.visible ? <Viewer key={p.startPage} {...p} /> : null; // fresh state every time it opens
}
function Viewer({ visible, onClose, startPage, minPage = 1, maxPage = 182 }: ViewerProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(startPage);
  const [lang, setLang] = useState<Lang>(currentLang());
  const q = usePage(visible ? page : null);
  const uri = q.data?.[lang] ?? q.data?.[lang === "bn" ? "en" : "bn"];
  const go = (d: number) => setPage((p) => Math.max(minPage, Math.min(maxPage, p + d)));
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0F2A2E" }}>
        <View className="flex-row items-center justify-between px-3 pt-12 pb-2">
          <Chip title={t("common.close")} onPress={onClose} tone="plain" />
          <T className="text-white font-bold">{t("page.printed", { n: num(page) })}</T>
          <Chip title={lang === "bn" ? "English" : "বাংলা"} onPress={() => setLang(lang === "bn" ? "en" : "bn")} tone="teal" />
        </View>
        <View className="flex-1">{q.isLoading ? <Loading /> : uri ? <Zoomable key={uri} uri={uri} onSwipe={go} /> : <T className="text-white text-center p-8">{t("page.missing")}</T>}</View>
        <View className="flex-row justify-between p-3 pb-8">
          <Btn kind="soft" title={`‹ ${num(Math.max(minPage, page - 1))}`} onPress={() => go(-1)} disabled={page <= minPage} />
          <Btn kind="soft" title={`${num(Math.min(maxPage, page + 1))} ›`} onPress={() => go(1)} disabled={page >= maxPage} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
/** Card shown in Ask and lessons: thumbnail of the exact page; tap for the full-screen viewer. */
export function PageCard({ printedPage, title, subtitle, pages }: { printedPage: number; title?: string; subtitle?: string | null; pages?: number[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>(currentLang());
  const q = usePage(printedPage);
  const uri = q.data?.[lang] ?? q.data?.[lang === "bn" ? "en" : "bn"];
  const range = pages?.length ? pages : [printedPage];
  return (
    <Card>
      <Row className="justify-between">
        <View className="flex-1"><T variant="h">{title ?? t("page.printed", { n: num(printedPage) })}</T>{subtitle ? <T variant="small" numberOfLines={3}>{subtitle}</T> : null}</View>
        <Chip title={lang === "bn" ? "English" : "বাংলা"} onPress={() => setLang(lang === "bn" ? "en" : "bn")} tone="plain" />
      </Row>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="imagebutton" accessibilityLabel={t("page.zoom")} className="h-80 rounded-card overflow-hidden bg-surface-page border border-surface-line">
        {q.isLoading ? <Loading /> : uri ? <Image source={{ uri }} style={{ flex: 1 }} contentFit="cover" contentPosition="top" /> : <T variant="small" className="p-6 text-center">{t("page.missing")}</T>}
      </Pressable>
      <Row className="justify-between"><Chip title={t("page.printed", { n: num(printedPage) })} /><T variant="small">{t("page.zoom")}</T></Row>
      <PageViewer visible={open} onClose={() => setOpen(false)} startPage={printedPage} minPage={Math.min(...range, printedPage)} maxPage={range.length > 1 ? Math.max(...range) : 182} />
    </Card>
  );
}
export function OpenInBook({ printedPage, last }: { printedPage: number; last?: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (<><Btn kind="soft" title={`${t("ch.openBook")} · ${t("page.printed", { n: num(printedPage) })}`} onPress={() => setOpen(true)} />
    <PageViewer visible={open} onClose={() => setOpen(false)} startPage={printedPage} maxPage={last && last > printedPage ? 182 : 182} /></>);
}
