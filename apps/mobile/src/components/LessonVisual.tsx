// Simple pictures for the Learn step: counters (groups of dots joined by + − × ÷), equations, fraction bars and
// vertical sums. Kept deliberately plain so a 10-year-old can follow one idea at a time.
import React from "react";
import { View } from "react-native";
import { num } from "../i18n";
import { Text } from "./AppText";

export interface Visual { type: "counters" | "equation" | "fraction" | "column" | "none"; groups?: number[]; op?: string; result?: string; numerator?: number; denominator?: number; lines?: string[] }
const GROUP_COLORS = ["#035B7B", "#167B7B", "#FFAA00", "#B0D80B"];

function Dots({ n, color }: { n: number; color: string }) {
  const k = Math.max(0, Math.min(20, Math.round(n)));
  return (
    <View className="flex-row flex-wrap justify-center gap-1.5" style={{ maxWidth: 5 * 22 }}>
      {Array.from({ length: k }).map((_, i) => <View key={i} style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: color }} />)}
    </View>
  );
}
const Big = ({ children, color = "#0E2A33" }: { children: React.ReactNode; color?: string }) => (
  <Text style={{ fontSize: 26, fontWeight: "700", color, textAlign: "center" }}>{children}</Text>
);

export function LessonVisual({ v }: { v?: Visual | null }) {
  if (!v || v.type === "none") return null;
  if (v.type === "counters" && v.groups?.length) {
    const groups = v.groups.slice(0, 4);
    return (
      <View className="bg-surface-page rounded-card p-3 gap-3 items-center">
        <View className="flex-row flex-wrap items-center justify-center gap-3">
          {groups.map((g, i) => (
            <React.Fragment key={i}>
              {i > 0 && v.op ? <Big color="#4A6670">{v.op}</Big> : null}
              <View className="items-center gap-1 p-2 rounded-card border border-surface-line bg-surface">
                <Dots n={g} color={GROUP_COLORS[i % GROUP_COLORS.length]} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: GROUP_COLORS[i % GROUP_COLORS.length] }}>{num(g)}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        {v.result ? <Big>= {v.result}</Big> : null}
      </View>
    );
  }
  if (v.type === "fraction" && v.denominator) {
    const d = Math.max(1, Math.min(12, v.denominator)), n = Math.max(0, Math.min(d, v.numerator ?? 0));
    return (
      <View className="bg-surface-page rounded-card p-3 gap-2 items-center">
        <View className="flex-row w-full h-12 rounded-lg overflow-hidden border-2" style={{ borderColor: "#035B7B" }}>
          {Array.from({ length: d }).map((_, i) => <View key={i} style={{ flex: 1, backgroundColor: i < n ? "#167B7B" : "#FFFFFF", borderLeftWidth: i ? 2 : 0, borderColor: "#035B7B" }} />)}
        </View>
        <Big>{num(n)}/{num(d)}</Big>
      </View>
    );
  }
  if (v.type === "column" && v.lines?.length) {
    const lines = v.lines.slice(0, 6);
    return (
      <View className="bg-surface-page rounded-card p-3 items-center">
        <View style={{ alignItems: "flex-end" }}>
          {lines.map((l, i) => (
            <View key={i} style={i === lines.length - 1 ? { borderTopWidth: 2, borderColor: "#0E2A33", marginTop: 4, paddingTop: 2, alignSelf: "stretch", alignItems: "flex-end" } : undefined}>
              <Text style={{ fontSize: 24, fontWeight: i === lines.length - 1 ? "700" : "500", color: "#0E2A33", letterSpacing: 2, textAlign: "right" }}>{l}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }
  if ((v.type === "equation" || v.type === "counters") && (v.lines?.length || v.result)) {
    return (
      <View className="bg-surface-page rounded-card p-3 gap-1 items-center">
        {(v.lines?.length ? v.lines.slice(0, 3) : [String(v.result)]).map((l, i) => <Big key={i}>{l}</Big>)}
      </View>
    );
  }
  return null;
}
