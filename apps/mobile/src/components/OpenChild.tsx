// Guardian -> "Open {name}'s learning" on THIS phone. Sets the phone up for the child first if needed
// (shared-phone children only), then locks guardian mode and opens the child's space.
import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { callFn } from "../lib/supabase";
import { useGuardian, useSession } from "../lib/session";
import { hasChildPin } from "../lib/lock";
import type { GChild } from "../lib/guardian";
import { Btn, errorKey, Notice, T } from "./ui";

export function OpenChild({ child }: { child: GChild }) {
  const { t } = useTranslation();
  const s = useSession();
  const { client } = useGuardian();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (child.status !== "active") return null;
  const here = s.children.some((c) => c.id === child.id);
  if (!here && child.device_mode === "own") return <T variant="small">{t("open.ownPhone", { name: child.nickname })}</T>;

  const open = async () => {
    setBusy(true); setMsg(null);
    try {
      const entry = { id: child.id, nickname: child.nickname };
      if (!here) {
        const tok = await callFn<{ access_token: string; refresh_token: string }>(client, "shared-device-enroll", { student_id: child.id, device_id: s.deviceId });
        await s.enrolChild(entry, tok);
      }
      if (await hasChildPin(child.id)) { s.setGuardianUnlocked(false); router.replace("/"); return; } // the child types their PIN on the picker
      if (await s.selectChild(child.id, entry)) { router.replace("/(student)"); return; }
      setMsg(t("open.failed"));
    } catch (e) { setMsg(t(errorKey(e))); }
    setBusy(false);
  };
  return (
    <View className="gap-2">
      {msg ? <Notice text={msg} /> : null}
      <Btn kind="soft" loading={busy} title={t("open.btn", { name: child.nickname })} onPress={open} />
    </View>
  );
}
