#!/usr/bin/env python3
"""Build content/textbook/index.json and pages.en.json.

Inputs
  structure.py            hand-authored chapters / lessons / manual transcriptions
  markers.en.json         numbered marker positions per pdf page (colour-detected by markers.py,
                          numbers read visually from crop sheets; "n": null = false positive)
  page_summaries.tsv      hand-written one-line summary per pdf page
  content/generated/ocr/en/p-XXX.json   Vision OCR observations (ocr.swift)  [gitignored]
  content/generated/ocr/bn/p-XXX.tsv    tesseract `ben` TSV (optional)       [gitignored]

Run:  python3 content/scripts/textbook/build_index.py
"""
import csv, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)
import structure as S  # noqa: E402

OCR_EN = os.path.join(ROOT, "content/generated/ocr/en")
OCR_BN = os.path.join(ROOT, "content/generated/ocr/bn")
OUT = os.path.join(ROOT, "content/textbook")
BN_DIG = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")
BN2EN = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
KIND = {"task": "task", "exercise": "exercise", "letusdo": "let_us_do"}


def printed(pdf):
    return pdf - S.PDF_OFFSET


def chapter_of(pp):
    for n, _, _, a, b in S.CHAPTERS:
        if a <= pp <= b:
            return n
    return None


def lesson_of(ch, pp):
    best = None
    for i, (_, _, a, b, _, _) in enumerate(S.LESSONS[ch]):
        if a <= pp <= b:
            best = i
    if best is None:  # review pages: attach to the nearest earlier lesson
        for i, (_, _, a, b, _, _) in enumerate(S.LESSONS[ch]):
            if b < pp:
                best = i
    return f"c{ch}-l{best + 1}" if best is not None else None


# ---------- OCR loading ----------
def load_en(pdf):
    path = os.path.join(OCR_EN, f"p-{pdf:03d}.json")
    if not os.path.exists(path):
        return []
    obs = json.load(open(path))
    out = []
    for o in obs:
        t = o["t"].strip()
        cy = o["y"] + o["h"] / 2
        if not t or t in ("2026", "Elementary Mathematics") or cy > 0.945 or cy < 0.035:
            continue
        out.append({"x": o["x"], "cy": cy, "t": t})
    return out


def load_bn(pdf):
    path = os.path.join(OCR_BN, f"p-{pdf:03d}.tsv")
    if not os.path.exists(path):
        return None
    W, H = 1305.0, 1710.0
    lines = {}
    with open(path, encoding="utf-8") as f:
        rd = csv.reader(f, delimiter="\t", quoting=csv.QUOTE_NONE)
        next(rd, None)
        for r in rd:
            if len(r) < 12 or r[0] != "5" or not r[11].strip():
                continue
            try:
                if float(r[10]) < 20:
                    continue
            except ValueError:
                continue
            key = (r[2], r[3], r[4])
            l, t, w, h = int(r[6]), int(r[7]), int(r[8]), int(r[9])
            d = lines.setdefault(key, {"x": l / W, "ys": [], "ws": []})
            d["x"] = min(d["x"], l / W)
            d["ys"].append((t + h / 2) / H)
            d["ws"].append(r[11])
    out = []
    for d in lines.values():
        cy = sum(d["ys"]) / len(d["ys"])
        t = " ".join(d["ws"]).strip()
        if cy > 0.945 or cy < 0.035 or t in ("প্রাথমিক গণিত",):
            continue
        out.append({"x": d["x"], "cy": cy, "t": t})
    return out


def join_obs(obs):
    obs = sorted(obs, key=lambda o: (round(o["cy"] / 0.011), o["x"]))
    lines, last = [], None
    for o in obs:
        if last is not None and abs(o["cy"] - last) < 0.009:
            lines[-1] += "  " + o["t"]
        else:
            lines.append(o["t"])
        last = o["cy"]
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def segment(obs, y0, y1, x0=None, x1=None):
    sel = [o for o in obs if y0 - 0.014 <= o["cy"] < y1 - 0.014
           and (x0 is None or o["x"] >= x0 - 0.03) and (x1 is None or o["x"] < x1 - 0.03)]
    return join_obs(sel)


# ---------- sub-item parsing ----------
NUM_RE = re.compile(r"\(\s*(\d{1,2})\s*\)|(?<![\w.÷×+\-])(\d{1,2})\)(?!\s*[÷×+\-=])")
ALPHA_RE = re.compile(r"\(\s*([a-h])\s*\)\.?|(?<![\w])([a-h])\)")
BN_NUM_RE = re.compile(r"\(\s*([০-৯0-9]{1,2})\s*\)")
BN_ALPHA_RE = re.compile(r"\(\s*([কখগঘ])\s*\)|(?<![ঀ-৿])([কখগঘ])\)")
BN_ALPHA = {"ক": "a", "খ": "b", "গ": "c", "ঘ": "d"}


