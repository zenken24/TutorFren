// What happens after any successful guardian sign-in (password or Google).
import { router } from "expo-router";
import { resetLock } from "./lock";
import { useSession } from "./session";

export function useFinishGuardianSignIn() {
  const s = useSession();
  return async () => {
    await resetLock();
    await s.refreshGuardian();
    s.setGuardianUnlocked(true); // a fresh sign-in counts as unlocking
    router.replace("/(guardian)");
  };
}
