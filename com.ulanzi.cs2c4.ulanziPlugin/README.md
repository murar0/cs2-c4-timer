# CS2 C4 Timer para Ulanzi D200

Plugin do Ulanzi Studio que mostra, em uma tecla (ou em duas teclas formando uma tela larga), quanto tempo falta para a C4 explodir no Counter-Strike 2, mudando de cor quando não dá mais tempo de defusar.

Criado por Felipe Muraro: [@mur4r0 no TikTok](https://www.tiktok.com/@mur4r0). Página do projeto: [murar0.github.io/cs2-c4-timer](https://murar0.github.io/cs2-c4-timer/).

## O que aparece na tela

Tudo é pixel art 8-bit, com números grandes e contornados para dar para ler de relance.

| Cor | Quando | Aviso |
| --- | --- | --- |
| Verde | Faltam 10s ou mais | DÁ SEM KIT |
| Amarelo | Entre 10s e 5s | SÓ COM KIT (ou USE SEU KIT, se você é CT e tem kit) |
| Vermelho | Menos de 5s | SEM TEMPO |

A barra embaixo marca os limites de 10s (sem kit) e 5s (com kit). Na tecla larga ela atravessa as duas teclas.

Quando acaba, a tecla toca uma animação: explosão com clarão, tremida, estilhaços e "BOOM!", ou o corte do fio com um check grande e confete quando a bomba é defusada.

A "Margem" (padrão 0.3s) antecipa as trocas de cor para compensar seu tempo de reação e o atraso da rede.

### Por que não pisca

Cada imagem que chega ao D200 faz a tecla piscar enquanto ele redesenha. Por isso o plugin manda a contagem inteira de uma vez, como uma animação GIF, no momento do plant, e o próprio deck anima sozinho. Um GIF novo só é enviado quando algo muda de verdade: o jogo corrige o tempo ou a rodada acaba.

De propósito, o plugin não mostra se alguém está defusando. Para o TR isso seria informação que o jogo esconde (o jogo mental de se expor para cortar o defuse), então fica de fora.

A "Precisão" escolhe se o número mostra segundos inteiros, meio segundo ou 0,2s abaixo de 10s. Como tudo vai na mesma animação, isso não aumenta as piscadas, só o tamanho do arquivo.

## Tela do seu lado (antes do plant)

O plugin detecta se você é TR ou CT pelos dados do próprio jogo. Antes da C4 ser plantada, a tecla mostra uma animação 8-bit do seu lado: um TR de balaclava segurando a C4 no deserto, ou um CT de capacete numa noite estrelada. Na tecla larga, o boneco fica na esquerda e o recado do lado ("PLANTE A C4" ou "SEGURE O BOMB") na direita. Quando você morre e passa a assistir outro jogador, a tela continua mostrando o seu lado.

A cada 4 a 6 minutos uma estrela cadente atravessa o céu das telas de espera, só para a tecla não ficar parada.

No painel da tecla:

* **Tela do lado: Sempre TR/CT** mostra a arte sem abrir o jogo.
* **Ver estrela cadente** faz a estrela passar na hora.
* **Simular plant (40s)**, ou apertar a própria tecla, roda uma contagem de teste. A explosão da simulação tem um final surpresa.

## Instalação

1. Feche o Ulanzi Studio (inclusive o ícone perto do relógio do Windows).
2. Extraia o ZIP e copie a pasta `com.ulanzi.cs2c4.ulanziPlugin` para `%APPDATA%\Ulanzi\UlanziDeck\Plugins`. Dentro da pasta copiada precisa aparecer o `manifest.json`.
3. Abra o Ulanzi Studio. Vai aparecer a categoria "CS2 C4 Timer" com a ação "Timer da C4".
4. Arraste a ação para uma tecla (ou para duas teclas vizinhas, para a tecla larga).
5. Clique na tecla para abrir o painel e aperte **Instalar no CS2**. O plugin procura a pasta do jogo na Steam e grava o arquivo de integração.
   Se ele não achar, aperte **Ver arquivo .cfg**, copie o texto e salve como `gamestate_integration_ulanzi_c4.cfg` em:
   `...\steamapps\common\Counter-Strike Global Offensive\game\csgo\cfg`
6. Reinicie o CS2. O painel deve mostrar "CS2: conectado".

Para atualizar de versão, feche o Ulanzi Studio, troque a pasta e abra de novo. O plugin reaproveita a integração que já está no CS2, então não precisa reinstalar.

## Tela larga

Coloque a ação em duas teclas lado a lado na mesma linha, com o layout em "Automático" (o padrão). O plugin junta as duas sozinho: o número fica na esquerda e o aviso na direita, sempre no mesmo instante. Se por algum motivo elas não se juntarem, use "metade esquerda" e "metade direita" manualmente.

A janela comprida do canto inferior direito não aceita plugins: o Ulanzi Studio só deixa escolher relógio, uso do PC ou uma imagem de fundo. Para combinar com o resto, use `assets/janela-456x196.png` como imagem de fundo dela (selecione a janela > Imagem de fundo).

## Precisão do tempo

O CS2 manda os dados pela Game State Integration oficial da Valve. O plugin usa a melhor fonte disponível:

1. `phase_countdowns` com fase "bomb": tempo exato informado pelo jogo.
2. `bomb.countdown`: tempo exato, enviado quando você está morto, espectando ou no GOTV.
3. `round.bomb = planted`: o jogo só avisa que plantou, e o plugin conta 40s a partir do aviso.

O plugin ignora dados repetidos ou atrasados e nunca adia a explosão, só antecipa. Se no seu jogo só a fonte 3 chegar e o tempo parecer atrasado, abra `logs/c4-debug.log`: a linha "C4 plantada detectada via ..." diz qual fonte foi usada. Nesse caso, aumente o campo **Correção** no painel.

Fake plant não engana: a contagem só começa quando o jogo confirma que a bomba foi plantada.

## Configuração avançada

`config.json` na raiz do plugin:

* `gsiPort`: porta local onde o CS2 manda os dados (padrão 30731).
* `gsiToken`: senha que o CS2 envia junto. É criada sozinha na primeira vez que o plugin roda.
* `debugLog`: grava `logs/c4-debug.log`.

Se mudar a porta ou o token, aperte "Instalar no CS2" de novo e reinicie o jogo.

## Regras e VAC

A Game State Integration é um recurso oficial da Valve: o próprio jogo envia os dados, sem leitura de memória, sem injeção e sem mexer em arquivos do jogo.

O plugin não dá vantagem que os outros não tenham, como ver através de paredes ou mira assistida. O CS2 não tem um timer oficial na tela, mas a comunidade inteira sabe que a C4 dura 40 segundos e que a música acelerando marca o limite entre defusar sem kit e só com kit. O timer transforma esse conhecimento numa cor, para decidir mais rápido se defusa ou corre.

Ainda assim, plataformas e campeonatos (Gamers Club, FACEIT, torneios presenciais) têm regras próprias e podem proibir qualquer programa externo ou cronômetro da C4. Confira as regras antes de usar nesses lugares. Para tirar a integração, apague o `gamestate_integration_ulanzi_c4.cfg` da pasta cfg do CS2 e reinicie o jogo.

## Estrutura

```
plugin/app.js              serviço principal (Node.js dentro do Ulanzi Studio)
plugin/gsi.js              servidor HTTP do CS2 e lógica do cronômetro
plugin/render.js           monta as imagens e os quadros da contagem
plugin/art.js              arte 8-bit: fontes, bonecos, contador, explosão, defuse, estrela
plugin/gif.js, png.js      geram GIF e PNG sem dependências
plugin/cfgInstaller.js     encontra a pasta do CS2 e grava o .cfg
plugin/miniWs.js           cliente WebSocket próprio (sem dependências)
plugin/ulanzi-api/         SDK oficial da Ulanzi (Apache 2.0)
property-inspector/        painel de configuração da tecla
tools/gerar-animacoes.mjs  gera os GIFs de assets/anim e a imagem da janela
```

Para depurar, abra o Ulanzi Studio com `--log --nodeRemoteDebug` e acesse `chrome://inspect` (porta 9231).

## Responsabilidade

Projeto gratuito, publicado para incentivar a comunidade a ser criativa e a se ajudar. O autor não se responsabiliza, de nenhuma maneira, por banimentos, punições ou qualquer outra consequência do uso. A responsabilidade é inteiramente de quem decidir usar.
