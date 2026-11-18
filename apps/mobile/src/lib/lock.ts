// Guardian-mode lock on this phone: device biometric / screen lock, or a 6-digit guardian PIN.
// This is a LOCAL convenience lock. Risky actions are also re-checked on the server (step-up).
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const PIN_KEY = "tf.guardian.pin", FAIL_KEY = "tf.guardian.fails";
export const MAX_FAILS = 5;
export const AUTO_LOCK_MS = 2 * 60 * 1000;

export async function hashPin(pin: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}
export async function setGuardianPin(pin: string) {
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(PIN_KEY, `${salt}:${await hashPin(pin, salt)}`);
}
export const hasGuardianPin = async () => !!(await SecureStore.getItemAsync(PIN_KEY));
export async function deviceLockAvailable() {
  return (await LocalAuthentication.hasHardwareAsync().catch(() => false)) && (await LocalAuthentication.isEnrolledAsync().catch(() => false));
}
export const lockConfigured = async () => (await hasGuardianPin()) || (await deviceLockAvailable());
export async function fails() { return Number(await SecureStore.getItemAsync(FAIL_KEY)) || 0; }
async function recordResult(ok: boolean) {
  if (ok) await SecureStore.deleteItemAsync(FAIL_KEY); else await SecureStore.setItemAsync(FAIL_KEY, String((await fails()) + 1));
  return ok;
}
export async function unlockWithDevice(prompt: string) {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, disableDeviceFallback: false });
  if (!r.success && (r.error === "user_cancel" || r.error === "system_cancel" || r.error === "app_cancel")) return false; // not a failed attempt
  return recordResult(r.success);
}
export async function unlockWithPin(pin: string) {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  return recordResult((await hashPin(pin, salt)) === hash);
}
export async function resetLock() { await SecureStore.deleteItemAsync(FAIL_KEY); }
/** optional per-child 4-digit PIN (sibling privacy on a shared phone) */
export async function setChildPin(id: string, pin: string | null) {
  if (!pin) return SecureStore.deleteItemAsync(`tf.childpin.${id}`);
  const salt = Crypto.randomUUID();
  await SecureStore.setItemAsync(`tf.childpin.${id}`, `${salt}:${await hashPin(pin, salt)}`);
}
export const hasChildPin = async (id: string) => !!(await SecureStore.getItemAsync(`tf.childpin.${id}`));
export async function checkChildPin(id: string, pin: string) {
  const stored = await SecureStore.getItemAsync(`tf.childpin.${id}`);
  if (!stored) return true;
  const [salt, hash] = stored.split(":");
  return (await hashPin(pin, salt)) === hash;
}