def split_labels(text, rx, norm):
    hits = []
    for m in rx.finditer(text):
        lab = norm(m.group(1) or m.group(2))
        if lab is not None:
            hits.append((m.start(), m.end(), lab))
    return hits


def consecutive(hits, order):
    """keep the first hit of each label; require labels to form order[0..k] with k>=1"""
    seen = {}
    for st, en, lab in hits:
        seen.setdefault(lab, (st, en))
    k = 0
    while k < len(order) and order[k] in seen:
        k += 1
    if k < 2:
        return None
    return {lab: seen[lab] for lab in order[:k]}


def parse_subs(text, bn=False):
    """returns (stem, [(label, text)]) – numeric sub-items preferred, else alphabetic."""
    if not text:
        return text, []
    if bn:
        num = split_labels(text, BN_NUM_RE, lambda s: s.translate(BN2EN).lstrip("0") or None)
        alp = split_labels(text, BN_ALPHA_RE, lambda s: BN_ALPHA.get(s))
    else:
        num = split_labels(text, NUM_RE, lambda s: s.lstrip("0") or None)
        alp = split_labels(text, ALPHA_RE, lambda s: s)
    for hits, order in ((num, [str(i) for i in range(1, 31)]), (alp, list("abcdefgh"))):
        ok = consecutive(hits, order)
        if not ok:
            continue
        cuts = sorted(set(st for st, _, _ in hits))  # every label-like token ends a segment
        first = min(st for st, _ in ok.values())
        subs = []
        for lab in ok:
            st, en = ok[lab]
            nxt = [c for c in cuts if c > st]
            # stop at the next label of the same family (they may be out of order after OCR)
            end = nxt[0] if nxt else len(text)
            subs.append((lab, text[en:end].strip(" .|")))
        # MCQ options: a numeric family wins, and its alpha options stay inside the text
        if hits is num:
            subs = []
            order_pos = sorted((ok[lab][0], ok[lab][1], lab) for lab in ok)
            for i, (st, en, lab) in enumerate(order_pos):
                end = order_pos[i + 1][0] if i + 1 < len(order_pos) else len(text)
                subs.append((lab, text[en:end].strip(" .|")))
            subs.sort(key=lambda s: int(s[0]))
        return text[:first].strip(" .|"), subs
    return text, []


MATH_ONLY = re.compile(r"^[\d\s.,×÷+\-−=()/□]+$")


def bn_from_math(t):
    return t.translate(BN_DIG) if t and MATH_ONLY.match(t) else None


def clean(t):
    t = re.sub(r"^[)\]•|,.\s]+", "", t or "")
    return t.strip()


