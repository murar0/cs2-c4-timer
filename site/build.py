#!/usr/bin/env python3
"""
Gera a página em português (docs/index.html) e em inglês (docs/en/index.html)
a partir de site/page.html.

Uso:  python3 site/build.py            (ou VERSION=1.4.0 python3 site/build.py)

Para mudar um texto: edite o português em page.html e, se o texto tiver
tradução abaixo (EN), atualize o par correspondente. O script avisa quando
um texto em português da lista não for encontrado na página.
"""
import os
import sys

REPO = os.environ.get("REPO", "murar0/cs2-c4-timer")
VERSION = os.environ.get("VERSION", "1.3.1")
HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, "..", "docs")

# Pares (português, inglês). Trechos de HTML são trocados exatamente como estão.
EN = [
    ('<title>C4 Timer para Ulanzi</title>', '<title>C4 Timer for Ulanzi</title>'),
    ('Plugin gratuito que mostra o tempo da C4 do Counter-Strike 2 nas teclas do Ulanzi D200, em pixel art 8-bit.',
     'Free plugin that shows the Counter-Strike 2 C4 timer on the keys of the Ulanzi D200, in 8-bit pixel art.'),

    # topo
    ('Plugin grátis para Ulanzi D200', 'Free plugin for the Ulanzi D200'),
    ('O tempo da C4 nas teclas do seu deck, em pixel art 8-bit. Verde dá sem kit, amarelo só com kit, vermelho não dá mais. Leitura de relance, sem tirar o olho do jogo.',
     "The C4 timer on your deck's keys, in 8-bit pixel art. Green means you can defuse without a kit, yellow only with a kit, red means it's too late. Read it at a glance without taking your eyes off the game."),
    ('>Baixar v', '>Download v'),
    ('>Como instalar<', '>How to install<'),
    ('Windows · Ulanzi Studio 2.1+ · funciona offline', 'Windows · Ulanzi Studio 2.1+ · works offline'),
    ('Ulanzi D200 com o timer da C4 ocupando duas teclas: tela do CT, contagem até zero e explosão',
     'Ulanzi D200 with the C4 timer on two keys: CT screen, countdown to zero and explosion'),
    ('Tecla larga: duas teclas viram uma tela só', 'Wide key: two keys become one screen'),


    # cores
    ('>O que aparece<', '>What you see<'),
    ('Três cores, uma decisão', 'Three colors, one decision'),
    ('A cor diz se ainda dá tempo de defusar. As marcas na barra são os limites de 10 segundos (sem kit) e 5 segundos (com kit). Uma margem de 0,3s antecipa a troca de cor para cobrir o seu tempo de reação.',
     'The color tells you whether there is still time to defuse. The marks on the bar are the 10-second (no kit) and 5-second (with kit) limits. A 0.3s margin switches the color a little early to cover your reaction time. The labels on the keys are in Portuguese: <b>DÁ SEM KIT</b> means no kit needed, <b>SÓ COM KIT</b> means kit only and <b>SEM TEMPO</b> means no time left.'),
    ('Tecla verde com 27 segundos e o aviso DÁ SEM KIT', 'Green key with 27 seconds and the label DÁ SEM KIT (no kit needed)'),
    ('Tecla amarela com 8 segundos e o aviso SÓ COM KIT', 'Yellow key with 8 seconds and the label SÓ COM KIT (kit only)'),
    ('Tecla vermelha com 3 segundos e o aviso SEM TEMPO', 'Red key with 3 seconds and the label SEM TEMPO (no time left)'),
    ('>VERDE<', '>GREEN<'),
    ('>AMARELO<', '>YELLOW<'),
    ('>VERMELHO<', '>RED<'),
    ('10s ou mais. Dá para defusar sem kit.', '10s or more. You can defuse without a kit.'),
    ('Entre 10s e 5s. Só dá com kit. Se você é CT e tem kit, aparece USE SEU KIT.',
     'Between 10s and 5s. Only possible with a kit. If you are a CT holding a kit, it shows USE SEU KIT (use your kit).'),
    ('Menos de 5s. Não dá mais, nem com kit. Hora de sair.', 'Under 5s. Too late, even with a kit. Time to run.'),

    # animações
    ('>Arte 8-bit original<', '>Original 8-bit art<'),
    ('Cada momento tem a sua animação', 'Every moment has its own animation'),
    ('Boneco TR de balaclava segurando a C4 no deserto', 'T character in a balaclava holding the C4 in the desert'),
    ('Boneco CT de capacete numa noite estrelada', 'CT character in a helmet on a starry night'),
    ('Explosão da C4 com clarão e BOOM', 'C4 explosion with a flash and BOOM'),
    ('Fio cortado, check verde e DEFUSADA', 'Cut wire, green check and DEFUSADA (defused)'),
    ('<figcaption>Você é TR</figcaption>', '<figcaption>You are T</figcaption>'),
    ('<figcaption>Você é CT</figcaption>', '<figcaption>You are CT</figcaption>'),
    ('<figcaption>Explodiu</figcaption>', '<figcaption>It blew up</figcaption>'),
    ('<figcaption>Defusada</figcaption>', '<figcaption>Defused</figcaption>'),
    ('Estrela cadente cruzando o céu da tela do TR, nas duas teclas', 'Shooting star crossing the sky of the T screen, across both keys'),
    ('A cada 4 a 6 minutos, uma estrela cadente cruza o céu', 'Every 4 to 6 minutes, a shooting star crosses the sky'),
    ('<h3>Por que não pisca</h3>', "<h3>Why it doesn't flicker</h3>"),
    ('Cada imagem que chega ao D200 faz a tecla piscar enquanto ele redesenha. Por isso o plugin manda a contagem inteira de uma vez, como animação, no momento do plant. O próprio deck anima sozinho.',
     'Every image sent to the D200 makes the key flicker while it redraws. So the plugin sends the whole countdown at once, as an animation, the moment the bomb is planted. The deck animates it on its own.'),
    ('Ele detecta se você é TR ou CT pelo jogo, e continua mostrando o seu lado mesmo quando você morre e assiste um amigo.',
     'It detects whether you are T or CT from the game, and keeps showing your side even when you die and watch a teammate.'),

    # instalação
    ('>Passo a passo<', '>Step by step<'),
    ('Instalação em 6 passos', 'Install in 6 steps'),
    ('<h3>Baixe e extraia</h3>', '<h3>Download and extract</h3>'),
    ('<p>Baixe o <a', '<p>Download the <a'),
    ('>ZIP do plugin</a>, clique com o botão direito e escolha "Extrair tudo".', '>plugin ZIP</a>, right-click it and choose "Extract All".'),
    ('<h3>Feche o Ulanzi Studio</h3>', '<h3>Close Ulanzi Studio</h3>'),
    ('Feche a janela e também o ícone perto do relógio do Windows (botão direito, Sair).',
     'Close the window and also the icon next to the Windows clock (right-click, Exit).'),
    ('<h3>Copie para a pasta de plugins</h3>', '<h3>Copy it to the plugins folder</h3>'),
    ('<p>Aperte <code>', '<p>Press <code>'),
    ('</code>, cole <span', '</code>, paste <span'),
    ('</span> e dê Enter. Copie a pasta <code>', '</span> and hit Enter. Copy the <code>'),
    ('</code> para dentro. Abrindo a pasta copiada, o <code>', '</code> folder into it. When you open the copied folder, <code>'),
    ('</code> precisa aparecer logo de cara.', '</code> must be right there.'),
    ('Janela Executar do Windows com o caminho da pasta de plugins', 'Windows Run dialog with the plugins folder path'),
    ('<figcaption>Win + R com o caminho</figcaption>', '<figcaption>Win + R with the path</figcaption>'),
    ('Pasta Plugins com a pasta com.ulanzi.cs2c4.ulanziPlugin destacada', 'Plugins folder with com.ulanzi.cs2c4.ulanziPlugin highlighted'),
    ('<figcaption>A pasta do plugin junto com as outras</figcaption>', '<figcaption>The plugin folder next to the others</figcaption>'),
    ('<h3>Coloque nas teclas</h3>', '<h3>Put it on your keys</h3>'),
    ('Abra o Ulanzi Studio. Na categoria <b>CS2 C4 Timer</b>, arraste <b>Timer da C4</b> para uma tecla, ou para duas teclas vizinhas na mesma linha para ter a tecla larga. Ele junta as duas sozinho.',
     'Open Ulanzi Studio. In the <b>CS2 C4 Timer</b> category, drag <b>C4 Timer</b> (called <b>Timer da C4</b> if your Ulanzi Studio is in Portuguese) onto a key, or onto two neighboring keys in the same row for the wide key. It joins them on its own.'),
    ('Ulanzi Studio: arrastando Timer da C4 da categoria CS2 C4 Timer para uma tecla', 'Ulanzi Studio: dragging the timer action from the CS2 C4 Timer category onto a key'),
    ('<figcaption>Arraste "Timer da C4" para a tecla</figcaption>', '<figcaption>Drag the action onto the key</figcaption>'),
    ('<h3>Ligue ao CS2</h3>', '<h3>Connect it to CS2</h3>'),
    ('Clique na tecla e aperte <b>Instalar no CS2</b>. O plugin encontra a pasta do jogo na Steam e grava um arquivo de configuração. Se não achar, use <b>Ver arquivo .cfg</b> e salve o texto em',
     'Click the key and press <b>Instalar no CS2</b> (install in CS2). The plugin finds the game folder in Steam and writes a config file. If it can\'t find it, use <b>Ver arquivo .cfg</b> (show .cfg file) and save the text in'),
    ('Painel da tecla com o botão Instalar no CS2 destacado', 'Key panel with the Instalar no CS2 button highlighted'),
    ('<figcaption>Clique na tecla e aperte "Instalar no CS2"</figcaption>', '<figcaption>Click the key and press "Instalar no CS2"</figcaption>'),
    ('<h3>Reinicie o CS2 e teste</h3>', '<h3>Restart CS2 and test</h3>'),
    ('Com o jogo aberto, o painel mostra <b>CS2: conectado</b>. Para testar sem jogar, aperte a própria tecla: roda uma simulação de 40 segundos. Assista até o fim.',
     'With the game open, the panel shows <b>CS2: conectado</b> (connected). To test without playing, press the key itself: it runs a 40-second simulation. Watch until the end.'),
    ('Painel mostrando CS2: conectado com o jogo aberto', 'Panel showing CS2: conectado with the game open'),
    ('<figcaption>Com o jogo aberto: "CS2: conectado"</figcaption>', '<figcaption>With the game open: "CS2: conectado"</figcaption>'),
    ('Partida do CS2 com a C4 plantada e as duas teclas mostrando 32 e DÁ SEM KIT', 'CS2 match with the C4 planted and both keys showing 32 and DÁ SEM KIT'),
    ('<figcaption>C4 plantada: as duas teclas já estão contando</figcaption>', '<figcaption>C4 planted: both keys are already counting</figcaption>'),
    ('<h3>Bônus: a janela comprida</h3>', '<h3>Bonus: the long window</h3>'),
    ('A janela do canto inferior direito não aceita plugins, só relógio, uso do PC ou imagem de fundo. Para combinar, selecione a janela, vá em <b>Imagem de fundo</b> e escolha <code>assets\\janela-456x196.png</code>, que vem dentro da pasta do plugin.',
     "The window in the bottom-right corner doesn't accept plugins, only a clock, PC stats or a background image. To match, select the window, go to <b>Background image</b> and pick <code>assets\\janela-456x196.png</code>, which comes inside the plugin folder."),

    # como funciona
    ('>Por dentro<', '>Under the hood<'),
    ('<h2>Como funciona</h2>', '<h2>How it works</h2>'),
    ('O CS2 tem um recurso oficial chamado <b>Game State Integration</b>, feito pela Valve para luzes de palco, periféricos e overlays de transmissão. Com um arquivo de configuração na pasta do jogo, o próprio CS2 envia o estado da partida para um endereço no seu computador. O plugin recebe esses dados e desenha as teclas. Nada sai do seu PC.',
     'CS2 has an official feature called <b>Game State Integration</b>, made by Valve for stage lighting, peripherals and broadcast overlays. With a config file in the game folder, CS2 itself sends the match state to an address on your computer. The plugin receives that data and draws the keys. Nothing leaves your PC.'),
    ('Fluxo: o CS2 lê o arquivo de configuração e envia os dados para o plugin no seu PC, que manda a animação pelo Ulanzi Studio para o D200',
     'Flow: CS2 reads the config file and sends data to the plugin on your PC, which passes the animation through Ulanzi Studio to the D200'),
    ('>envia o estado<', '>sends game state<'),
    ('>no seu PC<', '>on your PC<'),
    ('>repassa a animação<', '>passes the animation<'),
    ('>anima sozinho<', '>animates on its own<'),
    ('>HTTP local<', '>local HTTP<'),
    ('>lê o .cfg na pasta do jogo<', '>reads the .cfg in the game folder<'),
    ('>endereço 127.0.0.1<', '>address 127.0.0.1<'),

    # ban e ética
    ('>A pergunta que todo mundo faz<', '>The question everyone asks<'),
    ('Dá ban? É hack?', 'Can you get banned? Is it a hack?'),
    ('Por que achamos que não dá ban', "Why we think it won't get you banned"),
    ('<li>Usa a <a', '<li>It uses <a'),
    ('</a>, um recurso que a própria Valve documenta e que o jogo traz de fábrica.', '</a>, a feature Valve itself documents and that ships with the game.'),
    ('Quem envia os dados é o CS2. O plugin não lê a memória do jogo, não injeta nada e não altera arquivos do jogo.',
     "CS2 is the one sending the data. The plugin doesn't read game memory, doesn't inject anything and doesn't change game files."),
    ('É o mesmo recurso usado por overlays de campeonato, luzes RGB e periféricos.', "It's the same feature used by tournament overlays, RGB lighting and peripherals."),
    ('Não existe garantia oficial. Gamers Club, FACEIT e torneios têm regras próprias e podem proibir qualquer programa externo ou cronômetro da C4. Confira antes de usar lá. Para desligar, apague o arquivo <code>',
     'There is no official guarantee. FACEIT, Gamers Club and tournaments have their own rules and may ban any external program or C4 timer. Check before using it there. To turn it off, delete <code>'),
    ('</code> da pasta cfg do CS2.', '</code> from the CS2 cfg folder.'),
    ('>ÉTICA<', '>ETHICS<'),
    ('Por que não é hack', "Why it's not a hack"),
    ('Hack de verdade dá vantagem com algo que os outros jogadores não têm: ver através de paredes, mira assistida, informação escondida. Isso prejudica quem joga limpo.',
     "A real hack gives you an edge with something other players don't have: seeing through walls, aim assistance, hidden information. That hurts people who play fair."),
    ('O timer não faz nada disso. Não revela posição de ninguém, não mexe na mira e não muda nada dentro do jogo.',
     "The timer does none of that. It doesn't reveal anyone's position, doesn't touch your aim and doesn't change anything in the game."),
    ('O CS2 não tem um timer oficial da C4 na tela, mas a comunidade inteira sabe que ela dura 40 segundos e que, quando a música acelera, é o divisor entre defusar sem kit e só com kit.',
     "CS2 has no official C4 timer on screen, but the whole community knows it lasts 40 seconds and that when the music speeds up, that's the line between defusing without a kit and kit only."),
    ('O plugin transforma esse conhecimento numa cor. É um gadget visual e funcional que ajuda a decidir mais rápido: defusa ou corre.',
     "The plugin turns that knowledge into a color. It's a visual, functional gadget that helps you decide faster: defuse or run."),
    ('De propósito, o plugin não mostra se alguém está defusando. Para o TR isso revelaria o que o jogo esconde e acabaria com o jogo mental de se expor ou não para cortar o defuse.',
     "On purpose, the plugin doesn't show whether someone is defusing. For the T side that would reveal what the game hides and kill the mind game of peeking or not to stop the defuse."),
    ('Segundo a documentação da Valve, enquanto você joga o CS2 só avisa que a bomba foi plantada, o mesmo momento que todo mundo percebe na partida. Fake plant não engana.',
     "According to Valve's documentation, while you play CS2 only reports that the bomb was planted, the same moment everyone notices in the match. Fake plants don't fool it."),

    # dúvidas
    ('>Dúvidas<', '>Questions<'),
    ('Perguntas frequentes', 'FAQ'),
    ('Funciona quando o time inimigo planta?', 'Does it work when the enemy team plants?'),
    ('Sim. O aviso de plant chega para todo mundo, dos dois lados.', 'Yes. The plant notice reaches everyone, on both sides.'),
    ('Funciona no Stream Deck da Elgato?', 'Does it work on the Elgato Stream Deck?'),
    ('Ainda não. O plugin é feito para o Ulanzi Studio (D200 e família). Uma versão para Elgato depende de procura.',
     'Not yet. The plugin is made for Ulanzi Studio (D200 and family). An Elgato version depends on demand.'),
    ('E no Valorant?', 'What about Valorant?'),
    ('Não. O Valorant não tem um recurso oficial como a Game State Integration do CS2.', "No. Valorant has no official feature like CS2's Game State Integration."),
    ('Precisa de internet ou conta?', 'Does it need internet or an account?'),
    ('Não. Tudo acontece no seu computador, e o plugin não coleta nem envia nenhum dado.',
     "No. Everything happens on your computer, and the plugin doesn't collect or send any data."),
    ('O tempo é exato?', 'Is the time exact?'),
    ('Enquanto você joga, o plugin conta 40 segundos a partir do aviso de plant que o jogo envia. Morto, assistindo ou no GOTV, ele usa o tempo exato que o jogo manda. Se notar atraso, o painel tem um campo de correção.',
     "While you play, the plugin counts 40 seconds from the plant notice the game sends. When you're dead, spectating or on GOTV, it uses the exact time the game sends. If you notice a delay, the panel has a correction field."),
    ('Como atualizo para uma versão nova?', 'How do I update to a new version?'),
    ('Feche o Ulanzi Studio, troque a pasta do plugin e abra de novo. A ligação com o CS2 é reaproveitada, então não precisa reinstalar.',
     "Close Ulanzi Studio, replace the plugin folder and open it again. The CS2 link is reused, so you don't need to reinstall."),
    ('Achei um problema, onde aviso?', 'Found a problem, where do I report it?'),
    ('<p>Abra uma <a', '<p>Open an <a'),
    ('>issue aqui no GitHub</a> ou comente nos vídeos do TikTok.', '>issue here on GitHub</a> or comment on the TikTok videos.'),

    # rodapé
    ('>Créditos<', '>Credits<'),
    ('Criado por Felipe Muraro', 'Created by Felipe Muraro'),
    ('Ideia, testes e o vídeo que começou tudo: <a', 'Idea, testing and the video that started it all: <a'),
    ('>@mur4r0 no TikTok</a>. Siga para ver as próximas versões.', '>@mur4r0 on TikTok</a>. Follow for the next versions.'),
    ('Feito pela comunidade, para a comunidade', 'Made by the community, for the community'),
    ('Este projeto é gratuito e foi publicado para incentivar a comunidade a ser criativa e a se ajudar. Use, estude, modifique e crie as suas próprias versões.',
     'This project is free and was published to encourage the community to be creative and help each other. Use it, study it, modify it and make your own versions.'),
    ('<strong>O autor não se responsabiliza, de nenhuma maneira, por banimentos, punições ou qualquer outra consequência do uso.</strong> A responsabilidade é inteiramente de quem decidir usar.',
     '<strong>The author takes no responsibility, in any way, for bans, penalties or any other consequence of using it.</strong> Full responsibility lies with whoever chooses to use it.'),
    ('Projeto independente, sem ligação com a Valve ou a Ulanzi. Counter-Strike é marca da Valve Corporation. Ulanzi e Ulanzi Studio são marcas da Ulanzi. Usa o SDK de plugins da Ulanzi (Apache 2.0). Toda a arte 8-bit é original do projeto.',
     'Independent project, not affiliated with Valve or Ulanzi. Counter-Strike is a trademark of Valve Corporation. Ulanzi and Ulanzi Studio are trademarks of Ulanzi. Uses the Ulanzi plugin SDK (Apache 2.0). All 8-bit art is original to the project.'),
]

