#!/bin/sh
# Gera docs/index.html (português) e docs/en/index.html (inglês) a partir de page.html.
# Uso: sh site/build.sh   (ou VERSION=1.4.0 sh site/build.sh)
#
# Para lançar uma versão nova:
#   1. gere o ZIP: git archive --format=zip -o com.ulanzi.cs2c4.ulanziPlugin.zip HEAD com.ulanzi.cs2c4.ulanziPlugin
#   2. crie uma Release no GitHub com esse ZIP anexado (o nome do arquivo precisa ser o mesmo)
#   3. rode este script com VERSION=x.y.z para atualizar o texto do botão
# O botão de download aponta para releases/latest, então sempre baixa a versão mais nova.
exec python3 "$(dirname "$0")/build.py"
