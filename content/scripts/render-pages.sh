#!/usr/bin/env bash
# Renders both textbooks to WebP at 140 dpi into content/generated/pages/{bn,en}/pNNN.webp
set -euo pipefail
cd "$(dirname "$0")/../.."
DPI="${DPI:-140}"
for lang in bn en; do
  src="content/sources/math-g5-$lang-2026.pdf"
  out="content/generated/pages/$lang"
  tmp="content/generated/tmp-$lang"
  [ -f "$src" ] || { echo "missing $src"; exit 1; }
  mkdir -p "$out" "$tmp"
  pdftoppm -r "$DPI" -png "$src" "$tmp/p"
  for f in "$tmp"/p-*.png; do
    n=$(basename "$f" .png | sed 's/^p-//')
    cwebp -quiet -q 80 "$f" -o "$out/p$n.webp"
  done
  rm -rf "$tmp"
  echo "$lang: $(ls "$out" | wc -l | tr -d ' ') pages"
done
