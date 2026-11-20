// Student mode: the five tabs, with chapter and lesson pages opening ON TOP of them (stack), so they
// always open and the back gesture works. Everything in here uses ONLY the active child's client.
import React from "react";
import { Redirect, Stack } from "expo-router";
import { useSession } from "../../lib/session";

export default function StudentLayout() {
  const s = useSession();
  if (!s.activeChild) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#F4FAFB" } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="chapter/[n]" />
      <Stack.Screen name="lesson/[id]" />
    </Stack>
  );
}
