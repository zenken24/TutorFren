// Delete account: choose the GUARDIAN account or ONE CHILD, see exactly what will be deleted, type DELETE.
// Needs a recent sign-in (server step-up). Deleting the guardian also deletes the children they are the
// main guardian for, because a child account cannot exist without a consenting guardian.
import React, { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { callFn } from "../../lib/supabase";
import { useGuardian, useSession } from "../../lib/session";
import { usePrimaryChildIds, useChildren } from "../../lib/guardian";
import { useStepUp } from "../../components/GuardianGate";
import { GHeader } from "../../components/GuardianMenu";
import { Btn, Card, errorKey, Field, Loading, Notice, Row, Screen, T } from "../../components/ui";

type Target = { kind: "guardian" } | { kind: "child"; id: string; name: string };
const same = (a: Target | null, b: Target) => !!a && a.kind === b.kind && (a.kind === "guardian" || (b.kind === "child" && a.id === b.id));
function Option({ value, title, help, selected, onPick }: { value: Target; title: string; help: string; selected: Target | null; onPick: (v: Target) => void }) {
  const on = same(selected, value);
  return (
    <Card onPress={() => onPick(value)} label={title} className={on ? "border-practice bg-practice-soft" : ""}>
      <Row><T className="text-xl">{on ? "◉" : "○"}</T><T className="flex-1 font-bold">{title}</T></Row>
      <T variant="small">{help}</T>
    </Card>
  );
}

export default function DeleteAccount() {
  const { t } = useTranslation();
  const { client } = useGuardian();
  const s = useSession();
  const guarded = useStepUp();
  const qc = useQueryClient();
  const kids = useChildren();
  const primary = usePrimaryChildIds();
  const [target, setTarget] = useState<Target | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pickT = (v: Target) => { setTarget(v); setTyped(""); };
  const mine = (kids.data ?? []).filter((c) => primary.data?.has(c.id));

  const del = async () => {
    if (!target) return;
    setBusy(true); setMsg(null);
    try {
      if (target.kind === "child") {
        await guarded(() => callFn(client, "account-delete", { student_id: target.id, confirm: "DELETE" }));
        await s.removeChild(target.id);
        qc.invalidateQueries({ queryKey: ["g-children"] });
        setTarget(null); setTyped(""); setMsg(t("del.childDone"));
      } else {
        await guarded(() => callFn(client, "account-delete", { target: "guardian", confirm: "DELETE" }));
        for (const c of s.children) await s.removeChild(c.id); // forget every child session on this phone
        await s.signOutGuardian();
        router.replace("/");
        return;
      }
    } catch (e) { if ((e as { code?: string }).code !== "reauth_required") setMsg(t(errorKey(e))); }
    setBusy(false);
  };

  return (
    <Screen>
      <GHeader title={t("menu.delete")} />
      <T variant="small">{t("del.intro")}</T>
      {msg ? <Notice tone="teal" text={msg} /> : null}
      {kids.isLoading || primary.isLoading ? <Loading /> : (
        <>
          <T variant="h">{t("del.whichChild")}</T>
          {mine.length === 0 ? <T variant="small">{t("g.none")}</T> : mine.map((c) => (
            <Option key={c.id} selected={target} onPick={pickT} value={{ kind: "child", id: c.id, name: c.nickname }} title={t("del.childTitle", { name: c.nickname })} help={t("del.childHelp", { name: c.nickname })} />
          ))}
          <T variant="h">{t("del.guardianHead")}</T>
          <Option selected={target} onPick={pickT} value={{ kind: "guardian" }} title={t("del.guardianTitle")} help={t("del.guardianHelp", { n: mine.length })} />
        </>
      )}
      {target ? (
        <Card className="border-practice">
          <Notice text={target.kind === "guardian" ? t("del.confirmGuardian") : t("child.delete1", { name: target.name })} />
          <Field label={t("child.delete2")} value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} />
          <View className="flex-row gap-2">
            <Btn className="flex-1" kind="ghost" title={t("common.cancel")} onPress={() => { setTarget(null); setTyped(""); }} />
            <Btn className="flex-1" kind="amber" loading={busy} disabled={typed !== "DELETE"} title={t("child.delete")} onPress={del} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
