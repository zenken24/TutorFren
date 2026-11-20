// Launch screen. Not signed in and no child on this phone: Log in / Create account (plus pairing code for a
// child's own phone). After guardian login, or when children are set up here: "Who's using TutorFren?".
// The last child is never opened automatically.
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSession } from "../lib/session";
import { checkChildPin, hasChildPin } from "../lib/lock";
import { Icon } from "../components/Icon";
import { Btn, Card, Field, LangToggle, Loading, Notice, Row, Screen, T } from "../components/ui";

export default function Who() {
  const { t } = useTranslation();
  const s = useSession();
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  if (!s.ready) return <Screen><Loading /></Screen>;

  const open = async (id: string) => {
    setMsg(null);
    if (!(await s.selectChild(id))) { setMsg(t("who.reenrol")); return; }
    router.replace("/(student)");
  };
  const tap = async (id: string) => { if (await hasChildPin(id)) { setPinFor(id); setPin(""); } else open(id); };
  const submitPin = async () => { if (pinFor && (await checkChildPin(pinFor, pin))) { const id = pinFor; setPinFor(null); open(id); } else setMsg(t("who.pinWrong")); };
  const fresh = s.children.length === 0 && !s.guardianSignedIn;

  return (
    <Screen>
      <Row className="justify-between"><T variant="title" className="text-primary-dark">{t("app.name")}</T><LangToggle /></Row>
      {fresh ? (
        <View className="gap-3 pt-10">
          <T variant="h" className="text-center">{t("welcome.tag")}</T>
          <View className="h-4" />
          <Btn title={t("auth.signinBtn")} onPress={() => router.push("/(auth)/sign-in")} />
          <Btn kind="soft" title={t("auth.signupBtn")} onPress={() => router.push("/(auth)/sign-up")} />
          <View className="h-2" />
          <Btn kind="ghost" title={t("welcome.pair")} onPress={() => router.push("/(auth)/pair")} />
        </View>
      ) : (
        <>
          <T variant="title">{t("who.title")}</T>
          {msg ? <Notice text={msg} /> : null}
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {s.children.map((c) => (
              <Pressable key={c.id} onPress={() => tap(c.id)} accessibilityRole="button" accessibilityLabel={c.nickname} className="w-[48%] aspect-square bg-primary-soft rounded-card items-center justify-center gap-2 p-2 active:opacity-80">
                <View className="w-16 h-16 rounded-full bg-primary items-center justify-center"><T className="text-white text-2xl font-bold">{c.nickname.slice(0, 1).toUpperCase()}</T></View>
                <T variant="h" className="text-center px-2" numberOfLines={2}>{c.nickname}</T>
              </Pressable>
            ))}
            <Pressable onPress={() => router.push(s.guardianSignedIn ? "/(guardian)" : "/(auth)/sign-in")} accessibilityRole="button" accessibilityLabel={t("who.guardian")} className="w-[48%] aspect-square bg-surface border border-surface-line rounded-card items-center justify-center gap-2 p-2 active:opacity-80">
              <Icon name="lock" size={34} color="#024560" /><T variant="h">{t("who.guardian")}</T>
            </Pressable>
          </View>
          {pinFor ? (
            <Card>
              <Field label={t("who.pin")} value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry maxLength={4} autoFocus onSubmitEditing={submitPin} />
              <Row><Btn className="flex-1" kind="ghost" title={t("common.cancel")} onPress={() => setPinFor(null)} /><Btn className="flex-1" title={t("common.continue")} onPress={submitPin} /></Row>
            </Card>
          ) : null}
          {s.children.length === 0 ? <T variant="small">{t("who.empty")}</T> : null}
        </>
      )}
    </Screen>
  );
}