# Pergunta extra só na versão em inglês
EN_EXTRA_FAQ = (
    '        <details><summary>Achei um problema, onde aviso?</summary>',
    '        <details><summary>Are the keys and the panel in Portuguese?</summary><p>For now, yes. The key labels and the settings panel are in Portuguese. This page explains each label, and an English version of the plugin depends on demand.</p></details>\n'
    '        <details><summary>Achei um problema, onde aviso?</summary>',
)

AUTOLANG_PT = (
    '<script>try{if(!localStorage.getItem("c4timer-lang")&&!/^pt/i.test(navigator.language||""))'
    'location.replace("en/"+location.hash)}catch(e){}</script>'
)


def skeleton(body_src, lang):
    head, rest = body_src.split("</style>", 1)
    return (
        f'<!doctype html>\n<html lang="{lang}">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        f"{head}</style>\n</head>\n<body>\n{rest.lstrip()}</body>\n</html>\n"
    )


def fill(src, **vals):
    for k, v in vals.items():
        src = src.replace("{{" + k + "}}", v)
    return src


def main():
    src = open(os.path.join(HERE, "page.html"), encoding="utf-8").read()
    src = fill(src, REPO=REPO, VERSION=VERSION)

    pt = fill(src, ROOT="", HREF_PT="./", HREF_EN="en/", CUR_PT='aria-current="page"', CUR_EN="", AUTOLANG=AUTOLANG_PT)
    en = fill(src, ROOT="../", HREF_PT="../", HREF_EN="./", CUR_PT="", CUR_EN='aria-current="page"', AUTOLANG="")

    a, b = EN_EXTRA_FAQ
    if a not in en:
        sys.exit("pergunta extra: âncora não encontrada")
    en = en.replace(a, b, 1)

    missing = []
    for p, e in EN:
        if p not in en:
            missing.append(p)
            continue
        en = en.replace(p, e)
    if missing:
        print("AVISO: textos em português não encontrados na página:")
        for m in missing:
            print("  -", m[:90])

    os.makedirs(os.path.join(DOCS, "en"), exist_ok=True)
    with open(os.path.join(DOCS, "index.html"), "w", encoding="utf-8") as f:
        f.write(skeleton(pt, "pt-BR"))
    with open(os.path.join(DOCS, "en", "index.html"), "w", encoding="utf-8") as f:
        f.write(skeleton(en, "en"))
    print("ok: docs/index.html e docs/en/index.html")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
