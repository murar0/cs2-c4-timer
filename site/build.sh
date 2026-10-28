#!/bin/sh
# Gera o index.html do GitHub Pages e a prévia a partir de page.html
REPO="${REPO:-murar0/cs2-c4-timer}"
VERSION="${VERSION:-1.3.0}"
cd "$(dirname "$0")"
OUT=../docs
sed -e "s#{{REPO}}#$REPO#g" -e "s#{{VERSION}}#$VERSION#g" page.html > "$OUT/preview.tmp"
{
  printf '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  sed -n '1,/<\/style>/p' "$OUT/preview.tmp"
  printf '</head>\n<body>\n'
  sed '1,/<\/style>/d' "$OUT/preview.tmp"
  printf '</body>\n</html>\n'
} > "$OUT/index.html"
rm -f "$OUT/preview.tmp"
