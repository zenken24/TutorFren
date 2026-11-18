import React, { useState } from "react";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../lib/supabase";
import { useGuardian } from "../../lib/session";
import { Btn, Card, Chip, errorKey, Field, Notice, Row, Screen, T } from "../../components/ui";

export default function AddChild() {
  const { t } = useTranslation();
  const { client } = useGuardian();
  const qc = useQueryClient();
  const [nickname, setNickname] = useState("");
  const [language, setLanguage] = useState<"bn" | "en">("bn");
  const [mode, setMode] = useState<"shared" | "own" | null>(null); // REQUIRED question, no default
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const create = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await callFn<{ student_id: string }>(client, "student-create", { nickname: nickname.trim(), grade: 5, language, device_mode: mode });
      qc.invalidateQueries({ queryKey: ["g-children"] });
      router.replace({ pathname: "/(guardian)/consent", params: { id: r.student_id, name: nickname.trim(), mode: mode! } });
    } catch (e) { setMsg(t((e as { status?: number }).status === 429 ? "add.limit" : errorKey(e))); }
    setBusy(false);
  };
  const name = nickname.trim() || "…";
  return (
    <Screen>
      <T variant="title">{t("g.add")}</T>
      {msg ? <Notice text={msg} /> : null}
      <Field label={t("add.nickname")} value={nickname} onChangeText={setNickname} maxLength={30} />
      <T variant="small">{t("add.nickHelp")}</T>
      <Card><T variant="label">{t("add.grade")}: 5</T><T variant="label">{t("add.language")}</T>
        <Row><Chip tone={language === "bn" ? "teal" : "plain"} title="বাংলা" onPress={() => setLanguage("bn")} /><Chip tone={language === "en" ? "teal" : "plain"} title="English" onPress={() => setLanguage("en")} /></Row>
      </Card>
      <Card>
        <T variant="h">{t("add.deviceQ", { name })}</T>
        <Btn kind={mode === "shared" ? "primary" : "ghost"} title={`${mode === "shared" ? "◉" : "○"} ${t("add.shared")}`} onPress={() => setMode("shared")} />
        <Btn kind={mode === "own" ? "primary" : "ghost"} title={`${mode === "own" ? "◉" : "○"} ${t("add.own")}`} onPress={() => setMode("own")} />
      </Card>
      <Btn title={t("add.create")} onPress={create} loading={busy} disabled={!nickname.trim() || !mode} />
      <Btn kind="ghost" title={t("common.cancel")} onPress={() => router.back()} />
    </Screen>
  );
}
