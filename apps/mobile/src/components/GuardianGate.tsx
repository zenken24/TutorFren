// Guardian-mode gate + auto-lock + server step-up.
//  * Gate: biometric / device credential or guardian PIN. 5 failures -> full sign-in required.
//  * Auto-lock: after 2 minutes without a touch, when the app goes to the background, and when a child tile is chosen.
//  * Step-up: when the server answers 401 reauth_required, ask for the password and retry. The local
//    unlock alone is never enough for consent changes, delete, export, or a new pairing code.
//  * Screens are hidden from screenshots / the app switcher.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState, Modal, View } from "react-native";
import { router } from "expo-router";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useTranslation } from "react-i18next";
import { useSession } from "../lib/session";
import { AUTO_LOCK_MS, deviceLockAvailable, fails, hasGuardianPin, MAX_FAILS, setGuardianPin, unlockWithDevice, unlockWithPin } from "../lib/lock";
import { Btn, Card, Field, Notice, PasswordField, Screen, T } from "./ui";
import { Icon } from "./Icon";
import { GoogleButton, OrLine } from "./GoogleButton";

type Guarded = <T>(fn: () => Promise<T>) => Promise<T>;
const StepUpContext = createContext<Guarded>((fn) => fn());
export const useStepUp = () => useContext(StepUpContext);

export function GuardianGate({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const s = useSession();
  usePreventScreenCapture("guardian");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [hasPin, setHasPin] = useState(false);
  const [hasDevice, setHasDevice] = useState(false);
  const last = useRef(0);
  const [reauth, setReauth] = useState<{ resolve: (ok: boolean) => void } | null>(null);
  const [pw, setPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => { hasGuardianPin().then(setHasPin); deviceLockAvailable().then(setHasDevice); }, [s.guardianUnlocked]);
  useEffect(() => { if (s.ready && !s.guardianSignedIn) router.replace("/(auth)/sign-in"); }, [s.ready, s.guardianSignedIn]);
  // auto-lock: idle + background
  useEffect(() => {
    if (!s.guardianUnlocked) return;
    last.current = Date.now();
    const iv = setInterval(() => { if (Date.now() - last.current > AUTO_LOCK_MS) s.setGuardianUnlocked(false); }, 5000);
    const sub = AppState.addEventListener("change", (st) => { if (st !== "active") s.setGuardianUnlocked(false); });
    return () => { clearInterval(iv); sub.remove(); };
  }, [s, s.guardianUnlocked]);

  const afterFail = async () => {
    if ((await fails()) >= MAX_FAILS) { await s.signOutGuardian(); router.replace("/(auth)/sign-in"); } else setMsg(t("lock.wrong"));
  };
  const tryDevice = async () => { setMsg(null); if (await unlockWithDevice(t("lock.prompt"))) s.setGuardianUnlocked(true); else if ((await fails()) > 0) await afterFail(); };
  const tryPin = async () => { setMsg(null); const ok = await unlockWithPin(pin); setPin(""); if (ok) s.setGuardianUnlocked(true); else await afterFail(); };
  const createPin = async () => { await setGuardianPin(pin); setPin(""); setHasPin(true); s.setGuardianUnlocked(true); };

  const guarded = useCallback<Guarded>(async (fn) => {
    try { return await fn(); } catch (e) {
      if ((e as { code?: string }).code !== "reauth_required") throw e;
      const ok = await new Promise<boolean>((resolve) => setReauth({ resolve }));
      if (!ok) throw e;
      return fn();
    }
  }, []);
  const confirmPw = async () => {
    setPwBusy(true);
    const email = (await s._guardian.auth.getUser()).data.user?.email ?? "";
    const { error } = await s._guardian.auth.signInWithPassword({ email, password: pw });
    setPwBusy(false); setPw("");
    if (error) { setMsg(t("auth.failed")); return; }
    setMsg(null); reauth?.resolve(true); setReauth(null);
  };

  if (!s.ready || !s.guardianSignedIn) return null;
  if (!s.guardianUnlocked) {
    const configured = hasPin || hasDevice;
    return (
      <Screen>
        <Icon name="lock" size={36} color="#024560" />
        <T variant="title">{t(configured ? "lock.title" : "lock.setup")}</T>
        {!configured ? <T variant="small">{t("lock.setupHelp")}</T> : null}
        {msg ? <Notice text={msg} /> : null}
        {hasDevice ? <Btn title={t(configured ? "lock.unlock" : "lock.useDevice")} onPress={tryDevice} /> : null}
        {hasPin || !hasDevice ? (
          <Card>
            <Field label={t("lock.pin")} value={pin} onChangeText={(v) => setPin(v.replace(/[^0-9]/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry maxLength={6} />
            <Btn kind="soft" title={t(hasPin ? "lock.unlock" : "lock.setPin")} disabled={pin.length !== 6} onPress={hasPin ? tryPin : createPin} />
          </Card>
        ) : null}
        <Btn kind="ghost" title={t("common.back")} onPress={() => router.replace("/")} />
      </Screen>
    );
  }
  return (
    <StepUpContext.Provider value={guarded}>
      <View style={{ flex: 1 }} onStartShouldSetResponderCapture={() => { last.current = Date.now(); return false; }}>{children}</View>
      <Modal visible={!!reauth} transparent animationType="fade" onRequestClose={() => { reauth?.resolve(false); setReauth(null); }}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="bg-surface-page p-4 pb-10 rounded-t-3xl gap-3">
            <T variant="h">{t("auth.reauthTitle")}</T>
            <T variant="small">{t("auth.reauth")}</T>
            {msg ? <Notice text={msg} /> : null}
            <GoogleButton client={s._guardian} onDone={() => { setMsg(null); reauth?.resolve(true); setReauth(null); }} onMessage={setMsg} />
            <OrLine />
            <PasswordField label={t("auth.passwordPlain")} value={pw} onChangeText={setPw} onSubmitEditing={confirmPw} />
            <Btn title={t("common.continue")} onPress={confirmPw} loading={pwBusy} disabled={!pw} />
            <Btn kind="ghost" title={t("common.cancel")} onPress={() => { reauth?.resolve(false); setReauth(null); }} />
          </View>
        </View>
      </Modal>
    </StepUpContext.Provider>
  );
}
