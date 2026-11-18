import React from "react";
import { Stack } from "expo-router";
import { GuardianGate } from "../../components/GuardianGate";
export default function GuardianLayout() {
  return <GuardianGate><Stack screenOptions={{ headerShown: false }} /></GuardianGate>;
}
