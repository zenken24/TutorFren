// Masks contact details in student free text before it goes to any LLM (CLAUDE.md rule 7).
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const BN = "০১২৩৪৫৬৭৮৯";
export function redact(input: string): string {
  // work on a copy with Bangla digits mapped to ASCII so ০১৭… numbers are caught too
  const ascii = input.replace(/[০-৯]/g, (d) => String(BN.indexOf(d)));
  let out = "";
  let last = 0;
  // BD mobiles (+8801XXXXXXXXX / 8801… / 01XXXXXXXXX, with spaces or dashes) and any run of 9+ digits
  const re = /(?:\+?88[\s-]?)?01[\s-]?[3-9](?:[\s-]?\d){8}|\+?\d(?:[\s-]?\d){8,}/g;
  for (const m of ascii.matchAll(re)) {
    out += input.slice(last, m.index) + "[number removed]";
    last = m.index! + m[0].length;
  }
  out += input.slice(last);
  return out.replace(EMAIL, "[email removed]");
}
