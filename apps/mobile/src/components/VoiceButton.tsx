// Mic button. Rendered ONLY when the student's voice_input consent is active (server also enforces it).
// Records to the private cache (max 60 s), uploads once, deletes the file in finally{}, and hands the
// TRANSCRIPT to the caller to show in an editable field. Only text is ever submitted.
import React, { useEffect, useRef, useState } from "react";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useStudent } from "../lib/session";
import { MAX_RECORDING_SECONDS } from "../lib/voice";
import { removeFile, transcribeRecording } from "../lib/voiceDevice";
import { currentLang } from "../i18n";
import { Btn, T } from "./ui";

export function useVoiceConsent() {
  const { client, child } = useStudent();
  return useQuery({
    queryKey: ["voice-consent", child.id], staleTime: 30_000,
    queryFn: async () => ((await client.from("consents").select("id").eq("scope", "voice_input").is("revoked_at", null).limit(1)).data ?? []).length > 0,
  });
}
export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const { t } = useTranslation();
  const { client } = useStudent();
  const consent = useVoiceConsent();
  // HIGH_QUALITY = AAC in an .m4a file on Android and iOS (LOW_QUALITY is AMR/3GP on Android, which Gemini cannot read)
  const rec = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, sampleRate: 16000, numberOfChannels: 1, bitRate: 32000 });
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (rec.uri) removeFile(rec.uri); }, [rec]);
  if (!consent.data) return null; // no consent -> no mic at all

  const stop = async () => {
    if (timer.current) clearTimeout(timer.current);
    setState("working");
    let uri: string | null = null;
    try {
      await rec.stop();
      uri = rec.uri;
      if (!uri) throw new Error("no_file");
      const text = await transcribeRecording(client, uri, currentLang()); // deletes the file in finally{}
      uri = null;
      if (text.trim()) onTranscript(text.trim()); else setMsg(t("voice.failed"));
    } catch {
      setMsg(t("voice.failed"));
    } finally {
      if (uri) removeFile(uri);
      setState("idle");
    }
  };
  const start = async () => {
    setMsg(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) { setMsg(t("voice.permission")); return; }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await rec.prepareToRecordAsync();
      rec.record();
      setState("recording");
      timer.current = setTimeout(stop, MAX_RECORDING_SECONDS * 1000); // hard stop at 60 s
    } catch { setMsg(t("voice.failed")); setState("idle"); }
  };
  return (
    <>
      <Btn kind={state === "recording" ? "amber" : "soft"} loading={state === "working"} icon={state === "recording" ? "stop" : "mic"} title={t(state === "recording" ? "voice.stop" : "voice.start")} onPress={state === "recording" ? stop : start} />
      {state === "working" ? <T variant="small">{t("voice.working")}</T> : msg ? <T variant="small" className="text-practice-text">{msg}</T> : null}
    </>
  );
}
