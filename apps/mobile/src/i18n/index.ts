// Bangla is the default. Switching takes effect immediately everywhere (react-i18next re-renders).
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as SecureStore from "expo-secure-store";
import bn from "./bn.json";
import en from "./en.json";

export type Lang = "bn" | "en";
i18n.use(initReactI18next).init({
  resources: { bn: { translation: bn }, en: { translation: en } },
  lng: "bn", fallbackLng: "en", keySeparator: false, nsSeparator: false, interpolation: { escapeValue: false },
});
SecureStore.getItemAsync("tf.lang").then((l) => { if (l === "en" || l === "bn") i18n.changeLanguage(l); }).catch(() => {});
export function setLanguage(l: Lang) { i18n.changeLanguage(l); SecureStore.setItemAsync("tf.lang", l).catch(() => {}); }
export const currentLang = (): Lang => (i18n.language === "en" ? "en" : "bn");
const BN = "০১২৩৪৫৬৭৮৯";
/** digits in the current language */
export const num = (n: number | string, l: Lang = currentLang()) => (l === "bn" ? String(n).replace(/\d/g, (d) => BN[Number(d)]) : String(n));
export default i18n;
