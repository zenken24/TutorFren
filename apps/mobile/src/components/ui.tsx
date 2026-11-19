// Small themeable UI kit. Colours and radii come from tailwind.config.js so Stitch designs can re-skin it.
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, type TextInputProps, View } from "react-native";
import { Text, TextInput } from "./AppText";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";

type TP = React.ComponentProps<typeof Text> & { variant?: "title" | "h" | "body" | "small" | "label"; className?: string };
const TV = { title: "text-2xl font-bold text-ink", h: "text-lg font-bold text-ink", body: "text-base font-sans text-ink", small: "text-sm font-sans text-ink-soft", label: "text-sm font-medium text-ink-soft" };
export function T({ variant = "body", className = "", ...p }: TP) {
  return <Text {...p} className={`${TV[variant]} ${className}`} />;
}
export function Screen({ children, scroll = true, className = "" }: { children: React.ReactNode; scroll?: boolean; className?: string }) {
  return (
    <SafeAreaView className="flex-1 bg-surface-page" edges={["top", "left", "right"]}>
      {scroll ? <ScrollView contentContainerClassName={`p-4 pb-10 gap-4 ${className}`} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View className={`flex-1 p-4 gap-4 ${className}`}>{children}</View>}
    </SafeAreaView>
  );
}
export function Card({ children, className = "", onPress, label }: { children: React.ReactNode; className?: string; onPress?: () => void; label?: string }) {
  const cls = `bg-surface rounded-card p-4 border border-surface-line gap-2 ${className}`;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={`${cls} active:opacity-80`}>{children}</Pressable> : <View className={cls}>{children}</View>;
}
export function Btn({ title, onPress, kind = "primary", disabled, loading, className = "" }: { title: string; onPress?: () => void; kind?: "primary" | "soft" | "ghost" | "amber"; disabled?: boolean; loading?: boolean; className?: string }) {
  const bg = { primary: "bg-primary", soft: "bg-primary-soft", ghost: "bg-transparent border border-surface-line", amber: "bg-practice-soft" }[kind];
  const fg = { primary: "text-white", soft: "text-primary-dark", ghost: "text-ink", amber: "text-practice" }[kind];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: !!disabled }}
      className={`min-h-[52px] px-5 rounded-card items-center justify-center flex-row gap-2 ${bg} ${disabled ? "opacity-40" : "active:opacity-80"} ${className}`}>
      {loading ? <ActivityIndicator color={kind === "primary" ? "#fff" : "#0F766E"} /> : <Text className={`text-base font-bold ${fg}`}>{title}</Text>}
    </Pressable>
  );
}
export function Field({ label, className = "", ...p }: TextInputProps & { label: string; className?: string }) {
  return (
    <View className="gap-1">
      <T variant="label">{label}</T>
      <TextInput {...p} accessibilityLabel={label} placeholderTextColor="#8AA0A3" className={`min-h-[52px] bg-surface border border-surface-line rounded-card px-4 py-3 text-base font-sans text-ink ${className}`} />
    </View>
  );
}
export function PasswordField({ label, className = "", ...p }: TextInputProps & { label: string; className?: string }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <View className="gap-1">
      <T variant="label">{label}</T>
      <View className={`flex-row items-center bg-surface border border-surface-line rounded-card ${className}`}>
        <TextInput {...p} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} accessibilityLabel={label} placeholderTextColor="#8AA0A3" className="flex-1 min-h-[52px] px-4 py-3 text-base font-sans text-ink" />
        <Pressable onPress={() => setShow(!show)} accessibilityRole="button" accessibilityLabel={t(show ? "auth.hide" : "auth.show")} hitSlop={8} className="px-4 min-h-[52px] justify-center active:opacity-60">
          <Text className="text-sm font-bold text-primary-dark">{show ? `🙈 ${t("auth.hide")}` : `👁 ${t("auth.show")}`}</Text>
        </Pressable>
      </View>
    </View>
  );
}
export function Chip({ title, onPress, tone = "teal" }: { title: string; onPress?: () => void; tone?: "teal" | "amber" | "plain" }) {
  const c = { teal: "bg-primary-soft", amber: "bg-practice-soft", plain: "bg-surface border border-surface-line" }[tone];
  const f = { teal: "text-primary-dark", amber: "text-practice", plain: "text-ink-soft" }[tone];
  const inner = <Text className={`text-sm font-medium ${f}`}>{title}</Text>;
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} className={`px-3 min-h-[40px] justify-center rounded-full ${c} active:opacity-70`}>{inner}</Pressable> : <View className={`px-3 py-1.5 rounded-full self-start ${c}`}>{inner}</View>;
}
export function Bar({ value, amber }: { value: number; amber?: boolean }) {
  return <View className="h-2.5 rounded-full bg-surface-line overflow-hidden" accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(value * 100), min: 0, max: 100 }}><View className={`h-full rounded-full ${amber ? "bg-practice" : "bg-primary"}`} style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></View>;
}
export function Ring({ value, size = 84, children }: { value: number; size?: number; children?: React.ReactNode }) {
  const r = (size - 10) / 2, c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#DCE7E5" strokeWidth={10} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#0F766E" strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={`${c * Math.max(0, Math.min(1, value))} ${c}`} />
      </Svg>
      {children}
    </View>
  );
}
export type BadgeKind = "not_started" | "learning" | "practising" | "mastered";
export function MasteryBadge({ kind }: { kind: BadgeKind }) {
  const { t } = useTranslation();
  return <Chip title={t(`badge.${kind}`)} tone={kind === "mastered" ? "teal" : kind === "not_started" ? "plain" : "amber"} />;
}
export function LangToggle() {
  const { i18n } = useTranslation();
  const bn = i18n.language !== "en";
  return (
    <Pressable onPress={() => setLanguage(bn ? "en" : "bn")} accessibilityRole="button" accessibilityLabel={bn ? "Switch to English" : "বাংলায় বদলাও"} className="min-h-[40px] px-3 rounded-full border border-surface-line bg-surface justify-center active:opacity-70">
      <Text className="text-sm font-bold text-primary-dark">{bn ? "EN" : "বাং"}</Text>
    </Pressable>
  );
}
export function Loading() { return <View className="p-8 items-center"><ActivityIndicator color="#0F766E" size="large" /></View>; }
export function Notice({ text, tone = "amber" }: { text: string; tone?: "amber" | "teal" }) {
  return <View className={`rounded-card p-3 ${tone === "amber" ? "bg-practice-soft" : "bg-primary-soft"}`}><T variant="small" className={tone === "amber" ? "text-practice" : "text-primary-dark"}>{text}</T></View>;
}
export function Row({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <View className={`flex-row items-center gap-2 ${className}`}>{children}</View>; }
export function errorKey(e: unknown): string {
  const code = (e as { code?: string })?.code, status = (e as { status?: number })?.status;
  return code === "network" || status === 0 ? "common.network" : status === 429 ? "common.rate" : "common.error";
}
