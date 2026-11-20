import fs from "fs";
import path from "path";
import bn from "../i18n/bn.json";
import en from "../i18n/en.json";
import { scrubEvent } from "../lib/scrub";

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
const src = path.join(__dirname, "..");
const read = (f: string) => fs.readFileSync(f, "utf8");

describe("client separation (shared phone)", () => {
  const student = walk(path.join(src, "app", "(student)"));
  const studentComponents = ["PageCard.tsx", "Practice.tsx", "VoiceButton.tsx"].map((f) => path.join(src, "components", f));
  it("student screens never touch the guardian client", () => {
    for (const f of [...student, ...studentComponents, path.join(src, "lib", "hooks.ts")]) {
      expect(read(f)).not.toMatch(/useGuardian\b|_guardian\b|GuardianGate|useStepUp/);
    }
    expect(student.length).toBeGreaterThanOrEqual(8);
  });
  it("guardian screens never touch a student client or learning tables", () => {
    for (const f of walk(path.join(src, "app", "(guardian)"))) {
      const s = read(f);
      expect(s).not.toMatch(/useStudent\b|_student\b/);
      expect(s).not.toMatch(/from\("(attempts|explanations|concept_mastery|session_events)"\)/);
    }
  });
  it("switching user clears the query cache and locks guardian mode", () => {
    const s = read(path.join(src, "lib", "session.tsx"));
    expect(s).toMatch(/async selectChild\(id[^)]*\) \{\s*setUnlocked\(false\);[^\n]*\s*qc\.clear\(\)/);
    expect(s).toMatch(/switchUser\(\) \{ qc\.clear\(\); setActive\(null\); setUnlocked\(false\); \}/);
  });
});
describe("no secrets or insecure storage in the app", () => {
  const files = walk(src).filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__"));
  it("uses SecureStore only; no service keys", () => {
    for (const f of files) {
      const s = read(f);
      expect(s).not.toMatch(new RegExp(["Async" + "Storage", "service" + "_role", "SERVICE" + "_ROLE", "GEMINI" + "_API_KEY", "@google/" + "genai"].join("|")));
    }
  });
});
describe("i18n", () => {
  it("bn and en have the same keys and no empty strings", () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
    for (const v of [...Object.values(bn), ...Object.values(en)]) expect(String(v).length).toBeGreaterThan(0);
  });
  it("every t('key') used in the app exists", () => {
    const keys = new Set(Object.keys(en));
    const used = new Set<string>();
    for (const f of walk(src).filter((f) => /\.tsx?$/.test(f) && !f.includes("__tests__"))) for (const m of read(f).matchAll(/\bt\(\s*"([a-zA-Z_.]+)"/g)) used.add(m[1]);
    const missing = [...used].filter((k) => !keys.has(k));
    expect(missing).toEqual([]);
    expect(used.size).toBeGreaterThan(100);
  });
});
describe("crash-report scrubber", () => {
  it("removes text-like fields and breadcrumbs", () => {
    const out = scrubEvent({ extra: { transcript: "canary-tiger-42", message: "hi", email: "a@b.c", phone: "01712345678", ok: 1 }, breadcrumbs: [{ message: "x" }] }) as Record<string, any>;
    expect(JSON.stringify(out)).not.toMatch(/canary|01712345678|a@b\.c/);
    expect(out.extra.ok).toBe(1);
    expect(out.breadcrumbs).toBeUndefined();
  });
  it("drops any event carrying audio", () => {
    expect(scrubEvent({ extra: { audio_base64: "AAAA" } })).toBeNull();
    expect(scrubEvent({ contexts: { recording: { uri: "x" } } })).toBeNull();
  });
});