# ---------- build ----------
def main():
    markers = json.load(open(os.path.join(HERE, "markers.en.json")))
    bn_markers = {}
    p_bn = os.path.join(HERE, "markers.bn.json")
    if os.path.exists(p_bn):
        bn_markers = json.load(open(p_bn))
    # a blue circle the colour detector missed (number 13 on pdf 97); position read from OCR
    if not any(m.get("n") == 13 and m["kind"] == "letusdo" for m in markers["97"]):
        markers["97"].append({"kind": "letusdo", "y": 0.468, "x": 0.1222, "n": 13, "added_manually": True})
        markers["97"].sort(key=lambda m: (m["y"], m["x"]))

    lud_pages = {}
    for ch, sets in S.LET_US_DO.items():
        for si, (pages, sec_en, sec_bn) in enumerate(sets, 1):
            for pp in pages:
                lud_pages[pp] = (ch, si)

    blocks, lud_blocks, warnings = [], {}, []
    have_bn = False
    for pdf in range(S.FIRST_BODY_PDF, S.LAST_BODY_PDF + 1):
        pp = printed(pdf)
        ch = chapter_of(pp)
        ms = [m for m in markers.get(str(pdf), []) if m.get("n") is not None]
        if not ms:
            continue
        en_obs = load_en(pdf)
        bn_obs = load_bn(pdf)
        have_bn = have_bn or bn_obs is not None
        # pair bn marker positions (same kind, nearest y) – fall back to the English position
        bn_avail = [dict(m) for m in bn_markers.get(str(pdf), [])]
        for m in ms:
            cand = [b for b in bn_avail if b["kind"] == m["kind"] and abs(b["y"] - m["y"]) < 0.07 and not b.get("used")]
            if cand:
                b = min(cand, key=lambda b: abs(b["y"] - m["y"]) + abs(b["x"] - m["x"]))
                b["used"] = True
                m["by"], m["bx"] = b["y"], b["x"]
            else:
                m["by"], m["bx"] = m["y"], m["x"]
        per_kind_seen = {}
        for i, m in enumerate(ms):
            def bounds(yk, xk):
                later = [o for o in ms if o[yk] > m[yk] + 0.012]
                y1 = min([o[yk] for o in later], default=0.95)
                same = [o for o in ms if abs(o[yk] - m[yk]) <= 0.012 and o is not m]
                x0 = m[xk] if any(o[xk] < m[xk] for o in same) else None
                right = [o[xk] for o in same if o[xk] > m[xk]]
                return m[yk], y1, x0, (min(right) if right else None)
            y0, y1, x0, x1 = bounds("y", "x")
            raw_en = segment(en_obs, y0, y1, x0, x1)
            raw_en = clean(re.sub(r"^\s*%d\b[\s.)]*" % m["n"], "", raw_en))
            raw_bn = None
            if bn_obs is not None:
                by0, by1, bx0, bx1 = bounds("by", "bx")
                raw_bn = clean(segment(bn_obs, by0, by1, bx0, bx1)) or None
            stem, subs = parse_subs(raw_en)
            bn_stem, bn_subs = parse_subs(raw_bn, bn=True) if raw_bn else (None, [])
            bn_map = dict(bn_subs)
            kind = KIND[m["kind"]]
            sub_items = []
            for lab, t in subs:
                t = clean(t)
                sub_items.append({"label": lab, "text_en": t or None,
                                  "text_bn": bn_from_math(t) or bn_map.get(lab) or None})
            q = {"number": m["n"], "printed_page": pp, "pdf_page": pdf,
                 "text_en": (clean(stem)[:500] or None), "text_bn": (bn_stem[:500] if bn_stem else None),
                 "text_source": "ocr", "text_verified": False, "sub_items": sub_items}
            if kind == "let_us_do":
                if pp not in lud_pages:
                    warnings.append(f"let-us-do marker outside a declared set: pdf {pdf}")
                    continue
                key = lud_pages[pp]
                lud_blocks.setdefault(key, []).append(q)
            else:
                occ = per_kind_seen.get((kind, m["n"]), 0) + 1
                per_kind_seen[(kind, m["n"])] = occ
                bid = f"p{pp}-{'ex' if kind == 'exercise' else 'task'}{m['n']}" + (f"-{chr(96 + occ)}" if occ > 1 else "")
                info = S.MARKER_KINDS[m["kind"]]
                blocks.append({
                    "id": bid, "kind": kind, "number": m["n"], "chapter": ch, "lesson_id": lesson_of(ch, pp),
                    "label_en": f"{info['label_en']} {m['n']}", "label_bn": f"{info['label_bn']} {str(m['n']).translate(BN_DIG)}",
                    "printed_pages": [pp], "pdf_pages": [pdf], "verified": True,
                    "questions": [q],
                })

    # duplicate printed numbers on a page (book typo on printed p.151: two "Exercise 2")
    for b in blocks:
        if b["id"].endswith("-a") or b["id"].endswith("-b"):
            b["note"] = "This number is printed twice on the page in the book."
    for b in blocks:
        twins = [o for o in blocks if o is not b and o["kind"] == b["kind"] and o["number"] == b["number"] and o["printed_pages"] == b["printed_pages"]]
        if twins and "note" not in b:
            b["note"] = "This number is printed twice on the page in the book."

    # let us do sets
    for (ch, si), qs in sorted(lud_blocks.items()):
        pages, sec_en, sec_bn = S.LET_US_DO[ch][si - 1]
        qs.sort(key=lambda q: q["number"])
        nums = [q["number"] for q in qs]
        expected = S.EXPECTED_LUD_COUNTS[ch][si - 1]
        ok = nums == list(range(1, expected + 1))
        if not ok:
            warnings.append(f"let-us-do ch{ch} set{si}: numbers {nums} != 1..{expected}")
        for q in qs:
            man = S.MANUAL.get((ch, si, q["number"]))
            if man:
                q["text_en"] = man["text"]
                q["text_source"] = "manual"
                q["text_verified"] = True
                if "subs" in man:
                    old = {s["label"]: s for s in q["sub_items"]}
                    q["sub_items"] = [{"label": k, "text_en": v, "text_bn": bn_from_math(v) or (old.get(k) or {}).get("text_bn")}
                                      for k, v in man["subs"].items()]
        multi = len(S.LET_US_DO[ch]) > 1
        blocks.append({
            "id": f"c{ch}-lud{si if multi else ''}", "kind": "let_us_do", "number": None, "set_index": si,
            "chapter": ch, "lesson_id": None,
            "label_en": "Let us do" + (f" ({sec_en})" if sec_en else ""),
            "label_bn": "নিজে করি" + (f" ({sec_bn})" if sec_bn else ""),
            "section_en": sec_en, "section_bn": sec_bn,
            "printed_pages": pages, "pdf_pages": [p + S.PDF_OFFSET for p in pages], "verified": ok,
            "questions": qs,
        })

    # let us try (no numbered markers; numbers come from OCR only -> unverified)
    for ch, groups in S.LET_US_TRY.items():
        for gi, pages in enumerate(groups, 1):
            qs = []
            for pp in pages:
                obs = load_en(pp + S.PDF_OFFSET)
                starts = []
                for o in sorted(obs, key=lambda o: o["cy"]):
                    mm = re.match(r"^\(?(\d{1,2})[.)]\s*(.*)", o["t"])
                    if mm and o["x"] < 0.16 and int(mm.group(1)) == (qs[-1]["number"] + 1 if qs else 1) + len(starts):
                        starts.append((o["cy"], int(mm.group(1))))
                for j, (y, n) in enumerate(starts):
                    y1 = starts[j + 1][0] if j + 1 < len(starts) else 0.95
                    t = clean(re.sub(r"^\(?%d[.)]\s*" % n, "", segment(obs, y, y1)))
                    qs.append({"number": n, "printed_page": pp, "pdf_page": pp + S.PDF_OFFSET, "text_en": t or None,
                               "text_bn": None, "text_source": "ocr", "text_verified": False, "sub_items": []})
            multi = len(groups) > 1
            blocks.append({
                "id": f"c{ch}-try{gi if multi else ''}", "kind": "let_us_try", "number": None, "set_index": gi,
                "chapter": ch, "lesson_id": None, "label_en": "Let us try", "label_bn": "দেখি পারি কি না",
                "printed_pages": pages, "pdf_pages": [p + S.PDF_OFFSET for p in pages],
                "verified": False, "note": "Question numbers on these pages have no icon marker; numbering read by OCR only.",
                "questions": qs,
            })

    order = {"let_us_do": 2, "let_us_try": 1}
    blocks.sort(key=lambda b: (b["chapter"], b["printed_pages"][0], order.get(b["kind"], 0), b["pdf_pages"][0], b["id"]))

    chapters = []
    for n, te, tb, a, b in S.CHAPTERS:
        lessons = []
        for i, (le, lb, la, lz, slug, bn_printed) in enumerate(S.LESSONS[n], 1):
            lid = f"c{n}-l{i}"
            lessons.append({
                "id": lid, "number": i, "title_en": le, "title_bn": lb,
                "title_bn_source": "printed_heading" if bn_printed else "derived",
                "concept_id": f"g5m-c{n}-{slug}",
                "printed_pages": [la, lz], "pdf_pages": [la + S.PDF_OFFSET, lz + S.PDF_OFFSET],
                "block_ids": [bl["id"] for bl in blocks if bl.get("lesson_id") == lid],
            })
        chapters.append({
            "number": n, "title_en": te, "title_bn": tb,
            "printed_pages": [a, b], "pdf_pages": [a + S.PDF_OFFSET, b + S.PDF_OFFSET],
            "lessons": lessons,
            "let_us_do_block_ids": [bl["id"] for bl in blocks if bl["chapter"] == n and bl["kind"] == "let_us_do"],
            "let_us_try_block_ids": [bl["id"] for bl in blocks if bl["chapter"] == n and bl["kind"] == "let_us_try"],
            "verified": True,
        })

    index = {
        "schema_version": 1,
        "book": {
            "id": "nctb-g5-math-2026",
            "title_en": "Elementary Mathematics, Class Five", "title_bn": "প্রাথমিক গণিত, পঞ্চম শ্রেণি",
            "publisher": "National Curriculum and Textbook Board (NCTB), Bangladesh",
            "edition": "Experimental Edition, academic year 2026 (first print September 2025)",
            "grade": 5, "subject": "mathematics",
            "languages": {
                "en": {"source_file": "content/sources/math-g5-en-2026.pdf", "pdf_pages": 190, "page_image_prefix": "en/"},
                "bn": {"source_file": "content/sources/math-g5-bn-2026.pdf", "pdf_pages": 190, "page_image_prefix": "bn/"},
            },
            "page_map": {
                "note": "Both language versions share layout and numbering. printed = pdf - 7 for pdf pages 8..189.",
                "ranges": [{"pdf_from": 8, "pdf_to": 189, "printed_from": 1, "printed_to": 182, "offset": -7}],
                "unnumbered": {str(k): v for k, v in S.FRONT_MATTER.items()},
                "verified": True,
            },
            "source_label_en": "NCTB Class 5 Maths", "source_label_bn": "এনসিটিবি পঞ্চম শ্রেণি গণিত",
        },
        "naming": {
            "note": "The book has NO 'Exercise 5.3'-style numbering. It uses four icon-marked item types. "
                    "Task/Exercise numbers restart in every sub-section, so they are only unique together with a page (or lesson).",
            "kinds": {
                "let_us_do": {"label_en": "Let us do", "label_bn": "নিজে করি", "icon": "blue circle with number",
                              "scope": "question numbers 1..n per set; one set at the end of each chapter (three in chapter 8)"},
                "exercise": {"label_en": "Exercise", "label_bn": "অনুশীলন", "icon": "orange square with number",
                             "scope": "inline practice; number restarts per sub-section; sub-items (1),(2).. or (a),(b).."},
                "task": {"label_en": "Task", "label_bn": "কাজ", "icon": "green triangle with number",
                         "scope": "guided class activity; number restarts per sub-section"},
                "let_us_try": {"label_en": "Let us try", "label_bn": "দেখি পারি কি না", "icon": "yellow heading, plain numbers",
                               "scope": "self-check page before each 'Let us do'"},
            },
        },
        "chapters": chapters,
        "blocks": blocks,
    }
    os.makedirs(OUT, exist_ok=True)
    json.dump(index, open(os.path.join(OUT, "index.json"), "w"), ensure_ascii=False, indent=1)

    # ---------- pages.en.json ----------
    summ = {}
    p_sum = os.path.join(HERE, "page_summaries.tsv")
    if os.path.exists(p_sum):
        for line in open(p_sum, encoding="utf-8"):
            parts = line.rstrip("\n").split("\t")
            if len(parts) >= 2 and parts[0].isdigit():
                summ[int(parts[0])] = parts[1:]
    lud_pp = set(lud_pages)
    try_pp = {pp for g in S.LET_US_TRY.values() for pages in g for pp in pages}
    pages = []
    for pdf in range(1, 191):
        pp = printed(pdf) if S.FIRST_BODY_PDF <= pdf <= S.LAST_BODY_PDF else None
        ch = chapter_of(pp) if pp else None
        s = summ.get(pdf, [])
        kind = "front_matter" if pp is None else "let_us_do" if pp in lud_pp else "let_us_try" if pp in try_pp else "lesson"
        lid = lesson_of(ch, pp) if (ch and kind == "lesson") else None
        concept = None
        if lid:
            concept = next(l["concept_id"] for c in chapters if c["number"] == ch for l in c["lessons"] if l["id"] == lid)
        pages.append({
            "pdf_page": pdf, "printed_page": pp, "chapter": ch, "lesson_id": lid, "concept_id": concept, "kind": kind,
            "summary": s[0] if s else (S.FRONT_MATTER.get(pdf) or None),
            "worked_example": (s[1] if len(s) > 1 and s[1] else None),
            "summary_verified": bool(s),
            "block_ids": [b["id"] for b in blocks if pdf in b["pdf_pages"]],
            "text_ocr": join_obs(load_en(pdf)) if pp else None,
            "text_ocr_verified": False,
        })
    json.dump({"schema_version": 1, "book_id": "nctb-g5-math-2026", "language": "en",
               "note": "summary/worked_example are hand-written from reading each page; text_ocr is raw machine OCR (unverified; fractions and vertical sums are often garbled).",
               "pages": pages}, open(os.path.join(OUT, "pages.en.json"), "w"), ensure_ascii=False, indent=1)

    # ---------- stats ----------
    nq = sum(len(b["questions"]) for b in blocks)
    ns = sum(len(q["sub_items"]) for b in blocks for q in b["questions"])
    kinds = {}
    for b in blocks:
        kinds[b["kind"]] = kinds.get(b["kind"], 0) + 1
    print("blocks", len(blocks), kinds, "questions", nq, "sub_items", ns, "bn_ocr", have_bn)
    print("with en text:", sum(1 for b in blocks for q in b["questions"] if q["text_en"]),
          "with bn text:", sum(1 for b in blocks for q in b["questions"] if q["text_bn"]),
          "verified text:", sum(1 for b in blocks for q in b["questions"] if q["text_verified"]))
    print("pages with summary:", sum(1 for p in pages if p["summary_verified"]))
    for w in warnings:
        print("WARN", w)


if __name__ == "__main__":
    main()
