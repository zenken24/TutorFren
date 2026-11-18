import { assert, assertEquals } from "@std/assert";
import { redact } from "./redact.ts";
Deno.test("redacts Bangladeshi phone numbers, emails and long digit runs", () => {
  for (const s of ["01712345678", "+8801712345678", "8801712345678", "017-1234-5678", "+880 1712 345678", "০১৭১২৩৪৫৬৭৮"]) {
    const r = redact(`call me ${s} ok`);
    assert(!/\d{5}/.test(r) && !/[০-৯]{5}/.test(r), r);
    assert(r.includes("[number removed]"), r);
  }
  assertEquals(redact("mail rafi.k+1@example.com.bd now"), "mail [email removed] now");
  assertEquals(redact("my id 123456789012"), "my id [number removed]");
});
Deno.test("keeps ordinary maths untouched", () => {
  for (const s of ["4614 × 365 = 1684110", "৯৮৭৬৫ ÷ ১০০", "exercise 5 question 3", "12.5% of 50000 taka"]) assertEquals(redact(s), s);
});
