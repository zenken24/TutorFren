"""Detect the three numbered marker shapes on each page and attach nearest OCR line.
green triangle = task/key question, orange square = exercise, blue circle = 'Let us do' question."""
import sys, json, numpy
from PIL import Image
from scipy import ndimage
COL = {"task": (180,217,139), "exercise": None, "letusdo": (129,177,223)}
def detect(path, cols):
    im = numpy.array(Image.open(path).convert("RGB")).astype(int)
    H, W, _ = im.shape
    out = []
    for kind, c in cols.items():
        m = (abs(im - numpy.array(c)).sum(axis=2) < 40)
        lab, n = ndimage.label(m)
        for i, sl in enumerate(ndimage.find_objects(lab)):
            h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
            area = int((lab[sl] == i+1).sum())
            if 30 <= h <= 75 and 30 <= w <= 75 and area > 0.35*h*w:
                out.append({"kind": kind, "y": round((sl[0].start+h/2)/H,4), "x": round((sl[1].start+w/2)/W,4), "w": w, "h": h, "fill": round(area/(h*w),2)})
    return sorted(out, key=lambda o: (o["y"], o["x"]))
if __name__ == "__main__":
    lang = sys.argv[1]; cols = json.loads(sys.argv[2]); cols = {k: tuple(v) for k, v in cols.items()}
    res = {}
    for p in range(1, 191):
        res[p] = detect(f"{lang}200/p-{p:03d}.png", cols)
    json.dump(res, open(f"markers_{lang}.json", "w"))
    from collections import Counter
    print(Counter(m["kind"] for v in res.values() for m in v))
