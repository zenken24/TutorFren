import "../../global.css";
import "../i18n";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, NotoSansBengali_400Regular, NotoSansBengali_500Medium, NotoSansBengali_700Bold } from "@expo-google-fonts/noto-sans-bengali";
import { SessionProvider } from "../lib/session";
import { sweepRecordings } from "../lib/voiceDevice";

// No offline persistence: child data is never kept on the phone beyond the current screens.
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, gcTime: 5 * 60_000 } } });

export default function Root() {
  const [loaded] = useFonts({ NotoSansBengali_400Regular, NotoSansBengali_500Medium, NotoSansBengali_700Bold });
  useEffect(() => { sweepRecordings(); }, []); // delete any recording left behind by a crash
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }} />
          </SessionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
