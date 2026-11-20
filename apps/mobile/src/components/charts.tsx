// Guardian dashboard charts drawn with react-native-svg (no extra library).
// Every chart measures its own width (onLayout) so it always fits the phone screen.
import React, { useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import Svg, { Circle, G, Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { num } from "../i18n";
import { Row, T } from "./ui";
import { Text } from "./AppText";

export const COLORS = { mastered: "#167B7B", progress: "#FFAA00", notStarted: "#D6E6EA", empty: "#E8F2F4" }; // seaweed / chrome yellow
const HEAT = ["#E8F2F4", "#BFE6E3", "#7CC5C0", "#167B7B", "#035B7B"]; // seaweed -> sapphire

function useWidth(): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.floor(e.nativeEvent.layout.width))];
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** GitHub-style activity heatmap: one column per week, one row per weekday (Sat..Fri, Bangladesh week). */
export function Heatmap({ days, weeks = 12 }: { days: { day: string; n: number }[]; weeks?: number }) {
  const { t } = useTranslation();
  const [width, onLayout] = useWidth();
  const counts = new Map(days.map((d) => [d.day, d.n]));
  const today = new Date();
  // the week starts on Saturday: shift so that today's column is the last one
  const dow = (today.getUTCDay() + 1) % 7; // Sat=0 ... Fri=6
  const start = new Date(today.getTime() - ((weeks - 1) * 7 + dow) * 864e5);
  const labelW = 34, gap = 3;
  const cell = width ? Math.max(8, Math.floor((width - labelW - gap * weeks) / weeks)) : 0;
  const level = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
  const activeDays = days.filter((d) => d.n > 0).length;
  const rowLabels = [t("dash.dow.sat"), "", t("dash.dow.mon"), "", t("dash.dow.wed"), "", t("dash.dow.fri")];
  return (
    <View onLayout={onLayout} className="gap-2">
      {cell ? (
        <Row className="items-start">
          <View style={{ width: labelW }}>
            {rowLabels.map((l, i) => <View key={i} style={{ height: cell + gap, justifyContent: "center", paddingBottom: gap }}><Text numberOfLines={1} style={{ fontSize: 10, lineHeight: Math.min(cell, 16), color: "#4A6670" }}>{l}</Text></View>)}
          </View>
          <Svg width={(cell + gap) * weeks} height={(cell + gap) * 7} accessibilityLabel={t("dash.heatA11y", { n: num(activeDays) })}>
            {Array.from({ length: weeks }).map((_, w) => (
              <G key={w}>
                {Array.from({ length: 7 }).map((__, d) => {
                  const date = new Date(start.getTime() + (w * 7 + d) * 864e5);
                  if (date > today) return null;
                  return <Rect key={d} x={w * (cell + gap)} y={d * (cell + gap)} width={cell} height={cell} rx={3} fill={HEAT[level(counts.get(iso(date)) ?? 0)]} />;
                })}
              </G>
            ))}
          </Svg>
        </Row>
      ) : null}
      <View className="gap-2">
        <T variant="small">{t("dash.activeDays", { n: num(activeDays), w: num(weeks) })}</T>
        <Row className="gap-1">
          <T variant="small" className="text-[11px]">{t("dash.less")}</T>
          {HEAT.map((c) => <View key={c} style={{ width: 11, height: 11, borderRadius: 2, backgroundColor: c }} />)}
          <T variant="small" className="text-[11px]">{t("dash.more")}</T>
        </Row>
      </View>
    </View>
  );
}

/** Donut (pie) chart with a legend underneath. */
export function Donut({ parts, center, sub }: { parts: { label: string; value: number; color: string }[]; center: string; sub: string }) {
  const [width, onLayout] = useWidth();
  const size = Math.min(width, 220), stroke = Math.max(18, Math.round(size * 0.14));
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  const lens = parts.map((p) => (p.value / total) * c);
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <View onLayout={onLayout} className="items-center gap-3">
      {size ? (
        <View style={{ width: size, height: size }} className="items-center justify-center">
          <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={COLORS.empty} strokeWidth={stroke} fill="none" />
            {parts.map((p, i) => (p.value > 0
              ? <Circle key={p.label} cx={size / 2} cy={size / 2} r={r} stroke={p.color} strokeWidth={stroke} fill="none" strokeDasharray={`${lens[i]} ${c - lens[i]}`} strokeDashoffset={-starts[i]} />
              : null))}
          </Svg>
          <View style={{ width: size - stroke * 2.4, alignItems: "center" }}><T variant="title" className="text-primary-dark text-center">{center}</T><T variant="small" className="text-center" numberOfLines={2}>{sub}</T></View>
        </View>
      ) : null}
      <View className="w-full gap-1.5">
        {parts.map((p) => (
          <Row key={p.label} className="justify-between">
            <Row className="flex-1"><View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: p.color }} /><T variant="small" className="flex-1 text-ink">{p.label}</T></Row>
            <T variant="small" className="font-bold text-ink">{num(p.value)} · {num(Math.round((p.value / total) * 100))}%</T>
          </Row>
        ))}
      </View>
    </View>
  );
}

/** One horizontal stacked bar per chapter: mastered | in progress | not started. */
export function ChapterBars({ rows }: { rows: { label: string; total: number; mastered: number; in_progress: number }[] }) {
  return (
    <View className="gap-3">
      {rows.map((r) => {
        const m = r.total ? r.mastered / r.total : 0, p = r.total ? r.in_progress / r.total : 0;
        return (
          <View key={r.label} className="gap-1">
            <Row className="justify-between"><T variant="small" className="flex-1 text-ink" numberOfLines={1}>{r.label}</T><T variant="small" className="font-bold text-ink">{num(Math.round(m * 100))}%</T></Row>
            <View className="h-3.5 rounded-full overflow-hidden flex-row" style={{ backgroundColor: COLORS.notStarted }}>
              <View style={{ width: `${m * 100}%`, backgroundColor: COLORS.mastered }} />
              <View style={{ width: `${p * 100}%`, backgroundColor: COLORS.progress }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}
