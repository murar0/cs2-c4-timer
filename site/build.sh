#!/bin/sh
# Gera o index.html do GitHub Pages e a prévia a partir de page.html
REPO="${REPO:-murar0/cs2-c4-timer}"
VERSION="${VERSION:-1.3.1}"
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

# Para lançar uma versão nova:
#   1. gere o ZIP: git archive --format=zip -o com.ulanzi.cs2c4.ulanziPlugin.zip HEAD com.ulanzi.cs2c4.ulanziPlugin
#   2. crie uma Release no GitHub com esse ZIP anexado (o nome do arquivo precisa ser o mesmo)
#   3. rode este script com VERSION=x.y.z para atualizar o texto do botão
# O botão de download aponta para releases/latest e o contador soma os downloads de todas as versões.
