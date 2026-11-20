// Text + TextInput that render Bangla correctly on Android.
// Why: React Native on Android garbles custom fonts when `fontWeight` is set on a single-weight font file
// (it falls back or fakes bold), and tight line heights clip Bangla vowel signs above/below the letters
// (ি ী ু ূ ৃ ে ৈ and conjuncts). So:
//   * the font FILE is chosen from the weight (Regular / Medium / Bold) and `fontWeight` is removed;
//   * Text gets a line height of at least 1.6 × font size;
//   * NativeWind classNames are resolved into `style` first (cssInterop), so all of this also works with className.
import React, { forwardRef } from "react";
import { Platform, StyleSheet, Text as RNText, TextInput as RNTextInput, type TextInputProps, type TextProps, type TextStyle } from "react-native";
import { cssInterop } from "nativewind";

export const FONT = { regular: "NotoSansBengali_400Regular", medium: "NotoSansBengali_500Medium", bold: "NotoSansBengali_700Bold" } as const;

function familyFor(weight: TextStyle["fontWeight"]): string {
  const w = weight === "bold" ? 700 : weight === "normal" || weight == null ? 400 : Number(weight) || 400;
  return w >= 600 ? FONT.bold : w >= 500 ? FONT.medium : FONT.regular;
}
export function bnStyle(style: TextProps["style"], forInput = false): TextStyle {
  const s = { ...(StyleSheet.flatten(style) ?? {}) } as { -readonly [K in keyof TextStyle]: TextStyle[K] };
  const ours = !s.fontFamily || s.fontFamily.startsWith("NotoSansBengali");
  if (ours) s.fontFamily = s.fontFamily && s.fontWeight == null ? s.fontFamily : familyFor(s.fontWeight);
  if (ours) delete s.fontWeight;
  if (!forInput) {
    const size = s.fontSize ?? 16;
    s.lineHeight = Math.max(typeof s.lineHeight === "number" ? s.lineHeight : 0, Math.round(size * 1.6));
  }
  if (Platform.OS === "android") s.includeFontPadding = true;
  if (!forInput && s.flexShrink == null && s.flex == null && s.flexGrow == null) s.flexShrink = 1; // wrap instead of running off-screen
  return s;
}

const BaseText = forwardRef<React.ComponentRef<typeof RNText>, TextProps>(function BaseText({ style, ...p }, ref) {
  return <RNText ref={ref} {...p} style={bnStyle(style)} />;
});
const BaseInput = forwardRef<React.ComponentRef<typeof RNTextInput>, TextInputProps>(function BaseInput({ style, ...p }, ref) {
  return <RNTextInput ref={ref} {...p} style={bnStyle(style, true)} />;
});
cssInterop(BaseText, { className: "style" });
cssInterop(BaseInput, { className: { target: "style" }, placeholderClassName: { target: false, nativeStyleToProp: { color: "placeholderTextColor" } } });

export const Text = BaseText as unknown as React.ComponentType<TextProps & { className?: string }>;
export const TextInput = BaseInput as unknown as React.ComponentType<TextInputProps & { className?: string; ref?: React.Ref<React.ComponentRef<typeof RNTextInput>> }>;
