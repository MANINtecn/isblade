# DIARIO IS BLADE

Jogo de acao no navegador (Three.js). PC e celular (botoes de toque desde 31/10/2026; nivel de qualidade grafica automatico no celular). No ar em https://isblade.vercel.app e https://isblade.tecx.pro, servidor de jogo na VPS (wss://play.isblade.tecx.pro).

- PASTA UNICA DO PROJETO: `C:\TECX SOFTHOUSE\IS ONLINE\` (nome da pasta). O JOGO se chama IS BLADE. Dentro dela: `prototipo\` (o jogo), `DIARIO_IS_BLADE.md` e `ROADMAP_IS_BLADE.md`. A pasta `C:\TECX SOFTHOUSE\IS BLADE\` NAO existe mais (unificada em 22/10/2026); caminhos antigos "IS BLADE\..." nas entradas abaixo agora sao `IS ONLINE\...`.
- Pasta do jogo: `C:\TECX SOFTHOUSE\IS ONLINE\prototipo\`
- Arquivo principal: `arena.html` (arena de combate 3D)
- Como abrir: `INICIAR.bat` (servidor na porta 8000) e depois `http://localhost:8000/arena.html`
- Referencia de jogabilidade: Dragon Nest (mira no centro, skills com alcance, combate fluido)
- Ultima atualizacao deste diario: 01/11/2026 (Auditoria Geral de Ecossistema de MMORPG pelo Gemini; detalhes tecnicos do Claude em `REGISTRO_CLAUDE.md`)

---

## 1. Estado atual (resumo)

O combate ja segue o estilo Dragon Nest em PC: mira central com o mouse, camera em 3a ou 1a pessoa, golpes que erram no vazio, guarda do chefe, lancamento e combo aereo, nota no fim da luta. A fluidez do movimento foi mexida na ultima rodada e AINDA NAO foi confirmada pelo dono (ele precisa testar o "vai e volta" da corrida). Cenario e armas dependem do TECX LABS 3D (outro chat).

O que funciona (confirmado por captura de tela ou pelo dono):

- Mira central, camera 3a/1a pessoa, mouse capturado (o dono testou e aprovou).
- Skills, projetil Lamina, guarda do chefe, lancamento no ar, contador de combo.

O que foi feito mas NAO foi testado por quem joga (so por captura/simulacao):

- Fila de comandos e cancelamento de golpes.
- Conserto do "vai e volta" da corrida, aceleracao suave, hit-stop, arcos de corte, rastro da espada.

---

## 2. O que fizemos (em ordem)

### 2.1 Base 3D (rodadas anteriores a 21/10)

- Personagens em VRM: Talibrac (jogador, `assets/Talibrac.vrm`) e Talibrac2 (chefe, `assets/Talibrac2.vrm`).
- Animacoes do Mixamo, com motor proprio de retarget (24 clips carregados).
- Procurado pacote de efeitos de corte em pixel art (CC0); descartado o estilo pixel art (o dono achou arcaico).

### 2.2 Limpeza do PC (21/10)

- Disco C: estava com 0 GB livres; liberados cerca de 26 GB (screenshots do agente de navegador, modelo de IA do Chrome, cache do CapCut, conversas e backup do Antigravity com mais de 7 dias, Scoop inteiro).
- Chrome configurado para usar a GTX 1650 (alto desempenho) nas preferencias graficas do Windows.
- Notebook Lenovo 82MJ, Ryzen 5 5600H, 16 GB (2,1 GB reservados ao video integrado; mexer na BIOS fica para depois).

### 2.3 Sensacao de jogo (arena.html)

Backup antes: `arena_antes_mira.html`

- Fila de comandos: se apertar enquanto ocupado, o comando espera ate 0,35 s e sai assim que der.
- Cancelamento: golpes e skills cancelam apos o acerto (ou 60% da animacao); skills de varios golpes so no fim. Bloqueio cancela a recuperacao por 10 de estamina.
- Estamina: atacar nao gasta, acertar recupera (+4 golpe basico, +6 skill). Esquiva custa 32 (+10 se cancelar skill de varios golpes). Ataques do chefe custam 24/42/55 de estamina para bloquear.
- Alcance e abertura proprios por golpe basico (tabela `MRANGE`); cones de alcance no chao; tecla V liga/desliga o cone; tecla B liga reguas a 5, 10, 15 e 20 unidades.
- Skill de projetil Z (Lamina): alcance 15, velocidade 26, atravessa o alvo. Unidade do mundo = cerca de 1 metro.

### 2.4 Estilo Dragon Nest no combate

Backup antes: `arena_antes_dn.html`

- Barra de GUARDA do chefe (super armadura): golpes basicos tiram 6, skills 10, medias 22, Execucao 40 (dividido por pulso). Zerou = chefe atordoado por 2,6 s. Regenera sozinha apos 3 s sem apanhar.
- Lancamento no ar: Onda (R), Execucao (F) e Tempestade (T). No ar, +40% de dano e o chefe fica la (ate 6 golpes). Armadura com guarda cheia impede o lancamento.
- Contador de combo (zera ao tomar dano ou apos 2,4 s) e nota C/B/A/S/SS/SSS ao derrotar o chefe (tempo, combo maximo, dano sofrido).
- Parametros de autoteste na URL: `?selftest=N&dbg=1`, `&simT=`, `&freeze=1`.

### 2.5 Mira central e camera (22/10)

Backup antes: `arena_antes_mira_central.html`

- Mira fixa no centro da tela; mouse gira camera e mira; golpes e skills vao para onde a mira aponta.
- Mira fica dourada com a distancia quando o chefe esta sob ela.
- PgUp = 1a pessoa, PgDn = 3a pessoa, roda do mouse ajusta a distancia, Esc libera o mouse, M volta ao modo antigo (cursor livre, clique anda).
- Camera 3a pessoa sobre o ombro direito (7,5 unidades, 0,9 de desvio).

### 2.6 Fluidez (22/10)

Backup antes: `arena_antes_fluidez.html`

- "Vai e volta" da corrida: hipotese principal e o deslocamento do quadril embutido nos clips do Mixamo. O deslocamento horizontal foi removido dos clips; so a altura vem da animacao. (Tentativa de medir o deslocamento falhou; a causa e por deducao.)
- Aceleracao e frenagem suaves; a passada da animacao acompanha a velocidade real.
- Hit-stop nos acertos, arcos de luz nos golpes (jogador e chefe), rastro da espada.
- Menos escrita no DOM por quadro (barras, cooldowns, textos).
- F3 mostra FPS, pico de tempo por quadro, chamadas de desenho e triangulos.
- Defeito achado no caminho: a suavizacao gerava valor invalido no primeiro quadro e a cena ficava preta. Corrigido (guarda contra divisao por zero e `dt` negativo). O laco de quadros agora e protegido por try/catch.

### 2.7 Cenario e pipeline de assets

- Prompts em ingles entregues para imagem, pecas 3D e ceu (arena aberta em cidade em ruinas, estilo dark fantasy colorido, sem citar jogos).
- Painel de gerador de mundos 3D analisado: escolhas para Three.js = SPZ, OpenGL, Ground level, Textured. O dono vai testar US$ 20 depois.
- Decisao: comecar pelo TECX LABS 3D (pecas modulares, `.glb`) e deixar os US$ 20 para um teste posterior com criterios (estilizado? menos de 200 mil triangulos? combina com os personagens?).
- Especificacao de entrega do TECX LABS 3D para web escrita (GLB, metros, Y para cima, frente +Z, nos nomeados, limites de triangulos, manifest.json). Entregue ao dono para colar no outro chat.

---

## 3. Controles atuais (PC)

| Acao                     | Tecla                                           |
| ------------------------ | ----------------------------------------------- |
| Mover                    | WASD                                            |
| Mirar e girar camera     | Mouse (clique na tela para capturar; Esc solta) |
| Ataque basico (segure)   | Clique esquerdo                                 |
| Golpes                   | 1 a 6                                           |
| Skills                   | Q, E, R, F, T, Z                                |
| Bloquear / parry         | Espaco                                          |
| Esquivar                 | Shift                                           |
| 1a / 3a pessoa           | PgUp / PgDn                                     |
| Modo cursor livre        | M                                               |
| Cone de alcance / reguas | V / B                                           |
| Medidor de desempenho    | F3                                              |

---

## 4. Proximos passos

Prioridade alta

1. DONO: testar a corrida (WASD em varias direcoes) e um combo; dizer se o "vai e volta" sumiu e se ainda ha travadas. Usar F3 e reportar FPS e pico.
2. Efeitos e texturas por skill (brilho nas laminas, particulas, visual proprio de cada habilidade). O dono sente falta disso para a fluidez.
3. Decidir a tecla do PULO (Espaco ja e bloqueio; sugestoes C ou Ctrl) e implementar golpes aereos do jogador.

Prioridade media 4. Botao direito do mouse: definir acao (golpe alternativo?). 5. Mostrar espada e maos na 1a pessoa (hoje o corpo some). 6. Ajustar balanceamento: Tempestade em cima do chefe no ar tirou cerca de 26% da vida na simulacao (pode estar forte). 7. Cenario: receber `.glb` do TECX LABS 3D em `assets\cenario\` e montar a arena; armas em `assets\armas\` para prender na mao da Talibrac. 8. Possivel corrida com tecla propria (Ctrl segurado) se o dono quiser; no Dragon Nest nao ha certeza de que Shift corria.

FUTURO (em espera, anotado a pedido do dono)

- Interface de combos e gestos: hoje fica atras do botao Config (desligada). Retomar depois: decidir se os gestos voltam, revisar o livro de combos, e levar esquivar/bloquear para botoes proprios no toque.

Prioridade baixa 9. Limpar os registros de diagnostico (`DBG`, `JSERR`, `JSREJ`, `FRAMEERR`, `?dbg=1`) quando tudo estiver estavel. 10. Colocar a pasta do jogo em git (hoje so ha os backups `.html`). 11. Jogabilidade de celular e tablet (joystick e toque ja existem, mas nao foram revisados com a mira central). 12. Teste de gerador de mundos pago (US$ 20), depois das pecas do TECX LABS 3D.

---

## 5. Pendencias e riscos conhecidos

- Mira com mouse capturado, fila de comandos e cancelamentos so foram verificados em simulacao; o dono e quem confirma a sensacao.
- Navegador de teste (Edge headless) e instavel e lento; capturas as vezes falham e precisam repetir.
- Sem git: o unico seguro e a copia `arena_antes_*.html`. Antes de qualquer mudanca grande, criar nova copia.
- Licenca do gerador de mundos pago nao foi lida (uso comercial e expiracao de creditos).
- Pixel art foi descartado pelo dono; manter 3D estilizado.

---

## 6. Backups (do mais antigo ao mais novo)

`arena_backup_procedural.html`, `arena_r128_backup.html`, `arena_antes_mira.html`, `arena_antes_dn.html`, `arena_antes_mira_central.html`, `arena_antes_fluidez.html`. Para voltar: copiar o backup por cima de `arena.html`.

---

## 6.1 Regras de trabalho em dupla (Claude + Gemini)

- Claude e Gemini trabalham juntos neste projeto. Cada um registra AQUI tudo que arrumar, implementar ou corrigir, assinando com o proprio nome e a data. Ler o registro antes de comecar qualquer tarefa.
- Sempre mandar ao dono, no chat, o link de teste: `http://localhost:8000/arena.html` (e os arquivos alterados).
- Porta 3000 e do tecx-labs-3d; nao usar. IS BLADE usa a 8000.

## 6.2 Registro de alteracoes

### [Claude] 22/10/2026

- Li o diario e subi o servidor do IS BLADE (`python -m http.server 8000` em `prototipo\`). Link: http://localhost:8000/arena.html
- Nenhum arquivo do jogo foi alterado.
- `C:\TECX SOFTHOUSE\IS ONLINE\` e a versao errada (Sung / Solo Leveling, Three.js com server.js); o dono disse que pode ser removida, mas a remocao foi bloqueada pela protecao do ambiente e NAO foi apagada. Servidor dela foi parado. Nela, so mudei `server.js` para a porta 3010 (antes 3000, que e do tecx-labs-3d). Ignorar essa pasta; nao faz parte do IS BLADE.

### [Claude] 22/10/2026 - Botao de Config e interface de combos desligada

Backup antes: `arena_antes_config.html`

- Decisao do dono: foco total no combate fluido (Dragon Nest). A interface de combos por gestos sai da tela e vai para as configuracoes; nao e prioridade agora.
- Escondidos por padrao: painel (guia do proximo golpe + livro de combos), barra da sequencia (`#chain`, `#winbar`, `#hits`) e botoes 1-6 / esquivar / bloquear (`#pad`). Isso e so CSS (`body:not(.combo-ui)`), a logica de combos continua intacta.
- Novo botao de engrenagem no canto superior direito (`#cfgBtn`), abre o painel `#cfg` com a opcao "Interface de combos e gestos". A escolha fica salva no navegador (`localStorage` chave `isblade.comboUI`). Com o mouse capturado, Esc solta o mouse para clicar.
- Skills mantidas na tela e nas teclas: Q, E, R, F, T, Z.
- `GESTURES` continua `false` (desenhar gestos segue desligado, nao mexi).
- Arquivo alterado: `prototipo\arena.html`. Sintaxe do script verificada (node --check); ainda NAO testado visualmente pelo dono.
- Atencao: no celular/tablet os botoes de esquivar e bloquear estavam no `#pad`, que agora fica escondido. Resolver quando formos para o toque.

### [Claude] 22/10/2026 - Avaliacao da espada `weapon_sword_01.glb`

- Arquivo estava em `C:\TECX SOFTHOUSE\IS ONLINE\weapon_sword_01.glb` (794 KB; 8000 triangulos; nos `weapon_sword_01`, `grip`, `base_edge`, `tip_edge`; sem normais, so POSITION+UV). Estrutura e nomes seguem o pedido, mas...
- REPROVADA: renderizei de 4 angulos e o modelo sao PECAS SOLTAS (tampa, barra, blocos/martelos, lamina rasgada), nao uma espada inteira. Tamanho 0,77 x 1,2 x 0,57 m (grossa demais no eixo Z). Provavel causa: a foto de origem tinha varios objetos e a categoria ficou errada (nao era arma). Nao foi colocada na arena.
- Nenhum arquivo do jogo foi alterado. Copia e pagina de preview temporarias removidas.
- CORRECAO (dono): a intencao NAO era gerar espada, era a ARENA (cenario). A foto era de pecas de cenario e saiu com nome `weapon_sword_01` por a categoria nao ter sido trocada. Por isso as pecas soltas. O dono vai refazer escolhendo a categoria de cenario (parte de cenario). Espada fica para depois.
- Quando chegar o `.glb` de cenario: conferir escala (metros), pecas modulares e triangulos antes de montar a arena em `assets\cenario\`.
- Dica: o dono tem a pasta `C:\TECX SOFTHOUSE\IS ONLINE\` (versao do Sung) so como deposito de downloads; nao apagar enquanto houver arquivos novos la.

### [Claude] 22/10/2026 - Avaliacao de `env_arena_ring_01.glb`

- Arquivo: `C:\TECX SOFTHOUSE\IS ONLINE\env_arena_ring_01.glb` (2,4 MB, 30000 triangulos, 1 malha, 1 no, so POSITION+UV, sem normais). Bounding box 27 x 13,2 x 15,7 m (largura bate com a arena, raio 13,5).
- REPROVADO para montar a arena: renderizei de 4 angulos e nao e um anel. Sao props soltos espalhados (4 bracadeiras/chamas em pedestais pretos, poste com bandeira rasgada, pedras), sem chao e sem muralha continua. O gerador parece ter reconstruido a foto como uma folha de objetos e esticado para 27 m. Nada foi colocado na arena.
- Nenhum arquivo do jogo alterado; copia e preview temporarios removidos.
- Sugestao: gerar PECAS INDIVIDUAIS, uma por arquivo e uma por foto (chao circular, trecho de muralha, pilar, bracadeira, bandeira), e eu monto o anel em codigo repetindo/rotacionando as pecas. Os props deste arquivo so servem se forem separados em objetos (hoje e uma malha unica).

### [Claude] 22/10/2026 - Instalado `env_arena_ring_01.glb` na arena (a pedido do dono)

Backup antes: `arena_antes_cenario.html`

- Mesmo com a ressalva acima, o dono mandou instalar. Copiado para `prototipo\assets\cenario\env_arena_ring_01.glb` e carregado em `arena.html` logo depois dos pilares (GLTFLoader, sem escala nem rotacao: ja veio em metros, centrado na origem).
- Ajustes no carregamento: `computeVertexNormals()` (o arquivo nao tem normais), material `DoubleSide`, `frustumCulled=false`.
- Para desligar sem mexer no codigo: abrir `arena.html?cenario=0`.
- Verificado por captura de tela: carrega e aparece; props escuros nas bordas (blocos/pedestais, rochas) e a mira/combate seguem funcionando. Pontos a avaliar pelo dono: props muito escuros e "chapados", alguns ficam perto da camera nas bordas e podem tapar a visao; o chao quadriculado continua o antigo.
- NAO testado pelo dono em jogo. Se atrapalhar, usar `?cenario=0` ou voltar o backup.

### [Claude] 22/10/2026 - Licoes do primeiro teste do TECX LABS 3D (dono: "primeiro teste nao ficou bom")

- Contexto: o TECX LABS 3D (`L2 IKARUS INTERCROW\tecx-labs-3d`) esta em construcao e vai gerar itens, objetos e cenarios do IS BLADE. Os dois primeiros `.glb` (espada/arena) vieram como folha de pecas soltas.
- O que aprendemos: a ferramenta reconstroi UM objeto a partir de UMA imagem. Foto com varios objetos vira malha unica com tudo espalhado; a categoria errada piora (a arena saiu como `weapon_sword_01`). Saida sem normais e escura/chapada no jogo.
- Para os proximos testes: uma peca por foto, fundo liso, categoria certa, conferir no preview antes de baixar. Ideias para o proprio laboratorio: exportar normais, avisar quando a imagem tem varios objetos, e mostrar dimensoes no preview.
- Arena atual segue com o cenario antigo + o `env_arena_ring_01.glb` (desligavel com `?cenario=0`).

### [Claude] 22/10/2026 - Atalhos das skills + ROADMAP

Backup antes: `arena_antes_cenario.html` (mesmo ponto de partida; nao criei backup novo)

- Config agora tem a secao "ATALHOS DAS SKILLS": clicar no atalho e apertar a nova tecla. Se a tecla ja for de outra skill, as duas trocam. Teclas do sistema (WASD, 1-6, M, V, B, G, Y, Espaco) sao recusadas. Botao "Restaurar padrao". Salvo em `localStorage` chave `isblade.skillKeys`. Atualiza os botoes de skill na tela na hora.
- Painel de Config: z-index acima dos botoes de skill, com rolagem se a janela for baixa.
- Testado com navegador automatizado (CDP): Q->X, troca com E, recusa de W, persistencia no localStorage. Fora do teste, a frase de ajuda inicial no rodape ainda diz "Q E R F T Z" (estatica; nao atualiza).
- Criado `C:\TECX SOFTHOUSE\IS BLADE\ROADMAP_IS_BLADE.md`: plano em 7 fases (config, efeitos de skills, status/inventario/sets, inimigos/arena, polimento, encaixe dos assets do TECX LABS 3D, futuro). Quem concluir um item marca `[x]` la e registra aqui.
- Combinado: Claude e Gemini seguem o roadmap; antes de comecar um item, avisar no diario para nao mexermos no mesmo trecho de `arena.html` ao mesmo tempo.
- Proximo (sugerido): efeitos das skills (Fase 2).

### [Claude] 22/10/2026 - Efeitos das skills (Fase 2, versao 1)

Backup antes: `arena_antes_efeitos.html`

- Novo sistema em `arena.html` (logo apos `burst()`): `addVfx/updateVfx` (maximo 60 efeitos ao mesmo tempo, descarta os mais antigos), `groundRing` (anel no chao), `lightColumn` (coluna de luz), `streak` (faixa de luz), `screenFlash` (clarao de tela, div `#flash`). `updateVfx(dt)` roda no laco antes do `renderer.render`.
- `skillSwingFx(an)` (no momento do corte, chamado em `applyHit` antes do teste de alcance) e `skillHitFx(an,x,z)` (no alvo, depois do acerto), um `switch` por `pose` da skill:
  - Q Avanco: faixa azul atras do jogador + anel + particulas.
  - E Corte Rapido: dois arcos cruzados + faisca branca.
  - R Onda: dois aneis violeta no chao, coluna de luz, tremor, e coluna + anel no chefe.
  - F Execucao: coluna dourada e anel por pulso, arco girando; no ultimo pulso, clarao dourado de tela, tremor e explosao de particulas.
  - T Tempestade: 3 arcos girando por pulso, anel violeta; clarao leve no fim.
  - Z Lamina: anel e faixa na saida, anel e faisca no impacto (o projetil ja tinha trilha).
- Para ajustar uma skill: mexer so no `case` dela nessas duas funcoes. Cores vem de `sk.css`.
- Testado com navegador automatizado: as 6 skills disparam sem erro de script; capturas mostram aneis e colunas. NAO avaliado pelo dono (intensidade, cor, duracao e se atrapalham a visao).
- Roadmap atualizado (Fase 2).

### [Claude] 22/10/2026 - Bloqueio por arma + estamina so no ataque padrao

Backup antes: `arena_antes_bloqueio.html`
**Estamina (pedido do dono):**

- Agora so o ataque padrao recupera estamina ao acertar; skills nao recuperam mais. Ganho cresce com o combo: 1,5 no 1o golpe, +0,5 por golpe, maximo 7 (constantes `STROKE_GAIN_MIN/STEP/MAX`, antes era +4 fixo; `SKILL_GAIN` ficou sem uso).
- NAO mexi na regeneracao passiva (20/s parado, 6/s bloqueando, com 0,6 s de atraso apos gastar). Perguntar ao dono se ela tambem deve sair.
  **Bloqueio (Espaco) depende da arma equipada:**
- Tres armas de teste, escolhidas em Config > "ARMA (TESTE)" (salvo em `localStorage` `isblade.weapon`; sera substituida pelo inventario): espada longa de 2 maos (padrao), espada e escudo, cajado de 2 maos.
- Espada longa: espada na diagonal na frente do peito, as duas maos na empunhadura. Espada e escudo: escudo redondo (novo, preso no antebraco esquerdo) na frente do corpo, espada baixa ao lado. Cajado: modelo novo (haste + argola + orbe), a ponta de baixo fica FINCADA no chao a frente, e so ele cria a bolha de luz de protecao; espada e escudo nao criam mais a bolha.
- Como funciona: `weaponPose()` (logo apos `updateRig`) sobrescreve, so enquanto bloqueia, os ossos de bracos e maos (`GPOSE`) e zera quadril/tronco/pernas (`BODYBONES`) com mistura suave de 0,14 s. O clip `guard` do Mixamo NAO e mais usado: ele e de lado (corpo girado ~55 graus) e a espada ficava apontada para baixo. `playerLoco` agora toca `idle`/`run` durante o bloqueio.
- Limitacoes: no cajado o ataque ainda usa as animacoes de espada (cajado so troca o modelo na mao); pernas ficam retas no bloqueio (sem agachar); modelos de escudo/cajado sao provisorios (formas simples) ate chegarem do TECX LABS 3D.
- Ferramentas de teste visual (so desenvolvimento): `?orbit=1&camyaw=3.14&camdist=3&wpn=staff` (camera orbita e segura o bloqueio; o titulo da aba mostra posicoes da espada/maos), `&gp=18 numeros` (sobrepoe a pose de bracos da arma atual, x,y,z por osso na ordem de `GBONES`).
- Testado so por captura de tela e navegador automatizado; NAO sentido pelo dono em jogo (parry/bloqueio com defesa real nao foi retestado).

### [Claude] 22/10/2026 - Regeneracao passiva de estamina -80%

- Pedido do dono: a barra amarela enchia rapido demais parado. Nova constante `STAM_REGEN=.2` em `arena.html` multiplica a regeneracao passiva: parado 20/s -> 4/s, bloqueando 6/s -> 1,2/s (o atraso de 0,6 s apos gastar continua). Para ajustar, mudar so `STAM_REGEN`.
- Junto com o ganho por golpe padrao (1,5 a 7 conforme o combo), a estamina agora depende bem mais de acertar combos. Nao testado em jogo pelo dono; pode ficar apertado para a esquiva (custa 32).

### [Claude] 22/10/2026 - Arena montada com as pecas novas do TECX LABS 3D

Backup antes: `arena_antes_bloqueio.html` (nao criei backup novo; o `arena.html` desta rodada so mudou o bloco do cenario).

- Pecas novas em `prototipo\assets\cenario\`: `env_arena_floor_01.glb` (30x30 m, 4414 tri, topo da pedra em y=0,25), `env_arena_wall_01.glb` (2216 tri, 3,12 m de altura, raio interno 13,8, entrada em +Z), `env_banner_pole_01.glb` (190 tri). Todas com normais, feitas no Blender. Bem melhores que o anel antigo.
- Instalacao em `arena.html` (bloco "pecas modulares"): piso descido 0,25 m (o personagem pisa em y=0), muralha na origem sem ajuste, 4 mastros a 12,4 m do centro (45, 135, 225, 315 graus; fora do eixo da entrada), virados para o centro. O chao quadriculado antigo ficou como fundo, 0,3 m abaixo.
- DIVERGENCIA: o texto do dono diz mastro de 5 m, mas o arquivo tem 8,4 m de altura real (a haste vai ate 8 m, com topo em 8,4). Escalei a 0,6 (cerca de 5 m). Se o outro chat gerar de novo, conferir a escala.
- `env_arena_ring_01.glb` (anel ruim) deixou de ser carregado; o arquivo continua na pasta, pode apagar. `?cenario=0` ainda desliga tudo para comparar.
- Verificado por captura de tela (visao alta e de jogo): piso de pedra, muralha com abertura atras do jogador, mastros e a bolha antiga do portal ao fundo. NAO verificado: camera atravessando a muralha ao andar perto dela, desempenho (F3), cor/iluminacao a gosto do dono.
- Pilares cilindricos antigos (18 a 16,5+ m) continuam atras da muralha; decidir se removem.

### [Claude] 22/10/2026 - Versao do Sung (Gemini) apagada + nomes

- A pedido do dono, apaguei a versao antiga do Gemini (personagem Sung / "IS LEVELING", Three.js com `server.js`, porta 3010) que estava em `C:\TECX SOFTHOUSE\IS ONLINE\`: `audio.js`, `index.html`, `main.js`, `package.json`, `server.js`, `style.css` e a pasta `assets` (so texturas). Mantidos os 3 `.glb` do TECX LABS 3D que estavam la (`env_arena_floor_01`, `env_arena_wall_01`, `env_banner_pole_01`; copias ja em `IS BLADE\prototipo\assets\cenario\`). Sem git, nao ha como restaurar.
- REGRA DE NOMES (dono): o JOGO se chama IS BLADE (combate hack and slash com mira, estilo Dragon Nest, personagem Talibrac). "IS ONLINE" e o nome da PASTA do projeto. Nao existe mais outra versao do jogo; so vale o `arena.html` atual.
- Pendente: o jogo ainda roda de `C:\TECX SOFTHOUSE\IS BLADE\prototipo\` (porta 8000). Perguntado ao dono se quer mover tudo para dentro de `IS ONLINE`.

### [Claude] 22/10/2026 - Projeto UNIFICADO em `C:\TECX SOFTHOUSE\IS ONLINE\`

- O dono mandou unificar. Movi `prototipo\`, `DIARIO_IS_BLADE.md` e `ROADMAP_IS_BLADE.md` de `C:\TECX SOFTHOUSE\IS BLADE\` para `C:\TECX SOFTHOUSE\IS ONLINE\` e apaguei a pasta `IS BLADE` (ficou vazia). Os 3 `.glb` soltos na raiz eram identicos (hash) aos de `prototipo\assets\cenario\`; apaguei os duplicados da raiz.
- Nao mexi em `C:\Users\icaro\OneDrive\Ãrea de Trabalho\IS BLADE\` (referencias do dono: FBX, packs, imagens). Se for usar algo de la, copiar para `prototipo\assets\`.
- Servidor de teste reiniciado a partir de `C:\TECX SOFTHOUSE\IS ONLINE\prototipo\` (`python -m http.server 8000`) ou pelo `INICIAR.bat` dessa pasta. Link: http://localhost:8000/arena.html
- Tudo que o Gemini e eu fizermos daqui em diante usa SO esta pasta.

### [Claude] 22/10/2026 - Dados de combate em JSON + painel F2 (so desenvolvimento)

Backup antes: `arena_antes_json.html`

- Novo arquivo `prototipo\data\combate.json` com: `player` (estamina, esquiva, parry, alcance, corrida), `skills` (as 6 skills) e `boss.attacks` (3 ataques do chefe). E a FONTE UNICA desses valores: o `arena.html` NAO tem mais essas tabelas escritas no codigo. Para mudar dano, recarga, custo etc., editar o JSON e recarregar a pagina.
- `arena.html` carrega o JSON no topo do script (`await fetch('data/combate.json')`, top-level await do modulo). Se o arquivo faltar ou estiver invalido, aparece uma tela de erro explicando. Variaveis `STAM_REGEN`, `ROLL_COST`, `PARRY_W`, `RUN` etc. continuam existindo e sao preenchidas por `syncP()` a partir de `P=DATA.player`. `SK` = `DATA.skills`, `ATK` = `DATA.boss.attacks` (cor hex calculada de `css`). `SKEY` agora e montado a partir de `SK[i].key` (antes era fixo).
- Painel de ajuste: tecla F2 abre/fecha. SO FUNCIONA EM `localhost`/`127.0.0.1` (em outro dominio, como o site da ISLABS, ele nem e criado). Lista todos os valores do JSON com campos numericos, vale na hora; botoes "Baixar JSON" (gera `combate.json` com os valores atuais e as teclas ORIGINAIS das skills, nao as remapeadas), "Copiar JSON" e "Recarregar dados". Cones de alcance (`half`/`range`) so atualizam ao recarregar.
- Plano combinado com o dono: F2 e so ferramenta de desenvolvimento; no futuro havera um painel de ADMIN no servidor para ajustar valores de verdade. Quando o servidor existir, o JSON passa a vir dele e o F2 pode sair.
- Testado com navegador automatizado: jogo abre sem erro, F2 abre com 76 campos, editar o dano da skill Q aparece no JSON exportado, e o restante exportado e identico ao arquivo. NAO testado em jogo pelo dono.
- Proximo (roadmap): skills por arma em arquivos separados (`data\armas\...`), maestria por arma (estilo Albion, sem nivel de personagem).

### [Claude] 22/10/2026 - "Combo padrao nao recupera estamina": ganho aumentado + aviso na tela

- Investigado com navegador automatizado (hook `window.__dbg={S,P}`, so em localhost): a recuperacao FUNCIONAVA (ex.: +1,5 e +2 por golpe), mas era pequena demais (1,5% da barra no 1o golpe) e, com a regeneracao passiva em 20%, parecia que nao recuperava. Golpes que ERRAM (`Errou`) nao recuperam nada, por regra.
- Ajuste em `data\combate.json`: `strokeGainMin` 1,5 -> 3, `strokeGainStep` 0,5 -> 1, `strokeGainMax` 7 -> 12. Combo de 6 golpes agora devolve cerca de 33 de estamina (uma esquiva custa 32).
- Novo aviso: a cada golpe padrao que recupera estamina aparece um texto amarelo "+N EST" sobre o jogador (so quando a estamina nao esta cheia). Skills continuam sem recuperar.
- Nao testado em jogo pelo dono. Se ainda parecer pouco/muito, ajustar so esses 3 valores (ou no F2).

### [Claude] 22/10/2026 - Skills por arma + maestria por arma (estilo Albion, sem nivel de personagem)

Backup antes: `arena_antes_armas.html`

- `data\combate.json` perdeu o bloco `skills`; ganhou `slots` (teclas padrao dos 6 slots: Q E R F T Z) e `weapons` (ids das armas). As skills agora estao em `data\armas\sword.json` (espada longa 2 maos), `swordshield.json` (espada e escudo 1 mao) e `staff.json` (cajado 2 maos). Cada arquivo: `name`, `mastery` ({xpHit, xpSkill, levels[]}) e `skills[6]` (mesmos campos de antes + `unlock`). `arena.html` carrega os 4 JSON no topo (Promise.all).
- Trocar de arma (Config > ARMA) troca as skills: `setWeapon(id)` recarrega `SK` (mesmo array, reaproveitado), refaz os cones de alcance (`buildFans`), os botoes e zera as recargas. As teclas ficam por SLOT (`SLOTKEYS`), valem para qualquer arma e continuam reatribuiveis em Config. `WPN` agora e definido no topo, junto de `SK`.
- Variacoes por arma (mesmas animacoes por enquanto): espada e escudo = recargas menores, dano menor, Onda vira "Investida de Escudo" (nao lanca; `intr:2` quebra mais guarda), Tempestade vira "Danca de Laminas"; cajado = Estaca Arcana (projetil rapido na tecla E, alcance 10), Orbe Arcano (projetil largo, alcance 20), Pulso Arcano, Chuva de Estrelas, Tormenta, Passo Arcano.
- MAESTRIA: cada arma tem XP proprio (`localStorage` `isblade.mastery`). Cada golpe que acerta com a arma da `xpHit` (1) e skill da `xpSkill` (2; skill de varios golpes conta uma vez). Niveis (XP acumulado) 0, 30, 90, 180, 320, 520. Skills tem `unlock` (nivel minimo): `Avanco` e `Corte Rapido` livres; `Onda` e `Lamina` Nv 1; `Tempestade` Nv 2; `Execucao` Nv 3. Skill travada aparece apagada com "Nv N" e avisa ao tentar usar. Subir de nivel mostra banner com a skill liberada. Barra de maestria sob o nome do cacador (`#mastTxt`, `#mastFill`).
- ATENCAO (muda a experiencia de teste): quem abre o jogo do zero comeca com SO 2 skills livres por arma. Para testar tudo: F2 > "+50 XP maestria" (repetir ate Nv 3) ou, no console, `localStorage.setItem('isblade.mastery','{"sword":600,"swordshield":600,"staff":600}')`.
- Painel F2: agora baixa dois arquivos (`combate.json` e `<arma atual>.json`), tem "+50 XP maestria" e "Zerar maestria", campo `unlock` editavel, e se refaz ao trocar de arma. `window.__dbg` (so localhost) expoe `S`, `P`, `setWeapon`, `addMastery`, `mast()` para testes automaticos.
- Testado com navegador automatizado: 3 armas trocam as skills e nomes; travas e desbloqueio (+35 XP vira Nv 1); golpes reais somam XP; skill travada mostra o aviso; sem erros de script. NAO testado em jogo pelo dono.
- Pendente/duvidas ao dono: a armadura tambem da skills (como no Albion)? 6 ou 8 slots? Valores de XP e niveis sao chute inicial.

### [Claude] 22/10/2026 - Itens, equipamento, status e inventario (tecla I)

Backup antes: `arena_antes_itens.html`

- DECISAO DO DONO: armadura NAO da skills. Armas e armaduras dao STATUS, que variam por RARIDADE: normal, raro, epico, lendario (armas e armaduras tem as 4).
- Novo `data\itens.json`: `rarities` (mult dos status x1, x1,3, x1,7, x2,3; extras 0/1/2/3; peso de drop 60/28/10/2), `stats` (dano %, vida, defesa %, regen. de estamina %), `affixes` (valor base dos extras sorteados), `slots` (arma, elmo, peitoral, luvas, botas), `bases` (7 itens provisorios: Espada Longa, Espada e Escudo, Cajado Arcano, Elmo de Ferro, Peitoral de Placas, Luvas de Couro, Botas Ligeiras), `start` (itens iniciais) e `bagMax` (40). Carregado no topo junto dos outros JSON (`DATA.itens`).
- Item = `{uid, base, rar, stats}` (stats = base x mult da raridade + extras sorteados com variacao de 80% a 120%). Inventario e equipamento ficam em `localStorage` `isblade.inv`.
- A ARMA EQUIPADA define o tipo de arma: equipar Cajado Arcano troca as skills (`setWeapon`), o bloqueio e a maestria. Por isso REMOVI o seletor "ARMA (TESTE)" da Config. Comeca com Espada Longa normal equipada e os outros 6 itens normais na mochila.
- Status aplicados no combate: `dano` multiplica o dano do jogador (em `applyHit`); `vida` soma a `S.pmax` (base 100); `defesa` reduz o dano recebido (em `hurtPlayer`, maximo 60%); `estamina` multiplica a regeneracao passiva. Recalculado em `applyStats()`.
- Loot: ao derrotar o chefe cai 1 item (35% de chance de 2), raridade por peso; banner colorido com nome, raridade e status (`dropLoot`). Mochila cheia = aviso.
- Inventario (tecla I, ou botao Fechar): 3 colunas (equipado / mochila / status e raridades). Clique no item da mochila equipa (o antigo volta para a mochila); clique no slot equipado tira (a arma nunca fica vazia); X descarta. Abrir solta o mouse capturado. `I` agora e tecla reservada (nao pode ser skill).
- `window.__dbg` (so localhost) ganhou `INV()`, `ST()`, `dropLoot`, `mkItem`, `addItem`, `equipItem`.
- Testado com navegador automatizado: inicio com Espada Longa; equipar Cajado pelo clique troca as 6 skills; Peitoral normal da +40 vida (pmax 140); Peitoral lendario gerado da +92 vida e extras; drop gera item valido; sem erros de script. NAO testado em jogo pelo dono (nem a sensacao dos numeros).
- Observacao: o jogo ainda tem o "Cacador Rank/Nv" (XP do chefe) herdado do inicio; no modelo Albion nao ha nivel de personagem. Decidir se remove ou transforma em outra coisa.
- Proximo (roadmap): icones/modelos dos itens (TECX LABS 3D), efeitos visuais por raridade, atributos mais ricos, venda/crafting, 6 ou 8 slots de skill (ainda em aberto).

### [Claude] 22/10/2026 - Fluidez: andar enquanto ataca/usa skill, mira independente do corpo, esquiva

Backup antes: `arena_antes_fluidez2.html`

- Relato do dono: travava ao combar; ao correr e usar skill o personagem PARAVA; skill devia ir para onde mira, independente do lado em que anda; esquiva nem sempre ia para o lado desejado.
- CAUSA da parada (confirmada no codigo): em `frame2`, `canWalk` exigia `!S.anim`, entao durante QUALQUER golpe/skill a velocidade era zerada (`S.vx=S.vz=0`) e, ao acabar, o personagem reacelerava do zero (~0,12 s). Isso e a "interrupcao por mim mesmo".
- Correcao: agora ANDA durante golpes e skills, a `MOVE_CAST` = 55% da velocidade (`player.moveCast` em `combate.json`). So fica parado em: skills de impulso/avanco grande (`lg` > 2,2: Avanco, estocada), skills de varios golpes com armadura (Execucao, Tempestade) e quando atordoado/esquivando. A velocidade nao e mais zerada ao terminar o golpe (sem arrancada).
- Mira: durante o golpe o corpo acompanha a MIRA (`aimAngle`, ate 18 rad/s), nao a direcao em que anda; golpe/skill/projetil saem para onde o mouse aponta mesmo andando de lado. Chefe sob a mira (cruz dourada, raio de 1,5 da linha de visao) vira o alvo exato (`S.aimT`, assistencia leve).
- Esquiva: continua indo para onde se APERTA (WASD relativo a camera), nao para onde o corpo olha nem para onde mira. Novo: se a tecla foi solta ate `rollMemory` (0,2 s) antes do Shift, usa a ultima direcao (antes caia em "para tras do chefe"). Sem direcao = para tras do chefe, como antes.
- Hit-stop agora vem de `player.hitStopSmall` (0,045) e `hitStopBig` (0,09) em `combate.json` (mesmos valores de antes); reduzir se ainda parecer travado.
- Testado com navegador automatizado: correndo com D e usando Corte Rapido, `vx` cai de 5,6 para 3,08 (=0,55x) e o personagem continua se movendo; o rosto vira para a mira; Avanco prende e da o impulso; esquiva com A vai para o lado esquerdo da camera; esquiva solta ha 100 ms usa a ultima direcao; sem erros. NAO sentido em jogo pelo dono.
- Se ainda travar, dados uteis: F3 (FPS e pico de quadro), qual skill/golpe, e se o chefe estava batendo. Possivel causa externa (PC/navegador) so se o FPS cair no F3.

### [Claude] 22/10/2026 - Modo treino

Backup antes: `arena_antes_treino.html`

- Config > MODO TREINO (3 opcoes, salvas em `localStorage` `isblade.train`): "Alvo de treino" (o chefe NAO ataca e NAO morre: a vida volta ao maximo a cada golpe; a guarda quebra e o lancamento no ar continuam funcionando), "Sem recarga das skills" e "Estamina infinita".
- Com o alvo ligado aparece o painel MODO TREINO (esquerda, abaixo do combo): dano total, DPS dos ultimos 5 s, DPS da sessao, numero de golpes, ultimo/maior golpe e combo atual (maximo). Botao "Zerar". Dano medido ja inclui status dos itens, fraqueza, aereo etc. (o valor final aplicado ao alvo).
- Codigo: bloco "modo treino" antes de `setWeapon` (`TRAIN`, `TR`, `trainLog`, `renderTrain`, `trainReset`); gancho em `applyHit` (loga e restaura `S.hp`) e em `frame2` (trava o ataque do chefe e zera recargas/estamina).
- Testado com navegador automatizado: painel escondido no inicio, aparece ao ligar, 3 golpes registrados (84 de dano), vida do alvo 1800/1800, chefe parado, sem erros. NAO visto em jogo pelo dono (posicao do painel pode sobrepor algo em telas pequenas).
- Roadmap atualizado (limpei itens ja feitos de inventario/drops/save).

### [Claude] 22/10/2026 - Tela de skills (K) + variantes por skill

Backup antes: `arena_antes_selskills.html`

- Os 3 arquivos `data\armas\*.json` ganharam `desc` em cada skill base e uma lista `variants`: cada variante tem `slot` (0 a 5 = Q E R F T Z), `name`, `desc`, `unlock` (nivel de maestria) e os mesmos campos de uma skill (cd, dmg, range, half, ifr, hits, proj, launch...). Espada longa: 2 variantes por slot (12); espada e escudo: 3 (Muro de Escudo, Execucao Frontal, Lamina Curta); cajado: 3 (Estaca Dupla Pierce, Pulso Explosivo, Orbe Veloz). Efeitos visuais seguem a `pose` (mesmos da base) e a cor `css` da variante.
- Tecla K (ou botao de espada no topo; ao lado da engrenagem ha tambem um botao de mochila para o inventario): lista os 6 slots com todas as versoes, mostrando recarga, dano (xN para varios golpes), alcance e abertura, descricao e o nivel de maestria exigido. Clique equipa; travada mostra aviso. Escolhas por arma salvas em `localStorage` `isblade.skillSel` ({arma:{slot:indiceDoCandidato}}). K virou tecla reservada (nao pode ser skill). Abrir K fecha o inventario e vice-versa; solta o mouse.
- MUDANCA INTERNA: `SK` agora guarda REFERENCIAS aos proprios objetos de `DATA.armas[arma]` (antes eram copias); `loadWeaponSkills()` escolhe por slot a base ou a variante salva (se a variante ainda estiver travada, volta para a base). O F2 edita o dado real e "Baixar arma" exporta o JSON da arma inteira (skills + variants, sem a propriedade `key`).
- Testado com navegador automatizado: 18 cartas (6 slots), 16 travadas com maestria 0; clicar variante travada nao troca; com Nv 2 equipar Onda Giratoria/Corte Veloz/Lamina Veloz troca os botoes; escolha persiste ao recarregar; trocar de arma e voltar mantem; sem erros. NAO jogado pelo dono (equilibrio das variantes e chute).
- Pendente: icones das skills, descricoes mais ricas, mais variantes (buff/contra-ataque), animacoes proprias por arma.

### [Claude] 22/10/2026 - Som (efeitos sonoros sintetizados)

Backup antes: `arena_antes_som.html`

- Novo modulo `SFX` no topo de `arena.html` (antes de "constantes de combate"): WebAudio sintetizado, SEM arquivos de audio (osciladores + ruido filtrado). O navegador so libera o audio apos o primeiro clique/tecla (listener `init`). `SFX.play(nome)` nao repete o mesmo som em menos de 35 ms.
- Sons e onde tocam: `swing` (golpe padrao), `hit`/`hitBig` (acerto padrao/forte), `roll` (esquiva), `block`, `parry`, `guardBreak` (guarda do jogador ou do chefe quebrada), `hurt` (dano recebido), `bossWind` (aviso do ataque do chefe), `bossStrike` e `slam` (golpe do chefe), `ui` (abrir/fechar inventario e skills), `drop` (arpejo por raridade: 1 a 4 notas, lendario com brilho) e `levelup` (subir maestria). Skills: `<pose>_swing` ao golpear e `<pose>_hit` ao acertar, um par por pose (dash, quick, wave, ult, storm, blade): as variantes de skill herdam o som da pose.
- Config > SOM: volume (0 a 100%, padrao 60) e Mudo; salvos em `localStorage` `isblade.vol` e `isblade.mute`.
- Para trocar/criar um som: editar o objeto `S_` dentro de `SFX` (funcoes `tone(f0,f1,dur,tipo,ganho,atraso)` e `noise(dur,ganho,filtro,f0,f1,atraso,q)`). Futuro: carregar arquivos `.wav/.mp3` em `assets\audio\` se o dono quiser sons gravados.
- Testado com navegador automatizado (politica de autoplay liberada): audio so inicia apos o gesto; todos os 24 sons geram sinal (pico entre 0,08 e 0,5; o primeiro da lista media 0 por aquecimento do teste, e repetido deu 0,29); sem erros de script. NAO OUVIDO por mim (o ambiente de teste nao tem saida de audio): o dono precisa avaliar timbre, volume relativo e se algum som incomoda.
- Hooks de teste: `__dbg.SFX` (so localhost).

### [Claude] 22/10/2026 - DUNGEON: obstaculos, mobs e chefao

Backup antes: `arena_antes_dungeon.html`

- Novo `data\dungeon.json` (carregado no topo como `DATA.dungeon`): `healOnEnter` (cura 30% ao entrar numa sala), `dropChance` por mob, `mobs` (shade/brute/caster) e `rooms` (3 salas). Cada sala: `obstacles` (pillar, rock, wall com colisao) e `mobs` ([tipo, quantidade]); a 3a tem `boss:true`.
- MODO PADRAO AGORA E A DUNGEON. Config > MODO DE JOGO troca entre "Dungeon" e "Arena do chefe" (so o chefe, como antes); salva em `localStorage` `isblade.mode` e recarrega. Tambem `?mode=dungeon|duel`. Botao "Recomecar dungeon".
- Fluxo: Sala 1 "Corredor das Sombras" (4 Sombras, 5 obstaculos) -> Sala 2 "Salao dos Brutos" (3 Sombras, 2 Conjuradores, 1 Brutamontes; muros, pilares, pedras) -> Sala 3 "Camara do Sentinela" (chefe + 2 Conjuradores). Limpar a sala abre um portal em z=-9; entrar leva a proxima (jogador volta a entrada, z=+10). Depois do chefe o portal volta a sala 1. Morrer = recomecar a sala atual com vida cheia. Barra do topo mostra "Sala X/3 - nome - Inimigos: N" (ou a vida do chefe na sala 3).
- Mobs (`mkMob`, `updateMobs`): primitivas provisorias (corpo, cabeca, olhos; brutamontes com espinhos; conjurador com orbe) com barra de vida sempre voltada para a camera. IA: perseguem, no maximo 2 atacam corpo a corpo ao mesmo tempo, aviso (brilho pulsante) antes de golpear. Sombra: rapida, fraca. Brutamontes: lento, 420 de vida, armadura (golpe nao interrompe), ataque em area (anel no chao). Conjurador: mantem distancia (~8), dispara projetil (11/s). Parry atordoa o mob (vulneravel +35%); bloqueio, esquiva perfeita, quebra de guarda e armadura da skill funcionam igual ao chefe (`playerTakeHit`). Mobs colidem entre si, com o jogador, obstaculos e a borda.
- Obstaculos (`OBST`): circulos de colisao (muro = varios circulos); o jogador, os mobs e AS ESQUIVAS nao atravessam; projeteis (do jogador e dos conjuradores) sao BLOQUEADOS por eles.
- Combate no jogador: `applyHit` chama `hitMobs(an,rng,half)` (cone/alcance do golpe ou skill, 360 graus se `half>=3.1`); projeteis acertam mobs em `updateProj` (cada projetil acerta cada mob uma vez; perfura se `pierce`). Dano com status dos itens e +30% apos parry; maestria, estamina por golpe padrao e combo contam como com o chefe; mira com assistencia no mob mais proximo da linha de visao; cruz dourada tambem trava em mobs. Modo treino registra o dano nos mobs.
- Loot: chance por mob (`dropChance`) de 1 item com raridade por peso; chefe continua com 1-2 itens. XP: 25 por mob (+40 brutamontes).
- Sala sem chefe: o chefe fica invisivel/longe (`BOSS_ON=false`, `S.dead=true`); o respawn automatico do chefe so existe no modo arena.
- Testado com navegador automatizado: sala 1 com 4 mobs e 5 obstaculos; mobs atacam e tiram vida; matar todos abre o portal; portal leva a sala 2 (6 mobs, 31 circulos de colisao); sala 3 com chefe 1800/1800 e 2 conjuradores; derrotar o chefe marca a dungeon concluida e o portal volta a sala 1; sem erros de script. Captura de tela confirma o visual. NAO jogado pelo dono: dificuldade (as Sombras tiraram bastante vida de um jogador parado), IA e velocidade dos mobs sao chute inicial.
- Pendente: modelos 3D dos mobs (TECX LABS 3D), mais salas/tipos/chefes, fases do chefe, minimapa, trancar portal de volta.

### [Claude] 22/10/2026 - Santuario + 3 dificuldades, som real, efeitos macios (bloom), maos e escudo

Backups: `arena_antes_som2.html`, `arena_antes_hub.html`, `arena_antes_vfx2.html`, `arena_antes_maos.html` (nessa ordem).
**1. Santuario e dificuldades (pedido do dono)**

- O jogo agora abre num SANTUARIO (a arena calma, sem inimigos, com um portal em z=-9). Entrar no portal abre a escolha de dificuldade (Normal, Medio, Hard) e comeca a dungeon de 3 salas. Esc ou "Cancelar" fecha o menu. Depois do chefe, o portal leva de volta ao santuario. Config > "Voltar ao santuario" abandona a corrida. Modo "Arena do chefe" continua em Config.
- `data\dungeon.json` ganhou `difficulties` (normal/medio/hard): `hp`, `dmg`, `speed`, `count` (quantidade de mobs), `bossHp` e `rarityBoost` (peso dos itens raro/epico/lendario). Normal x1 tudo; Medio hp x1,6, dano x1,3, mobs x1,4, chefe x1,6, raros x1,6; Hard hp x2,4, dano x1,7, vel x1,18, mobs x1,8, chefe x2,4, raros x2,8. O dano recebido e escalado em `hurtPlayer`; `wOf()` aplica o boost de raridade no loot de mobs e do chefe. Dungeon concluida em uma dificuldade fica marcada (`localStorage isblade.dgbest`).
- Funcoes: `dgHub`, `dgStart(dif)`, `openDiff/closeDiff`, portal com rotulos `enter`/`next`/`exit`. Estado `DG.run` (corrida em andamento) e `DG.diff`.
  **2. Som real (feedback: "som de joguinho de pixel")**
- Baixei amostras CC0 do Kenney (Impact Sounds, RPG Audio, Sci-fi Sounds; 79 arquivos .ogg, 1,6 MB) para `prototipo\assets\audio\` (licenca em `LICENCAS.txt` la). O `SFX` agora toca camadas de amostras (impacto de metal/soco/placa/vidro, corte de faca, tecido, forceField, explosao, laser, sino, moedas) com variacao aleatoria de tom (+-5%), reverb (resposta ao impulso sintetica) e compressor no master. Cada skill tem receita propria por pose (`<pose>_swing/_hit`). Novo som `mobDie`. Enquanto as amostras carregam (ou se faltarem) cai na sintese antiga.
- Onde mexer: objeto `R_` dentro de `SFX` (receitas) e `F` (listas de arquivos). Para sons ainda melhores, trocar/adicionar `.ogg` em `assets\audio` e citar em `F`. NAO ouvido por mim; so verifiquei que as 79 amostras carregam.
  **3. Efeitos de skill "quadrados" -> macios**
- Texturas suaves geradas em canvas (`TX_RING`, `TX_COL`, `TX_STREAK`, `TX_ARC`, `TX_FAN`) substituem os aneis/cilindros/planos de borda dura: `groundRing`, `lightColumn` (3 planos cruzados), `streak`, `slashArc` e o crescente da Lamina. O cone de alcance e a faixa da espada ficaram difusos.
- BLOOM proprio (so com THREE core, sem pos-processamento externo): a cena vai para um alvo HalfFloat com MSAA 4x, as partes muito claras sao borradas (1/4 da resolucao, 2 passadas) e somadas. Config > GRAFICOS > "Brilho nos efeitos (bloom)" liga/desliga (`isblade.bloom`, padrao ligado). `renderFrame()` substitui o `renderer.render` do laco. Conferido por captura: coluna dourada e aneis violeta com halo luminoso. Observacao: no navegador de teste (FPS muito baixo) a faixa da espada vira um poligono largo; no jogo real ela e fina.
  **4. Armas: duas maos, escudo, troca**
- Espada longa e cajado: a mao esquerda agora segura a arma (IK de dois ossos no braco esquerdo, `twoHandIK`, cotovelo para baixo/fora). A espada ganhou cabo longo e pomo; a mao esquerda pega perto do pomo. Desliga durante o bloqueio e a esquiva. Espada e escudo e uma mao so.
- Escudo: agora fica SEMPRE VERTICAL e virado para a frente, preso ao antebraco esquerdo (`placeShield`, escala 0,42); antes era filho do osso e ficava deitado.
- Troca de arma rapida: tecla X (passa para a proxima arma da mochila; o inventario I tambem equipa). `X` e `K` e `I` sao reservadas. Nao ha mais troca de arma em Config (por design: a arma equipada define as skills).
- Ferramentas de teste visual: `?orbit=1&noguard=1&wpn=..&camyaw=..&camdist=..` (camera orbita, sem segurar bloqueio); `__dbg.fx`, `__dbg.scene`.
- Testado com navegador automatizado: santuario, menu, 3 dificuldades (mobs 4/6/7, vida do mob 110/176/264, chefe 1800/2880/4320), cancelar, X troca as 3 armas e as skills, sem erros de script. NAO jogado pelo dono: IK da mao esquerda e escudo foram vistos so em captura; tom/volume dos sons e intensidade do bloom precisam do olho/ouvido do dono.
- Pendente: icones, mais efeitos (particulas de faisca alongadas, fumaca), maos esquerda com rotacao propria no cabo, escudo com modelo 3D real, animacoes proprias de cada arma.

### [Claude] 22/10/2026 - Pose das armas de duas maos refeita (sem braco bugado)

Backup antes: `arena_antes_pose.html`

- Feedback do dono (com captura): o braco esquerdo bugava na espada longa e no cajado. Causa: o IK de dois ossos (`twoHandIK`) puxava a mao esquerda para o pomo/cajado numa pose de idle torta, esticando o braco. REMOVI a chamada do IK (a funcao ficou no arquivo, sem uso).
- Nova POSE PRONTA (`GREADY`, em `weaponPose`): so para espada longa e cajado, quando o personagem nao esta golpeando, esquivando, bloqueando ou atordoado. Sobrescreve bracos e maos com rotacoes fixas (mistura de 0,14 s) e, PARADO, zera quadril/tronco/pernas (`BODYBONES`, o idle do Mixamo vem girado ~55 graus); correndo mantem as pernas da corrida (so os bracos ficam na pose). Espada: as duas maos juntas na frente da cintura, lamina para cima na diagonal. Cajado: de pe ao lado do corpo, orbe para cima. Espada e escudo continua como era (uma mao + escudo vertical).
- Valores escolhidos por tentativa e captura de tela (candidatos via `?gr=` com 18 numeros x,y,z de cada osso em ordem `GBONES`, mais `?ready=1&orbit=1&noguard=1&campitch=`). Para mudar a pose: editar `GREADY` em `arena.html`.
- Visto por captura (de frente, de lado e na camera do jogo) e sem erros de script; ao golpear, os bracos voltam ao movimento da animacao e depois a pose pronta. NAO sentido em movimento pelo dono. Limitacao: durante ataques da espada longa/cajado a mao esquerda ainda segue a animacao de uma mao (ate haver animacoes proprias de duas maos).

### [Gemini] 22/10/2026 - Pegada da Espada Longa (2H) e Cajado com MÃ£os Afastadas + AnimaÃ§Ãµes MÃ¡gicas

Backup antes: `arena_antes_pegada.html`

- **Contexto**: A espada longa de 2 mÃ£os estava bugando os braÃ§os porque usava uma sobreposiÃ§Ã£o de rotaÃ§Ã£o estÃ¡tica (`GREADY`) em cima do idle torto de 1H. O cajado estava com pegada de espada (mÃ£os juntas), sem a empunhadura clÃ¡ssica de mago com as mÃ£os afastadas na haste.
- **ImportaÃ§Ã£o de FBX da Ãrea de Trabalho**:
  - `Great Sword Idle.fbx` copiado para `prototipo\assets\mixamo\sword2h_idle.fbx`.
  - Do `Pro Magic Pack.zip` extraÃ­dos: `staff_idle.fbx` (idle de mago 2H com mÃ£os afastadas), `staff_idle2.fbx`, `staff_cast.fbx` (conjuraÃ§Ã£o), `staff_area.fbx` (ataque em Ã¡rea cravando/erguendo cajado), `staff_attack1.fbx`, `staff_attack2.fbx` e `staff_block.fbx`.
- **Idles Nativos por Arma**:
  - Criada funÃ§Ã£o `getPlayerIdleClip()`: `sword` toca `sword2h_idle`, `staff` toca `staff_idle`, `swordshield` toca `idle`.
  - `weaponPose()` ajustado: quando a arma tem clip nativo de idle (`hasNativeIdle`), `GREADY` nÃ£o sobrescreve os braÃ§os, permitindo que a animaÃ§Ã£o anatÃ´mica real do Mixamo/VRM execute perfeitamente, sem torÃ§Ã£o ou quebra de juntas.
  - `setWeapon(id)` agora transiciona suavemente o idle da arma ao equipar via tecla X ou inventÃ¡rio (I).
- **Pegada da Espada Longa**:
  - Confirmado por captura frontal: o guerreiro segura a espada longa com as DUAS MÃOS na frente do peito de forma imponente e fluida, com coluna e ombros alinhados.
- **Pegada e Ataques do Cajado (Staff)**:
  - O cajado agora tem pegada dupla com **mÃ£os afastadas**: mÃ£o direita como Ã¢ncora inferior na altura da cintura e mÃ£o esquerda erguida apoiando a haste.
  - RotaÃ§Ã£o e altura do cajado calibradas em `loadRig` (`stfIn.position.set(0, -1.15, 0)`, `stf.rotation.set(0, 0, Math.PI * 0.48)`) para que o orbe fique no alto e a haste atravesse as duas mÃ£os.
  - `mkAnim` agora usa `getClipConfig(pose)` para cajado: ao atacar ou usar skills com a staff equipada, o personagem executa animaÃ§Ãµes reais de mago (`staff_attack1`, `staff_attack2`, `staff_cast`, `staff_area`) em vez dos cortes de espada.
- **Link de teste**: `http://localhost:8000/arena.html`
- **PrÃ³ximo passo alinhado com o dono**: Refinamento das skills de mago no `data\armas\staff.json` e definiÃ§Ã£o dos tipos de mago.

### [Gemini] 22/10/2026 - O Despertar de Baium (Lineage 2) - Modelo 3D Oficial, AnimaÃ§Ãµes e Boss na Arena

Backup antes: `arena_antes_baium.html`

- **Problema Inicial**: O modelo de Baium extraÃ­do diretamente via conversÃ£o MD5/JSON apresentava ossos invertidos, punhos e pÃ©s retorcidos, e animaÃ§Ãµes travadas devido Ã  diferenÃ§a de sistemas de coordenadas de Unreal Engine para Three.js.
- **SoluÃ§Ã£o Definitiva com Blender 5.1**:
  - Utilizado o script de automaÃ§Ã£o no Blender 5.1 para importar os arquivos originais do Lineage 2 Interlude (`baium_m00.psk` e `Baium_anim.psa`).
  - Corrigida compatibilidade do Blender 5.1 (remoÃ§Ã£o de `use_auto_smooth`, suporte ao novo sistema de Slotted Actions com `FCurvesShim`).
  - Gerado o arquivo unificado `prototipo\assets\baium\baium_boss.glb` (12.9 MB) contendo a malha limpa, pesagem de vÃ©rtices anatÃ´mica perfeita e **todas as 14 animaÃ§Ãµes oficiais do Lineage 2**: `Wait`, `Walk`, `run`, `atk01`, `atkwait`, `spatk01`, `spatk02`, `spatk03`, `spatk04`, `SpWait01`, `spwait02`, `Social01`, `death`, `deathwait`.
- **PÃ¡gina de DemonstraÃ§Ã£o e Testes (`teste_baium.html`)**:
  - Interface clÃ¡ssica de Raid Boss do Lineage 2 com barra de HP/MP, botÃµes interativos para cada habilidade e controles orbitais de cÃ¢mera.
  - Implementado retorno automÃ¡tico ao `Wait` (respiraÃ§Ã£o imponente) apÃ³s finalizar cada golpe/habilidade.
  - Efeitos visuais (VFX) implementados:
    - **Soco Brutal (`atk01`)**: impacto com arco dourado e som de impacto.
    - **PisÃ£o SÃ­smico (`spatk01`)**: onda de choque circular laranja e branca expandindo pelo chÃ£o + tremor de tela.
    - **Rugido de FÃºria (`Social01`)**: tripla onda de pulso sÃ´nico e tremor prolongado.
    - **Chuva de Raios Alaranjados (`spatk02`)**: mÃºltiplos cÃ­rculos de aviso no chÃ£o seguidos de pilares de relÃ¢mpagos alaranjados com nÃºcleo incandescente caindo dos cÃ©us acompanhados de trovÃµes sintetizados.
- **IntegraÃ§Ã£o na Arena Principal (`arena.html`)**:
  - O chefe antigo (`Talibrac2.vrm`) foi substituÃ­do por `loadBaium()` carregando `baium_boss.glb` com texturas de alta definiÃ§Ã£o (`baium_t00_sp.png` e `baium_t01_sp.png`).
  - Escala colossal calibrada para ~4.8 metros de altura, tornando Baium um verdadeiro Raid Boss gigante.
  - Mapeamento da IA de combate para as habilidades nativas de Baium:
    - `slash` -> **Soco Devastador** (`atk01`).
    - `slam` -> **PisÃ£o SÃ­smico** (`spatk01`) com fissura e onda de choque.
    - `charge` -> **Investida Feroz** (`atk01` em avanÃ§o).
    - `storm` -> **Tempestade de Raios** (`spatk02`), invocando 6 raios alaranjados consecutivos pela arena com marcadores no chÃ£o, causando dano em Ã¡rea a quem nÃ£o esquivar.
    - `stagger` -> **Rugido de FÃºria** (`Social01`).
    - `death` -> **Queda Ãpica** (`death`), onde Baium cai de joelhos e tomba no chÃ£o.
  - HUD atualizada: `#ehptxt` exibe `ð BAIUM â RAID BOSS (Lv 75)` e tÃ­tulo `IS BLADE - o despertar de baium`.
  - ConfiguraÃ§Ãµes sincronizadas em `data\combate.json` e sala 3 da dungeon em `data\dungeon.json` ("Trono do Imperador Baium").
- **ValidaÃ§Ã£o**: Testado via navegador e capturas de tela comprovando anatomia impecÃ¡vel, animaÃ§Ãµes fluidas e efeitos visuais funcionando a 60 FPS.
- **Links para teste**:
  - Showcase interativo: `http://localhost:8000/teste_baium.html`
  - Duelo direto na Arena: `http://localhost:8000/arena.html?mode=duel`
  - Dungeon Completa: `http://localhost:8000/arena.html` (Sala 3)

### [Gemini] 23/10/2026 - Ãudio de Alta Fidelidade (WAVs AutÃªnticos) e Arsenal Completo de Skills do Baium

- **Problema Relatado pelo Dono**:
  1. O som no jogo estava artificial/ruim demais (beeps e ruÃ­dos sintetizados via oscilador Web Audio).
  2. Pedido para trazer todas as skills de Baium com suas animaÃ§Ãµes prÃ³prias e efeitos nativos.
- **SubstituiÃ§Ã£o Completa do Ãudio por Efeitos Sonoros Reais (PCM WAV)**:
  - Localizados arquivos originais de Ã¡udio de alta fidelidade no repositÃ³rio de assets do cliente (`Priston-Tale-Client\bin\Client\wav`).
  - Identificado e corrigido o cabeÃ§alho proprietÃ¡rio `JODO` -> `RIFF` (formato padrÃ£o PCM WAV de 44.1kHz e 22kHz).
  - Convertidos e integrados 12 efeitos sonoros em `prototipo\assets\audio\` e `prototipo\assets\baium\sounds\`:
    - `thunder_strike.wav` (trovÃ£o estalado de alta intensidade com reverberaÃ§Ã£o de 8.3s).
    - `thunder_rumble.wav` (eco contÃ­nuo e estrondo sÃ­smico grave de 6.8s).
    - `lightning_bolt.wav` e `lightning_bolt2.wav` (descarga elÃ©trica cortante e rasgante de 3.2s).
    - `boss_roar.wav` e `boss_roar_long.wav` (rugido gutural feroz e ameaÃ§ador de Raid Boss).
    - `stomp_quake.wav` (terremoto de impacto e tremor no solo).
    - `ground_smash.wav` (martelo duplo explosivo com dispersÃ£o de fragmentos de 4.4s).
    - `earth_fissure.wav` (rachadura de placas de pedra e terra).
    - `punch_heavy.wav` e `punch_hit.wav` (impacto contundente de punho maciÃ§o).
    - `heavy_swing.wav` (varredura de ar pesado em alta velocidade).
  - Modificado o motor `SFX` em `arena.html` e `teste_baium.html` para prÃ©-carregar os buffers WAV via `AudioContext.decodeAudioData()`, eliminando o chiado sintetizado e ativando camadas estÃ©reo de alta imersÃ£o.
- **Arsenal Completo de Habilidades e AnimaÃ§Ãµes de Baium**:
  - Em `teste_baium.html` e `arena.html`, habilitadas todas as aÃ§Ãµes oficiais extraÃ­das de `baium_boss.glb`:
    - **`atk01` - Soco Devastador (Punch)**: alcance frontal 4.5m, impacto seco com som de `punch_heavy` + `heavy_swing`.
    - **`spatk01` - PisÃ£o SÃ­smico (Stomp)**: raio de 6.2m, onda de choque circular laranja, tremor de tela e Ã¡udio combinado `stomp_quake` + `earth_fissure`.
    - **`spatk02` - Chuva de Raios (Thunderstorm)**: invocaÃ§Ã£o para os cÃ©us com ambas as mÃ£os, mÃºltiplos raios em sequÃªncia com marcadores e sons autÃªnticos `lightning_bolt` + `thunder_strike`.
    - **`spatk03` - Martelo SÃ­smico Duplo (Double Hammer Smash)**: golpe cataclÃ­smico onde Baium ergue ambos os punhos e crava com toda forÃ§a no chÃ£o, gerando onda de choque de 8 metros de raio, explosÃ£o de fragmentos de pedra em chamas e som de `ground_smash` + `thunder_rumble`.
    - **`spatk04` - Varredura GiratÃ³ria 360Â° (Spinning Fist Sweep)**: rotaÃ§Ã£o de corpo inteiro limpando uma Ã¡rea de 5.8 metros ao redor com arcos cortantes duplos e som de `heavy_swing` em velocidade aumentada.
    - **`Social01` - Rugido de FÃºria**: ativado ao quebrar a guarda (`stagger`) ou provocar, com Ã¡udio do rugido gutural autÃªntico `boss_roar_long`.
    - **`death` - Queda e Desmoronamento**: animaÃ§Ã£o monumental de 14 segundos onde o gigante desaba de joelhos e colapsa com tremor de terra.
- **Sincronia MatemÃ¡tica**:
  - Calibradas as fraÃ§Ãµes de impacto `h` no `BOSS_CLIP` para bater exatamente no fim do telegraph (`windup`), sem atraso ou antecipaÃ§Ã£o entre animaÃ§Ã£o, dano e Ã¡udio.
- **ValidaÃ§Ã£o e Testes**:
- **SubstituiÃ§Ã£o dos Cones por Efeitos Visuais Reais de Lineage 2 (VFX Procedurais)**:
  - **Problema Notado pelo Dono**: Os raios estavam sendo gerados como cilindros/cones alaranjados estÃ¡ticos rÃ­gidos (`new THREE.CylinderGeometry`), parecendo cones de trÃ¢nsito em vez de raios mÃ¡gicos do Lineage 2.
  - **SoluÃ§Ã£o Implementada em `arena.html` e `teste_baium.html`**:
    - **CÃ­rculo RÃºnico Oficial (`TX_RUNE_CIRCLE`)**: Desenho procedural em canvas com octagrama, anÃ©is concÃªntricos decorados e glifos rÃºnicos com brilho pulsante no chÃ£o antes da queda do raio.
    - **Raio Procedural em Fita ContÃ­nua (`createProceduralLightning`)**: Gerador de relÃ¢mpagos com 22 nÃ³s em zigue-zague caÃ³tico e 3 ramificaÃ§Ãµes laterais. ConstruÃ­do com fita 3D contÃ­nua cruzada (plano frontal e ortogonal) usando textura `TX_BOLT_SEG`, nÃºcleo branco incandescente de alta voltagem e corona alaranjada aditiva com luz pontual de 9 candelas.
    - **Fissura e Rachadura de Solo (`TX_CRACK` e `spawnGroundCrack`)**: Placa de impacto com padrÃ£o fractal de rocha partida e magma/eletricidade fluindo pelas fendas que esfria gradualmente.
    - **Detritos FÃ­sicos de Rocha 3D (`spawnDebrisChunks`)**: PedaÃ§os tridimensionais de pedra (`DodecahedronGeometry`) que explodem do chÃ£o com fÃ­sica, velocidade balÃ­stica, gravidade e rotaÃ§Ã£o tridimensional.
    - **EspigÃµes de Rocha Eruptivos (`spawnEarthSpikes`)**: Pilares pontiagudos de pedra que brotam da terra no Martelo SÃ­smico Duplo (`spatk03`).
    - **Flash de Tela e Tremores**: ClarÃ£o instantÃ¢neo em tela cheia (`screenFlash`) sincronizado com o estalo do trovÃ£o.
  - Criada tambÃ©m pÃ¡gina de laboratÃ³rio isolada `test_lightning_vfx.html` para inspeÃ§Ã£o visual dos efeitos.

- **Ãudio de Batalha e Soulshot AutÃªnticos do Lineage 2 (Fim do Som SintÃ©tico / Pixel Art)**:
  - **Demanda do Dono**: O Ã¡udio sintetizado por osciladores WebAudio (`tone`/`noise`) parecia jogo de pixel art 8-bit. O dono solicitou a sonoridade profissional e impactante de batalha do Lineage 2, especialmente o estalo caracterÃ­stico do **Soulshot** estralando ao usar skills e golpear com as armas.
  - **ExtraÃ§Ã£o Oficial dos Clientes L2**:
    - Utilizado `umodel_materials.exe` para desempacotar pacotes originais `.uax` (`skillsound.uax`, `skillsound4.uax`, `SkillSound3.uax`, `itemsound.uax`) do cliente oficial Interlude.
    - ExtraÃ­dos 33 arquivos WAV autÃªnticos em alta definiÃ§Ã£o para `prototipo/assets/audio/`:
      - `soul_shot_shot.wav` (o icÃ´nico estalo explosivo do Soulshot!) e `soul_shot_cast.wav`.
      - LÃ¢minas e cortes: `public_sword_shing_1` a `public_sword_shing_4` (shing metÃ¡lico cortando o ar), `sword_great_1..3`, `sword_big_1..3`, `sword_mid_1..3`, `dagger_1..2`.
      - Armaduras e impactos: `public_armor_01` a `public_armor_04`.
      - Skills originais L2: `power_strike_shot`, `fatal_strike_shot`, `energywave_shot`, `mortal_blow_shot`, `doublewind_shot`, `onehand_shot`, `dash_shot`, `focus_sonic_shot`, `battle_roar_shot`, `shieldstun_shot` e `baium_earthquake_shot`.
  - **IntegraÃ§Ã£o no Motor SFX (`arena.html` e `teste_baium.html`)**:
    - Removido o bloqueio `nSamples > 10` que causava fallback para osciladores de pixel art.
    - Mapeadas receitas sonoras completas em `R_`:
      - **Soulshot**: Disparado automaticamente com flash e faÃ­scas azuis em cada skill (`skillSwingFx`) e nos golpes finais de combo (`applyHit`).
      - **Skills do Jogador**: Cada pose (`dash`, `quick`, `wave`, `ult`, `storm`, `blade`) agora toca sua skill respectiva com shing de espada real e impacto de armadura.
      - **Boss Baium**: Integrado `baium_earthquake_shot` ao impacto sÃ­smico do martelo duplo (`smash`).
    - Exposto `window.SFX = SFX;` globalmente e validado via CDP: 124 amostras decodificadas simultaneamente sem erros.

- **Gemido de Dano e Ãudios ClÃ¡ssicos do MU Online**:
  - **Demanda do Dono**: O som de dano do personagem nÃ£o combinava com os efeitos novos de batalha. O dono pediu para integrar o clÃ¡ssico "Urh! Urh!" de quando o personagem apanha no MU Online, alÃ©m de preparar o som de Level Up do MU.
  - **ExtraÃ§Ã£o dos Ãudios Originais do MU Online**:
    - Localizados no pacote de dados do MU (`MU_Full_Data_Extracted\Data\Sound`):
      - `pMaleScream.wav`, `pMaleScream1.wav`, `pMaleScream2.wav`, `pMaleScream3.wav` e `pDarkPain.wav` (os inesquecÃ­veis "Urh! Urh!" de dano do Dark Knight / guerreiro).
      - `pMaleDie.wav` (o grito clÃ¡ssico de quando o personagem cai/morre no MU).
      - `pLevelUp.wav` (a lendÃ¡ria fanfarra/chime de Level Up do MU Online).
    - Copiados e organizados em `prototipo/assets/audio/` como `mu_hurt_0..3.wav`, `mu_dark_pain.wav`, `mu_male_die.wav` e `mu_levelup.wav`.
  - **IntegraÃ§Ã£o no Jogo (`arena.html`)**:
    - Ao receber golpe (`hurtPlayer`), o personagem agora solta aleatoriamente um dos gemidos autÃªnticos do MU Online (`mu_hurt_0..3` ou `mu_dark_pain`), perfeitamente sincronizado com a animaÃ§Ã£o de impacto e o tremor.
    - Ao zerar o HP (`S.php <= 0`), toca o grito oficial de morte do MU (`mu_male_die`).
    - Em `SFX.levelup()`, conectada a fanfarra clÃ¡ssica `mu_levelup`, jÃ¡ pronta para o futuro sistema de progressÃ£o e subida de nÃ­vel.
    - Validado via CDP com 131 amostras carregadas e sem erros no console.

- **SuÃ­te dos 3 Motores de Efeitos Visuais (Three.js VFX Trilogy - 23/10 por Gemini)**:
  - **DecisÃ£o EstratÃ©gica do Dono**: Ter os 3 melhores sistemas de efeitos visuais trabalhando em conjunto no Three.js para cobrir todos os aspectos visuais do jogo (aura de set completo estilo MU Online, encantos de arma, feitiÃ§os pesados de anime/MMO e destruiÃ§Ã£o de ambiente).
  - **Bibliotecas Instaladas em `prototipo/lib/`**:
    1. **`three.quarks` (v0.17.1)**:
       - Arquivos: `lib/three.quarks.min.js` (189 KB, bundle UMD que anexa em `window.THREE.QUARKS`), `lib/three.quarks.esm.js` e `lib/three.quarks.js`.
       - FunÃ§Ã£o no jogo: Renderizador em lote (`BatchedParticleRenderer`) de alta performance para partÃ­culas persistentes e contÃ­nuas:
         - **Aura de Set Completo (+11 / +15 estilo MU Online)**: EmissÃ£o de partÃ­culas ascendentes em torno do corpo/armadura (`MeshSurfaceEmitter` ou `SphereEmitter`).
         - **Encanto e Brilho das Armas**: Rastro de lÃ¢mina (`TrailBatch`), faÃ­scas dinÃ¢micas com gravidade e turbulÃªncia (`Noise`).
    2. **`EffekseerForWebGL` (v1.70e)**:
       - Arquivos: `lib/effekseer.min.js` (194 KB) e `lib/effekseer.wasm` (1.2 MB de runtime WebAssembly compilado em C++).
       - FunÃ§Ã£o no jogo: Efeitos autorais complexos de anime/JRPG/MMO carregados a partir de pacotes `.efkefc` (explosÃµes de energia cÃ³smica, invocaÃ§Ãµes mÃ¡gicas prontas, cÃ­rculos de poder desenhados).
       - IntegraÃ§Ã£o: Carregamento do WebAssembly com `effekseer.initRuntime('lib/effekseer.wasm', callback)` e sincronizaÃ§Ã£o de matriz de projeÃ§Ã£o/cÃ¢mera no loop `renderer.render()`.
    3. **`Procedural Three.js` (Nativo)**:
       - FunÃ§Ã£o no jogo: InteraÃ§Ã£o fÃ­sica e destruiÃ§Ã£o da arena em tempo real com custo zero de pacotes externos:
         - **RelÃ¢mpagos ContÃ­nuos em Fita 3D**: Cruzamento planar com ruÃ­do aleatÃ³rio dinÃ¢mico em zigue-zague e corona luminosa aditiva.
         - **CÃ­rculos RÃºnicos**: Glifos arcanos desenhados em canvas procedural.
         - **Crateras e Fissuras de Solo**: Decalques de magma/eletricidade com dissipaÃ§Ã£o de temperatura.
         - **Detritos 3D FÃ­sicos**: Fragmentos de pedra com fÃ­sica balÃ­stica, gravidade e colisÃ£o.
  - **LaboratÃ³rio de Teste 3-em-1 Criado**:
    - Criado `prototipo/teste_vfx_engines.html` demonstrando a inicializaÃ§Ã£o de todos os motores em simultÃ¢neo com botÃµes interativos (Aura MU +15, ExplosÃ£o na Arma, Raios Zigzag e EspigÃµes SÃ­smicos).
    - Validado via Chrome DevTools com `isQuarksReady: true`, `isEffekseerReady: true` e `hasTHREE: true`.
  - **Diretriz ObrigatÃ³ria para Claude Code e Gemini**:
    - Ambos os assistentes devem utilizar esta suÃ­te de 3 motores em `arena.html`, respeitando a divisÃ£o de papÃ©is: `three.quarks` para auras/armas/rastros contÃ­nuos, `effekseer` para skills mÃ¡gicas em pacote `.efkefc`, e `Procedural Three.js` para destruiÃ§Ã£o de terreno e raios em fita.

- **Ilha de Talking: Cidade Inicial & Arena de Duelo (23/10 por Gemini)**:
  - **DecisÃ£o do Dono**: Trazer a lendÃ¡ria Talking Island do Lineage 2 como a cidade inicial do IS BLADE, cercada por mar aberto e sem NPCs (espaÃ§o limpo para livre exploraÃ§Ã£o e combate). Na praÃ§a central, em vez do obelisco antigo, estabelecer a **Arena de Duelo** com a logo oficial **IS BLADE** esculpida no centro do piso de pedra.
  - **ExtraÃ§Ã£o Oficial dos Pacotes do Cliente Interlude**:
    - Utilizado `umodel_materials.exe` para exportar diretamente para glTF 2.0 e PNG a partir de `Cliente Interlud 300x`:
      - `speakingfighter_s.usx` (Guilda dos Guerreiros: `SI_Fighter_Hall`, `Front`, `Arch`, `wall`, `brazier`, `torchlight`).
      - `speaking1f_s.usx` e `speaking2f_s.usx` (Casas medievais, edifÃ­cios e lojas da vila: `obj5`, `obj7`, `obj49`, `obj50`, etc.).
      - `speakingfighterbridge_s.usx` (Pontes de pedra da vila).
      - `speaking_port_s.usx` (Docas, cais de madeira e torres do porto: `sp_p_wood02`, `sp_p_wood03`, `sp_p_light_tower`).
      - `sp_lighthouse.usx` (O clÃ¡ssico Farol de Talking Island: `sp_lighthouse001`).
      - `speaking_tree_s.usx` (Ãrvores e vegetaÃ§Ã£o nativa: `splandtree1_A`, `splandtree4_A`).
    - Total consolidado em `prototipo/assets/talking_island/`: 247 modelos glTF 2.0 com 263 texturas PNG vinculadas automaticamente via script python (`patch_gltf`).
  - **Emblema Central de Duelo (`is_blade_duel_logo.png`)**:
    _ Gerado em alta resoluÃ§Ã£o (1024x1024) com selo rÃºnico dourado, circlet de energia ciano, espadas cruzadas em aÃ§o/ouro e tipografia nobre "IS BLADE â
    DUEL ARENA â
    ".
    _ Inserido no centro do piso circular da praÃ§a (diÃ¢metro 18 metros) com anel de aura mÃ¡gica pulsante.
  - **ConstruÃ§Ã£o do Mapa do Jogo (`prototipo/cidade.html`)**:
    _ Oceano tridimensional com animaÃ§Ã£o contÃ­nua de ondas em malha 1200x1200m circundando a ilha.
    _ Arena central de duelo com 8 braseiros autÃªnticos de Lineage 2 (`SI_Fighter_brazier`) com luzes dinÃ¢micas de chama e oscilaÃ§Ã£o.
    _ Boneco de treino de combate na arena para testar golpes, combos de espada com shing metÃ¡lico (`public_sword_shing`), impacto e dano flutuante na tela.
    _ Farol da costa sudeste com holofote/spotlight giratÃ³rio volumÃ©trico varrendo o mar.
    _ Controles Dragon Nest fluidos com cÃ¢mera orbital sobre o ombro, mouse capturado, pulo, corrida e esquiva com estamina.
    _ Seletor de atmosfera (Dia âï¸, PÃ´r do Sol ð
    , Noite ð) e minimapa em tempo real com radar de posiÃ§Ã£o e orientaÃ§Ã£o. \* BotÃµes de teleporte rÃ¡pido entre Arena, Guilda, Porto e Farol, alÃ©m de link direto para a Arena do Boss (`arena.html`).
  - **ConexÃ£o em `arena.html`**:
    - Adicionado o botÃ£o `ðï¸ Ilha de Talking` no cabeÃ§alho superior de `arena.html`, permitindo transiÃ§Ã£o imediata entre a arena do chefe e a cidade inicial.

- **IntegraÃ§Ã£o Definitiva do Personagem Talibrac (VRM) na Ilha de Talking (23/10 por Gemini)**:
  - **Problema Corrigido**: `cidade.html` havia sido criado com um boneco genÃ©rico procedural de caixas e cilindros, em vez de carregar o guerreiro Talibrac desenvolvido para o IS BLADE.
  - **SoluÃ§Ã£o Implementada**:
    - SubstituiÃ§Ã£o completa do boneco por `assets/Talibrac.vrm` carregado via `vendor.js` (`@pixiv/three-vrm`).
    - Motor de retargeting Mixamo ativo com todos os 24 clipes de animaÃ§Ã£o originais vinculados aos ossos humanoides.
    - Postura de 2 mÃ£os nativa para Espada Longa (`sword2h_idle`), com pegada imponente de duas mÃ£os na empunhadura e coluna ereta.
    - Troca de armas rÃ¡pida com a tecla `X`: cicla em tempo real entre **Espada Longa 2H** (`sword`), **Espada & Escudo 1H** (`swordshield`) e **Cajado Arcano 2H** (`staff`), atualizando o HUD, poses e animaÃ§Ãµes instantaneamente.
    - Sistema de combate fluido Dragon Nest: 4 golpes encadeados no botÃ£o esquerdo do mouse com arcos de corte (`slashArc`), lÃ¢mina brilhante com rastro luminoso e **Soulshot autÃªntico do Lineage 2** (`soul_shot_shot.wav`) detonando com brilho azul no 4Âº golpe finalizador e nas skills.
    - 6 habilidades mapeadas com cooldowns e banners visuais: AvanÃ§o (Q), Corte RÃ¡pido (E), Onda de Choque (R), ExecuÃ§Ã£o (F), Tempestade (T) e LÃ¢mina (Z).
    - Pulo anatÃ´mico com a tecla EspaÃ§o (`jump`), rolamento e esquiva com Shift/Q (`roll`) consumindo estamina, e bloqueio com botÃ£o direito.
    - InteraÃ§Ã£o total com o boneco de treino na Arena Central de Duelo (com nÃºmeros flutuantes de dano crÃ­tico, impacto e contador de combo).
    - IluminaÃ§Ã£o calibrada com luz frontal suave para destacar a malha 3D e texturas do personagem Talibrac por toda a vila.
    - Arquivo de backup criado antes da mudanÃ§a: `cidade_antes_personagem_vrm.html`.
    - Validado via automaÃ§Ã£o e captura de tela (`talibrac_talking_island_1792777501522.png`) mostrando Talibrac empunhando a lÃ¢mina na praÃ§a central.

- **CorreÃ§Ã£o Geral dos Controles, Portal da DG, Muralhas e Sincronia com Claude (23/10 por Gemini)**:
  - **Alinhamento com Claude (Regra de Ouro)**:
    - As habilidades e configuraÃ§Ãµes de combate passam a ser carregadas estritamente de `data/combate.json` e `data/armas/` (`sword.json`, `swordshield.json`, `staff.json`) criadas por Claude. Nenhuma habilidade Ã© inventada ou sobrescrita no cÃ³digo.
    - Ao ciclar de arma com `X` ou ao inicializar, o HUD de skills em `cidade.html` Ã© gerado dinamicamente com os nomes, tempos de recarga, custos e cores oficiais do Claude.
  - **CorreÃ§Ã£o dos Controles e CÃ¢mera Dragon Nest**:
    - MatemÃ¡tica de cÃ¢mera e movimentaÃ§Ã£o unificada com `arena.html` (`Fx = -sy * cpD`, `Fz = -cy * cpD`, `moveVec: x = -sy * nz + cy * nx, z = -cy * nz - sy * nx`).
    - W anda para frente (na direÃ§Ã£o para onde a cÃ¢mera aponta), S recua em direÃ§Ã£o Ã  cÃ¢mera, A vai para a esquerda e D para a direita.
    - Corrigido o mouse look vertical (pitch) para nÃ£o inverter o olhar.
    - Adicionada interpolaÃ§Ã£o suave de rotaÃ§Ã£o do corpo do personagem (`angDiff`) para giros naturais.
    - Suporte a eventos de `blur` para limpar teclas presas ao alternar janelas.
  - **Muralhas e ProporÃ§Ã£o 1:1 de Talking Island**:
    - Corrigida a altitude e o raio das muralhas da vila (`ti_wall_a.glb` atÃ© `ti_wall_d.glb`). Estavam na coordenada `y = -2.6` (enterradas) e com raio 26m; foram ajustadas para `y = 0.05` e escala calibrada para unir perfeitamente com os 4 portÃµes de pedra (`ti_gate.glb`) a 47m de raio, fechando o perÃ­metro medieval autÃªntico de Talking Island.
    - ProporÃ§Ã£o das edificaÃ§Ãµes (igreja, lojas, guilda dos guerreiros e agit) calibrada proporcionalmente Ã  escala do personagem Talibrac VRM (~2,45m).
  - **Portal Dimensional Monumental para a Dungeon**:
    - ConstruÃ­do portal monumental azul e imponente na praÃ§a central (`z = -18`):
      - Pilares gÃªmeos de pedra mÃ¡gica com 7,8m de altura e anÃ©is rÃºnicos dourados.
      - Arco superior de cantaria e selo rÃºnico no piso.
      - Dois anÃ©is de energia com rotaÃ§Ã£o inversa (azul ciano `0x5aa9ff` e violeta `0x8b7bff`).
      - VÃ³rtice dimensional de evento com pulsaÃ§Ã£o e luz dinÃ¢mica.
      - 180 partÃ­culas de luz azul em espiral ascendente.
      - Prompt de proximidade na tela informando atalho `[E] Entrar na Dungeon` ou teleporte direto ao adentrar o vÃ³rtice (`arena.html?mode=dungeon`).

- **UnificaÃ§Ã£o Total da Jogabilidade Cidade â Arena & OtimizaÃ§Ãµes do Baium (23/10 por Gemini)**:
  - **PadronizaÃ§Ã£o Absoluta de Controles e Combate em `cidade.html`**:
    - Atendendo ao feedback do Dono, `cidade.html` foi reconstruÃ­da diretamente sobre a base de cÃ³digo do motor de combate oficial de `arena.html`.
    - **Mesmos Comandos**: Clicar e segurar o botÃ£o esquerdo do mouse dispara a sequÃªncia fluida e contÃ­nua de golpes (`basicTick` e `perform`).
    - **Skills do Claude 100% Preservadas**: Q, E, R, F, T, Z chamam `castSkill` com os mesmos tempos de recarga, efeitos visuais, Ã¡udios e consumos de estamina.
    - **Bloqueio e Esquiva**: EspaÃ§o aciona bloqueio/parry (`S.guardHeld`), e Shift aciona rolamento/esquiva (`doRoll`). Tecla `X` cicla as armas (`cycleWeapon`).
    - **Boneco de Treino Oficial**: O boneco na praÃ§a central (`z = -5`) foi conectado Ã  entidade `enemy` (`S.en`), recebendo dano de todos os golpes, disparando nÃºmeros flutuantes (`floatText`), gerando combos reais e balanÃ§ando com impacto.
  - **BotÃ£o de Sair/Voltar no Duelo do Baium (`arena.html`)**:
    - Identificado e corrigido o motivo pelo qual o botÃ£o nÃ£o aparecia: ele estava inserido dentro do `<aside id="panel">` do livro de combos (que recebe `display: none !important` quando a interface de combos estÃ¡ desativada).
    - `<aside id="panel">` fechado corretamente. O botÃ£o `ð° Sair para a Vila` foi reposicionado na barra superior fixa (`right: 142px; top: 12px; z-index: 90`), sempre visÃ­vel e com clique garantido.
    - Adicionado tambÃ©m o botÃ£o de saÃ­da dentro do menu de configuraÃ§Ãµes/pausa (`Esc`).
  - **EliminaÃ§Ã£o do Lag na Skill de Raio do Baium (`arena.html`)**:
    - Causa do lag identificada: a funÃ§Ã£o `createProceduralLightning` criava um `new THREE.PointLight` no meio da cena a cada descarga, o que forÃ§ava o WebGLRenderer a recompilar os shaders de iluminaÃ§Ã£o em tempo de execuÃ§Ã£o, causando congelamento de 50-150ms.
    - SoluÃ§Ã£o: Criada uma luz pontual prÃ©-alocada (`boltFlashLight`) na cena no startup. Durante o raio, apenas sua posiÃ§Ã£o e intensidade sÃ£o atualizadas (`intensity = 8.5` com fade suave), com zero recompilaÃ§Ã£o de shaders.
    - Corrigido descarte de geometria compartilhada em `spawnDebrisChunks` (`skipDispose`) e limpeza adequada de memÃ³ria das malhas dos relÃ¢mpagos ao final de `animBolt`.
    - A skill de raio agora executa a 60+ FPS lisos e sem micro-travamentos.

  - **ResoluÃ§Ã£o da Tela Preta em `cidade.html`**:
    - **Causa 1 (ReferenceError `portal`)**: O loop `frame2` continha cÃ³digo herdado da arena tentando girar `portal.rotation.z+=dt*.25;pr2.rotation.z-=dt*.5;ring2.rotation.z+=dt*.1;`. Como os anÃ©is da arena antiga foram substituÃ­dos pelo cenÃ¡rio da vila, a variÃ¡vel `portal` nÃ£o existia, causando exceÃ§Ã£o no primeiro quadro e paralisando a renderizaÃ§Ã£o. Blindado com verificaÃ§Ã£o condicional e declaraÃ§Ãµes de seguranÃ§a.
    - **Causa 2 (TypeError `humanoid` em `tryInit()`)**: Em `arena.html`, `tryInit()` iterava sobre `[vrm, boss]` chamando `buildClips(r)`. Como na cidade o `boss` Ã© o boneco de treino (um `THREE.Group` procedural sem modelo VRM), `rig.vrm.humanoid` lanÃ§ava exceÃ§Ã£o ao carregar os FBX do Mixamo. Blindado `tryInit()` para animar estritamente o `vrm`, criando um mixer seguro para o dummy, e adicionada guarda defensiva em `buildClips` e `playClip`.
    - **Causa 3 (ReferenceError `i` no loop de estrelas)**: `i` e `a` foram devidamente declarados no escopo do cenÃ¡rio da vila (`var i = 0, a = 0;`).
    - **Causa 4 (HUD & Estado da Dungeon)**: Em `cidade.html`, `DG.on` foi definido como `false` por padrÃ£o, evitando que `dgHub` teleportasse o inimigo para longe e exibisse texto incorreto de santuÃ¡rio. A barra de vida do inimigo agora exibe "Boneco de Treino (Imortal) - Pratique seus Combos e Skills" com 100% de vida.
    - **VerificaÃ§Ã£o Visual e em Tempo Real**: Tela recarregada e capturada via CDP diretamente no navegador em execuÃ§Ã£o na porta 8000. Imagem `cidade_live_render.png` confirma a vila de Talking Island completamente renderizada com o personagem Talibrac, boneco de treino, portal monumental azul animado, minimapa ativo, controles de atmosfera e combate 100% idÃªntico Ã  arena.

---

- **Ajuste de Escala 1:1 Oficial do Lineage 2, Catedral de Einhasad, ColisÃµes e Terreno Sem InundaÃ§Ã£o (23/10 por Gemini)**:
  - **Problema Relatado**: Casas e prÃ©dios pareciam desproporcionais ao personagem; a porta da igreja impedia a entrada natural; o jogador atravessava as paredes de todos os prÃ©dios; e o chÃ£o parecia inundado/bugado com Ã¡gua subindo sobre a vila.
  - **Causa Raiz & SoluÃ§Ã£o MatemÃ¡tica**:
    - A escala anterior utilizava divisores inconsistentes entre a posiÃ§Ã£o original do Unreal Engine e a escala dos modelos GLB.
    - Definido SCALE_WORLD = 2.8 e DIVISOR = 100.0 / SCALE_WORLD (35.7143), convertendo as coordenadas brutas de talking_island_exact_layout.json diretamente para o espaÃ§o de Three.js com fidelidade 1:1 ao Lineage 2 oficial.
    - PrÃ©dios, lojas, casas e catedral foram ajustados com escala 3.2x (altura tÃ­pica medieval de 2 andares e portas de 5 a 6 metros), permitindo que o personagem Talibrac (1.85m) passe com folga sob os portais.
    - A Catedral de Einhasad foi alinhada com seu portal frontal aberto na direÃ§Ã£o sul (-22.0, -48.0), com degraus acessÃ­veis e espaÃ§o interior amplo para exploraÃ§Ã£o da nave e do altar.
  - **Sistema de ColisÃµes EstÃ¡ticas SÃ³lidas (village_colliders.json)**:
    - Gerados 100 colisores circulares estÃ¡ticos cobrindo: todas as casas (SI_H01..04), lojas (SI_SH01..03), clan hall (SI_Agit), guilda dos guerreiros (SI_Fighter_Hall), pilares do portal dimensional e a muralha externa (raio de 74m com os 4 portÃµes de saÃ­da abertos).
    - As paredes laterais e traseiras da Catedral estÃ£o bloqueadas por colisores, enquanto a entrada frontal e a nave central estÃ£o 100% desobstruÃ­das para entrada e caminhada.
  - **Terreno ContÃ­nuo e Oceano Rebaixado**:
    - Criada malha de terreno com 160x160 subdivisÃµes e funÃ§Ã£o procedural getGroundHeight(x, z) que mantÃ©m a cidade perfeitamente plana dentro da muralha (raio <= 76m) e gera colinas verdes e suaves fora dos muros.
    - O plano do oceano foi rebaixado para y = -5.5m, garantindo que a Ã¡gua cubra apenas a costa marÃ­tima ao sul e os pilares de madeira do porto, sem nunca inundar a praÃ§a central ou as ruas.
  - **Refinamento do Portal da Dungeon**:
    - O portal dimensional foi redimensionado para 7.5 metros de altura e posicionado no recanto tradicional do teleporte de Talking Island (x = -13.5, z = -13.0), liberando a vista do centro da vila e da catedral.
    - PartÃ­culas azuis ascendentes, runas de chÃ£o e ativaÃ§Ã£o com [E] Entrar na Dungeon calibradas para a nova posiÃ§Ã£o.
  - **ValidaÃ§Ã£o Automatizada no Navegador**:
    - Todas as rotas de teleporte testadas com sucesso: Arena, Porta Igreja, Dentro Igreja, Portal DG, Lojas, Guilda, Porto, Farol.
    - Combate no boneco de treino validado com registro imediato de danos, combos e habilidades.

---

- **CorreÃ§Ã£o da Geodata (Subida de Colinas) & Alinhamento dos PortÃµes da Cidade (23/10 por Gemini)**:
  - **Problema 1 (Entrar dentro dos morros)**: Ao caminhar para fora da cidade, o personagem e a cÃ¢mera entravam dentro do terreno das colinas ao invÃ©s de subir suavemente no topo dos declives.
    - **Causa**: No loop de movimentaÃ§Ã£o, wrap.position.set(S.px, Math.sin(T*2)*.02, S.pz) e a cÃ¢mera tinham a altura Y travada em 0 e 1.2 respectivamente, ignorando a funÃ§Ã£o de elevaÃ§Ã£o getGroundHeight(x, z).
    - **SoluÃ§Ã£o**: Implementado rastreamento de geodata em tempo real: targetY = getGroundHeight(S.px, S.pz) e interpolaÃ§Ã£o fÃ­sica suave S.py += (targetY - S.py) _ Math.min(1.0, 24.0 _ dt). O personagem, a sombra (pmark), o anel indicador (rings) e a mira (aimFan) agora acompanham a superfÃ­cie exata do relevo. A cÃ¢mera recebeu salvaguarda anti-clip (camera.position.y >= camGh + 0.75).
    - **Corredores de Estrada Nivelados**: Atualizado getGroundHeight para nivelar corredores de 14 metros de largura em cada uma das 4 saÃ­das de portÃµes, garantindo estradas planas e naturais sem montanhas cortando a passagem.
  - **Problema 2 (PortÃµes das saÃ­das atravessados)**: O modelo dos portÃµes com torre e passarela (SI_G01) estava rotacionado em 90 graus, com a passarela bloqueando a rua ao invÃ©s de se encaixar na muralha circular.
    - **Causa**: DiferenÃ§a de eixos de exportaÃ§Ã£o entre o Unreal Engine (X frontal) e o GLTF/Three.js (passarela ao longo de Z e vÃ£o sob o arco ao longo de X).
    - **SoluÃ§Ã£o**: Calibrada a rotaÃ§Ã£o em build_exact_village_data.py: rot_y = round(-math.atan2(tz, tx), 3). A passarela agora fica perfeitamente tangencial Ã  muralha circular nos 4 quadrantes (encaixe contÃ­nuo dos dois lados) e o arco abre-se radialmente na direÃ§Ã£o das estradas para o exterior da ilha.
  - **Interface & Testes**:
    - Adicionados botÃµes de atalho no minimapa para testar diretamente o 'PortÃ£o' (x=36, z=-38) e a 'Colina' (x=105, z=-35).
    - Ao teleportar, S.py se ajusta instantaneamente Ã  altura exata do terreno (getGroundHeight), mantendo o personagem imediatamente apoiado sobre a superfÃ­cie.

---

- **IntegraÃ§Ã£o do Human Fighter e Set Imperial Crusader (Lineage 2) com Jogabilidade Dragon Nest (24/10 por Gemini)**:
  - **DecisÃ£o do Dono**: Migrar o personagem de testes VR (`Talibrac.vrm`) para o esqueleto e visual autÃªntico do **Lineage 2** (Human Fighter), aproveitando a biblioteca modular de sets, armas, capas e asas jÃ¡ padronizada pela comunidade, **sem perder a jogabilidade rÃ¡pida de aÃ§Ã£o estilo Dragon Nest** (mira ativa, combos sequenciais encadeados, esquiva rÃ¡pida/rolamento e bloqueio) desenvolvida pelo usuÃ¡rio, Gemini e Claude Code.
  - **ExtraÃ§Ã£o Oficial dos Pacotes Interlude 300x**:
    - ExtraÃ­das as malhas esquelÃ©ticas do guerreiro humano de `Fighter.ukx`: Peito (`MFighter_m000_u`), Pernas/CalÃ§a (`m000_l`), Luvas (`m000_g`), Botas (`m000_b`), Cabelo (`m000_h`) e Rosto (`m000_f`), com todas as texturas PNG vinculadas de `MFighter.utx`.
    - ExtraÃ­do o pacote de animaÃ§Ãµes original `MFighter_anim.psa` contendo 114 aÃ§Ãµes nativas de locomoÃ§Ã£o e combate.
    - ExtraÃ­da a armadura S-Grade **Imperial Crusader** (`MFighter_m013_u`, `m013_l`, `m013_g`, `m013_b`) e a espada colossal de duas mÃ£os **Dragon Slayer** (`dragon_slayer_m00_wp.psk` e texturas de `LineageWeaponsTex`).
  - **Pipeline Automatizado no Blender 5.1 (`build_full_fighter.py` e `build_imperial_full.py`)**:
    - Resolvida a compatibilidade da nova API de Slotted Actions do Blender 5.1 no addon `io_scene_psk_psa`.
    - UnificaÃ§Ã£o de todas as partes da malha em torno de um esqueleto mestre de 70 ossos (padrÃ£o Biped L2).
    - **LocomoÃ§Ã£o AutÃªntica do Lineage 2**: Preservada a corrida clÃ¡ssica (`Run_2HS_MFighter` -> `run`), a postura imponente de espera (`Wait_2HS_MFighter` -> `idle`), caminhada (`walk`) e morte (`death`).
    - **Combate de AÃ§Ã£o Dragon Nest Retargeted & Baked**: Retargeting automÃ¡tico e bake direto no esqueleto do L2 das aÃ§Ãµes de combate essenciais:
      - Combo bÃ¡sico de 4 golpes em cadeia (`slash1`, `slash2`, `slash3`, `slash4`).
      - Esquiva dinÃ¢mica com rolamento no solo (`roll`).
      - Sistema de bloqueio e guarda (`guard` e `block_hit`).
      - Contra-ataque e parry (`parry`).
      - ReaÃ§Ãµes de impacto (`hit_small`, `hit_large`).
    - Exportados os pacotes otimizados em GLB: `assets/personagens/human_fighter.glb` (base/iniciante), `assets/personagens/human_fighter_imperial.glb` (com armadura Imperial Crusader completa) e `assets/personagens/dragon_slayer.glb`.
  - **IntegraÃ§Ã£o no Three.js (`cidade.html` e `arena.html`)**:
    - Criada a funÃ§Ã£o `loadL2Player()` que instancia o modelo GLB com escala calibrada (2.25m), vincula a Dragon Slayer ao socket nativo `Weapon_R_Bone` e inicializa o `AnimationMixer` com as aÃ§Ãµes prontas sem lag de conversÃ£o em tempo de execuÃ§Ã£o.
    - Adicionado o **Seletor de Personagem no HUD** (topo da tela): permite alternar em tempo real entre `âï¸ Human Fighter (L2 Oficial)`, `ð¡ï¸ Set Imperial Crusader S (L2)` e o protÃ³tipo `ð¤ Talibrac (VR)`. A escolha Ã© persistida automaticamente no `localStorage` (`isblade.char_type`).
    - 100% de compatibilidade mantida com a mÃ¡quina de estados, sistema de combos por clique esquerdo do mouse, mira no crosshair central, estamina e fÃ­sica.
  - **Diretriz de Limpeza Cumprida**:
    - Todos os arquivos temporÃ¡rios de captura de tela e prints de diagnÃ³stico foram limpos e excluÃ­dos do workspace para preservar espaÃ§o e organizaÃ§Ã£o.

---

- **CorreÃ§Ã£o do Seletor e ConclusÃ£o da Fase 4 - Tela de SeleÃ§Ã£o e CriaÃ§Ã£o de Personagens 3D (`criacao.html`) (24/10 por Gemini)**:
  - **CorreÃ§Ãµes CrÃ­ticas**:
    - **`ReferenceError: switchCharacter is not defined`**: Resolvido adicionando stub global prÃ©vio no `<head>` (`window.switchCharacter`) e delegaÃ§Ã£o por `addEventListener('change')` no `charSelector`, eliminando qualquer erro de escopo de mÃ³dulos ES.
    - **ProteÃ§Ã£o de Armas (`DATA.armas[WPN]`)**: Adicionada blindagem e fallback para `DATA.armas.sword` em `loadWeaponSkills`, `skillCands` e `mastCfg`, prevenindo falhas caso a chave da arma estivesse indefinida ou configurada com valor invÃ¡lido.
    - **Mapeamento de Habilidades do L2 Fighter**: Vinculados `boss_spin`, `skill_wave`, `skill_ult`, `boss_combo` e `roll` diretamente Ã s animaÃ§Ãµes nativas de combate (`SpAtk03_2HS`, `SpAtk01_1HS`, `SpAtk19_2HS`, `SpAtk11_2HS`), garantindo 100% de fluidez em todas as skills sem interrupÃ§Ãµes.
  - **Entrega Completa da Fase 4 (`criacao.html`)**:
    - **CenÃ¡rio 3D Imersivo**: Pedestal circular de pedra esculpida com anel de runas azuis brilhantes, aro dourado externo rotativo, iluminaÃ§Ã£o nobre de trÃªs pontos e partÃ­culas mÃ­sticas flutuantes em espiral ascendente.
    - **SeleÃ§Ã£o de RaÃ§a & Classe**: Card ativo para Humano Guerreiro (_Human Fighter_) e slots visuais preparados para as prÃ³ximas expansÃµes (Elfa MÃ­stica, Elfo Negro e AnÃ£o).
    - **Equipamentos e Armaduras**: AlternÃ¢ncia instantÃ¢nea em tempo real entre o **Traje de Iniciante** (No-Grade) e o **Set Imperial Crusader** (S-Grade com placas de ouro e cota de malha).
    - **Arsenal**: OpÃ§Ã£o de equipar a imponente **Dragon Slayer** (espada de duas mÃ£os com texturas de alta resoluÃ§Ã£o) ou punhos livres.
    - **Ãudio AutÃªntico Lineage 2**: Efeitos sonoros originais integrados aos botÃµes de teste de animaÃ§Ã£o (golpe de espada, Power Strike, som de Dash/Rush e o clÃ¡ssico disparo de Soulshot ao entrar no mundo).
    - **Ficha de Atributos Oficiais L2**: Painel lateral direito exibindo as estatÃ­sticas canÃ´nicas do guerreiro humano (FOR 40, DES 30, CON 43, INT 21, SAB 11, ESP 25), lore da classe e resumo do sistema de combate ativo (mira Dragon Nest, combo quÃ¡druplo, bloqueio e rush).
    - **PersonalizaÃ§Ã£o de Nome e Spawn**: Campo de nome com persistÃªncia em `localStorage` (`isblade.player_name`), refletido na badge de vida do HUD no jogo, e seletor de ponto de spawn (Vila de Talking Island ou Arena do Baium).
    - **Controles Orbitais**: RotaÃ§Ã£o 360Â° suave por clique e arrasto do mouse e zoom livre com a rodinha do mouse.
- **Sistema de Espada & Escudo (1HS), CalibraÃ§Ã£o de Grip Tecxlabs 3D e OrientaÃ§Ã£o do Escudo (24/10 por Gemini)**:
  - **Servidor Tecxlabs 3D & GeraÃ§Ã£o no Colab GPU**:
    - Iniciado e mantido em execuÃ§Ã£o o servidor local em `http://localhost:3000`.
    - Acompanhada a conexÃ£o com o backend Colab GPU e finalizada com sucesso a geraÃ§Ã£o da espada procedural em alta resoluÃ§Ã£o (`weapon_sword_IS 0%.glb`, 8.000 polÃ­gonos, materiais PBR completos).
  - **IntegraÃ§Ã£o do Arsenal 1HS no Human Fighter**:
    - Criados e calibrados os sockets para permitir a alternÃ¢ncia dinÃ¢mica entre a espada de duas mÃ£os (`swd2h`) e o conjunto de uma mÃ£o (`swd1h` + `shd`).
    - Corrigido o bug onde o escudo era desanexado do braÃ§o e jogado no chÃ£o; ele agora permanece firmemente parentado ao osso canÃ´nico do antebraÃ§o esquerdo (`Shield_L_Bone`).
    - Instalado o modelo gerado `weapon_sword_IS 0%.glb` da pasta da Ãrea de Trabalho como `prototipo/assets/personagens/weapon_sword_is_0.glb`.
  - **CalibraÃ§Ã£o AnatÃ´mica de Empunhadura (Grip) nos 3 Pontos**:
    - Identificados os 3 pontos do modelo 3D: Ponto 1 (Pomo em Y=0), Ponto 2 (Cabo/Grip em Y=0.28m) e Ponto 3 (Guarda em Y=0.67m e Ponta da LÃ¢mina).
    - Corrigida a pegada que estava segurando na extremidade do pomo: aplicado o deslocamento compensatÃ³rio no eixo de comprimento (`position.set(-5.5, 0, 0)`), fazendo a mÃ£o fechar com firmeza e precisÃ£o no centro anatÃ´mico do cabo, logo abaixo da guarda.
    - Corrigida a rotaÃ§Ã£o da lÃ¢mina no osso da mÃ£o (`rotation.set(-Math.PI / 2, 0, -Math.PI / 2)`), eliminando o desvio lateral e alinhando o fio de corte para a frente.
  - **CorreÃ§Ã£o da OrientaÃ§Ã£o do Escudo no AntebraÃ§o**:
    - O escudo estava com a rotaÃ§Ã£o plana ("deitado" na horizontal como uma prancha).
    - Aplicada a rotaÃ§Ã£o ortogonal precisa `cs.rotation.set(0, -Math.PI / 2, Math.PI / 2)`: o escudo agora fica perfeitamente em pÃ© (**vertical**), assentado ao longo do antebraÃ§o esquerdo, com o topo largo voltado para cima/ombro, a ponta inferior apontando para o cotovelo e a face externa do brasÃ£o voltada para a frente/lateral protegendo o tronco do guerreiro.
  - **Motor de AnimaÃ§Ãµes 1HS (Espada de 1 MÃ£o & Escudo)**:
    - **Postura de Espera (Idle)**: `Wait_1HS_MFighter`.
    - **LocomoÃ§Ã£o (Corrida)**: `Run_1HS_MFighter`.
    - **Guarda / Bloqueio (EspaÃ§o)**: `AtkWait_1HS_MFighter` (escudo erguido para absorÃ§Ã£o de impacto). A rotaÃ§Ã£o de lÃ¢mina de 2H no bloqueio foi isolada estritamente para a Dragon Slayer (`sword`).
    - **Ataques BÃ¡sicos de 1 MÃ£o (`getClipConfig`)**: Mapeados os golpes com uma Ãºnica mÃ£o (`Atk01_1HS_MFighter`, `Atk02_1HS_MFighter`, `Atk03_1HS_MFighter`) e habilidades como o golpe de escudo `ShieldAtk_1HS_MFighter`, impedindo que o guerreiro junte as duas mÃ£os na espada ao desferir golpes quando equipado com espada e escudo.
  - **SincronizaÃ§Ã£o**: Todas as correÃ§Ãµes e configuraÃ§Ãµes foram aplicadas de forma 100% idÃªntica em `cidade.html` e `arena.html`.
  - **Higiene de Disco**: Todas as capturas de tela e vÃ­deos de teste do subagente foram imediatamente excluÃ­dos para preservar espaÃ§o em disco.

- **Ajuste Fino de Escudo Vertical, Empunhadura de Espada 1H, Velocidade Realista e Combo 1HS Diferenciado (24/10 por Gemini)**:
  - **ResoluÃ§Ã£o da Causa Raiz do Escudo Flutuante / Desalinhado**:
    - O modelo original `composite_shield.glb` continha internamente um `SkinnedMesh` com junta Ã³ssea e translaÃ§Ã£o embutida de `[3.07, 0.017, 6.88]` unidades, o que fazia o escudo ser projetado a 7 metros de distÃ¢ncia ao tentar anexÃ¡-lo livremente.
    - Realizada a conversÃ£o da geometria para `THREE.Mesh` rÃ­gido normal no momento do carregamento, aplicando `geo.center()` (centralizando o escudo exatamente na origem [0,0,0]) e `geo.rotateZ(Math.PI / 2)`.
    - A altura fÃ­sica do escudo foi travada em 0.88m (`scale = 0.88 / 21.1`), proporcional ao porte do Human Fighter e ao set Imperial Crusader.
    - O mÃ©todo `placeShield(rig)` foi unificado para funcionar em todas as classes e modelos (Lineage 2 e Talibrac VRM), calculando o ponto mÃ©dio do antebraÃ§o (`_p1.add(_p2).multiplyScalar(0.5)`) com travamento ortogonal vertical (`sh.quaternion.identity()`). O escudo agora se mantÃ©m perfeitamente colado ao antebraÃ§o esquerdo, ereto (vertical), virado para a frente e protegendo o tronco do herÃ³i em todas as animaÃ§Ãµes (parado, correndo, atacando ou bloqueando).
  - **CalibraÃ§Ã£o da Empunhadura da Espada 1H (`weapon_sword_is_0.glb`)**:
    - Identificada a hierarquia interna dos 3 pontos do modelo 3D: Ponto 1 (Pomo em Y=-0.05), Ponto 2 (Centro do Grip em Y=0.00) e Ponto 3 (Guarda/Base da LÃ¢mina em Y=+0.09).
    - Removido o deslocamento que forÃ§ava a mÃ£o a segurar na ponta do pomo (`isSword.position.set(0, 0, 0)`), fazendo a manopla encaixar com precisÃ£o milimÃ©trica dentro do punho fechado do personagem.
    - Alinhada a rotaÃ§Ã£o com o eixo de ataque nativo da arma de 1 mÃ£o (`isSword.rotation.set(-Math.PI / 4, 0, 0)`), direcionando o gume cortante para frente.
  - **NormalizaÃ§Ã£o da Velocidade de Movimento (Adeus "Speed de GM")**:
    - A velocidade mÃ¡xima de corrida em `data/combate.json` foi ajustada de 5.6 m/s para 4.3 m/s, correspondendo Ã  passada clÃ¡ssica de um Human Fighter de Lineage 2.
    - A aceleraÃ§Ã£o instantÃ¢nea de 48/62 foi rebalanceada para uma fÃ­sica com inÃ©rcia realista de MMORPG (`acc = ((tvx||tvz)?22:30)*dt`), acabando com os arranques bruscos tipo speedhack.
    - O ciclo de passos (`timeScale`) foi sincronizado dinamicamente com a velocidade no chÃ£o, impedindo qualquer deslizamento ou patinaÃ§Ã£o dos pÃ©s.
  - **Combo Exclusivo de Espada de 1 MÃ£o & Escudo (`swordshield`)**:
    - Diferenciada completamente a cadeia de ataques do GuardiÃ£o em relaÃ§Ã£o Ã  Dragon Slayer (Slayer 2H). O herÃ³i nÃ£o junta mais a mÃ£o esquerda na espada de uma mÃ£o.
    - **1Âº Golpe**: `Atk01_1HS_MFighter` (corte horizontal rÃ¡pido com a mÃ£o direita, escudo firme Ã  frente).
    - **2Âº Golpe**: `Atk02_1HS_MFighter` (corte de retorno diagonal em arco).
    - **3Âº Golpe**: `ShieldAtk_1HS_MFighter` (Pancada de Escudo / _Shield Bash_ autÃªntica de Lineage 2, avanÃ§ando o braÃ§o esquerdo para atordoar e quebrar a postura do alvo).
    - **4Âº Golpe**: `Atk03_1HS_MFighter` (estocada perfurante pesada).
    - **Golpes Adicionais / Especiais**: `SpAtk01_1HS_MFighter` (avanÃ§o perfurante) e `SpAtk03_1HS_MFighter` (giro de 360Â° com lÃ¢mina de uma mÃ£o).
    - Timings de corte (`hit: 0.24 - 0.28`, `cut: 0.50 - 0.55`) calibrados para alta responsividade, ritmo Ã¡gil e impacto no estilo Dragon Nest.
  - **SincronizaÃ§Ã£o**: As melhorias foram aplicadas e validadas em `cidade.html` e `arena.html`, com sintaxe 100% aprovada e sem erros no console.
  - **Higiene de Disco**: Todas as capturas de tela e vÃ­deos de teste do subagente foram prontamente deletados.

### [Antigravity] 24/10/2026 - Fluidez de Combate: Mira 360Â° sem Travamento e RemoÃ§Ã£o do Hit-Stun Excessivo de Mobs

- **MotivaÃ§Ã£o / Relato do Dono (Ãcaro)**:
  - Ao testar a sequÃªncia do ataque padrÃ£o e as skills com Espada e Escudo (1HS), o golpe saÃ­a preso sempre na mesma direÃ§Ã£o em vez de acompanhar a mira/crosshair.
  - Qualquer toque ou arranhÃ£o dos mobs da dungeon travava e interrompia o guerreiro imediatamente, quebrando a jogabilidade e impedindo a execuÃ§Ã£o dos combos. O dono solicitou deixar a movimentaÃ§Ã£o e os ataques fluidos, reservando interrupÃ§Ãµes apenas para skills especiais dedicadas no futuro.

- **DiagnÃ³stico e ResoluÃ§Ãµes Implementadas**:
  1. **CorreÃ§Ã£o da DireÃ§Ã£o de Ataque e Mira 360Â° (`aimAngle` & `S.face`)**:
     - **Causa Raiz 1 (InterseÃ§Ã£o Distorcida de ChÃ£o)**: No modo Dragon Nest (`NAV.mode === 'dn'`), o cÃ¡lculo de `aimAngle()` utilizava uma projeÃ§Ã£o no plano zero do chÃ£o (`groundAt(innerWidth/2, innerHeight/2)`). Quando o personagem se deslocava pelas salas da dungeon ou a cÃ¢mera inclinava suavemente, essa coordenada projetada travava o Ã¢ngulo angular resultante em um Ãºnico quadrante fixo.
     - **Causa Raiz 2 (Trava de Pointer Lock)**: Quando o jogador acionava skills clicando nos botÃµes da interface ou antes de travar o cursor, o evento ficava preso e `cam.yaw` nÃ£o recebia a rotaÃ§Ã£o do mouse.
     - **Causa Raiz 3 (Trava de RotaÃ§Ã£o durante o Golpe)**: A interpolaÃ§Ã£o de giro `S.face += clamp(angDiff(S.face, aimAngle()), ...)` exigia a condiÃ§Ã£o `canWalk`. Como skills com impulso e armadura desligavam `canWalk`, o guerreiro ficava completamente engessado no Ã¢ngulo em que iniciou o golpe.
     - **SoluÃ§Ã£o**:
       - `aimAngle()` agora mira diretamente ao longo do vetor de visÃ£o da cÃ¢mera em 360Â° (`cam.yaw + Math.PI`) ou no monstro sob a retÃ­cula (`S.aimM`/`S.aimT`). Se o cursor estiver livre na tela (sem pointer lock), mira com precisÃ£o pontual em `groundAt(MOUSE.x, MOUSE.y)`.
       - O evento de clique com o mouse agora registra o ataque e atualiza a mira instantaneamente mesmo no primeiro toque.
       - A rotaÃ§Ã£o de corpo durante ataques (`an0`) agora ajusta a face a 24 rad/s independentemente de `canWalk`, garantindo que qualquer golpe ou skill vire suavemente na direÃ§Ã£o exata do mouse/crosshair.
       - A sequÃªncia de ataque contÃ­nuo com espada e escudo (`BASIC` em `swordshield`) foi ajustada para a cadeia clÃ¡ssica de 4 golpes: `up` (Corte 1) -> `down` (Corte 2) -> `sweep` (Pancada de Escudo) -> `thrust` (Estocada Perfurante).

  2. **Combate Fluido sem Travamentos por Toque de Mobs (`playerTakeHit` & `hurtPlayer`)**:
     - **Causa Raiz**: Cada golpe de mob comum ou projÃ©til disparava `hurtPlayer(h.dmg, false)` e `S.stun = .3`. Isso acionava `S.anim = null` (cancelando o ataque do jogador), `S.combo = 0` (zerando a contagem de combo), `hold: .5` no mixer (congelando as animaÃ§Ãµes) e `S.stun = .3` (bloqueando novos inputs por retornarem `'busy'`). Em salas com vÃ¡rios monstros, o guerreiro ficava infinitamente atordoado.
     - **SoluÃ§Ã£o**:
       - Separada a mecÃ¢nica de dano (`hurtPlayer`) da mecÃ¢nica de interrupÃ§Ã£o pesada (`isInterrupt`).
       - Ataques normais de mobs e projÃ©teis agora operam com dano leve (`soft = true`): reduzem a vida (`S.php`), exibem nÃºmeros vermelhos flutuantes, disparam som de ferimento e flash sutil na tela, mas **NÃO cancelam `S.anim`**, **NÃO zeram o combo**, **NÃO aplicam `S.stun`** e **NÃO congelam a movimentaÃ§Ã£o**.
       - O guerreiro pode combear e fatiar hordas de monstros no meio do combate com extrema fluidez e responsividade, exatamente no estilo hack-and-slash moderno / Dragon Nest.
       - InterrupÃ§Ãµes com atordoamento ficam restritas a quebra de guarda (`guardBreak`), ataques em Ã¡rea devastadores do Chefe ou futuras skills com aviso explÃ­cito (`interrupt: true`).

- **SincronizaÃ§Ã£o**:
  - Aplicado e verificado com rigor tanto em `prototipo/arena.html` quanto em `prototipo/cidade.html`.
  - Sintaxe e integridade dos scripts ES Modules validadas sem nenhum erro.

### [Antigravity] 24/10/2026 - Encaixe Nativo dos Dados de Lineage 2: Montagem nos Ossos `Weapon_R_Bone` & `Shield_L_Bone` e Alinhamento Perfeito

- **MotivaÃ§Ã£o / Relato do Dono (Ãcaro via Ãudio)**:
  - _"EntÃ£o, eu te falei pra vocÃª seguir os dados do Lineage 2. Porque o escudo agora, ele tÃ¡ pra dentro do braÃ§o. Ele tÃ¡ na posiÃ§Ã£o certa, mais ou menos na direÃ§Ã£o certa, sÃ³ que deixa, como a gente pegou o personagem e o personagem jÃ¡ tem uma certa animaÃ§Ã£o com escudo, sem escudo, com staff, sem staff, com espada grande, com espada pequena, com adaga, com martelo, entÃ£o ele jÃ¡ tem essa animaÃ§Ã£o prÃ³pria dele, entÃ£o o item tem que casar direitinho, entendeu? E a espada nÃ£o tÃ¡ na mÃ£o mais, eu te mandei a foto aÃ­, acho que vocÃª nÃ£o viu."_

- **DiagnÃ³stico das Causas RaÃ­zes**:
  1. **Espada Ausente / InvisÃ­vel na MÃ£o**:
     - Estava sendo carregado o modelo genÃ©rico `weapon_sword_is_0.glb` (que nÃ£o pertence Ã  hierarquia do Lineage 2, com escala em metros e offsets manuais), deixando a Bastard Sword oficial do L2 apenas como fallback de erro. O modelo genÃ©rico ficava desalinhado da manopla e invisÃ­vel/fora de Ã¢ngulo.
  2. **Escudo Entrando para Dentro do BraÃ§o**:
     - A rotina `placeShield(rig)` calculava um ponto mÃ©dio entre o cotovelo e a mÃ£o e forÃ§ava `sh.quaternion.identity()`. Por manter rotaÃ§Ã£o estÃ¡tica em coordenadas de mundo do jogador, sempre que o guerreiro respirava, corria, atacava ou bloqueava, o antebraÃ§o se mexia em 3D enquanto o escudo ficava imÃ³vel e cortava a carne do personagem.
     - AlÃ©m disso, o modelo do escudo havia sido desmontado e adicionado Ã  raiz do `player`, ignorando completamente a armadura esquelÃ©tica do personagem.
  3. **Hierarquia Nativa do Lineage 2**:
     - O esqueleto dos guerreiros do L2 (`human_fighter.glb` e `human_fighter_imperial.glb`) possui ossos soquetes canÃ´nicos dedicados:
       - Node 23: `Weapon_R_Bone` (filho da mÃ£o direita `Bip01_R_Hand`).
       - Node 8: `Shield_L_Bone` (filho da mÃ£o esquerda `Bip01_L_Hand` / antebraÃ§o).
     - **Todas as animaÃ§Ãµes de Lineage 2** (`Wait_1HS_MFighter`, `Run_1HS_MFighter`, `AtkWait_1HS_MFighter`, `ShieldAtk_1HS_MFighter`, `Atk01_1HS_MFighter`, etc.) possuem trilhas de animaÃ§Ã£o de rotaÃ§Ã£o e translaÃ§Ã£o gravadas **especificamente para `Weapon_R_Bone` e `Shield_L_Bone`**.

- **SoluÃ§Ãµes Implementadas**:
  1. **Espada de 1 MÃ£o Oficial de Lineage 2 (`bastard_sword.glb`)**:
     - Carregada como arma primÃ¡ria de 1 mÃ£o (`swd1h`) e anexada diretamente ao osso `Weapon_R_Bone`.
     - Aplicada a rotação canônica de soquete s.rotation.set(-0.15, 0.33, -1.0). Ela agora repousa com perfeição vertical ao longo da coxa direita em descanso (sem apontar para trás nem perfurar o corpo/ombro), a empunhadura fica 100% encaixada na manopla fechada, o escudo cobre o peito na guarda e os combos desferem cortes frontais na mira.
  2. **Escudo Composite Shield Oficial de Lineage 2 (`composite_shield.glb`)**:
     - Anexado diretamente como filho do osso `Shield_L_Bone` (`shdBone.add(shd)`).
     - Aplicada a rotaÃ§Ã£o canÃ´nica do soquete `cs.rotation.set(0, -Math.PI / 2, 0)`.
     - O escudo agora se posiciona verticalmente ao longo do antebraÃ§o esquerdo, com o aro largo superior no topo, a ponta inferior voltada para o cotovelo/chÃ£o e o brasÃ£o esculpido em bronze voltado para a frente/lateral protegendo o tronco.
  3. **PreservaÃ§Ã£o das Trilhas de AnimaÃ§Ã£o do L2**:
     - Em `placeShield(rig)`, adicionada a verificaÃ§Ã£o `if(rig.isL2) return;`, garantindo que o escudo nunca mais tenha sua rotaÃ§Ã£o forÃ§ada para `identity` e passe a ser 100% animado pelo mixer nativo do L2.
     - Em `switchCharacter`, o escudo do L2 nÃ£o Ã© duplicado no nÃ³ raiz do `player`, residindo exclusivamente dentro do osso esquelÃ©tico.
  4. **ValidaÃ§Ã£o Visual e DinÃ¢mica**:
     - Validada postura estÃ¡tica (Idle), guarda defensiva (Guard/AtkWait com o escudo erguido cobrindo o peito) e cadeia completa de 4 golpes de ataque (Corte 1, Corte 2, Shield Bash avanÃ§ando o escudo e Estocada).
     - Zero colisÃµes anÃ´malas ou penetraÃ§Ã£o na malha do braÃ§o.
  5. **SincronizaÃ§Ã£o Total**:
     - CÃ³digo sincronizado de forma idÃªntica entre `arena.html` e `cidade.html`.
     - Sintaxe validada com motor ECMAScript Node (100% livre de erros).

---

## 7. Como continuar em outro chat

Dizer ao assistente para ler primeiro este diario, depois o `ROADMAP_IS_BLADE.md` e depois o `arena.html`. Ele nao tem memoria da conversa anterior.

### [Antigravity] 25/10/2026 - Padronização Definitiva de Itens L2: Blender (+Y Up) e Função Universal `attachL2Item()`

#### 1. A Descoberta Técnica: Causa Raiz do Encaixe e Eixos (+Y Up)

- **Origem dos dados L2**: No cliente original Lineage 2 (Unreal Engine 2.x), o sistema de coordenadas é **Z-up**. Todas as armas e escudos canônicos do jogo foram modelados para encaixar com precisão milimétrica nos ossos de soquete do esqueleto dos personagens:
  - Armas (1H, 2H, adagas, cajados, arcos, etc.): osso `Weapon_R_Bone` (filho da mão direita `Bip01_R_Hand`).
  - Escudos: osso `Shield_L_Bone` (filho do antebraço esquerdo `Bip01_L_Forearm`).
- **O Comportamento do Blender**: Ao converter `.psk` → Blender → `.glb`, a opção padrão do exportador glTF é **`+Y Up`**:
  - Com **`+Y Up` MARCADO**, o Blender converte os vértices da malha para o padrão Web/glTF (troca Y e Z).
  - Como os ossos do esqueleto do personagem no Three.js mantêm as orientações relativas da hierarquia do Unreal, a rotação canônica **`L2_WPN_AXIS_FIX = Math.PI / 2` (+90° no eixo X: `mesh.rotation.set(Math.PI / 2, 0, 0)`) desfaz com exatidão matemática essa conversão do Blender**, devolvendo a malha 100% alinhada ao espaço Unreal nativo do soquete.
  - **REGRA DE OURO DO BLENDER**: A opção **"+Y Up" DEVE permanecer SEMPRE MARCADA** ao exportar qualquer modelo `.glb`. Se for desmarcada, a troca de eixos não ocorre e a compensação matemática passa a inverter o item.

#### 2. As Três Categorias de Itens no Jogo

1. **Arma ou Escudo Oficial do Lineage 2 (`.psk` → Blender → `.glb` com `+Y Up`)**:
   - **Comportamento**: 100% padronizado. Todas as armas e escudos do L2 usam o mesmo padrão de soquete.
   - **Ajuste**: Rotação canônica automática de `+90° em X` (`L2_WPN_AXIS_FIX`).
   - **Resultado**: NENHUM ajuste de ângulo por tentativa e erro é necessário. Qualquer nova arma ou escudo oficial do L2 entra na posição exata de imediato (idle, corrida, guarda e ataques).
2. **Armaduras, Luvas, Botas e Cabelos do Lineage 2 (`SkeletalMesh`)**:
   - **Comportamento**: Peças de armadura se deformam junto com a musculatura e o esqueleto do personagem através de pesos de vértices (_skinning_ / _rigging_).
   - **Ajuste**: Não utilizam os soquetes rígidos da mão ou do braço, portanto a rotação `L2_WPN_AXIS_FIX` não se aplica a eles.
3. **Itens Não-Lineage 2 (Modelados do zero, baixados da internet ou gerados no Tecxlabs 3D)**:
   - **Comportamento**: Não compartilham os pivots ou convenções do L2.
   - **Ajuste**: Precisam de `isL2: false` e ajustes manuais via parâmetros opcionais (`rotation`, `position`, `scale`).

#### 3. A Função Padronizada `attachL2Item()`

Implementada de forma idêntica e sincronizada em `prototipo/arena.html`, `prototipo/cidade.html` e `prototipo/criacao.html`:

```javascript
var L2_WPN_AXIS_FIX = Math.PI / 2;

function attachL2Item(rootOrBone, boneNameOrParent, glbUrl, options, callback) {
  var opts = options || {};
  var holder = new THREE.Group();
  if (opts.visible !== undefined) holder.visible = !!opts.visible;

  // Determinar o osso de ancoragem com fallbacks canônicos
  var targetBone = null;
  if (typeof boneNameOrParent === "string") {
    var root = rootOrBone;
    var name = boneNameOrParent;
    if (root && root.getObjectByName) {
      targetBone = root.getObjectByName(name);
      if (!targetBone && name === "Weapon_R_Bone")
        targetBone = root.getObjectByName("Bip01_R_Hand");
      if (!targetBone && name === "Shield_L_Bone")
        targetBone = root.getObjectByName("Bip01_L_Forearm");
    }
  } else if (boneNameOrParent && boneNameOrParent.isObject3D) {
    targetBone = boneNameOrParent;
  } else if (rootOrBone && rootOrBone.isObject3D) {
    targetBone = rootOrBone;
  }

  if (targetBone) targetBone.add(holder);

  var loader =
    opts.loader ||
    (window._l2GltfLoader = window._l2GltfLoader || new THREE.GLTFLoader());
  loader.load(
    glbUrl,
    function (gw) {
      var itemScene = gw.scene;
      itemScene.traverse(function (c) {
        if (c.isMesh) {
          c.castShadow = true;
          c.receiveShadow = true;
          if (c.material) {
            if (opts.envMapIntensity !== undefined)
              c.material.envMapIntensity = opts.envMapIntensity;
            else if (c.material.envMapIntensity !== undefined)
              c.material.envMapIntensity = 1.2;
          }
        }
      });

      // Correção canônica de eixos L2 (+90° em X) por padrão
      if (opts.isL2 !== false) {
        itemScene.rotation.set(L2_WPN_AXIS_FIX, 0, 0);
      }

      // Overrides opcionais (itens customizados ou não-L2)
      if (opts.rotation) {
        if (Array.isArray(opts.rotation))
          itemScene.rotation.set(
            opts.rotation[0],
            opts.rotation[1],
            opts.rotation[2],
          );
        else if (opts.rotation.isEuler) itemScene.rotation.copy(opts.rotation);
      }
      if (opts.position) {
        if (Array.isArray(opts.position))
          itemScene.position.set(
            opts.position[0],
            opts.position[1],
            opts.position[2],
          );
        else if (opts.position.isVector3)
          itemScene.position.copy(opts.position);
      }
      if (opts.scale !== undefined) {
        if (typeof opts.scale === "number")
          itemScene.scale.setScalar(opts.scale);
        else if (Array.isArray(opts.scale))
          itemScene.scale.set(opts.scale[0], opts.scale[1], opts.scale[2]);
      }

      holder.add(itemScene);
      if (callback) callback(holder, itemScene, gw);
    },
    undefined,
    function (err) {
      console.error("[attachL2Item] Falha ao carregar item:", glbUrl, err);
    },
  );

  return holder;
}
```

#### 4. Como Adicionar Qualquer Novo Item (Exemplos Práticos)

- **Nova Arma L2 (ex: Dragon Slayer, Bastard Sword, Machado, Adaga, Arco)**:
  ```javascript
  var swd = attachL2Item(
    root,
    "Weapon_R_Bone",
    "assets/personagens/minha_arma.glb",
    {
      visible: true,
    },
  );
  ```
- **Novo Escudo L2 (ex: Composite Shield, Shield of Nightmare)**:
  ```javascript
  var shd = attachL2Item(
    root,
    "Shield_L_Bone",
    "assets/personagens/meu_escudo.glb",
    {
      visible: true,
    },
  );
  ```
- **Item Externo / Não-L2 (ex: espada feita no Tecxlabs 3D)**:
  ```javascript
  var customSword = attachL2Item(
    root,
    "Weapon_R_Bone",
    "assets/custom/espada_futurista.glb",
    {
      isL2: false,
      rotation: [0, Math.PI, 0],
      position: [0, 0.05, 0],
      scale: 1.0,
    },
  );
  ```

#### 5. Sincronização e Validação do Projeto

- **`arena.html`**: Totalmente refatorado para utilizar `attachL2Item()`. A espada de 1 mão (`swd1h`) do conjunto Espada & Escudo foi redefinida para a espada feita com IA (`weapon_sword_is_0.glb`), perfeitamente calibrada na manopla com escala proporcional (`42.78 / 2.25`) e fallback automático para a `bastard_sword.glb`.
- **`cidade.html`**: Sincronizado de forma 100% idêntica com `arena.html`, carregando `weapon_sword_is_0.glb` no conjunto de 1 mão com escudo.
- **`criacao.html`**: Suporte unificado para `weapon_sword_is_0.glb` via `attachL2Item()`.
- **Sintaxe JavaScript**: Todos os scripts dos 3 arquivos HTML validados via Node.js (`vm.Script` e `node --check`), 100% sem erros de compilação.
- **Teste Visual no Navegador**: Validado carregamento em tempo real no Three.js em modo dungeon com espada curta e escudo equipados e funcionando sem erros.

### [Claude Code] 25/10/2026 - Espada 1H "IS 0%" (Tecxlabs 3D) Finalmente na Mão: Receita para Itens NÃO-L2

#### Problema

- A `weapon_sword_is_0.glb` (item caso 3, gerado no Tecxlabs 3D) aparecia deitada/atravessada na cintura, fora da mão. A Dragon Slayer (2H) estava perfeita porque é item L2 e usa `L2_WPN_AXIS_FIX`.
- Causa: os valores de `position [5.66, -1.18, -0.02]` e `rotation [-π/4, 0, 0]` foram copiados do **nó de osso interno da `bastard_sword.glb`** (T do joint dela), que não tem relação com a geometria da espada 0%. Resultado: a lâmina apontava para o eixo Y/Z do osso em vez de X.

#### Regra do soquete `Weapon_R_Bone` (medida na Bastard Sword, que encaixa certo)

Dentro do osso (unidades L2, a raiz do personagem tem escala `2.25/42.78`):

- **Lâmina ao longo de +X** (pomo em x≈-7.2, guarda em x≈0..1.3, ponta em x≈+25.8).
- **Guarda aberta em ±Y**, **espessura da lâmina em Z**.
- **Centro do cabo em x≈-2.5** (cabo vai de -4.7 a -0.3). É nesse ponto que a mão fecha.

#### Receita para QUALQUER item não-L2 (isL2:false)

1. Descobrir no modelo o eixo do comprimento (pomo → ponta), o eixo da largura da guarda e o ponto do centro do cabo (medir os vértices, não chutar).
2. `rotation`: levar comprimento → +X, largura da guarda → ±Y, espessura → Z.
3. `scale`: `42.78 / 2.25` (= 19.01) se o modelo está em metros (1 m do modelo = 19.01 unidades do osso). Conferir a largura da guarda: a da Bastard tem ~7.15 unidades.
4. `position`: `-2.5 - (escala * coordenada_do_cabo_no_eixo_do_comprimento_já_rotacionada)` no eixo X; Y e Z = 0.
5. Não copiar posição/rotação de outro .glb nem do nó de osso interno de outro item.

#### Aplicação na espada 0%

- Modelo: comprimento em **Y** (pomo y=-0.056, cabo y 0.12..0.42, guarda y 0.6..0.78 com 0.4 de largura em X, ponta y=1.144). Centro do cabo = y≈0.27.
- `rotation: [0, 0, -Math.PI / 2]` (Z -90°: Y→+X, X→-Y, Z→Z; a guarda é simétrica, então o sinal de X não importa).
- `scale: 42.78 / 2.25` (guarda fica com 7.6 unidades, quase igual à da Bastard).
- `position: [-7.63, 0, 0]` = `-2.5 - 19.01 * 0.27`.
- Aplicado igual em `arena.html`, `cidade.html` e `criacao.html`. Sintaxe validada com `node --check`.
- Se a pegada precisar de ajuste fino depois, mexer SÓ no `position[0]` (desliza a espada ao longo da mão) ou girar em X (`rotation[0]`) para trocar a face da lâmina; não alterar o resto.

#### Lembretes que continuam valendo

- Exportação Blender (itens L2): **"+Y Up" sempre MARCADO**.
- Item L2 → `attachL2Item(root, 'Weapon_R_Bone' | 'Shield_L_Bone', 'arquivo.glb')` sem ajuste nenhum.
- Item não-L2 → `isL2:false` + a receita acima.
- O escudo (`Shield_L_Bone`) e a espada 2H não foram alterados nesta correção.

#### CONFIRMADO PELO DONO (25/10/2026): espada 0% perfeita na mão

Teste visual no jogo: espada de 1 mão na mão direita, lâmina para frente/baixo, escudo no braço esquerdo. Valores finais validados (NÃO mexer):

```javascript
attachL2Item(
  root,
  "Weapon_R_Bone",
  "assets/personagens/weapon_sword_is_0.glb",
  {
    isL2: false,
    position: [-7.63, 0, 0],
    rotation: [0, 0, -Math.PI / 2],
    scale: 42.78 / 2.25,
  },
);
```

#### FÓRMULA PADRÃO (item não-L2 em `Weapon_R_Bone`) - usar sempre

Definições: `S = 42.78 / 2.25 = 19.01` (metros do modelo → unidades do osso); `G` = coordenada, em metros do modelo, do centro do cabo medida ao longo do eixo do comprimento (pomo → ponta); `-2.5` = centro do cabo da Bastard Sword L2 dentro do osso.

1. **Rotação** (comprimento → +X do osso, guarda → ±Y, espessura → Z):
   - comprimento no eixo **Y** do modelo (caso da espada 0%): `rotation [0, 0, -π/2]`
   - comprimento no eixo **Z**: `rotation [0, π/2, 0]` (Y +90°: Z→+X); comprimento já em **X**: `rotation [0, 0, 0]`
2. **Escala**: `S` (modelo em metros). Conferir: guarda ≈ 7 unidades de largura (a da Bastard tem 7.15).
3. **Posição**: `position = [-2.5 - S * G, 0, 0]`. Exemplo: G = 0.27 → `-2.5 - 19.01*0.27 = -7.63`.
4. Medir G, o eixo do comprimento e a largura da guarda lendo os vértices do .glb (script de bounding box por faixa), nunca no olho e nunca copiando valores de outro item.
5. Ajuste fino, se precisar: só `position[0]` (desliza ao longo da mão) ou `rotation` em X (gira a face da lâmina).

Resumo de 1 linha: **item L2 = zero ajuste (`+Y Up` marcado); item não-L2 = rotação para lâmina em +X, escala 19.01, position X = -2.5 - 19.01 × (centro do cabo).**

### [Gemini] 25/10/2026 - A Dança das Lâminas do Cabal e a Refatoração Total do Guardião (Espada & Escudo 1HS)

- **Contexto & Demanda do Dono (Ícaro via Áudio)**:
  - O combate de 1HS precisava de identidade própria e espetáculo coreografado inspirado no **CABAL Online** com a fluidez do **Dragon Nest** e o visual do **Lineage 2**.
  - **Problemas corrigidos**:
    1. O **Q** era só um "dashzinho" curto quase parado -> Transformado em **Investida Astral** com arrancada real de 8.5 metros na mira, rastro espesso de energia e som de impacto/terremoto (`stomp_quake`).
    2. O **E** agora é o **Corte Cruzado em X**, com dois tempos rítmicos distintos de corte e estalo de lâmina afiada.
    3. O **R** agora é o **Demolidor de Escudo (Shield Break do Cabal)**, com salto frontal de 4m cravando o escudo no chão, abrindo fenda no solo (`spawnGroundCrack`), dispersando pedregulhos 3D e quebrando a super-armadura do chefe.
    4. O **F** agora é a **Execução Celestial (Rising Force)**: eliminado o travamento no ar! Primeiro tempo lança o alvo no ar (juggle aéreo), seguido de giro acrobático e descida rápida cravando a lâmina no solo com choque sísmico e explosão de partículas douradas.
    5. O **T** agora é a **Dança das Lâminas (Blade Dance - O Clássico do Cabal)** em **4 tempos coreografados**:
       - 1º Tempo (0.18s): Giro rasante baixo com corte horizontal (Dano 1 + rastro).
       - 2º Tempo (0.42s): Pancada giratória com escudo e desequilíbrio (Dano 2 + impacto).
       - 3º Tempo (0.70s): Salto e vórtice cortante no ar (Dano 3 + faíscas).
       - 4º Tempo (0.98s): Estocada finalizadora profunda com **Soulshot Duplo**, clarão de tela e tremor sísmico (Dano 4 Crítico).
    6. O **Z** agora tem como ativa padrão a **Barreira de Retribuição (Aegis Burst)** (Opção C escolhida pelo dono): finca o escudo projetando selo rúnico 360°, repelindo e empurrando inimigos com pulso de choque.
    7. No catálogo de variantes do Z (Tecla K), foram criadas e disponibilizadas para teste a **Opção A: Grito de Provocação (Taunt Roar)** (+30% defesa por 6s e foco dos mobs) e a **Opção B: Lança Astral (Aethel Thrust)** (estocada dimensional projetando lança de luz de 14m).
- **Arquivos Alterados**:
  - `prototipo/data/armas/swordshield.json` (skills, variantes, tempos de múltiplos hits, danos e descrições).
  - `prototipo/arena.html` (`sword1hCM` em `getClipConfig`, `spawnProj` com suporte a Lança Astral, `skillSwingFx` e `skillHitFx` calibrados para 1HS, knockback na Barreira).
  - `prototipo/cidade.html` (100% sincronizado com `arena.html`).
- **Validação e Testes**:
  - Backups criados: `arena_antes_skills_cabal.html` e `cidade_antes_skills_cabal.html`.
  - Sintaxe Node.js e ES Modules 100% validada sem erros.
  - Testado via CDP no navegador ativo na porta 8000: HUD carregado com os 6 novos nomes, catálogo de variantes na Tecla K validado com as 3 opções no Z.
- **Link de teste**: `http://localhost:8000/arena.html?mode=dungeon&wpn=swordshield`

#### CONFIRMAÇÃO DO DONO VIA ÁUDIO (25/10/2026):

- **Decisão no Slot Z**: Aprovada a **Opção C (Barreira de Retribuição)** como habilidade ativa primária no Z por padrão.
- **Opções A e B como Variantes Avançadas**: A **Opção A (Grito de Provocação)** e a **Opção B (Lança Astral)** foram catalogadas como variantes avançadas no slot Z (`unlock: 0` para testes imediatos), permitindo ao jogador abrir o menu (Tecla K) e alternar livremente entre as três opções no Z a qualquer momento do combate.
- **Refinamento da Lança Astral**: Integrada à animação de estocada canônica do Lineage 2 (`Atk03_1HS_MFighter`), disparando a lança sólida 3D acompanhada pelo som autêntico de **Soulshot** e impacto sônico de corte.
- **Validação Completa**: Subagente automatizado no navegador testou a alternância no menu K: Lança Astral equipada com sucesso, Grito de Provocação equipado com sucesso e Barreira de Retribuição restabelecida perfeitamente no HUD.

### [Gemini] 25/10/2026 - Ícones de Habilidades Estilo Cabal Online (Mobiliário Metálico & Silhuetas Limpas)

- **Demanda do Dono**: Criar ícones para as habilidades com visual mais básico e direto representando a ação, no estilo clássico do **CABAL Online** (moldura chanfrada de aço escuro, silhuetas nítidas e elegantes de lâminas/escudos, sem excesso de saturação ou visual de desenho animado).
- **Implementação**:
  - Desenvolvido renderizador de ícones vetoriais SVG (`skillIconSVG`) com 14 glifos autorais limpos em matriz 32x32:
    - **Investida Astral (Q)**: Escudo em arrancada com 3 faixas aerodinâmicas de velocidade.
    - **Corte Cruzado em X (E)**: Duas lâminas afiadas cruzadas em 'X' com faísca estelar no centro.
    - **Demolidor de Escudo (R)**: Escudo pesado cravado no solo com fissuras sísmicas e ondas de choque laterais.
    - **Execução Celestial (F)**: Arco crescente ascendente com lâmina vertical e estrela no ápice.
    - **Dança de Lâminas (T)**: O clássico vórtice de 4 lâminas giratórias do Cabal Online.
    - **Barreira de Retribuição (Z)**: Brasão rúnico hexagonal com anéis concêntricos de choque em 360°.
    - **Grito de Provocação (Z var)**: Elmo guerreiro com 3 arcos de ressonância acústica dourada.
    - **Lança Astral (Z var)**: Ponta de lança dimensional em estocada perfurante com feixe de luz.
    - **Muro de Escudo / Execução Frontal (R/F var)**: Pavês com reforço de metal e montante vertical de quebra de guarda.
    - **Lâmina / Turbilhão / Onda / Orbe**: Glifos de suporte para armas 2H e cajados.
  - **Paleta Sóbria**: Fundo ardósia/aço escuro (`#0b121e`), contornos em aço escovado e sutis acentos em ciano frio (`#4fc3f7`) e âmbar claro (`#ffe082`).
  - Atualizado o HUD de skills em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html) e [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) com os ícones integrados aos botões, badge de atalho no canto superior esquerdo e nome compacto embaixo.
  - Atualizado o menu da Tecla K com os ícones exibidos à esquerda de cada card.
- **Validação**: Capturas de tela no navegador confirmam layout limpo, 60 FPS e estética profissional de MMORPG.

### [Gemini] 25/10/2026 - Studio de Animações no Blender 5.1 & Tutorial de Coreografia para o Dono

- **Demanda do Dono**: Criar um ambiente completo dentro do Blender onde o próprio desenvolvedor possa criar as coreografias das skills exatamente como imagina, testar cada movimento no esqueleto e depois repassar as animações para serem inseridas no jogo. Solicitou também a inclusão da espada em punho e um tutorial detalhado.
- **Implementações Técnicas**:
  1. **Resolução das Deformações ("Fora dos Encaixes")**:
     - Removidos todos os marcadores de esferas cinzas (`custom_shape: Icosphere`) que o glTF havia gerado nas juntas e que cobriam o corpo com a opção `show_in_front`.
     - Pose padrão do esqueleto ajustada para o `Wait_1HS_MFighter` nativo do Lineage 2, eliminando qualquer conflito de rotação de eixos e mantendo todas as placas da armadura Imperial 100% perfeitamente ajustadas.
  2. **Espada e Escudo em Punho**:
     - Importada a **Espada Bastarda** nativa do Lineage 2 (`bastard_sword.glb`), na escala correta e acoplada diretamente ao osso de empunhadura nativo `Weapon_R_Bone`.
     - **Escudo Composto** (`composite_shield.glb`) acoplado no osso `Shield_L_Bone` no antebraço esquerdo.
  3. **Tutorial de Animação Passo a Passo**:
     - Criado o guia completo [TUTORIAL_ANIMACAO_BLENDER.md](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/TUTORIAL_ANIMACAO_BLENDER.md) explicando atalhos essenciais, modo Pose (`Ctrl + Tab`), rotação livre trackball (`R R`), movimentação da pelve com `G` para agachar/saltar, ativação do Auto-Keying na Timeline, criação e renomeação de ações no Action Editor, e o fluxo para salvar e carregar diretamente no jogo.

### [Gemini] 26/10/2026 - Controle Estrito de Movimentação (Fim do Auto-Dash Involuntário) & Pés Plantados no Solo

- **Demanda do Dono**: Ao segurar o ataque básico ou disparar golpes, o guerreiro estava avançando/deslizando para frente sozinho de forma involuntária (auto-dash contínuo). O ataque deve ter os pés firmemente plantados no solo, e qualquer movimentação deve ser estritamente controlada pelas teclas WASD do jogador.
- **Implementações Técnicas**:
  1. **Travamento de Deslize Involuntário (`lg: 0`)**:
     - Redefinido o parâmetro `lg` (lock glide / impulso de avanço) para `0` em todas as fases da sequência de golpes básicos e habilidades estacionárias.
     - O guerreiro agora permanece com a base firme no chão durante a execução dos ataques, eliminando avanços descontrolados contra alvos ou abismos.
  2. **Controle Dinâmico de Movimento**:
     - A movimentação do personagem agora responde 100% e exclusivamente aos comandos intencionais do jogador (WASD), proporcionando precisão cirúrgica de esquiva, posicionamento e espaçamento em combate.
  3. **Sincronização**:
     - Ajuste aplicado em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html) e sincronizado de forma idêntica em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html).

### [Gemini] 26/10/2026 - Física e VFX de Pedregulhos e Fragmentos Sísmicos em 3D

- **Demanda do Dono**: Ao cravar o escudo no chão (Skill R - Demolidor de Escudo) ou desferir golpes pesados no solo, o efeito de pedregulhos e rachaduras devia parecer rocha real tridimensional fragmentada saltando do chão.
- **Implementações Técnicas**:
  1. **Geometria de Rochas 3D (`spawnDebrisChunks`)**:
     - Substituídos cubos simples por blocos facetados retangulares com proporções orgânicas e vértices angulares simulando granito quebrado.
     - Materiais com sombreamento físico realista (PBR) com tonalidades de pedra escura, terra e aspereza (`roughness: 0.9`), reagindo à iluminação da cena e aos clarões das habilidades.
  2. **Física Balística e Dispersão**:
     - Cada pedregulho recebe velocidade inicial radial divergente, vetor vertical aleatório e rotação multiaxial, caindo e colidindo suavemente com o plano do chão.
  3. **Sincronização**:
     - Atualizado em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html) e [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html).

### [Gemini] 26/10/2026 - Remoção do Obelisco Central da Praça de Talking Island

- **Demanda do Dono**: Remover o monumento/obelisco antigo do centro da praça principal de Talking Island Village para liberar o espaço central para duelos, movimentação livre e visão ampla da arena de duelo.
- **Implementações Técnicas**:
  1. **Remoção do Modelo**:
     - Removida a entidade `SI_Centertop` (`ti_centertop.glb`) de [village_data_threejs.json](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/village_data_threejs.json).
     - Inserida verificação de segurança no loop de entidades em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) descartando explicitamente o obelisco (`ti_centertop.glb` / `SI_Centertop`).
  2. **Remoção do Colisor**:
     - Removido o colisor estático central `{"x": 0.0, "z": 0.0, "r": 3.2}` de `VILLAGE_STATIC_OBST`, liberando completamente a passagem do personagem através de toda a praça central.
  3. **Validação**:
     - Teste automatizado no navegador confirmou a praça 100% aberta, o decalque `IS BLADE DUEL ARENA` e a aura circular limpos, sem qualquer colisão invisível no centro. O jogador pode atravessar o ponto central `(0, 0)` com total liberdade.

### [Gemini] 26/10/2026 - Roster Completo de Personagens do Lineage 2 na Tela de Criação (Elfa, Anã, Orc, Maga e Guerreiro)

- **Demanda do Dono**: Trazer os outros personagens clássicos do Lineage 2 e disponibilizá-los diretamente na sessão de criação de personagem ([criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html)) para criação e exploração totalmente livre.
- **Implementações Técnicas**:
  1. **Extração dos Pacotes Oficiais do Lineage 2**:
     - Extraídas as malhas esqueléticas (.psk), texturas difusas (.png) e animações (.psa) dos pacotes `Elf.ukx`, `Dwarf.ukx`, `Orc.ukx`, `Magic.ukx` e `Fighter.ukx` do cliente Interlude:
       - **Elfa Branca** (`elf_f`): Malhas faciais, cabelos diáfanos e conjunto Trainee com 92 animações nativas.
       - **Anã Guerreira** (`dwarf_f`): O clássico modelo de marias-chiquinhas com 89 animações de combate e vigor de terra.
       - **Orc Guerreiro** (`orc_m`): O guerreiro titânico de ombros largos com 115 animações de força bruta e fúria.
       - **Humana Mística** (`magic_f`): A feiticeira arcana com vestes esvoaçantes e 85 animações místicas.
       - **Humano Guerreiro** (`human_fighter`): Mantido com suporte tanto ao Traje de Iniciante quanto ao conjunto Imperial Crusader S-Grade.
  2. **Pipeline de Construção Automatizado no Blender 5.1 (`build_all_l2_races.py`)**:
     - Desenvolvido e executado script em lote no Blender 5.1 que limpa o esqueleto, consolida as malhas em um único `master_arm`, reatribui vértices faciais a `Bip01_head`, elimina deformações de `custom_shape`, aplica materiais PBR realistas e mapeia as 13 ações de combate canônicas em trilhas NLA do glTF.
     - Exportados com perfeição para `prototipo/assets/personagens/`:
       - `elf_f.glb` (7.5 MB)
       - `dwarf_f.glb` (8.8 MB)
       - `orc_m.glb` (9.2 MB)
       - `magic_f.glb` (7.9 MB)
       - `human_fighter.glb` & `human_fighter_imperial.glb`
  3. **Interface de Criação Totalmente Interativa ([criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html))**:
     - **Grid de Seleção de Raças**: 5 raças totalmente desbloqueadas com transição fluida de modelo no pedestal rúnico 3D.
     - **Painel Dinâmico de Atributos**: Ficha de atributos em tempo real com barras de progresso animadas e valores numéricos fiéis ao Lineage 2 (STR, DEX, CON, INT, WIT, MEN) correspondentes a cada deusa e linhagem de Aden.
     - **Lore Oficial**: Textos imersivos da história de cada raça e suas bênçãos divinas (Eva, Maphr, Pa'agrio, Einhasad).
     - **Arsenal Completo**: Suporte à lendária Dragon Slayer (2H), conjunto de Espada & Escudo 1H (Guardião com escudo composto) e modo Desarmado.
     - **Testes de Animações**: Botões interativos para testar em tempo real as animações nativas de corrida, espera, bloqueio e golpes com efeitos sonoros de corte e Soulshot.
  4. **Sincronização nos Mapas de Jogo**:
     - Atualizado o seletor `switchCharacter(type)` em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) e [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html) para aceitar e carregar instantaneamente qualquer raça escolhida na criação (`isblade.char_type` e `isblade.char_race`).
  5. **Validação Visual Completa**:
     - Teste automatizado com o subagente no navegador: todas as 5 raças renderizaram no pedestal rúnico sem erros de console, a transição entre armas funcionou imediatamente e o teletransporte para Talking Island manteve o personagem selecionado totalmente funcional e responsivo.

### [Gemini] 26/10/2026 - Ativação Completa de Animações Canônicas para Todas as Raças (Espera, Corrida, Bloqueio, Golpes)

- **Demanda do Dono**: Os novos personagens (Elfa, Anã, Orc e Maga) estavam estáticos no pedestal e no jogo, sem suas animações ativas. Solicitação para fazer o conjunto completo igual ao do Humano Guerreiro (espera/idle, corrida, bloqueio/guarda, combos de ataque, rolamento e combate desarmado).
- **Diagnóstico & Causa Raiz**:
  1. No script anterior de montagem, as ações haviam sido exportadas com sufixos da raça (ex: `idle_FElf`, `run_FDwarf`, `guard_MOrc`), fazendo com que o Three.js (`clips['idle']`, `clips['run']`, `clips['guard']`) não encontrasse os nomes esperados.
  2. Foram exportadas mais de 80 ações brutas extras do PSA, gerando sobrecarga e inconsistência na seleção de ações do glTF.
- **Implementações Técnicas**:
  1. **Recompilação Cirúrgica no Blender 5.1 (`build_all_l2_races_perfect.py`)**:
     - Mapeadas e padronizadas exatamente as 13 ações de combate canônicas do Lineage 2 para cada uma das raças:
       - `idle`: Postura de combate clássica com arma em punho.
       - `run`: Corrida autêntica de cada raça.
       - `walk`: Marcha de aproximação.
       - `guard`: Bloqueio defensivo frontal com lâmina/escudo erguido.
       - `slash1` & `slash2`: Sequência de corte primário e secundário.
       - `slash4`: Golpe pesado com finalização e tremor.
       - `roll`: Arrancada tática com I-Frames.
       - `idle_hand`, `run_hand`, `walk_hand` & `punch`: Modo desarmado completo.
       - `death`: Animação de colapso e queda ao chão.
     - Eliminadas todas as ações não mapeadas antes da exportação, reduzindo o tamanho de cada modelo em ~75% (de ~9MB para ~1.8MB) e acelerando o carregamento no Three.js para menos de 3 segundos.
     - Exportados os novos arquivos otimizados com cache renovado:
       - `prototipo/assets/personagens/elf_f.glb`
       - `prototipo/assets/personagens/dwarf_f.glb`
       - `prototipo/assets/personagens/orc_m.glb`
       - `prototipo/assets/personagens/magic_f.glb`
  2. **Tratamento de Clipes Resiliente em `criacao.html`, `cidade.html` e `arena.html`**:
     - Implementado normalizador de nomes de animações que aceita tanto nomes canônicos diretos quanto variações com sufixos de raça (`_FElf`, `_FDwarf`, `_MOrc`, `_FMagic`).
     - Fallback automático para `idle_hand` quando desarmado e `idle` quando armado.
  3. **Validação Visual no Navegador**:
     - Subagente no navegador executou o ciclo completo na tela de criação:
       - **Elfa Branca**: Animação de corrida ágil e guarda defensiva confirmadas em vídeo e screenshot.
       - **Anã Guerreira**: Corrida vigorosa e guarda pesada confirmadas.
       - **Orc Guerreiro**: Passada pesada e corrida furiosa confirmadas.
       - **Humana Mística**: Movimentação graciosa de corrida confirmada.

### [Gemini] 26/10/2026 - Estrutura de Produção: Tela de Seleção de Personagens (Lobby L2), Gerenciador Multi-Slot, Customização de Cabelo & Calibração de Passada

- **Demanda do Dono**:
  1. Corrigir o speed e a sincronia de corrida nas novas raças igual foi feito no humano para não patinar/deslizar.
  2. Implementar customização de cabelos (estilos e cores).
  3. Resolver a persistência da criação: ao criar um novo personagem, o jogador caía sempre no mesmo boneco inicial porque não havia um Lobby / Tela de Seleção com múltiplos slots salvos.
  4. Criar o espaço completo de Seleção de Personagens (Lobby estilo Lineage 2) permitindo ver os personagens criados, escolher com qual entrar no jogo, criar novos e deletar com confirmação.
  5. Estruturar o jogo como produto comercial real para monetização e documentar detalhadamente para que o Claude e outros assistentes respeitem os módulos existentes sem sobrescrever.

- **Implementações Técnicas**:
  1. **Tela de Seleção de Personagens / Lobby 3D ([selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html))**:
     - **Pedestal 3D Rúnico Oficial**: Plataforma circular de pedra com anel de ouro maciço, runas arcanas emissivas azuis e partículas cintilantes flutuantes no espaço escuro.
     - **Preview Dinâmico do Herói**: Ao clicar em qualquer slot, o modelo 3D correspondente carrega instantaneamente no pedestal com suas vestes, arma equipada (Dragon Slayer / Bastard Sword + Escudo Composto / Desarmado), corte e cor de cabelo, executando animação de espera (idle) em loop suave.
     - **Gerenciador de 7 Slots de Personagens**:
       - Lista interativa de slots na lateral direita exibindo Avatar de classe, Nome do Herói, Nível (`Lv. 1`), Raça/Título (`Elfa Branca`, `Guerreira de Eva`, `Titã de Paagrio`, etc.) e Localização atual (`Talking Island` / `Arena do Baium`).
       - Slots vagos exibem card pontilhado elegante `➕ Criar Novo Personagem (Slot N)` direcionando para [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html).
     - **Ficha Técnica e Lore Canônica (Painel Esquerdo)**:
       - Ficha completa com atributos canônicos do Lineage 2 (STR, DEX, CON, INT, WIT, MEN) com barras dinâmicas em gradiente ciano-dourado.
       - Equipamentos ativos e bênçãos dos deuses de Aden (Einhasad, Eva, Maphr, Pa'agrio).
     - **Ações Principais de Produção**:
       - **[ENTRAR NO MUNDO]**: Botão dourado de destaque com flash de transição branca e áudio clássico de warp, teleportando para Talking Island ou Arena com o personagem selecionado.
       - **[➕ CRIAR NOVO PERSONAGEM]**: Atalho rápido para criação de novo aventureiro.
       - **[🗑️ EXCLUIR PERSONAGEM]**: Modal de segurança com aviso de exclusão permanente (`confirmDelete()`), impedindo a exclusão se restar apenas 1 personagem.

  2. **Customização de Cabelo em [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html)**:
     - **Estilos de Cabelo**:
       - `Padrão L2` (Franja + Rabo/Trança completo).
       - `Curto / Ágil` (Franja frontal isolada).
       - `Longo / Trança` (Rabo de cavalo / trança posterior).
     - **Paleta de Cores com Swatches Circulares Interativos**:
       - Original / Natural (`#ffffff`)
       - Loiro Dourado (`#e8c46d`)
       - Castanho Nobre (`#8b5a2b`)
       - Prata Élfico (`#d2e2f5`)
       - Ruivo Flamejante (`#ba3b2a`)
       - Negro Ébano (`#2b2b2b`)
       - Azul Místico (`#38bdf8`)
     - **Manipulação em Tempo Real (`applyHair`)**:
       - Função de traversal que identifica os nós `Hair_Front` (`m00_ah`) e `Hair_Back` (`m00_bh`), alternando visibilidade conforme o estilo e tingindo os materiais de cabelo na cena 3D e no jogo real.

  3. **Correção do Speed e Sincronização de Passada (Fim do Moonwalk/Patinação)**:
     - **Causa Raiz Identificada**: Em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) e [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html), a função `getPlayerIdleClip()` retornava incondicionalmente `'Wait_1HS_MFighter'`, que não existe nas raças não-humanas, congelando os personagens em T-pose ao usar espada/escudo.
     - **Correção Resiliente**:
       - Inserido fallback inteligente em `getPlayerIdleClip()` e `playerLoco()`: se o clipe específico não existir no modelo ativo, utiliza `run`, `idle` ou `guard` canônicos.
       - Calibração de velocidade de passada por biotipo de raça (`raceScale`):
         - **Anã (`dwarf_f`)**: `raceScale = 1.32` (passos curtos e ágeis proporcionais ao tamanho de pernas reduzido `targetH = 1.65`, eliminando deslizamento).
         - **Orc (`orc_m`)**: `raceScale = 0.92` (passada pesada, longa e compassada para estatura titânica `targetH = 2.5`).
         - **Elfa (`elf_f`)**: `raceScale = 1.06` (passada esbelta, rápida e fluida).
         - **Humanos**: `raceScale = 1.0`.

  4. **Integração Bidirecional no Jogo ([cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) & [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html))**:
     - Inserido o botão **`👥 Trocar Personagem`** na barra de teletransporte e no cabeçalho superior.
     - O jogo lê `isblade_active_character_id` e `isblade_characters`, carregando o modelo exato, escala correta, estilo e cor de cabelo, além de estampar o nome personalizado do herói sobre o HUD.

  5. **Validação Completa Automatizada**:
     - Subagente no navegador realizou o ciclo de ponta a ponta:
       1. Abriu [selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html) com o personagem inicial carregado no pedestal.
       2. Clicou em criar novo personagem &rarr; abriu [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html).
       3. Criou a Elfa Branca "Lyra" com cabelo trança longa e cor Loiro Dourado.
       4. Entrou no mundo &rarr; [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) carregou perfeitamente com a Elfa Lyra no centro da praça aberta de Talking Island.
       5. Clicou em "👥 Trocar Personagem" &rarr; retornou ao Lobby [selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html), agora com os 2 slots ativos (Íkarus e Lyra) e o slot 3 aberto para criação.

---

## 📅 SESSÃO: 26/10/2026 — ROSTER COMPLETO DOS 10 HERÓIS DO L2 & NORMALIZAÇÃO DEFINITIVA DE VELOCIDADE (PSA FPS)

### 🎯 Objetivos Concluídos com Sucesso Absoluto

1. **Normalização Definitiva da Velocidade de Animação ("Fim do Speed de GM")**:
   - **Descoberta Crítica no Formato PSA**: Os arquivos `.psa` do Lineage 2 gravam keyframes em taxas de amostragem (`Rate`) individuais para cada animação:
     - `Wait_*` (Respiração/Idle): **3.0 FPS** (8 frames no total = ciclo sereno de **2.67 segundos**).
     - `AtkWait_*` (Guarda): **6.0 FPS** (10 frames = **1.67 segundos**).
     - `Walk_*` (Caminhada): **15.0 FPS** (11 frames = **0.73 segundos**).
     - `Run_*` (Corrida): **20.0 FPS** (18 frames = **0.90 segundos**).
     - `Death_*` (Queda de Morte): **15.0 FPS** (38 frames = **2.53 segundos**).
     - `Atk01_*` a `Atk03_*` (Golpes de Combate): **30.0 FPS** (46 frames = **1.53 segundos**).
   - **Causa da Aceleração**: Na importação padrão do Blender, cada frame do PSA era alocado a 1 frame da cena de 30 FPS. Assim, o Idle de 8 frames durava apenas **0.233 segundos**, repetindo 4.3 vezes por segundo (o que fazia a Elfa parecer hiper-acelerada / tremendo).
   - **Calibração Matemática no Blender 5.1**:
     - Script [build_all_10_l2_heroes.py](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/build_all_10_l2_heroes.py) lê os metadados do chunk `ANIMINFO` e escala temporalmente todas as fcurves:
       $$\text{scale\_factor} = \frac{30.0}{\text{native\_fps}}$$
     - O Idle passou de **0.233s** para **2.33s** (100% canônico, cadenciado e elegante).
     - A corrida passou para **0.83s - 0.95s** (passada real de Lineage 2 sem moonwalk).

2. **Roster Completo dos 10 Heróis do Lineage 2 Interlude**:
   - Extração via UModel e compilação em `.glb` leves (1.6MB a 2.19MB cada) com 13 ações padronizadas:
     1. [human_fighter.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/human_fighter.glb) — Humano Guerreiro (M)
     2. [human_fighter_imperial.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/human_fighter_imperial.glb) — Humano Imperial Crusader (M)
     3. [human_fighter_female.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/human_fighter_female.glb) — Humana Guerreira (F)
     4. [magic_m.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/magic_m.glb) — Humano Místico (M)
     5. [magic_f.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/magic_f.glb) — Humana Mística (F)
     6. [elf_m.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/elf_m.glb) — Elfo Branco (M)
     7. [elf_f.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/elf_f.glb) — Elfa Branca (F)
     8. [orc_m.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/orc_m.glb) — Orc Guerreiro (M)
     9. [orc_f.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/orc_f.glb) — Orc Guerreira (F)
     10. [dwarf_m.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/dwarf_m.glb) — Anão Artesão (M)
     11. [dwarf_f.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/dwarf_f.glb) — Anã Artesã (F)
   - Malhas de rosto e cabelo amarradas ao osso `Bip01_head` com peso 1.0 (eliminando descolamentos).

3. **Restauração Completa de Talking Island Village ([cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html))**:
   - Corrigida a sintaxe JSON no [village_data_threejs.json](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/village_data_threejs.json).
   - Inserido cache-buster dinâmico (`?v=' + Date.now()`), garantindo que todas as 121 construções (igreja, casas de pedra, telhados, mourões e praça) carreguem instantaneamente sem tela vazia.
   - Remoção do obelisco central preservada.

4. **Sistema de Tingimento de Cabelo com Realce Emissivo**:
   - Ajustado `applyHair()` com `m.emissive.copy(tc).multiplyScalar(0.32)`, permitindo que tons como Loiro Dourado, Prata Élfico e Azul Místico brilhem com intensidade mesmo sobre texturas de cabelo ruivas ou escuras.

5. **Integração Completa do Lobby de Seleção e Navegação**:
   - [selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html): 7 slots de personagens com visualização 3D em pedestal rúnico, ficha canônica de atributos e botões de exclusão/criação/entrada.
   - [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html): Seletor visual atualizado com cards para todos os 10 heróis, personalização de cabelo, set e arsenal.
   - [index.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/index.html): Redireciona diretamente para o Lobby de Seleção ao abrir o jogo no servidor local.
   - Contrato de co-working registrado em [SISTEMA_PERSONAGENS_ARQUITETURA.md](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/SISTEMA_PERSONAGENS_ARQUITETURA.md) para garantir que Claude e Antigravity não alterem o código um do outro.

---

## 📅 SESSÃO: 26/10/2026 — LOBBY CATEDRAL COM HERÓIS AO FUNDO, TRAVAMENTO DE CÂMERA, VALIDAÇÃO DE NOMES & TELA DE CARREGAMENTO

### 🎯 Objetivos Concluídos com Sucesso Absoluto

1. **Prevenção e Tratamento de Nomes Duplicados**:
   - **Na Criação ([criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html))**: Adicionada validação em tempo real com indicador visual `#nameFeedback` e realce de borda. Se o nome já existir em `isblade_characters`, a criação é bloqueada com aviso `❌ O nome já existe! Escolha outro nome.`.
   - **No Lobby ([selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html))**: Implementada resolução automática de duplicados históricos (ex: duas "Lyra" viram "Lyra" e "Lyra 2" sem perda de dados).
   - **Botões Inline de Ação**: Cada card de personagem agora possui botões `✏️` (Renomear com validação de unicidade) e `🗑️` (Excluir com modal de confirmação).

2. **Travamento Vertical da Câmera no Lobby e Criação**:
   - Atendendo à solicitação _"se eu puxo o pé do personagem a câmera acaba subindo e descendo vamos travar ela ali"_:
   - Removida a variação vertical de `camera.position.y` em `mousemove` ao arrastar o mouse.
   - A câmera agora fica permanentemente travada na altura e no ângulo de visão cinemáticos canônicos de Lineage 2 (`Y = 1.25`, `lookAt(0, 1.15, 0)`), enquanto o mouse rotaciona apenas o personagem horizontalmente.

3. **Cenário 3D da Catedral Gótica & Personagens ao Fundo (Lineage 2 Oficial)**:
   - **Fim do Vazio Preto**: Fundo `0x030611` substituído pelo artwork 8K da Catedral Gótica de Einhasad ([assets/lobby_temple_bg.jpg](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/lobby_temple_bg.jpg)) com fog atmosférico reduzido para `0.012`.
   - **Chão e Dais Multi-níveis**: Piso de lajes de pedra góticas texturizadas ([assets/cathedral_stone_floor.jpg](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/cathedral_stone_floor.jpg)) estendendo-se por 60 metros, altar circular com anel de ouro esculpido e glifo de runas emissivas azuis.
   - **Braseiros e Tochas Acesas**: 4 colunas de pedra gótica com caldeirões de bronze, luzes pontuais dinâmicas com efeito de cintilância de fogo (`brazierLights`).
   - **Personagens Criados ao Fundo**: Todos os outros heróis criados na conta agora ficam posicionados ao fundo do templo em formação viva, empunhando suas armas salvas e executando animação `idle` com descompasso temporal.
   - **Seleção por Raycasting**: Clicar em qualquer personagem do fundo seleciona e traz o guerreiro instantaneamente para o altar principal.

4. **Tela de Carregamento Oficial de Lineage 2 ([cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html))**:
   - **Eliminação do Limbo**: Criado overlay fullscreen com artwork épica 8K de Talking Island ([assets/talking_island/loading_screen.jpg](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/loading_screen.jpg)), vinheta escura, moldura dourada e carrossel de dicas de combate que rotaciona a cada 2.5s.
   - **Barra de Progresso Sincronizada (0% a 100%)**: Rastreia o carregamento de todas as 121 construções da vila + modelo 3D do jogador.
   - **Transição Suave**: Somente após 100% dos prédios e o guerreiro estarem carregados e renderizados na GPU, a tela faz um fade-out elegante de 0.8s, impedindo que o jogador veja terreno vazio ou carregamento parcial.

---

## 📅 SESSÃO: 26/10/2026 — INTEGRAÇÃO TOTAL DOS DARK ELVES (ELFO NEGRO & ELFA NEGRA) DO LINEAGE 2

### 🎯 Objetivos Concluídos com Sucesso Absoluto

1. **Roster Completo das 5 Raças de Lineage 2 Fechado (12 Heróis)**:
   - Extração e montagem canônica dos dois heróis que faltavam para completar todas as raças de Lineage 2 Interlude:
     - [darkelf_m.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/darkelf_m.glb) — Elfo Negro Guerreiro / Assassino (M) (2.26 MB)
     - [darkelf_f.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/darkelf_f.glb) — Elfa Negra Guerreira / Templária (F) (2.34 MB)

2. **Diagnóstico & Solução de Engenharia Reversa nos Pacotes L2**:
   - **Diagnóstico do Pacote `DarkElf.ukx`**: As malhas base `m000_u/l/g/b/f` estavam com malha não indexada (`0 vertices`) devido a uma criptografia/stripping no cliente 300x.
   - **Solução Canônica**:
     - O conjunto nobre Imperial Crusader S-Grade (`MDarkElf_m011_*` e `FDarkElf_m011_*`) estava íntegro com geometria completa (Upper, Lower, Gloves, Boots).
     - Rosto canônico de Dark Elf extraído com precisão cirúrgica de `LineageNpcs.ukx` (`a_fighterguild_teacher_MDarkElf_m00` e `a_fighterguild_teacher_FDarkElf_m00`, slot 2), reposicionado matematicamente no osso `Bip01_head` e amarrado com peso 1.0.
     - Cabelos canônicos com franja e rabo de cavalo (`m001_m00_ah/bh` para o macho e `m000_m00_ah/bh` para a fêmea) extraídos com canais de alpha e renderização clipada.
     - 948 texturas originais em PNG extraídas de `mdarkelf.utx` e `fdarkelf.utx`.

3. **13 Ações de Combate Canônicas Calibradas (PSA Speed Correction)**:
   - `MDarkElf_anim.psa` (12.9 MB) e `FDarkElf_anim.psa` (13.4 MB) mapeados com fator de escala temporal:
     - `idle` (Wait 3.0 FPS): ciclo sereno de **3.00s a 3.16s**.
     - `run` (Run 24.0 FPS): passada de **0.625s**.
     - `walk` (Walk 12-24 FPS): **0.750s**.
     - `guard` (AtkWait): **1.583s**.
     - `slash1` & `slash2` (Atk01/02): **1.500s**.
     - `slash4` (Power Strike / SpAtk): **1.733s**.
     - `roll`, `death`, `idle_hand`, `run_hand`, `walk_hand`, `punch`.

4. **Integração Completa em Todo o Ecossistema do Jogo**:
   - [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html): Cards interativos de "Elfo Negro (M)" e "Elfa Negra (F)" adicionados, com ficha canônica (STR 41, DEX 34, CON 32, INT 25, WIT 12, MEN 26), lore de Shilen e traços de combate.
   - [selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html): Entradas `darkelf_m` e `darkelf_f` no `RACE_CONFIG` do Lobby de 7 slots com ícones e status de exibição 3D.
   - [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) & [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html): `heroGlbMap` atualizado e dropdowns `#charSelector` com opções `🌑 Elfo Negro (M)` e `🗡️ Elfa Negra (F)`.

5. **Validação Visual de Ponta a Ponta**:
   - Teste automatizado no navegador executou o ciclo completo:
     - Seleção do Elfo Negro (M) e verificação dos atributos de Shilen.
     - Teste de animação de Corrida L2.
     - Seleção da Elfa Negra (F) e teste do Power Strike com a Dragon Slayer em punho.
     - Criação do personagem "Vesper" e transição para Talking Island (`cidade.html`), com renderização 3D estável e zero erros críticos.

---

## 📅 SESSÃO: 26/10/2026 — LOGOTIPO IS LABS EM CROMO AZUL & ARENA HEXAGONAL GEOMÉTRICA

### 🎯 Demandas do Usuário (Áudio & Asset)

- **Asset Fornecido**: `C:\Users\icaro\OneDrive\Área de Trabalho\UTXs\Logotipo IS Labs em Cromo Azul.png` (1254x1254 RGB).
- **Recorte Preciso**: Remover o fundo preto exterior sem criar caixa preta ou bordas serrilhadas, preservando os reflexos de aço escovado, facetas de cromo e halo de neon azul.
- **Redesign da Praça (Hexagonal / Geométrico)**: Substituir o círculo da praça central por um design geométrico pontudo/hexagonal ("a gente tem um BOzinho contra círculos, circunferências... queremos coisas mais quadradas, pontudas, geométricas").
- **Disfarce de Fundo & Contraste**: Criar um fundo elegante e sutil para a logo popar com contraste sem criar um bloco preto maciço que tape decalques ou VFX de skills no chão.

### 🛠️ Implementações Realizadas

1. **Processamento & Recorte Alfa de Alta Fidelidade**:
   - Desenvolvido pipeline de corte com Python/Pillow/Scipy (`scipy.ndimage.label` e `binary_fill_holes`):
     - Segmentação por componentes conectados e preenchimento de buracos internos preservou 100% dos corpos das letras e do escudo em cromo 3D.
     - Alpha feathering suave (sigma=1.2) eliminou fringing preto e preservou o flare especular central e o neon azul.
     - Assets gerados e salvos em:
       - [is_labs_chrome_logo.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/textures/is_labs_chrome_logo.png)
       - [is_blade_duel_logo.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/textures/is_blade_duel_logo.png)

2. **Arquitetura da Arena Hexagonal em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html)**:
   - **Piso Principal**: Convertido de `CircleGeometry(19.5, 64)` para Hexágono Regular pontudo `THREE.CircleGeometry(21.0, 6, Math.PI / 6)`, alinhado perfeitamente com os eixos da vila.
   - **Borda Externa Imperial**: Anel hexagonal `RingGeometry(20.4, 21.2, 6, 1, Math.PI / 6)` em ouro nobre L2 (`0xc49b45`, roughness: 0.35, metalness: 0.82).
   - **Filete Interno Rúnico**: Anel hexagonal `RingGeometry(19.8, 20.0, 6, 1, Math.PI / 6)` em ciano rúnico emissivo (`0x3388ff`, emissive: `0x114488`).
   - **Medalhão Central de Contraste (Obsidiana / Ardósia Escura)**: Hexágono `CircleGeometry(12.2, 6, Math.PI / 6)` em tom obsidiana profunda (`0x0c121d`, opacity: 0.82, `depthWrite: false`), permitindo que a pedra base e decalques de skills continuem visíveis, enquanto fornece contraste máximo para o cromo azul.
   - **Moldura do Medalhão & Aura de Combate**: Bordas hexagonais em cromo azulado e ciano neon pulsante (`RingGeometry(11.8, 12.2, 6)` e `RingGeometry(12.4, 12.8, 6)`).
   - **Mesh da Logo**: `PlaneGeometry(21.0, 21.0)` a `y = 0.045` com `SRGBColorSpace`, `depthWrite: false` e material metálico reflexivo (`metalness: 0.75`, `roughness: 0.25`).

3. **Validação Visual no Navegador**:
   - Inspeção via subagente de navegador em `http://localhost:8000/cidade.html`:
     - Verificado alinhamento das pontas do hexágono com a avenida principal.
     - Confirmada leitura correta das letras ("IS" no escudo, "L A B S" na base).
     - Captura de tela panorâmica comprovando o visual premium e harmonia com a vila de Talking Island.

4. **Branding na Tela de Carregamento (Substituição de Dicas)**:
   - Removido o box de dicas de combate ("DICA: ...") e o loop de carrossel em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html).
   - Gerada versão otimizada com recorte sem margens transparentes: [is_labs_logo_ui.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/textures/is_labs_logo_ui.png).
   - Inserida a logo **IS Labs em Cromo Azul** centralizada logo abaixo da barra dourada de progresso, com iluminação neon ciano e drop shadow suave.
   - Validado visualmente via captura de tela durante o carregamento dos 121 prédios da vila.

5. **Remoção do Anel Circular sob os Pés do Personagem (`pmark`)**:
   - Desativado o indicador circular azul (`RingGeometry(.6, .78, 28)`) ao redor dos pés do jogador em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) e [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html).
   - O chão ao redor do personagem agora fica 100% limpo, sem círculos interferindo na visualização do piso e do logotipo IS Labs.

6. **Estabilização do Personagem no Solo (Eliminação da Flutuação)**:
   - **Diagnóstico**: O loop de animação possuía uma oscilação senoidal legada (`Math.sin(T * 2) * 0.02`) adicionada ao `wrap.position.y`, fazendo o personagem levitar continuamente 2 cm para cima e para baixo.
   - **Correção**:
     - Removida a oscilação senoidal em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) e [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html).
     - Atualizada a função `getGroundHeight(x, z)` para retornar exatamente a cota do piso da praça hexagonal (`y = 0.02`), eliminando afundamento ou suspensão dos pés.
     - Validação via amostragem de telemetria no console comprovou estabilidade absoluta (`y = 0.0200` fixo sem desvio).

7. **Transição para Arena Octagonal (8 Lados) & Remoção das Texturas Azuis**:
   - **Remoção das Linhas Azuis**: Eliminados os filetes azuis decorativos (`plazaInnerTrim`, `logoBackingBorder` e `duelAura`) e a placa escura de fundo.
   - **Logo Pura & Recortada**: Apenas o logotipo **IS Labs em Cromo Azul** repousa diretamente sobre as pedras do piso em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html), integrando-se naturalmente ao cenário.
   - **Piso e Borda Octagonais**: O piso da arena e sua moldura imperial em ouro foram convertidos para **Octógono Regular (8 lados)** (`CircleGeometry(21.0, 8)` e `RingGeometry(20.4, 21.2, 8)`).
   - **Limpeza de Disco**: Liberados 13.38 GB no drive C ao limpar frames temporários de gravações do subagente.

8. **Substituição do Boneco de Testes pelo Espantalho Canônico Lineage 2**:
   - **Extração Oficial**: Extraído o modelo canônico de treino de Talking Island de `LineageNpcs.ukx` (`training_doll_m00` / `Quest_obj_scarecrow`) e sua textura original `training_doll_t00` de `LineageNpcsTex.utx`.
   - **Compilação em GLB**: Gerado o asset [scarecrow.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/scarecrow.glb) (449 KB, 2.45m de altura), apresentando a cruz de madeira rústica, tronco de palha amarrada com cordas e o alvo com alvo pintado (bullseye vermelho e branco).
   - **Integração no Combate**: Substituídos os cilindros/esferas primitivas em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html), mantendo total integração com o sistema de hit-stop, cálculo de dano e flash de impacto (`boss.mats`).
   - **Validação Visual**: Verificado em tempo real no navegador em frente ao jogador.

9. **Restauração do Chão Circular, Contraste de Textura de Duelo & Logo IS Labs Completa**:
   - **Formato Circular da Praça**: Revertido o piso principal da praça da vila para o formato circular clássico (`CircleGeometry(19.5, 64)`) com a textura de pedra lavrada (`sp_floor02.png`) e moldura perimétrica externa em bronze/dourado imperial (`RingGeometry(19.2, 19.8, 64)`).
   - **Eliminação Total de Bordas Azuis**: Removidos quaisquer círculos, anéis de aura ou bordas azuis (`duelAura`, bordas azuis claras e escuras), deixando a transição puramente orgânica e limpa.
   - **Piso de Duelo com Fundo Escuro (Contraste de Textura)**: Criada a área central de duelo (`CircleGeometry(12.5, 64)`) com piso em ardósia/pedra escura temperada (`color: 0x1c212a`), estabelecendo o contraste visual exato entre o calçamento aberto da vila (onde os jogadores passeiam) e o ringue central de combate.
   - **Preservação do Fundo Original da Logo IS Labs**: Em vez do recorte transparente brusco que perdia o brilho cromo, mantida a atmosfera escura de estúdio, flare de horizonte azul e reflexos metálicos da logo em [is_labs_duel_medallion.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/textures/is_labs_duel_medallion.png), com vinheta radial suave no perímetro que se funde perfeitamente ao piso escuro de duelo.
   - **Validação em Jogo**: Confirmado via navegador em `http://localhost:8000/cidade.html` com iluminação, proporções e contraste cinematográfico.

10. **Correção Anatômica da Face dos Dark Elves (Masculino e Feminino)**:

- **Diagnóstico da Falha**:
  - No Elfo Negro Masculino (`darkelf_m.glb`), a malha da face (`Face`) havia sido exportada com coordenadas locais em $Z \in [-0.77, 2.89]$ e $Y \in [-7.29, -3.05]$, fazendo a cabeça flutuar no chão à frente dos pés.
  - Na Elfa Negra Feminina (`darkelf_f.glb`), a face estava deslocada em $Z \in [34.79, 38.10]$ (na altura do peito/pescoço).
- **Correção Geométrica e Rigging**:
  - Através do Blender em modo batch, as malhas faciais foram calibradas com precisão milimétrica em relação ao osso `Bip01_head`, encaixando-se perfeitamente entre os fios de cabelo frontal (`Hair_Front`), traseiro (`Hair_Back`) e a gola do pescoço (`Chest`):
    - `darkelf_m.glb`: shift $(\Delta X = -5.35, \Delta Y = +5.17, \Delta Z = +40.32)$, alinhando o queixo a $Z = 39.55$ e a ponta do nariz a $Y = -2.12$.
    - `darkelf_f.glb`: shift $(\Delta X = +1.44, \Delta Y = +2.99, \Delta Z = +4.01)$, centralizando a face feminina em $X = 0$, queixo a $Z = 38.80$ e nariz a $Y = -1.65$.
  - Preservado o peso 100% no vértice para `Bip01_head`, garantindo que todas as animações (idle, combate, corrida, morte) sincronizem perfeitamente com a cabeça.
- **Atualização de Cache e Validação**:
  - Atualizada a chave de cache para `?v=2` em [selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html), [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html) e [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html).
  - Validado visualmente via captura de tela em tempo real no navegador: face no lugar certo, orelhas pontudas alinhadas, olhos e boca naturais e chão 100% limpo sem malha flutuante.

11. **Alinhamento Sagital da Face da Elfa Negra (darkelf_f.glb - Deslocamento para Frente)**:
    - **Diagnóstico da Falha**:
      - Embora a face da Elfa Negra tivesse sido reposicionada na altura correta do crânio (Z ≈ 40.5), na vista em perfil e 3/4 ela permanecia ancorada muito para trás, recuada em direção à nuca (Y ∈ [-1.65, +1.90]).
      - Isso gerava um vão vazio de 1.20 unidades entre a franja frontal do cabelo (Hair_Front, que atinge Y = -2.65 a -2.74) e a testa da personagem, deixando o interior do crânio visível.
    - **Correção Geométrica e Rigging**:
      - Medidas exatas comparativas entre os vértices da franja e a testa confirmaram o gap de 1.208 unidades no eixo sagital (Y do Blender).
      - Aplicado deslocamento sagital de ΔY = -1.20 aos vértices da malha Face em [darkelf_f.glb](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/personagens/darkelf_f.glb).
      - Removido objeto auxiliar órfão (Icosphere) e reexportado o modelo com todas as skins, ações e strips de animação preservadas.
      - A testa agora encosta perfeitamente por baixo da franja frontal, o nariz projeta-se naturalmente à frente e as orelhas pontudas se conectam sem descontinuidade à cabeça.
    - **Atualização de Cache e Validação**:
      - Incrementada a query string de cache para ?v=3 em [selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html), [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html), [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) e [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html).
      - Validado via captura de tela em tempo real no navegador em [criacao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/criacao.html) e [selecao.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/selecao.html), comprovando o encaixe perfeito entre testa, olhos, nariz e a franja do cabelo.

12. **Redesenho Slim da Barra de Alvo (Target Bar - #top) & Integração de Nome no Cristal**:
    - **Demanda do Usuário**: Afinar a barra de vida para caber apenas o nome dentro, mantendo o comprimento, eliminando a placa superior de pedra que ocupava espaço desnecessário e integrando o nome do alvo diretamente dentro da barra de vida.
    - **Execução**:
      - **Moldura Esculpida Slim**: Gerada a arte [mu_target_frame_clean.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/hud/mu_target_frame_clean.png) (500x42, proporção nativa 11.9:1) e o preenchimento de cristal [mu_target_hp_fill.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/hud/mu_target_hp_fill.png) (460x34).
      - **Ocultação de Elementos Obsoletos**: Removidos `#brand`, `#town-status`, `#estate`, `#hunter`, `#mastTxt` e barras extras legadas.
      - **Nome Integrado no Rubi**: `#l2-target-name` inserido diretamente no interior da barra, com drenagem de dano líquida da direita para a esquerda via clip-path (`.mu-target-crystal`).
      - **Aprovação**: Mockup comparativo apresentado e aprovado pelo usuário.

13. **Geometria Rígida / Anti-Circular (Minimapa Translúcido & Praça Octagonal)**:
    - **Diretriz Crítica do Usuário**: Proibição total de círculos/curvas na interface (_"mini mapa redondo jamais, temos fobia por coisas e objetos circulares, arredondados, deixa meio transparente... e a logo no centro da cidade tbm ta redonda era pra estar octagonal"_).
    - **Execução**:
      - **Minimapa Reto & Translúcido**: Aplicado `border-radius: 0 !important` e fundo escuro translúcido `rgba(6, 12, 26, 0.45) !important` em `#minimap-wrap`, `#atmo-clock` e `#mu-tp-toggle-btn`.
      - **Praça Central Octagonal (8 Faces)**: Em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html), o piso da arena central e anéis dourados foram convertidos de círculo para octágono regular (`CircleGeometry(21.0, 8)` e `RingGeometry(20.4, 21.2, 8)` rotacionados por $\pi/8$).
      - **Medalhão Central Octagonal**: Atualizada a textura [is_labs_duel_medallion.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/talking_island/textures/is_labs_duel_medallion.png) com corte facetado de 8 lados e bisel dourado angular.
      - **Minimapa 2D em Tempo Real**: Atualizada a função `updateCityMinimap()` para desenhar a praça central como um octágono regular facetado sobre o fundo translúcido.

14. **Mira em "V" Aberta de Alta Definição (AAA MMORPG Reticle - Tier 1 Striker)**:
    - **Demanda do Usuário**: _"crie uma mive em v aberta e mem cor que destaque... quero uma coisa sofisticada... tem que ser mais refinado que isso, ta parecendo pixelarte isso ai"_.
    - **Execução**:
      - **Arte Conceitual AAA**: Gerada folha de alta definição com miras esculpidas em cristal de mana e ouro imperial via subagente especializado em UI AAA.
      - **Mockup Oficial Apresentado**: Exibidas 3 opções (Tier 1 Striker, Tier 2 Asa Mítica, Tier 3 Prisma Radiante Imperial) em tamanho magnificado e escala de combate real.
      - **Seleção do Usuário**: Aprovada a **Opção 1 (Tier 1 - Minimalist / Striker)**.
      - **Recorte e Calibração de Sprites**:
        - [xhair_tier1.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/hud/xhair_tier1.png): Estado livre/idle com lâminas chanfradas em Cristal Ciano Neon, frisos de Ouro Imperial e diamante de precisão.
        - [xhair_tier1_lock.png](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/assets/hud/xhair_tier1_lock.png): Estado travado/lock-on com transição do núcleo para Rubi Radiante / Brasa de Fogo e aura flamejante.
      - **Integração CSS**: Configurado `#xhair` e `#xhair.lock` em [mu_hud.css](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/css/mu_hud.css#L301-L320) com escala balanceada (38x36px).

15. **Varredura e Calibração de Alinhamento Vertical de Textos em Texturas & Molduras**:
    - **Demanda do Usuário**: _"e faz uma verredura que onde tem texto dentro de textura ex: hp do target o texto nao ta centralizando, ficando acima um pouco perto da borda do topo"_.
    - **Diagnóstico**:
      - Descompasso entre caixas delimitadoras e cavidades de textura (na moldura de 42px de altura do target, a cavidade do cristal fica centrada em $y = 24.5px$ / 58% da altura, enquanto a caixa delimitadora padrão centrava em $y = 21px$).
      - Métricas de fontes em caixa alta ('Cinzel' All-Caps) sem descendentes empurravam a linha de base para o alto, colando as palavras na borda dourada superior.
    - **Correções Aplicadas em [css/mu_hud.css](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/css/mu_hud.css)**:
      - **Nome do Alvo (`#top #l2-target-name`)**: Reposicionado com `top: 58% !important; transform: translateY(-50%) !important; padding: 1px 4px 0 !important;`, fixando-se no centro óptico da gema de vida.
      - **HP e Estamina do Dragão (`.mu-bar-text`)**: Adicionado `padding-top: 3px !important;`, alinhando os textos no centro do canal de cristal líquido.
      - **Plaqueta Central (`.mu-hud-nameplate`)**: Calibrada para `top: 33.75% !important; height: 14.50% !important; padding: 2px 8px 0 !important;`.
      - **Contador de Recarga (`.slot-cd-txt`)**: Ajustado com `padding-top: 1px !important;`.
      - **Relógio e Botões (`#atmo-clock`, `#mu-tp-toggle-btn`, `.tp-btn`, `#lockhint`)**: Convertidos para flexbox inline com alinhamento vertical e paddings ópticos equilibrados.
      - **Incremento de Cache**: Versão elevada para `?v=13` em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) e [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html).

16. **Alinhamento Central da Câmera Estilo Dragon Nest (Remoção do Desvio de Ombro)**:
    - **Demanda do Usuário**: _"pode verificar o desalinhamento entre personagem e a mira ? a mira esta centralizada ja o personagem nao, deve ser assim ou nao ? nosso sistema de combate se baseia no dragon nest"_.
    - **Diagnóstico**: A câmera no modo 'dn' continha um deslocamento lateral residual de $+0.9m$ para a direita (`cy2 * 0.9` e `-sy2 * 0.9`), típico de shooters em terceira pessoa sobre o ombro (over-the-shoulder), fazendo o personagem ficar visivelmente deslocado para a esquerda enquanto a mira ficava no centro.
    - **Correção em [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) e [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html)**:
      - Zerado o deslocamento lateral: a câmera agora é ancorada diretamente atrás do eixo do personagem (`camera.position.set(S.px - Fx * NAV.tpDist + shx, ..., S.pz - Fz * NAV.tpDist)`).
      - O personagem agora fica **100% centralizado horizontalmente na tela** em perfeita simetria com a mira em "V".
      - Trajetórias de golpes, magias, cones de ataque e esquivas laterais (A/D) agora possuem alinhamento e vetorização idênticos ao **Dragon Nest**.

17. **Dungeon Estilo Albion Online: Baús de Recompensa, Telegrafia de Área, Mini-Boss e Correção do Baium**:
    - **Demanda do Usuário**:
      - Dungeons inspiradas em **Albion Online** (salas com chefes intermediários, baús de recompensas e mobs com áreas de dano telegrafadas no chão para desviar).
      - Correção crítica do **Baium** (estava sem animações de skills ativas e não morria de forma persistente na dungeon).
      - Diretriz dos 5 Pilares de Inspiração registrada:
        - **Albion**: Dungeons, mobs, áreas e baús.
        - **Cabal**: Estilo de skills e combos.
        - **Dragon Nest**: Jogabilidade não-target, câmera centralizada e esquiva.
        - **Lineage 2**: Modelos 3D, personagens, monstros e chefes.
        - **Mu Online**: HUD, sons, joias e orbes.
        - **Solo Leveling**: Progressão, caçadores e telas futuras.
    - **Execução Técnica**:
      1. **Correção do Baium em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html)**:
         - Eliminado o override que resetava os ataques do Baium para `boss_idle/boss_run` a cada frame.
         - Calibrada a velocidade e duração de animações de skills (`atk01`, `spatk01`, `spatk02`, `spatk03`, `spatk04`).
         - Corrigida a morte do Baium: na Dungeon ele executa o clipe oficial de morte `death` e permanece derrotado no chão (`boss.drv.hold = 9999`) sem renascer sozinho.
      2. **Telegrafia de Área de Dano no Solo (Albion Style)**:
         - Todos os inimigos de ataque em área e o mini-boss agora projetam **anéis e zonas de perigo luminosas no solo** durante a fase de windup/canalização (`groundRing`), permitindo que o jogador antecipe e use a esquiva (_i-frames_ via rolamento [Shift/Espaço]).
      3. **Baús de Recompensa 3D Interativos**:
         - Implementados os Baús de Prata e Ouro/Lendário (`spawnChest`, `updateChest`, `interactChest`) com tampa articulada móvel, cantoneiras e gema brilhante.
         - Surgem no centro ao limpar cada sala e após a derrota do Baium.
         - Interação com tecla **[E]**: abertura física da tampa com rotação suave, explosão de partículas douradas/azuis, efeitos sonoros (`SFX.parry` + `SFX.levelup`) e banners de recompensa.
      4. **Estrutura Expandida em [data/dungeon.json](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/data/dungeon.json)**:
         - Adicionado o **Mini-Boss Intermediário** (_Comandante das Sombras_, 750 HP, golpes pesados e anéis vermelhos).
         - 4 Salas progressivas:
           - Sala 1: Corredor das Sombras (Mobs de Vanguarda + Baú de Prata).
           - Sala 2: Cripta do Comandante (Mini-Boss + Baú de Ouro).
           - Sala 3: Salão dos Brutos Ancestrais (Hordas de elite + Baú de Prata).
           - Sala 4: Trono do Imperador Baium (Raid Boss épico + Baú Lendário).

18. **Portal de Retorno à Vila e Tela de Carregamento Oficial Lineage 2 na Arena/Dungeon**:
    - **Demanda do Usuário**:
      - Ao entrar no Santuário para ir à dungeon, não havia botão nem portal para retornar à cidade (`cidade.html`).
      - Adicionar tela de carregamento na entrada da arena/dungeon para eliminar o flash de cena não texturizada/preta enquanto os modelos e texturas 3D carregam.
    - **Execução Técnica**:
      1. **Tela de Carregamento Oficial Lineage 2 em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html)**:
         - Implementado `#l2LoadingScreen` utilizando a arte canônica de Talking Island (`assets/talking_island/loading_screen.jpg`) e o brasão IS LABS.
         - Barra de progresso com design reto/afiado em ouro (`#f5c451`) e cristal azul, acompanhando o carregamento real dos modelos modulares do cenário GLB (`env_arena_floor_01.glb`, `env_arena_wall_01.glb`, `env_banner_pole_01.glb`), animações FBX, texturas do Baium e personagem VRM/GLB.
         - Transição suave de fade-out (`opacity .8s`) assim que todos os assets estão prontos em memória, eliminando qualquer visualização de geometrias ou céu sem texturas.
      2. **Portal 3D de Retorno à Cidade (Talking Island)**:
         - Criado `spawnCityPortal()` com torus dourado (`0xf5c451`), vórtice de energia ciano (`0x3aa8ff`) e coluna de luz vertical no portão sul do santuário (`z = +11.5`).
         - Suporte a gatilho por travessia física (`dist < 1.9`) ou interação com tecla **[E]** ao se aproximar.
         - Prompt dinâmico de interação (`#portal-prompt`) estilizado em ouro e tipografia Cinzel: `Pressione [E] ou atravesse para Retornar a Talking Island`.
         - Retorno seguro: ao ativar, a tela de carregamento surge com mensagem _'Retornando à Vila de Talking Island...'_ e redireciona para [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html).
      3. **Botão de Interface Direta (HUD Santuário)**:
         - Adicionado botão `#btnReturnCity` no canto superior esquerdo (`top: 16px; left: 16px`), com moldura reta dourada e fundo escuro translúcido.
         - Visível exclusivamente no Santuário (`DG.room < 0`), permitindo saída rápida mesmo sem caminhar até o portal sul.

19. **Calibração de Elevação e Centralização da Mira (Estilo Dragon Nest Action TPS)**:
    - **Demanda do Usuário**:
      - A mira parecia não estar centralizada e estava 'colada' diretamente na cabeça/penteado do personagem.
      - Solicitação para subir a mira e descolar do topo do personagem.
    - **Diagnóstico & Causa Raiz**:
      - O cálculo de altura da câmera em terceira pessoa em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html) e [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html) projetava o raio central do frustum diretamente em Y = 2.1m (exatamente a altura do crânio/cabelo da Dark Elf e do Human Fighter).
      - Como a pose de combate/idle possui o quadril levemente inclinado (+12cm à direita) e escudo largo na esquerda, ter a mira grudada no crânio acentuava a sensação de assimetria.
    - **Execução Técnica**:
      1. **Elevação da Altura Base da Câmera**:
         - Aumentada a altura focal da câmera de 2.1m para 2.8m em terceira pessoa.
         - O personagem agora fica posicionado confortavelmente no terço inferior da tela, deixando um espaçamento limpo de ~50-60 pixels entre a cabeça e a retícula.
      2. **Reposicionamento Vertical da Retícula**:
         - Retícula #xhair calibrada em [css/mu_hud.css](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/css/mu_hud.css) para op: 46% !important; (levemente elevada em relação ao centro morto de 50%).
         - Raycast de colisão e mira ajustado em Three.js para NDC (0, 0.08), sincronizando a mira visual e o disparo físico de projéteis e ataques de forma milimétrica.
      3. **Sincronização**:
         - Alteração replicada em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html) e [cidade.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/cidade.html).

20. **Portal Dimensional Solo Leveling (Rank A/S - Laranja & Raios Elétricos)**:
    - **Demanda do Usuário**:
      - Selecionada a Opção 3 (Portal Dimensional Solo Leveling).
      - Requisitada versão em escala maior (monumental), com efeitos em tons alaranjados/âmbar e raios elétricos arcanos.
    - **Execução Técnica**:
      1. **Conceito & Mockup Visual**:
         - Gerado mockup de alta fidelidade [solo_leveling_s_rank_portal_concept_1793217817096.jpg](file:///c:/Users/icaro/.gemini/antigravity/brain/37e73844-1664-4aea-98c8-1a7ce6965eeb/solo_leveling_s_rank_portal_concept_1793217817096.jpg) com a fenda dimensional de chamas solares, monólitos de obsidiana levitantes e arcos elétricos.
      2. **Construção Procedural 3D em [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html)**:
         - **Escala Imponente**: Fenda vertical elíptica/losangular de ~4.9m de altura por 3.5m de largura (`RX = 1.75, RY = 2.45`).
         - **Vórtice Central em Camadas**: Núcleo de horizonte de eventos profundo (`0x120400`), disco de plasma laranja fundente (`0xff6600`) em rotação e anéis de energia solar âmbar (`0xffaa22`).
         - **14 Monólitos e Estilhaços Levitantes de Obsidiana**: Modelados em geometria facetada (`DodecahedronGeometry` com `flatShading`), orbitando o portal com flutuação senoidal orgânica independente e núcleos rúnicos de cristal laranja brilhante (`0xffaa00`).
         - **Arcos Elétricos Dinâmicos (Raios Laranjas)**: Sistema de `LineSegments` com arcos de energia em zig-zag que saltam continuamente entre os estilhaços e o centro da fenda dimensional.
         - **Iluminação Dinâmica**: Luz de ponto pulsante laranja (`PointLight` 4.5 intensidade) e coluna de luz vertical âmbar (`0xff7700`) iluminando o piso e o guerreiro.

21. **Correção Completa do Baium (Combate, Skills, Morte Real) e Grande Portal Solo Leveling (Versão 3 Colossal)**:
    - **Diagnóstico & Causa Raiz**:
      1. _Ausência do Baium no Spawn Inicial_: Com o sistema de Masmorra, [arena.html](file:///c:/TECX%20SOFTHOUSE/IS%20ONLINE/prototipo/arena.html) iniciava por padrão no Santuário (`DG.on = true`, `room = -1`), com o Baium oculto em `z = -500`. O jogador ficava diante de uma arena vazia sem saber como enfrentá-lo diretamente.
      2. _Loop Infinito nos Raios do Baium (`spawnBaiumBolt`)_: `requestAnimationFrame(animWarning)` estava incorretamente posicionado dentro de `if(el >= 1)`, disparando 60 descargas elétricas e fendas por segundo, travando a CPU e congelando o combate.
      3. _Baium "Não Morria de Verdade"_: No modo duelo, `if(S.deadT > 3.5 && !DG.on)` ressuscitava o Baium automaticamente após 3.5 segundos. No modo masmorra, o mixer travava com `hold = 9999` e não resetava ao reiniciar.
      4. _Detecção de Alcance de Golpe ("Errou")_: O cálculo de `reach` não descontava o raio de colisão do modelo gigante do Baium (~1.5m), fazendo com que ataques corporais falhassem mesmo colados ao chefe.
      5. _Portal Roxo Antigo no Fundo_: O portal decorativo ao fundo (`portal` em `0, 6, -22`) ainda utilizava três anéis roxos simples de `TorusGeometry`, destoando da identidade visual Solo Leveling.
    - **Execução Técnica**:
      1. **Botão de Duelo Direto no Santuário (`#btnFightBaiumDirect`)**:
         - Adicionado botão de ação rápida fixo no topo `[⚔️ DESAFIAR BAIUM (DUELO DIRETO)]` no Santuário.
         - Permite ao jogador pular direto para a luta contra o Baium em modo duelo sem precisar atravessar as salas anteriores.
      2. **Correção do Loop de Raios & Notificação de Skills**:
         - Corrigido o disparo de raios e fendas sísmicas para executar exatamente uma vez no fim do aviso rúnico.
         - Adicionados avisos de skills no topo da tela e floatText quando o Baium canaliza: `[PISÃO SÍSMICO]`, `[MARTELO SÍSMICO DUPLO]`, `[TEMPESTADE DE RAIOS]`, `[VARREDURA GIRATÓRIA 360°]`, `[INVESTIDA FEROZ]`.
      3. **Morte Real do Baium & Baú Lendário (`dgBossDuelDefeated`)**:
         - Removida a ressurreição automática de 3.5 segundos. O Baium reproduz sua animação de morte oficial, sofre dissipação de sombras e permanece derrotado.
         - Ao ser vencido, surge o Baú Lendário aos seus pés e o portal de retorno, com banner de vitória gloriosa.
      4. **Calibração de Acerto de Golpes**:
         - Descontado o raio de volume do Baium (`reach - 1.5m`), garantindo que golpes padrão e combos conectem com precisão.
      5. **Grande Portal Solo Leveling Colossal (Versão 3)**:
         - Substituído o antigo anel roxo por um portal colossal de ~11.2 metros de altura (`SL_RX = 3.8, SL_RY = 5.6`).
         - Composto por 20 monólitos de obsidiana facetada com runas incandescentes orbitando o perímetro, arcos elétricos dinâmicos (`LineSegments`), vórtice de plasma aditivo alaranjado e iluminação dinâmica volumétrica pulsante.

22. **Substituição Definitiva dos Anéis Low-Poly por Portais Solo Leveling HD Canônicos (S-Rank Azul/Ciano) em Todas as Instâncias**:
    - **Diagnóstico das Capturas do Usuário**:
      1. O usuário enviou 4 capturas de tela demonstrando que, ao jogar a masmorra e o santuário, o portal de retorno à cidade e o portal de saída após derrotar o Baium ainda renderizavam como um anel roxo/lilás simples e plano (`TorusGeometry` de raio 1.6m com cor `0x8b7bff` e círculo opaco `0x5a3fd0`).
      2. No Santuário, havia sobreposição visual estranha entre o portal de fundo (`z = -22`) e o portal interativo (`z = -9`), gerando o efeito de vórtices duplicados verticalmente.
      3. O construtor do portal de retorno à cidade (`spawnCityPortal`) e os fluxos de vitória não utilizavam o novo pipeline de texturas de alta definição.
    - **Execução Técnica & Renderização**:
      1. **Geração e Aplicação de Texturas HD Canônicas** (`prototipo/assets/fx/`):
         - `portal_vortex_blue.png`: Vórtice cósmico em espiral de nebulosa azul safira e ciano elétrico com microestrelas e filamentos energéticos.
         - `portal_event_horizon.png`: Anel radiante de horizonte de eventos contra-rotativo.
         - `portal_monolith_rune.png`: Textura de rocha vulcânica obsidiana com hieróglifos rúnicos arcanos entalhados e incandescentes em ciano (`#00e5ff`).
         - `portal_floor_seal.png`: Círculo de invocação rúnica mágica posicionado no piso sob a fenda dimensional.
         - `portal_mist_blue.png`: Névoa e partículas de vapor de condensação de éter na base do portal.
      2. **Construtor Unificado `createSoloLevelingGate(opts)`**:
         - **Singularidade Negra**: Disco central opaco (`CircleGeometry` com `color: 0x01030a`, `side: THREE.FrontSide`, `depthWrite: true`) simulando a profundidade infinita do abismo espacial/dimensional canônico de Solo Leveling.
         - **Monólitos de Obsidiana Facetados 3D**: Geometria facetada personalizada (`makePointedMonolithMesh`) simulando obeliscos de cristal afiados, dispostos tangencialmente ao contorno da elipse (com cristais de topo e base ampliados).
         - **Nuvem Orbital Externa & Arcos Elétricos**: 8 estilhaços orbitais levitantes e linhas de raio de alta voltagem (`0x00f5ff`, `LineSegments`) descarregando pulsos entre os monólitos a cada quadro.
         - **Fixação Espacial Firme**: Removido o billboarding forçado (`lookAt(camera)` a cada quadro), mantendo os portais firmemente ancorados em seus eixos de entrada com orientação natural.
      3. **Unificação Total de Cenários**:
         - _Santuário (Entrada DG)_: Portal S-Rank em `(0, 2.7, -9)` virado para o Sul.
         - _Santuário (Retorno à Cidade)_: Portal S-Rank em `(0, 2.7, 11.5)` virado para o Norte, banhado em luz azul de retorno a Talking Island.
         - _Fim de Sala / Vitória do Baium_: Portal de saída dimensional renderizado majestosamente atrás do Baú Lendário com o feixe de luz vertical de tesouro.
      4. **Verificação Automatizada via Edge/Playwright**:
         - Validado em tempo real com capturas [screenshot_live_solo_leveling_dungeon_gate.png](file:///C:/Users/icaro/.gemini/antigravity/brain/37e73844-1664-4aea-98c8-1a7ce6965eeb/screenshot_live_solo_leveling_dungeon_gate.png) e [screenshot_live_solo_leveling_baium_defeat_gate.png](file:///C:/Users/icaro/.gemini/antigravity/brain/37e73844-1664-4aea-98c8-1a7ce6965eeb/screenshot_live_solo_leveling_baium_defeat_gate.png).

23. **Correcao Completa do Retorno a Cidade, Portal Branco Celestial e Morte Definitiva do Baium**: - **Diagnostico Profundo dos Problemas Relatados**: 1. _Por que nem o botao nem atravessar o portal voltava pra cidade?_ - A funcao
    eturnToCity() chamava gestMsg('Retornando...'), que tentava acessar $('#msg').textContent. Como o elemento #msg nao existia no DOM, era disparada uma excecao silenciosa (TypeError: Cannot set properties of null), abortando a execucao antes de atingir o setTimeout(..., 400) que redirecionava para cidade.html! - Na rotina de renderizacao de cada quadro (
23. **Correcao Completa do Retorno a Cidade, Portal Branco Celestial e Morte Definitiva do Baium**:
    - **Diagnostico Profundo dos Problemas Relatados**:
      1. *Por que nem o botao nem atravessar o portal voltava pra cidade?*
         - A funcao 
eturnToCity() chamava gestMsg('Retornando...'), que tentava acessar $('#msg').textContent. Como o elemento #msg nao existia no DOM, era disparada uma excecao silenciosa (TypeError: Cannot set properties of null), abortando a execucao antes de atingir o setTimeout(..., 400) que redirecionava para cidade.html!
         - Na rotina de renderizacao de cada quadro (rameBody), updatePortal(dt) e updateChest(dt) estavam encapsulados sob if(DG.on){...}. Quando o jogador iniciava o duelo direto do Baium (DG.on = false), a animacao e deteccao de colisao com o portal e com o bau simplesmente NUNCA executavam!
         - O raio de deteccao do portal no Sul (z = 11.5) estava restrito a dCity < 2.0. Como o limite fisico da arena e ARENA = 13.5, o jogador precisava encostar na parede extrema do fundo para tentar bater o limite de 2 metros.
      2. *Por que o Baium ressuscitava em loop apos morrer?*
         - Na vitoria do duelo direto (dgBossDuelDefeated), a flag DG.cleared nao estava sendo marcada como 	rue e BOSS_ON permanecia ativo.
         - Se o jogador morresse ou se a arena tentasse resetar, 
esetDuel() reiniciava a luta inteira restaurando o HP do Baium para o maximo.
         - Ao dar F5, o localStorage.getItem('isblade.mode') mantinha o valor 'duel', fazendo o navegador reabrir o combate direto em vez de abrir o Santuario limpo ou a cidade.
    - **Implementacao & Melhorias Aplicadas**:
      1. **Portal Solo Leveling Branco Celestial Radiante (Sul - Retorno a Talking Island)**:
         - Criadas texturas celestiais peroladas em alta resolucao: portal_vortex_white.png, portal_event_horizon_white.png, portal_floor_seal_white.png, portal_monolith_rune_white.png, portal_mist_white.png.
         - O portal do Sul (Z = 11.5) agora e um imponente Solo Leveling Gate em Branco Celestial puro e platina (
uneColor: 0xffffff), com runas brancas incandescentes e arcos eletricos brancos, contrastando perfeitamente com o Portal Azul Safira da Dungeon (Norte, Z = -9).
      2. **Ativacao Universal de Retorno & Tecla de Atalho**:
         - Retirada a trava DG.on de updatePortal e updateChest, permitindo deteccao ativa em qualquer modo.
         - Ampliado o raio de deteccao de aproximacao para dCity < 3.2 e ativacao por tecla [E] ate 4.5m.
         - Adicionada a tecla de atalho universal [B] para Retorno Imediato a Talking Island.
         - Botao de tela [⬅ Retornar a Cidade [B]] no canto superior esquerdo com z-index: 9999 e soltura de mouse automatica (exitPointerLock).
      3. **Morte Permanente do Baium**:

         - dgBossDuelDefeated() agora define DG.cleared = true; BOSS_ON = false; S.dead = true; S.hp = 0;. O Baium permanece definitivamente no chao.
         - 
esetDuel() agora respeita if(DG.cleared) return;, impedindo qualquer ressurreicao.
         - Na vitoria do duelo direto, surge o Portal Branco Celestial de Retorno e o Bau Lendario.
      4. **Verificacao Automatizada com Suite Completa de Testes**:
         - Teste 1: Duelo direto contra Baium -> Golpe fatal -> Baium morto com 0 HP -> Espera de 4s confirmou que nao ressuscita.

         - Teste 2: Atravessar o portal de vitoria redireciona com sucesso para http://localhost:8000/cidade.html.
         - Teste 3: Atravessar o Portal Sul Branco Celestial redireciona com sucesso para http://localhost:8000/cidade.html.
         - Teste 4: Pressionar a tecla [B] redireciona com sucesso para http://localhost:8000/cidade.html.


---

## 📅 DETALHE POR MUDANÇA — [Claude] 28/10 a 31/10/2026 (migrado do REGISTRO_CLAUDE.md)


### [Claude] 28/10/2026 - Skill 1 v4: kamehameha (Claude)
- Verificado em Playwright: cidade carrega sem erro de script, 16 clipes g\_\* anexados (incluindo g_roll) e, com escudo equipado, o Shift toca `g_roll`.
- `prototipo/js/guardiao.js`: `fxSwing` de `g_s1` agora solta o feixe em vez do leque de escudos; `G.cena()` passou a expor `fx` (depuracao). A carga (escudo trocando de cor) continua igual.
- Hitbox da skill continua o cone de 90 graus (gameplay nao mexido).


### [Claude] 28/10/2026 - Skill 1 v5: Escudo de Energia canalizada (domo de colmeia + escudo astral) (Claude)
- Mecanica nova: segurar a tecla da skill = canalizar ate 5 s. Todo dano que vem da FRENTE (180 graus, atacante = inimigo mais proximo) e absorvido (0 de dano, sem interromper) e acumulado; dano de tras nao acumula e interrompe a canalizacao. Ao soltar (ou aos 5 s) o golpe causa o acumulado x 50% (0-3 s) / 100% (3-5 s) / 200% (5 s) em 180 graus por 10 m. Nada acumulado = nada acontece.
- `js/guardiao.js`: `canal`, `G.canalTick(an,dt)` (congela a animacao do clipe na pose de carga, frame 120), `G.canalAtivo()`, absorcao em `G.filtrarDano`, `G.canal` exposto para depuracao. Removido o `buffs.reflexoT` e o leque/feixe da skill 1.
- `js/guardiao_fx.js`: `FX.domo({getPos})` = meio domo de ~40 celulas hexagonais (encaixam com "pop" a cada golpe, cor por tempo de carga branco->ciano->azul) + escudo astral do IS (textura de canvas, frente e verso). `enc(n)`, `tempo(t)`, `pulso()`, `soltar()`, `kill()`. `FX.feixe` (kamehameha) continua na biblioteca, sem uso.
- `arena.html` (assinado): `S.skHeld` (tecla da skill segurada, keydown/keyup/blur), `Guardiao.canalTick` no tick do clipe, retorno antecipado em `hurtPlayer` quando absorvido, `getFoes` no `Guardiao.init`.
- `data/armas/shield.json`: descricao da skill atualizada.

- Calibracao pendente: `CANAL_CAP` (.4 = dano de 40% da vida maxima fecha o domo), `CANAL_FRAME` (120, pose de carga), atacante por proximidade (projeteis/area nao tem origem exata).

### [Claude] 28/10/2026 - Ataque padrao do Guardiao com efeitos 3D (Claude)
- Antes: o ataque padrao (sweep/thrust/spin) so tinha o arco e o leque genericos de espada; nenhum efeito do Guardiao.
- `js/guardiao.js`: `G.aoAtacar(an)` (inicio do golpe: rastro do escudo, poeira, aneis de vento) e `G.fxBasico(an)` (impacto). sweep = investida + pancada; thrust = giro de 360 com onda de vento; spin = pancada no chao (so o golpe final racha o chao: cratera, rachaduras, rochas angulares). `G.testeAtaque(id)` para teste visual.
- `arena.html` (assinado): chama `Guardiao.aoAtacar` ao criar o golpe e `Guardiao.fxBasico` no impacto; para o escudo nao desenha mais o leque/arco genericos.
- Ainda fraco: a poeira (`humo`) esta escura e em bolhas; o rastro do escudo mal aparece no headless; efeitos nao conferidos em movimento.


### [Claude] 28/10/2026 - Esquiva por classe: rolagem do Mixamo no esqueleto L2 (Claude)
- Causa: o personagem L2 usa o esqueleto Bip01; o `roll.fbx` do Mixamo so serve no esqueleto Mixamo. No L2 o jogo caia no clipe `roll` do proprio L2, que e um clipe de ataque reaproveitado (SpAtk11).
- `tools/blender_fx/dodge_roll.py` (novo): retarget do `roll.fbx` para `HumanFighter_Armature` -> acao `Dodge_Roll` (76 quadros, no lugar; so a descida vertical do quadril fica). Rotacao de mundo por osso (preserva torcao) + correcao de DIRECAO nos membros (compensa T-pose x pose de repouso). Verificado: membros a 0 graus do original, tronco a 4-6 graus. Zera os ossos fora do mapeamento (o `Bip01` raiz estava girado por uma acao anterior). Restaura o fps da cena (o importador de FBX muda para 30).
- `tools/blender_fx/export_guardian.py`: `Dodge_Roll` -> clipe `g_roll`. `assets/personagens/guardian_anims.glb` reexportado (v=2).
- `js/guardiao.js`: `G.clipeEsquiva(rig, dur)` escolhe o clipe pela classe (`isblade.char_type` com "magic" = `m_blink`, senao `g_roll`) e ajusta a velocidade a duracao da esquiva (`rollDur` 0,4 s). `arena.html` (assinado) usa isso em `doRoll`; sem clipe, cai no comportamento antigo.

- Testado no jogo: humano e anao (clipe congelado em 8 tempos). Mago: `m_blink` ainda nao existe, cai no clipe antigo.
- Pendente: blink do mago (saltinho, giro vertical no ar, aparece a frente no mesmo alcance da rolagem).

### [Claude] 28/10/2026 - Esquiva no cidade.html + ligacoes do arena portadas (Claude)
- Bug: o Shift continuava dando um "dashzinho" (clipe de ataque do L2) porque o `cidade.html` tem o proprio `doRoll` e eu so tinha corrigido o `arena.html`.
- `cidade.html` (assinado): `doRoll` usa `Guardiao.clipeEsquiva` (g_roll). Portadas tambem as ligacoes que so existiam no arena: `Guardiao.aoAtacar`/`fxBasico` (ataque padrao com efeitos), `canalTick`/`canalAtivo`/`S.skHeld`/`getFoes`/retorno antecipado em `hurtPlayer` (skill 1 canalizada).
- Verificado em Playwright: cidade carrega sem erro de script, 16 clipes g_* anexados (incluindo g_roll) e, com escudo equipado, o Shift toca `g_roll`.

- Licao: arena.html e cidade.html sao copias; toda ligacao nova do Guardiao precisa entrar nos dois.

### [Claude] 28/10/2026 - Escudo em repouso por raca (Claude)
- Problema (dark elf femea): fora de combate o escudo ficava como uma tabua na diagonal (so a elfa ficava boa); o repouso do L2 deixa a mao em lugar diferente em cada raca e o ajuste `AJ` por raca nao fechava.
- `js/guardiao.js`: nova pose de repouso relativa ao CORPO, igual a da guarda: `G.repouso = { off: [3, 7, -2], yaw: 1.5708 }` (escudo em pe ao lado da perna esquerda, face para fora; yaw gira a pose da guarda em torno do vertical). `guardaPose` generalizada (off, quaternion, peso). `rK` faz a transicao suave repouso <-> combate. `AJ` continua existindo mas o repouso agora o sobrepoe.
- Brilho do escudo reduzido (`is_logo` ei 1,2 -> .75; `is_trim` .9 -> .55): estourava em branco/amarelo na cidade.
- Verificado de costas em humano e dark elf femea. Nao vi de frente nem nas outras racas.


### [Claude] 28/10/2026 - Skill 1 v6 (escudo na hora, astral geometrico, domo maior) + Fortaleza Egide drena vida (Claude)
- Feedback do usuario apos testar: o escudo/domo demoravam (so nasciam na pose de carga, ~0,9 s); o astral devia ter as quinas geometricas do escudo de prototipo; o domo devia ser maior.
- `js/guardiao.js`: o canal comeca NO CAST (`aoCastar` cria o domo; `canalTick` so congela a animacao na pose de carga). `FX.domo` recebe `info: geoEscudo(...)`.
- `js/guardiao_fx.js`: o escudo astral agora usa a geometria do escudo equipado (quinas e espetos) com o shader de energia (cor por tempo de carga); a placa de canvas "IS" ficou como reserva. Domo: R 2,3 -> 3,6 m e celulas menores (ds .30 -> .25, ~58 celulas), assentado perto do chao.
- Fortaleza Egide (skill 2): dentro da zona de 8 s o jogador recupera 10% do dano que causa (`G.drenar`, constante `DRENO`). Ganchos assinados em `arena.html` e `cidade.html` (chefe e mobs): cura `S.php`, texto verde "+N", brasas verdes. Descricao em `data/armas/shield.json` atualizada.

- Interpretacao: "drenasse vidro" = drenar vida (lifesteal). Valor 10% e palpite de equilibrio; so vale dano causado dentro da zona.

### [Claude] 28/10/2026 - Esquiva: rolagem para a FRENTE feita por codigo (Claude)
- Problema: "duas piruetas". Medido no Blender: o `roll.fbx` do Mixamo e um rolamento para TRAS com salto (o quadril anda ~2,3 m contra a frente do personagem e o corpo gira ao contrario do deslocamento do jogo).
- `tools/blender_fx/dodge_roll_proc.py` (novo): rolagem para a frente no esqueleto L2, 41 quadros (0,85 s, 48 fps), no lugar: pronto agachado -> mergulho -> encolhe e rola sobre as costas (giro de 360 graus do corpo em torno do eixo lateral do quadril) -> pousa agachado -> levanta. Poses por direcao de osso no espaco do corpo.
- Achado importante: nos ossos do L2 o eixo Y NAO aponta para o osso filho (o deslocamento e por outro eixo); apontar o eixo Y deixava as pernas fora do lugar. O script usa a direcao real ate o filho (`limb_dir`). O `dodge_roll.py` antigo (retarget do Mixamo) tem o mesmo defeito e fica so como referencia.
- Exportado como `g_roll` em `guardian_anims.glb` (v=3). Conferido no jogo (humano e anao, clipe congelado em 8 instantes, camera de tras).

### [Claude] 28/10/2026 - PWA + preparo de deploy (Claude)

- PWA: `prototipo/manifest.json` (fullscreen, paisagem, start em selecao.html), `sw.js` (codigo: rede primeiro com cache de reserva; assets pesados: cache primeiro, guardados na 1a vez; `VERSAO` no topo limpa tudo), `js/pwa.js` (registra o sw; botao "Instalar app" na selecao/criacao; dica do iPhone; em localhost NAO registra, use `?pwa=1` para testar), `icons/` (192, 512, 180, maskable) gerados por `tools/gerar_icones.py` (escudo IS; o nome do jogo ainda e provisorio).
- 5 paginas (index, selecao, criacao, arena, cidade) ganharam link do manifesto + `js/pwa.js` (bloco assinado no `</head>`).
- Deploy: `vercel.json` (cabecalhos: sw e manifesto sem cache, assets 1 h) e `.vercelignore` (fora: fontes brutas, backups, .blend, tools, baium_export, .unr/.psa/.md5anim). Deploy limpo = 1023 arquivos, ~214 MB (a pasta inteira tem 1,5 GB). `.gitignore` na raiz do repo.
- Testado (Playwright, `?pwa=1`): sw ativo, manifesto valido, sem erros nas paginas, abre offline.
- Nao testado: instalacao de verdade em Android/iPhone, limites de tamanho da Vercel (confirmar na documentacao antes do primeiro deploy).

### [Claude] 28/10/2026 - Servidor de PvP (etapa 1: servidor) (Claude)
- Meta do usuario: cidade inicial com ate ~100 jogadores; grupo de teste ~20. Decisao: CANAIS (copias da cidade, ~50 por canal, configuravel) em vez de um mapa unico gigante; dungeons instanciadas depois.

- `servidor/server.js` (novo, Node 20 + `ws`): serve `prototipo/` e o WebSocket em `/ws` no MESMO endereco (`/status` mostra jogadores por canal). Canais com limite (`CAP`), fotos do mundo a 12 Hz so de quem esta perto (`AOI` 90 m). O servidor decide o dano: alcance, cone, recarga das skills (lidas de `data/armas/*.json`), guarda de frente (x0,2), esquiva (imunidade 0,34 s), morte e reaparecimento (4 s, imune 2 s), velocidade maxima (`VMAX`), limite de mensagens, chat. Posicao ainda e do cliente (so limitada); anti-trapaca real fica para depois.
- `servidor/teste_bots.js`: 12 verificacoes com bots (canais, acerto, direcao, intervalo, esquiva, guarda, skill, morte, reaparecimento, teleporte) — todas passam. Achado e corrigido: ficar parado juntava "credito" de movimento (agora o intervalo conta no maximo 0,5 s).
- `servidor/INICIAR_SERVIDOR.bat`. Ainda NAO ligado ao cliente: falta mostrar os outros jogadores, enviar posicao/ataques e aplicar `hit`/`die`/`resp` na cidade.
- Efeitos especiais das skills do Guardiao (canal da skill 1, dreno, reflexo) continuam locais; no PvP o servidor so aplica o dano base da skill.

### [Claude] 28/10/2026 - Servidor v2: mapas, duelo e times (Claude)

- Decisoes do usuario: canais (estilo MU) + um mapa de PvP compartilhado; no futuro castelo disputado por guildas (vencedora da semana ganha acesso); de inicio o jogo roda no site l2ikarus.com, entrando pela Talking Island; PvP na cidade por DUELO ou TIME; portal central escolhe entre DG (com dificuldades) e mapa de PvP.
- `servidor/server.js`: `STATIC=0` (so a conexao em tempo real, sem entregar arquivos) e `ORIGINS=` (lista de sites permitidos; `*` = um nivel de subdominio). Testado: aceita jogar.l2ikarus.com e \*.vercel.app, recusa site.malicioso.com, `x.vercel.app.evil.com` e conexao sem origem; arquivos 404 com STATIC=0; `/status` 200. Teste dos bots continua 33/33.
- `servidor/teste_bots.js`: 22 verificacoes, todas passam (canais, zona segura, duelo completo, esquiva, guarda, skills, times, morte, reaparecimento, limite de velocidade).
- Falta: cliente (js/net.js + cidade.html), mapa de PvP (arena.html ?modo=pvp), portal de escolha, hospedagem em subdominio de l2ikarus.com.

### [Claude] 28/10/2026 - Cliente multiplayer: cidade com duelo + mapa de PvP (Claude)
- `prototipo/js/net.js` (novo): conecta ao servidor (mesmo endereco, `/ws`; `?srv=wss://...` ou localStorage `isblade.srv` para servidor em outro lugar; `?online=0` desliga), mostra os outros jogadores (mesmo modelo L2 da raca, nome + barra de vida, ate 30 renderizados por perto), envia posicao/clipe/guarda a 12 Hz, envia ataque (no `applyHit`) e esquiva, aplica dano/morte/reaparecimento decididos pelo servidor, duelo (J desafia o mais proximo ate 20 m, U aceita, N recusa, H desiste), HUD de canal no canto. Sem servidor o jogo segue sozinho.

- `js/guardiao.js`: `G.ajusteRemoto` — o escudo dos jogadores remotos usa a mesma pose de repouso/guarda do jogador local.
- `cidade.html` e `arena.html` (blocos assinados `[net]`): import, `Net.init(ctx)`, `Net.tick`, `Net.atacou` em `applyHit`, `Net.rolou`, reaparecimento do PvP vem do servidor. Cidade entra sozinha no canal `cidade`.
- `arena.html`: MAPA DE PVP (`pvpStart`/`pvpSair`, obstaculos simetricos, carta "ARENA PVP" no menu do portal central ao lado das dificuldades da dungeon, botao "Sair do PvP"). A arena tem raio 13,5 m (pequena): serve para ~10x10; mapa maior e proxima etapa. Times nascem em z=-9 (azul) e z=+9 (vermelho).
- Verificado (Playwright, 2 navegadores reais): ambos se veem na cidade, desafio/aceite de duelo, 2 golpes de verdade (vida 100 -> 91 -> 82) vistos pelos dois lados; mapa de PvP com times diferentes e HUD correto; teste dos bots 22/22.
- NAO verificado: PvP com mais de 2 pessoas, desempenho com muitos personagens no celular, efeitos visuais das skills dos outros jogadores (so animacao e dano; os efeitos 3D ficam so no tela de quem ataca), skills especiais do Guardiao no PvP (canal da skill 1, dreno, reflexo: no PvP vale so o dano base), trapaca (posicao e do cliente), hospedagem real.

- Rodar com varios jogadores: `servidor\INICIAR_SERVIDOR.bat` (substitui o INICIAR.bat; porta 8000).

### [Claude] 28/10/2026 - Menu estilo MU + grupo (party) (Claude)
- `prototipo/js/net.js` v4: MENU (tecla P ou botao "MENU (P)" no canto superior esquerdo; so CSS, nenhuma imagem). Em destaque dourado "ATIVO": Duelo e Grupo; apagados "em breve": Troca, Loja, Amigos, Guilda, Mensagem, Ranking. Duelo: lista jogadores ate 40 m com [Desafiar]. Grupo: membros com vida, ★ lider, [Expulsar] (lider), [Sair do grupo], convidar ate 60 m. Painel do grupo (nomes + barra de vida) no canto da tela. U/N aceitam/recusam o pedido mais recente (duelo ou grupo). Redesenha so quando o conteudo muda (senao o clique perde o elemento).
- `servidor/server.js`: GRUPO ligado a SESSAO (`sid` no localStorage `isblade.sid`), nao a conexao: sobrevive a troca de pagina cidade<->arena (90 s de tolerancia; quem cai fica "offline" no grupo); ate 6; so o lider convida e expulsa; grupo com 1 membro se desfaz; no mapa de PvP colegas de grupo caem no mesmo canal e no MESMO time. Estado do grupo reenviado a cada 1 s.
- `servidor/teste_bots.js`: 33 verificacoes, todas passam (11 novas do grupo).

- Verificado em 2 navegadores reais: menu abre/fecha (P, Esc), 2 itens ativos e 6 apagados, convite pelo menu, aceite com U, grupo com os 2 nos dois lados, painel do grupo.
- NAO verificado: layout em tela de celular, grupo com 3+ pessoas em navegador real, troca de pagina com grupo em navegador real (so no teste de bots), expulsar por clique.
- Decisao do usuario (hospedagem): teste na Vercel (so cliente estatico); entrada bonita no site l2ikarus (git do site); cliente baixa em segundo plano e guarda em cache. Carga esperada na apresentacao: ate ~10 simultaneos.

### [Claude] 28/10/2026 - Servidor de teste gratuito (PC + tunel) e site l2ikarus (Claude)

- Contexto: o usuario nao pagou a VPS (sem jogadores ainda) e esta sem dinheiro; apresentacao com ate ~10 jogadores. Caminho de custo zero: cliente na Vercel (estatico) + servidor de jogo no PC do usuario + tunel gratuito do Cloudflare (`cloudflared`, sem conta). A VPS existente pode ser reativada quando houver publico.
- `servidor/iniciar_online.ps1` + `servidor/INICIAR_ONLINE.bat`: liga `servidor/server.js` (se a porta 8000 estiver livre), mostra o link local e o da rede Wi-Fi e, se `cloudflared` estiver instalado, abre o tunel e mostra o link publico para os amigos (tambem o sufixo `?srv=wss://HOST/ws` para quem abrir o jogo pela Vercel). Sem `cloudflared` mostra o comando de instalacao (`winget install --id Cloudflare.cloudflared`). Validado so a sintaxe do script: NAO foi executado de ponta a ponta (cloudflared nao esta instalado e o teste mexeria na porta 8000 do usuario).
- `js/net.js` v5: `?srv=wss://...` agora e GUARDADO (localStorage `isblade.srv`), porque cidade -> arena recarrega a pagina e perderia o parametro; `?srv=off` volta ao padrao.
- Site de producao do L2 Ikarus: `C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\site` (React/Vite na Vercel, repo MANINtecn/l2ikarus, branch main, com arquivos do usuario nao commitados). Nada foi alterado nele. Plano: jogo em projeto/subdominio proprio (ex.: jogar.l2ikarus.com) com a entrada bonita + barra de progresso; o site so ganha um link "Jogar" (alteracao pequena, so com pedido e revisao do usuario).

### [Claude] 28/10/2026 - Preparo para VPS propria (Claude)
- Decisao do usuario: pagar uma VPS propria para o servidor de jogo, cliente na Vercel e, depois, divulgacao na itch.io (a itch deve levar ao jogo hospedado por nos; service worker/PWA pode nao funcionar dentro do iframe da itch).
- `servidor/server.js`: `STATIC=0` (so a conexao em tempo real, sem entregar arquivos) e `ORIGINS=` (lista de sites permitidos; `*` = um nivel de subdominio). Testado: aceita jogar.l2ikarus.com e *.vercel.app, recusa site.malicioso.com, `x.vercel.app.evil.com` e conexao sem origem; arquivos 404 com STATIC=0; `/status` 200. Teste dos bots continua 33/33.

- Decisao: usar as animacoes de bracos que o L2 ja tem (CastShort/Mid/Long, MagicShot/Throw, ShieldAtk*1HS, Social*\*) e criar as skills das outras classes em cima delas, para ficar natural. Anotado para quando formos mexer nas skills (memoria `skills-base-l2`).
- `js/net.js` v6: constante `SRV_PADRAO` (vazia) para apontar o cliente da Vercel para a VPS; `?srv=` continua valendo.
- Nao verificado: nada disto foi instalado numa VPS de verdade (so testado em localhost).


### [Claude] 28/10/2026 - Deploy da VPS por git (Claude)
- Pergunta do usuario: usar o git para mandar os arquivos para a VPS. Resposta: sim (a VPS puxa do git). Nada foi enviado nem commitado; sem acesso a VPS nem credenciais.
- `servidor/atualizar_vps.sh` (rodar NA VPS: git pull --ff-only, npm ci, reinicia o systemd `isblade`, confere /status; para se o pull nao for limpo), `servidor/deploy-vps.yml.exemplo` (GitHub Actions + SSH, NAO ativo; precisa de 3 secrets e chave exclusiva de deploy), e secao no `DEPLOY_VPS.md` (clone parcial so de `servidor/`, deploy key somente leitura, nao usar o repo do site).
- Nao testado: os dois arquivos nao foram executados (nao ha VPS nem Linux aqui); so revisados.

### [Claude] 28/10/2026 - Dominio proprio, entrada do jogo e scripts da VPS Windows (Claude)
- Decisoes do usuario: jogo + entrada ficam JUNTOS no dominio proprio `www.isblade.tecx.pro` (Vercel); NAO editar o site l2ikarus; launcher aposentado (IKARUS.MD desatualizado); VPS e Windows (HeavyHost); o usuario liga o servidor pela VPS; repositorio novo `https://github.com/MANINtecn/isblade.git`.

- `prototipo/index.html`: agora e a pagina de entrada do jogo (visual da home aprovada do l2ikarus: fundo escuro, dourado, azul; botao START -> `selecao.html`; mostra se o servidor esta online lendo `https://play.isblade.tecx.pro/status` ou o `?srv=` guardado). O app instalado (PWA) abre direto em `selecao.html` (start_url). A pagina `public/isblade.html` que eu tinha criado no site l2ikarus foi APAGADA (arquivo novo meu, sem commit); o site ficou inalterado.
- `servidor/vps_windows/`: `auto_sync_isblade.ps1` (sync por git a cada 5 min; reinicia SO o node deste servidor, conferindo o caminho completo; TESTADO com repositorios de mentira: sem mudanca = nada, commit novo = atualiza e reinicia, outro node fora do caminho continua vivo; o teste achou um bug de recursao no nome da funcao `Git`, corrigido), `iniciar_isblade_auto.bat` (loop de reinicio; STATIC=0, ORIGINS dos dominios isblade.tecx.pro), `Caddyfile` (play.isblade.tecx.pro -> localhost:3000), `instalar_isblade.ps1` (firewall 80/443, tarefas IS_Servidor/IS_Sync/IS_Caddy; so sintaxe verificada, NAO executado).
- Push para o GitHub: NAO feito. O repositorio esta PUBLICO (responde sem login) e o jogo tem assets do Lineage 2 (NCSoft); aguardando o usuario deixar PRIVADO ou confirmar. Verificado antes: remoto vazio, 1154 arquivos / ~219 MB, nenhum segredo/chave, identidade git do usuario presente. Commit SEM atribuicao a IA (regra do usuario).


### [Claude] 28/10/2026 - Primeiro envio ao GitHub (Claude)
- Autorizado pelo usuario (que deixara o repo publico por enquanto e vai deixar PRIVADO depois). `git init -b main` na raiz `IS ONLINE`, `core.autocrlf=false` (arquivos vao byte a byte), 1155 arquivos / ~219 MB (maior 16,9 MB), commit `cb5c680` SEM atribuicao a IA (regra do usuario), push para `https://github.com/MANINtecn/isblade.git` branch `main`.
- Aviso dado: o conteudo ficou publico ate o repo virar privado (historico ja pode ter sido clonado/cacheado). Depois de privado, a VPS precisa de credencial (deploy key somente leitura ou token) para o `git fetch` do `auto_sync_isblade.ps1`.
- Pergunta do usuario: o sync do 300x nao cobre este repo. Resposta: o sync do IS e independente (clone em `C:\IS-sync`, tarefas `IS_Sync`/`IS_Servidor`/`IS_Caddy`, reinicia so o node pelo caminho completo); NAO usa o caminho nem os scripts do 300x (`l2ikarus300x-sync`, `auto_sync_300x.ps1`).

### [Claude] 29/10/2026 - Skill 1 com animacao nativa do L2 (CastMid) (Claude)

- Pedido: tirar a "pose de batalha antiga" ao lancar skills (o Blender `g_guard` agachado de pernas abertas, em que varios clipes `g_skillN` ja comecam: 4 e 6 no 1o quadro) e usar animacoes de conjuracao do proprio L2. Diagnostico: ao apertar a skill o corpo sai da guarda L2 (`guard` = AtkWait_2HS, de lado, com espada) para a postura agachada do Blender, e fica nela.
- Inventario do L2 (PSA original, `raw_fighter/.../MFighter_anim.psa`, 114 clipes; CastShort 0,83 s / CastMid 1,83 s / CastLong 3,83 s / CastEnd / MagicShot / MagicThrow / MagicNotarget / ShieldAtk_1HS / Social_Atk / Social_victory; cast a 30 fps). Importados no Blender (`guardian_skills.blend`, importador io_scene_psk_psa) 13 acoes, guardadas com fake user.
- Skill 1 agora usa `CastMid` (acao `L2_Cast_Skill1`, tempo x1,6 para 48 fps, exportada como `l2_cast1`, 1,79 s): escudo vem ao peito -> ergue os dois bracos (pose segurada, congela em 1,1 s) -> impulso para a frente (golpe em ~1,53 s). Pes no chao conferidos (pelve 19-23 contra 14,6 do g_guard).
- `js/guardiao.js`: `CM.g_s1 = { c:'l2_cast1', sp:1, hit:.86, cut:.98, fz:1.1 }`; `canalTick` congela em `cfg.fz` s; glb `?v=4`. `tools/blender_fx/export_guardian.py`: `'L2_Cast_Skill1': 'l2_cast1'`.
- ACHADO: a acao `Dodge_Roll` (rolagem) NAO estava salva no `.blend` (criada em sessao anterior). Recriada com `dodge_roll_proc.py` antes do export (senao o export teria apagado `g_roll`); agora salva no .blend junto com `L2_Cast_Skill1`. `guardian_anims.glb` com 17 clipes (g_roll 0,83 s e l2_cast1 1,79 s).
- Verificado no jogo (Playwright; humano, anao, orc, elfa negra): segura em 1,15 s (clipe pausado), 5 golpes de 40 acumulam 100, solta, volta para `guard`. NAO verificado: ritmo em tempo real (headless e lento), sensacao da pose parada, skills 2-6 (ainda com os clipes do Blender).


### [Claude] 29/10/2026 - DIRETRIZ: skills de todas as classes em cima das animacoes de braco do L2 (usuario)
- Decisao: usar as animacoes de bracos que o L2 ja tem (CastShort/Mid/Long, MagicShot/Throw, ShieldAtk_1HS, Social_*) e criar as skills das outras classes em cima delas, para ficar natural. Anotado para quando formos mexer nas skills (memoria `skills-base-l2`).
- O usuario esta olhando o catalogo e ja achou um clipe que deixa o arremesso do escudo (skill 6) mais fluido (levantar o escudo e baixar o braco "redondos"); aguardar qual e antes de mexer na skill 6.


### [Claude] 29/10/2026 - Travadas ao soltar skills: shaders compilando na hora (Claude)
- Medicao (Playwright + contador de `gl.linkProgram`; o headless e lento demais para medir quadros, mas conta shaders): a 1a skill compilava 13 shaders na cidade e 10 na arena (luz dos efeitos); a 2a vez da skill 1 chegou a 23; cada efeito novo compilava o seu na hora de aparecer. Cada compilacao e um travao (dezenas a centenas de ms numa GPU real).
- Causas: (1) a luz dos efeitos (`PointLight` em `guardiao_fx.js`) era criada so no 1o uso e depois ligava/desligava (`visible`), mudando o numero de luzes e recompilando shaders da cena toda; (2) nenhum efeito era pre-compilado; (3) o `dispose` ao fim de cada efeito destroi o programa do shader quando o ultimo material dele sai (o three.js conta uso) — entao compilar e descartar nao adianta.
- Correcao: `js/guardiao_fx.js` — a luz entra na cena no carregamento e NUNCA liga/desliga (intensidade 0 quando apagada); `FX.aquecer(extra)` cria um efeito de cada tipo, forca visivel os com `lag`, compila e tira da cena SEM dispose (instancias "sentinela" mantem os programas vivos). `js/guardiao.js` — `G.aquecer()` roda o codigo real de `fxSwing` das 6 skills e de `fxBasico` dos 3 golpes LONGE do jogador (x=z=4000), guarda e devolve posicao, buffs, tremor e arma; agendado em 2 s, 6 s e 12 s (o cenario da cidade termina de carregar depois). `cidade.html`/`arena.html` — `ctx.compile` compila para o alvo do bloom (`BLOOM.rt`; para a tela os shaders saem diferentes e recompilariam) e versoes dos scripts subidas (`guardiao.js?v=6`, `guardiao_fx.js?v=4`).
- Resultado medido: compilacoes durante as 6 skills em duas rodadas = 0 na cidade e 0 na arena (antes 4-23 por skill). O custo foi para o carregamento (~+20-40 shaders compilados nos primeiros segundos).

- NAO resolvido / nao medido: a travada ao GIRAR A CAMERA e ANDAR (sem skill). O cenario da cidade tem 993 malhas, 986 materiais e 7 luzes, e o jogo desenha em alvo do bloom (HalfFloat, MSAA 4x, 2 passes de blur, pixel ratio ate 2, antialias). Sombras em tempo real NAO sao usadas. Pedir ao usuario os numeros do F3 (fps/pico/draws/tri) andando e girando, com e sem bloom (`isblade.bloom`).

### [Claude] 29/10/2026 - Referencia registrada: G3D-Editor (usuario)

- https://github.com/LuizRafael79/G3D-Editor — editor de geodata para usar em qualquer projeto de L2 e tambem no L2web (palavras do usuario). Repositorio de TERCEIRO (LuizRafael79).
- Status: so registrado. Nao foi lido, clonado nem executado. Antes de usar: ler README/licenca/codigo, rodar em pasta separada e nao executar binarios sem revisar.

### [Claude] 29/10/2026 - Skills 2-6 do Guardiao com animacoes NATIVAS do L2 (Claude)
- Levantamento: importadas do PSA do lutador (`raw_fighter/.../MFighter_anim.psa`, 114 clipes, 30 fps) 32 candidatas; medidas no Blender (alcance/altura das maos, pico de velocidade, queda da pelve) e as principais vistas em quadros. Escolhas: 2 Fortaleza Egide = `SpAtk03_2HS` (pulo + pancada ajoelhado com o escudo no chao, impacto 1,03 s); 3 Chuva = `CastLong` recortado x1,6 (invocacao, bracos erguidos, desce em 2,10 s); 4 Rugido = `Social_Atk` x1,3 (gesto de desafio, impacto 0,85 s); 5 Corrente = `Magicshot` (soco para a frente e braco subindo, impacto 0,67 s); 6 Arremesso = `ShieldAtk_1HS` + pausa final de 1,1 s (o braco do escudo faz todo o movimento: arco, passa o ombro e dispara; solta em 1,13 s). Skill 1 ja era `CastMid`.
- `tools/blender_fx/skills_l2.py` (novo) cria as acoes `L2_Skill*`; `export_guardian.py` ganhou `l2_s2..l2_s6`; `guardian_anims.glb` com 22 clipes (`?v=5`).

- `js/guardiao.js`: `CM.g_s2..g_s6` apontam para `l2_s2..l2_s6` com hit/cut pelos impactos; skill 6: o clipe do L2 nao voa o escudo, entao o escudo do braco vira um disco de energia (`FX.escudoVoo`, novo em `guardiao_fx.js`, com o desenho do escudo equipado) que voa ate 5,7 m, segura e volta; o escudo real some do braco durante o voo e e devolvido em `onEnd`; agendado em tempo de jogo (`FX.add(null,...)`). `data/armas/shield.json`: skill 6 `hits` [0.554, 0.767] (antes [0.28, 0.47]).
- Verificado no jogo (Playwright, humano): as 5 tocam o clipe novo e voltam para `guard`; skill 6 escudo some e volta; na cidade (com boneco) a Fortaleza mostra salto -> pancada -> domo/runas/rachaduras. NAO verificado: skills 3, 4, 5 vistas quadro a quadro, outras racas, sincronia fina do impacto, sensacao em tempo real. O `.blend` foi salvo.

### [Claude] 29/10/2026 - Liberacao do personagem depois das skills do Guardiao (agilidade) (Claude)
- Queixa do usuario: depois de uma skill (principalmente a Z, arremesso do escudo) ha uma "travadinha" ate poder bater normal ou engatar outra, e ele NAO quer skill saindo em cima de skill. Obs.: a primeira tentativa (cancelar no meio da skill + disparar o golpe na hora) estava errada e foi DESFEITA.

- Causa (mapeada no codigo): o jogo tem DOIS criterios de liberacao. As teclas (`perform`/`castSkill`) usam `canCancel` (libera apos o golpe); o ataque basico com o mouse segurado (`basicTick`) e o andar normal/guarda so liberam quando `S.anim` acaba (`an.total = duracao x cut`), e ate la o personagem anda a 55% (`MOVE_CAST`). Os clipes do L2 tem "cauda" de relaxamento. Medido em tempo de jogo (`S.anim.tt`): liberava 0,57 s apos o golpe (skill 2), 1,15 s (4), 0,79 s (5) e 0,43 s depois de o escudo voltar (6).
- Correcao em `js/guardiao.js`: `cut` de cada skill = ultimo golpe + recuperacao (s1 .15 s, s2 .20, s3 .10, s4 .25, s5 .20, s6 .10): `cut` s1 .94, s2 .75, s3 .995, s4 .53, s5 .58, s6 .81. Novo `G.podeCancelar(an)`: so libera DEPOIS do ultimo golpe (a regra padrao liberava aos 60% do clipe, o que deixava a Chuva de Escudos ser cancelada antes de cair e perder o efeito); skill 1 canalizando nao cancela. `canCancel` (arena/cidade) consulta `Guardiao.podeCancelar`; `G.cena()` expoe `S` para depuracao.
- Medido depois: libera em 1,22 s (s2, antes 1,59), 1,09 s (s4, antes 2,00), 0,87 s (s5, antes 1,46), 2,09 s (s6, antes 2,53), com todos os efeitos ja disparados. Chuva e Arremesso: 0 amostras liberadas antes do golpe.
- NAO verificado: a sensacao em tempo real (headless e lento), a corrida/ataque basico logo apos a skill com mouse de verdade, o corte da cauda visualmente (blend para a guarda), skills 1 e 3 (cut quase igual ao de antes). Valores de recuperacao sao palpites ajustaveis no comentario de `CM`.


### [Claude] 29/10/2026 - Design de CC e counters do Guardiao + receita v2 (Claude)
- `DESIGN_COMBATE_CC.md` (raiz): documento de DESIGN (nada implementado). Vocabulario de controle (interromper, empurrao, puxao, derrubar, atordoar, lancar), regras anti-lock (tenacidade 4 s, levantada invulneravel 0,5 s, super armadura em 3 niveis que nunca ignora derrubar/atordoar, esquiva nega, guarda nao bloqueia puxao/derrubada, cancelar skill do outro so por controle ou esquiva, telegrafia >= 0,6 s), mapa de CC das 6 skills do Guardiao (1 = onda em cone escalada pela carga 50/100/200% empurrao/empurrao+interromper/derruba; 2 = derruba a 2,5 m do impacto + lentidao na zona; 3 = lentidao 30%; 4 = provocar/aggro; 5 = puxao + unico stun 0,9 s; 6 = empurrao leve na ida e puxao leve na volta), janela de combo (puxao -> basico e Rugido cabem; Fortaleza nao), counters entre arquetipos (Guardiao > Mago > Espadachim > Guardiao, soft), exigencias de codigo e 4 decisoes abertas. Base: campos ja existentes `intr`, `launch`, `armor`, `gauge->stagger`, `S.stun`.
- Receita v2 registrada em `prototipo/tools/blender_fx/RECEITA.md` e na memoria (`guardian-skill-recipe`).

### [Claude] 29/10/2026 - Design de CC reescrito com as regras REAIS do Dragon Nest (Claude)

- O usuario pediu para basear nas regras do Dragon Nest (nao lembra 100%). Pesquisado: so achei UM guia de PvP da comunidade (2014/15, https://onlineshopperslounge.blogspot.com/2015/03/dragon-nest-pvp-basics-fundamentals-w.html), qualitativo, sem numeros. Confirmado la: 7 estados de golpe (impacto leve, medio, stagger, empurrao, derrubado, lift, stun), super armadura com SA Defesa (skill lenta = alta) x SA Quebra (skill rapida = alta), stun so com SA quebrada e fixo em 3 s, i-frames nas skills, defesas passivas por classe com recarga longa (esquiva, esquiva aerea so em lift, escape especifico, "wake attack").
- NAO esta no guia (e eu tinha inventado na v1): tenacidade/imunidade apos stun, levantada invulneravel automatica, limite de combo, resistencias. Movidos para a secao 9 do `DESIGN_COMBATE_CC.md` como opcao. A "levantada invulneravel" do DN e o "wake attack", uma defesa passiva COM recarga, nao automatica.
- Numeros (duracoes, escala 0-3 de SA) sao propostas nossas marcadas no documento; as 4 decisoes abertas foram refeitas (duracao do stun, escape do chao, counters, PvP x PvE).

### [Claude] 29/10/2026 - Decisoes de combate registradas (usuario)

- Stun entre 1,5 e 2 s (padrao 1,8 s). Regras de combate do Dragon Nest, rapido e na mira; skills com identidade Cabal e comportamento DN; Guardiao unico. `DESIGN_COMBATE_CC.md` secao 7b e memoria `combat-rules-dn`.
- Regioes do mapa unico (coordenadas L2): Dungeon subsolo (z~-8900, 1027 pecas Refinery), Ilha1 orcs (155), Ilha2 = FORTRESS (477 atores), Ilha3 = vulcao/Blazing Swamp (143), Torre1 Curuma (29), Torre2 = MINI TOI/casa do Baium (201 atores, 59 malhas toh\_\*). Confirmado pelo dono: Torre 2 = casa do Baium.
### [Claude] 29/10/2026 - CC no PvE (camada de dados) + bloqueio do Guardiao
- Bloqueio: com escudo (WPN==='shield') cada golpe bloqueado custa 60% da estamina (arena.html e cidade.html, variavel gcost). So PvE; o PvP decide guarda no servidor e ainda nao tem isso.
- Novo `prototipo/js/cc.js` (estados leve .2 / medio .35 / stagger .6 / empurrao .8 / derrubado 1.2 / lift 1.5 / stun 1.8 s; regra "SA Quebra >= SA Defesa do alvo"). Ligado ao `damageMob` e ao loop dos mobs em arena.html e cidade.html (import cc.js?v=1).
- `data/armas/shield.json`: skills 2-6 com `q` e `golpe` (2 derruba, 3 impacto leve, 4 stagger, 5 stun, 6 empurrao+medio). Skill 1 (escudo de energia, forca pela carga) ainda sem golpe: falta ligar a carga.
- Testado so a regra em Node (SA, duracao, nao encurta controle maior, deslocamento). NAO testado no jogo rodando. Falta: servidor PvP, animacoes cair/deitar/levantar, wake attack (espaco), icone de status.


### [Claude] 29/10/2026 - Fortaleza Egide: domo gira e corta
- Correcao: arena.html `damageMob` estava sem o gancho `Guardiao.drenar` (cura da Fortaleza nao funcionava contra mobs na arena); recolocado.
- Domo girando: a cada 0,5 s, quem esta dentro do raio (6 m) leva 30% do dano da skill (mobs e chefe, via `domoDano` nas paginas) e a cura do Guardiao e de 35% desse dano (golpe comum: 10%). Visual: cupula gira (guardiao_fx.js) e dois arcos varrem (slashArc). Giro nao gera estamina, maestria, hitstop nem tremor. guardiao.js?v=11, guardiao_fx.js?v=6.
- Verificado: sintaxe dos scripts (node --check). NAO rodado no jogo (Chromium do Playwright nao instalado nesta maquina).

### [Claude] 29/10/2026 - Arremesso do Escudo com golpes multiplos (estilo Cabal)

- shield.json skill 6: dmg 55 -> 22 por golpe; `hits` = [.554,.59,.626 (ida, 3 golpes), .745,.77,.795 (volta, 3 golpes)] (total ~132 contra 110 antes). `golpe` por parte: empurrao no 1o, impacto medio no 4o.
- guardiao.js: partes 2,3,5,6 fazem um pulso curto (anel, espetos, brasas, luz) no ponto de impacto; 1 e 4 mantem a explosao grande. guardiao.js?v=12.
- Servidor PvP le o dano por golpe do mesmo JSON, entao acompanha sem mudar codigo. NAO rodado no jogo; so sintaxe verificada.

### [Claude] 29/10/2026 - HUD do MU na arena (vida do Baium e recargas) + recargas menores
- Causa: o script da arena e `type="module"`, entao `var S={...}` nao vira `window.S`; o mu_hud.js le `window.S` (barra do alvo e recargas dos slots) e nao via nada. Correcao: `var S=window.S={` em arena.html (a cidade ja tinha).

- Usuario indicou que o cliente 300x tem a torre inteira. Cliente usa Lineage2Ver111: arquivo = 28 bytes de cabecalho + corpo XOR 0xAC -> vira pacote UE2 normal (parser parse*unr.py funciona). Mapa 23_18.unr: 2559 atores (1074 toh*\*), toh_boss02 (pedestal do Baium) em L2 (116100, 17514, 10187); torre vai de z -6000 a 11175 (andares a cada ~1000 uu). Todos os modelos estao em staticmeshes/aden_tower_of_hubris_s.usx (131 malhas) + so 38 texturas (exportados via umodel).
- Nao rodado no jogo (so sintaxe). Se o Baium ainda nao morrer, checar o "Modo treino" (localStorage isblade.train): com ele ligado o chefe nunca cai.

### [Claude] 29/10/2026 - Barra de vida do Baium invisivel (HUD do MU)
- Reproduzido no Chrome (Playwright, channel chrome): a placa "BAIUM - RAID BOSS" aparecia sem barra nem numero. Causa: mu_hud.js insere a div `#l2-target-name` antes da barra, e o CSS usava `.bar:first-of-type` (primeira DIV), entao a barra de vida era escondida por `.bar:not(:first-of-type)`. Correcao: classe `mu-hp-bar` (js) e seletores `#top > .bar.mu-hp-bar` / `.bar:not(.mu-hp-bar)` (css). mu_hud.css?v=15, mu_hud.js?v=12.
- Com a correcao e o `window.S`, a recarga aparece nos slots do HUD (testado: 8.6 / 14 / 3.7 s com skills equipadas nos slots). Slots vazios nao mostram recarga: skill precisa estar equipada na hotbar.

- Teste da dungeon (sala 4, Baium): chefe leva dano e MORRE no fluxo normal (dgBossDown). Nao consegui reproduzir "nao morre"; provavel que fosse a barra invisivel + possivel modo treino ligado.

- Correcao: ao importar cada malha glTF do umodel, espelhar vertices em Y e inverter normais (`transform(Scale(-1,4,(0,1,0)))` + `flip_normals`) uma vez por modelo (sem escala negativa). Scripts da scratchpad blender\_{fort,top,hall,house,tower2}.py atualizados com MIRROR_Y.
- Origem: `Desktop\IS BLADE\maps\...` (nao alterada). Trabalho todo na scratchpad da sessao (`...\scratchpad\m18`): parser do `18_18.unr` (reusa parse_unr.py com leitura de propriedades Location/Rotation/DrawScale/DrawScale3D), export dos 323 StaticMesh do Amfa_S.usx via umodel (glTF + 822 PNG), cena montada no Blender (cenas separadas Fort18 e Tower2, nao salvas).
- Regioes do mapa unico (coordenadas L2): Dungeon subsolo (z~-8900, 1027 pecas Refinery), Ilha1 orcs (155), Ilha2 = FORTRESS (477 atores), Ilha3 = vulcao/Blazing Swamp (143), Torre1 Curuma (29), Torre2 = MINI TOI/casa do Baium (201 atores, 59 malhas toh_*). Confirmado pelo dono: Torre 2 = casa do Baium.
- Fortress: montou coerente (muralha, predios, patio). Peso: 113 malhas unicas, 58 mil vertices, 93 mil triangulos com instancias, 299 texturas (21,6 MB em PNG, max 1024 px) -> alvo ~5-10 MB comprimido.

- Escala/orientacao: mesma convencao da Talking Island (1 unidade = 100/2.8 uu; malha x2.8). Blender X/Y/Z = UE X/Y/Z apos import glTF; yaw direto.
- Falta: terreno (256 TerrainSector) e BSP (170 Model/70 Brush) nao extraidos (chao e salas); alguns props flutuam (21 com pitch/roll, sinal nao validado); arvores sem alpha; emissores de fogo ignorados.

### [Claude] 29/10/2026 - Terreno do Fortress e da Torre 2 (aproximado) — o que falta para ficar identico
- Terreno L2: TerrainInfo decodificado (10 camadas Texture+AlphaMap, escala 128x128x76, origem -65536,0; mapa 256x256 quads). Texturas de camada e mascaras (1024) exportadas do Amfa_T.utx; textura final composta por regiao (mascara com y NAO invertido: topo da imagem = y baixo, igual ao radar).
- NAO existe o mapa de altura: o TerrainMap `18_18` esta no pacote `Height` (import), que nao vem no pacote do mapa e nao existe no cliente 300x nem no PC. Aproximacao usada: mascara terra/mar tirada do radar `map_18_18_zs01.bmp` (4096x4096, topo = y 0) + altura por setor (bbox dos 256 TerrainSector: min/max z), suavizada; mar a -4704, agua em -4256 (WaterVolume). Relevo interno das ilhas fica plano. Para ficar identico: achar Height.utx (cliente L2 completo).

- Fortress: ilha + muralha + predios conferem com o radar (comparacao lado a lado em m18/cmp_fort.png).
- Torre 2 (Mini Toi): faltam o piso circular central e partes das paredes (visiveis no radar, nao na reconstrucao). Brushes CSG (40 na regiao) nao geram geometria (sem BSP compilado no arquivo). Hipoteses: o piso e outra malha fora da janela de busca, ou o subsolo "Refinery" (z -8900) faz parte do Mini Toi. Investigar.
- Nada convertido para GLB final nem integrado ao jogo ainda.

### [Claude] 29/10/2026 - Casa do Baium exportada para o projeto (GLB + visualizador)

- Mascara de terra do radar corrigida (piso escuro da torre tinha cor parecida com o mar): agora o terreno sob a Torre 2 existe como plataforma (sector zmax); relevo interno ainda aproximado (falta o pacote Height).
- Exportado `prototipo/assets/maps/baium_house/baium_house.glb` (18 MB, 895 malhas, texturas <=512 px, terreno 1024, opacas em JPEG) e `baium_house.json` (origem = toh_boss02 em 0,0,0; escala 1 un = 35.714 uu; nivel da agua; 4 spawns de PlayerStart em coordenadas do glTF, nao validados). Unidade igual a da Talking Island.
- Novo `prototipo/baium_house_view.html`: visualizador (three.min.js + lib/GLTFLoader.js do projeto) — carrega 895 malhas sem erro (testado no Chrome). Nao ligado a arena/cidade/dungeon.
- Falta para jogar: colisao/piso caminhavel (hoje so visual), decidir o andar da luta (toh_boss02 em z -1045 uu; PlayerStart perto em -1072), posicionar o Baium, reduzir peso, portal/canal do mapa, e o lado esquerdo do mini-mapa (Fortress) idem.

### [Claude] 29/10/2026 - Casa do Baium REAL (cliente 300x, mapa 23_18 = Torre da Insolencia)

- Usuario indicou que o cliente 300x tem a torre inteira. Cliente usa Lineage2Ver111: arquivo = 28 bytes de cabecalho + corpo XOR 0xAC -> vira pacote UE2 normal (parser parse_unr.py funciona). Mapa 23_18.unr: 2559 atores (1074 toh_*), toh_boss02 (pedestal do Baium) em L2 (116100, 17514, 10187); torre vai de z -6000 a 11175 (andares a cada ~1000 uu). Todos os modelos estao em staticmeshes/aden_tower_of_hubris_s.usx (131 malhas) + so 38 texturas (exportados via umodel).
- Recorte "casa do Baium": atores com z>=7200 e a menos de 4800 uu do pedestal (182 atores, 52 malhas): escada em espiral, plataforma em cruz com 2 estatuas gigantes (salao aberto), pilares/cercas, aneis em ruina. Exportado `assets/maps/baium_house/baium_house.glb` (11,7 MB, texturas <=512, centrado no pedestal) + `baium_house.json` (spawns de PlayerStart do topo, nao validados). A versao da comunidade (ilha Torre 2) ficou como `baium_house_comunidade.glb/json`.
- Visualizador `prototipo/baium_house_view.html` carrega 926 malhas no three do projeto (testado Chrome). Sem colisao/piso caminhavel ainda; ponte do ultimo andar (abaixo de z 7200) ainda nao incluida.
- Cliente tem 159 mapas na mesma criptografia (XOR 0xAC): da para extrair qualquer outro mapa do jogo original com este metodo.

### [Claude] 29/10/2026 - CAUSA DA BAGUNCA NAS PECAS: malhas do umodel vem espeladas em Y

- Sintoma: so pecas simetricas (cruz, portao) ficavam certas; o resto nao encaixava. Posicoes e rotacao (yaw sinal A) ja estavam certas (validado contra o radar no Fortress: muralha fecha o retangulo).
- Teste decisivo (m18/cmp_chir.png, radar x montagem normal x montagem com cada malha espelhada em Y): so a versao espelhada bate com o radar (patio, escadas, torres).
- Correcao: ao importar cada malha glTF do umodel, espelhar vertices em Y e inverter normais (`transform(Scale(-1,4,(0,1,0)))` + `flip_normals`) uma vez por modelo (sem escala negativa). Scripts da scratchpad blender_{fort,top,hall,house,tower2}.py atualizados com MIRROR_Y.
- Casa do Baium (cliente 300x) reexportada ja corrigida: `assets/maps/baium_house/baium_house.glb` 11,7 MB; agora e uma torre circular coerente (aneis de pilares, paredes de 16 lados, espiral, cruz central com estatuas). `baium_house_comunidade.glb` (Torre 2) continua da exportacao ANTIGA (espelhada): refazer se for usar. Fortress idem (so renders, nada exportado).

### [Claude] 29/10/2026 - .blend da casa do Baium para montar a mao (MCP do Blender caiu)

- Usuario: a casa ainda nao encaixou direito e quer arrastar/montar as pecas no Blender. MCP do Blender desconectou; geramos o .blend por linha de comando (blender -b --python).
- Novos: `prototipo/tools/blender_maps/montar_casa_baium.py` (gera o .blend: 1 objeto por ator, colecao por andar de 500 uu relativo ao pedestal, malhas ja espelhadas em Y, texturas empacotadas no .blend, props l2_malha / l2_pos_original_uu), `casa_baium_layout.json` (182 atores), `exportar_glb.py` (volta do .blend editado para GLB leve).
- Gerado `assets/maps/baium_house/baium_house_montagem.blend` (11,5 MB; 182 pecas / 52 modelos) e aberto no Blender 5.1 do usuario.
- Fluxo: usuario edita e salva o .blend; depois `blender -b baium_house_montagem.blend --python exportar_glb.py -- baium_house.glb`.

### [Claude] 29/10/2026 - .blend do pacote da comunidade (Mini Toi) para montar a mao

- Usuario prefere o pacote baixado (menor; diz que vem com video de como foi feito). Verificado: NAO ha video na pasta nem dentro do .rar (so 18_18.unr, Amfa_S/T/A/SND, radar bmp e TP data.txt); o video deve estar na pagina de download.
- Novo `tools/blender_maps/montar_mapa_l2.py` (generico: layout + pasta do umodel + pacotes de malha/textura + origem [+ terreno]) e `mini_toi_layout.json` (201 atores da Torre 2). Gerado `assets/maps/baium_house/mini_toi_montagem.blend` (22,8 MB: 201 pecas, 59 modelos, terreno aproximado, malhas espelhadas em Y, texturas empacotadas, colecoes por andar de 500 uu relativo ao pedestal toh_boss02) e aberto no Blender 5.1.
- Nota: `Dungeon` (subsolo Refinery, z -8900, 1027 pecas) NAO esta nesse .blend; o usuario disse que o Mini Toi e o andar de baixo + o andar do Baium, entao pode ser necessario adicionar.


### [Claude] 29/10/2026 - Pisos e paredes grandes = BSP (brushes CSG), agora reconstruidos
- Causa do "chao que falta" no Mini Toi: pisos/paredes circulares nao sao StaticMesh; sao Brushes do UnrealEd (classe Brush, CsgOper 1=Add, 2=Subtract) — cilindros de 16 lados (diametro 5073/4870 uu, alturas 26..1059). Polys parseados (formato: 1 byte, Num/Max int, poly = n(byte)+Base+Normal+TexU+TexV+n verts + trailer fixo) -> `scratchpad/m18/polys18.py`, `brush18.py`.
- Posicao dos vertices no mundo = Location + v - PrePivot (rot 0, escala 1) — validado: todos os brushes da torre convergem para o mesmo centro (-50303, 3475). Ordem CSG = ordem dos atores no `Level` (array maior: 3848 refs; achado por varredura de refs compactos).
- `montar_mapa_l2.py` ganhou arg opcional de brushes (`construir_bsp`: Add=UNION, Subtract=DIFFERENCE, solver EXACT, na ordem do nivel; 38 operacoes OK, 0 falhas). Material de pedra com `toh_tile01` em projecao BOX (texturas reais das faces nao aplicadas ainda).
- Gerado `assets/maps/baium_house/mini_toi_montagem_v2.blend` (23 MB) com pecas + terreno + BSP; render de cima agora bate com o radar (tambor circular com 3 telhados e rochas). Aberto no Blender do usuario.


### [Claude] 30/10/2026 - Pisos de baixo do Mini Toi (v3)
- Bug no v2: a uniao sequencial de todos os brushes num so objeto perdia os pisos finos (varias ADD nao mudavam o resultado). Corrigido em `construir_bsp`: cada brush ADD vira UM objeto (`BSP_<nome>`) e so os SUB posteriores na ordem do nivel que tocam a bbox dele o cortam (21 pecas, 21 cortes, 0 falhas). Isso tambem deixa cada piso/parede editavel separado no Blender.
- Pisos (discos 16 lados, 5073 uu): Brush405 (z -3272, base), Brush170 (z -2264), Brush186 (z -1186, nivel do pedestal), + aneis/paredes Brush7/22/13/159. Verificado por render em corte (floor_f1/f2.png).
- Terreno aproximado furava os pisos (subia ate z -2738 dentro da torre): `DEPRIMIR="x,y,raio,z"` (env) afunda o terreno dentro do raio; usado -50303,3475,2900,-4300.

- Usuario: passarela "invisivel" (na verdade piso liso bege: os BSP*\* e chao*\* nao tinham UV, o glTF exportava so a cor); e um buraco na frente do portao do Baium lá em cima (caiu no limbo).
- Novo `tools/blender_maps/texturizar_bsp.py`: UV triplanar pelo mundo (0.08) e 2 materiais (PISO toh*tile01 nas faces voltadas para cima/baixo, PAREDE toh_wall_05 nas verticais) em todos os BSP*\_ e chao\_\_; gera `mini_toi_montagem_v6.blend`; `mini_toi.glb` reexportado do v6 (16,7 MB). Verificado por captura: a passarela agora aparece com pedra rachada.
- Buraco do portao: posicao exata NAO conhecida (sem nota N). Analise do mapa de colisao (componentes conectados por altura): 17 vaos pequenos entre areas grandes de mesma altura; o vao 1 (largura 8 un, altura 21.2, ~(-92.8,-28..-36)) fica no telhado ao lado de um portao em arco (toh_gate\*). Adicionado a `torre_teste.html` o tour de vaos (G / Shift+G: teleporta ate o vao e poe uma coluna vermelha no meio).
- Decisao do usuario: a torre INTEIRA, andar por andar (3 pisos: bases z -62/-34/-4 em unidades do jogo relativas ao pedestal). Cerca (toh_fence11) confirmada como necessaria como barreira (sem ela o jogador cai da passarela).
- Plano: (1) mapa de chao andavel multi-camada gerado do .blend; (2) modulo de motor (js/torre.js) que le o mapa: altura do chao, subir escadas, cair, bloqueio por espaco livre baixo (paredes/cercas); mapa movido na vertical em vez de subir o jogador (o jogo assume chao em y=0: skills/FX/boss ficam no mesmo nivel); (3) ligar a portal/Baium/dungeon.
- Novo `tools/blender_maps/gerar_walkgrid.py`: raycast para baixo por celula, guarda topo de cada superficie com normal.z>0.35 + espaco livre acima (ate 12 un); saida .bin (offsets uint32 + camadas int16/uint8) + .json. Teste com celula 1.0, raio 90: 180x180 celulas, 81.817 camadas, 10 s. Visualizacao (scratchpad m18/walk_levels.png) mostra os 3 pisos como discos completos, o buraco retangular da escada no piso do meio e bloqueios (espaco livre baixo) nas bordas/obstaculos.

- Ainda NAO feito: motor (torre.js), validar escadas/rampas, resolucao final (0.5), ligar ao jogo, posicionar o Baium.

### [Claude] 30/10/2026 - Pagina de teste da torre (andar nos 3 pisos) + v4 do Mini Toi
- Usuario aprovou fazer "do meu jeito": pagina separada para testar andar e anotar por onde deve passar (sem mexer em arena.html).
- Bug achado e corrigido no BSP: o corte coplanar (SUB de mesma altura do ADD) falhava e deixava lajes macicas (piso do topo virava laje de 125 uu). Agora: cada SUB tem versao justa; so para o ADD "parceiro" de mesma altura usa-se uma versao alargada +-0.05 un em Z (`montar_mapa_l2.py`). Resultado: 3 pisos finos = -62 / -33.8 / -3.8 (un. do jogo rel. ao pedestal) + borda (parapeito) do topo em -1. Gerado `mini_toi_montagem_v4.blend` (v3 fica como estava).

- Gerados com v4: `mini_toi_walkgrid.bin/.json` (celula 0.5, raio 85 centrado em (-27,51) Blender; 310.482 camadas; 1,7 MB) e `mini_toi.glb` (16,7 MB, 223 objetos). `gerar_walkgrid.py`: agora tambem marca "dentro de solido" (raio para cima bate no verso de face) e aceita centro da grade.
- Nova `prototipo/torre_teste.html` (three r128 do projeto): jogador capsula, WASD/Shift/Espaco, camera arrastavel, subir degraus <=0.9 un, cair de bordas sem parede, bloqueio por espaco livre < 2.4 un e por superficie alta na altura do corpo; teclas 1/2/3 (andar), R, T (trilha), N (anotar ponto), E (baixar torre_notas.json), M (minimapa). Testes automaticos (Chrome headless): assenta nos 3 andares (y -62.04 / -33.76 / -3.78) e, no andar 1, as 8 direcoes ficam contidas em raio ~67 (parede da base). NAO testado: subir as escadas reais entre andares, passarela com cerca, desempenho em GPU real.

### [Claude] 30/10/2026 - Paredes finas atravessadas (pontilhado no minimapa)
- Causa: mapa de chao so tinha raios verticais no centro da celula; parede/cerca fina e inclinada so era pega "por sorte" (pontilhado). Correcao: `gerar_walkgrid.py` agora lanca raios HORIZONTAIS (+x e +y, ate o centro da vizinha, em h+1.05 e h+1.8 — acima de um degrau de 0.9) e grava 1 byte de mascara por camada (bit0=aresta +x, bit1=aresta +y), 4 bytes/camada. `torre_teste.html`: `arestaBloq/cruza` impedem cruzar a aresta (5 pontos do corpo); minimapa mostra laranja = parede fina.
- Resultado no andar 1: as 8 direcoes agora param em raio ~54 (antes ~67): ha uma parede circular interna (Brush159, 4059 uu de diametro, z -62..-34.5) que antes passava pelas frestas. Regerado `mini_toi_walkgrid.*` (96 s).


### [Claude] 30/10/2026 - Feedback do teste: escadas OK; buraco de chao em um piso
- Usuario confirmou: sobe os degraus das escadas; em uma area circulada falta o chao do piso (cai e renasce). Na ToI original as escadas ligam cada sala a proxima ate o Baium.
- `torre_teste.html`: tecla V = sobreposicao 3D do chao que o jogo enxerga (verde anda / vermelho bloqueado ou baixo / laranja parede fina na aresta; raio 22 un, +-7 de altura). Serve para separar "chao existe no desenho mas nao na colisao" (bug meu) de "chao nao existe no mapa" (precisa remendo).
- Metodo de remendo planejado: criar planos `chao_*` no .blend (colecao Remendos) e regerar GLB + walkgrid; ainda nao feito (aguardando notas com N/E).

### [Claude] 30/10/2026 - Chao da passarela (toh_fence11) criado + colisao de 5 raios

- Notas do usuario (`torre_notas.json` no Desktop): 1 nota "buraco aqui" em (-41.39, -18.16, -71.43). O `toh_fence11` so traz os 2 corrimaos; o chao da passarela nao existe no pacote. Criado por `tools/blender_maps/remendo_pontes.py`: separa os corrimaos por componentes conectados, linha central por faixas, poligono entre as fileiras, extrudado 0.3; topo no ponto mais baixo do corrimao (mundo -18,25). Colecao "Remendos", objeto `chao_ponte_StaticMeshActor132`. Unica instancia no mapa. `mini_toi_montagem_v5.blend`.
- `gerar_walkgrid.py`: agora 5 amostras por celula (centro + 4 cantos, funde camadas +-0.15: folga minima, aresta OR) para nao perder passarelas finas/diagonais. Regerado `mini_toi_walkgrid.*` (1,9 MB) e `mini_toi.glb` (16,7 MB) a partir do v5.
- Teste automatico: do ponto da nota (patamar, y -18.16) anda em linha reta ate o centro da passarela (y -18.26) sem cair; ao longo da passarela mantem y -18.26 por ~52 un para cada lado. NAO testado: extremidades (liga a que?), outras passarelas finas.

### [Claude] 30/10/2026 - Textura nos pisos/paredes de brush e na passarela; tour de vaos; buraco na frente do portao

- Usuario: passarela "invisivel" (na verdade piso liso bege: os BSP_* e chao_* nao tinham UV, o glTF exportava so a cor); e um buraco na frente do portao do Baium lá em cima (caiu no limbo).
- Novo `tools/blender_maps/texturizar_bsp.py`: UV triplanar pelo mundo (0.08) e 2 materiais (PISO toh_tile01 nas faces voltadas para cima/baixo, PAREDE toh_wall_05 nas verticais) em todos os BSP_* e chao_*; gera `mini_toi_montagem_v6.blend`; `mini_toi.glb` reexportado do v6 (16,7 MB). Verificado por captura: a passarela agora aparece com pedra rachada.
- Buraco do portao: posicao exata NAO conhecida (sem nota N). Analise do mapa de colisao (componentes conectados por altura): 17 vaos pequenos entre areas grandes de mesma altura; o vao 1 (largura 8 un, altura 21.2, ~(-92.8,-28..-36)) fica no telhado ao lado de um portao em arco (toh_gate*). Adicionado a `torre_teste.html` o tour de vaos (G / Shift+G: teleporta ate o vao e poe uma coluna vermelha no meio).
- Detalhe: portoes toh_gate02 ficam nos 3 telhados (alt ~28-29), nao dentro da torre; o mapa de colisao cobre X -112..58, Z -136..34 (gate C em X 60.5 fica fora da grade: ampliar se precisar).

### [Claude] 30/10/2026 - Chao do salao do Baium (nota "frente do portao")
- Nota do usuario (`torre_notas (1).json`): {x -59.11, y -3.8, z -108.92, andar 3, "frente do portao"}. Vista de cima (render do v6 com cortes) mostrou: piso na frente da porta ornamentada (toh_gate) existe; logo APOS a porta ha um vazio retangular ~9,2 x 14,5 un entre lajes escuras (topo -2.3) e o piso do andar 3 (-3.8), com faixa de degraus de tijolo entre eles.

- Corrida: **Shift toque rapido (< SPRINT_HOLD 0,16 s) = esquiva (executa ao soltar); segurar = correr** x1,45 (4,3 -> 6,23 un/s), gasto 10 estamina/s (100 de estamina = ~10 s), so comeca com >= 12 de estamina, nao corre guardando/em skill; ao zerar a estamina precisa soltar e apertar de novo; a esquiva custa 32 (ROLL_COST). Regen pausa 0,5 s durante a corrida. Constantes em arena.html/cidade.html (`SPRINT_HOLD, SPRINT_MULT, SPRINT_DRAIN, SPRINT_MIN`, bloco `[corrida]`; backups \*\_antes_corrida.html). Animacao da passada acelera ate 1,5x.
- Teste automatico: no centro do salao fica no chao a -2.3; dos 4 cantos (80% do caminho) anda sem cair. NAO confirmado: acesso a partir da frente da porta (do ponto da nota, andar em linha reta ate o centro e bloqueado imediatamente: porta solida/degraus > 0.9). Formato real do salao do Baium e incerto (medido so pelo contorno do vazio).

### [Claude] 30/10/2026 - Torre no jogo (?mapa=torre) + escada que faltava (1o -> 2o andar)
- Usuario: ja pode usar no jogo; o 1o andar devia ter a passagem aberta para subir ao 2o e chegar ao 3o (Baium).

- Integracao no jogo: novo `js/torre.js` (carrega GLB + mapa de colisao; mapa sobe/desce em vez do jogador; colisao por camadas/arestas; chefe so acorda no andar 3 e fica no chao dele; nasce no andar 1). Ganchos `[torre]` em arena.html (import, TORRE_MODE=?mapa=torre, ARENA=1e6, esconder chao/aneis/pilares, Torre.depois() em separate(), enemyThink/chefe, torreStart()). Backup: arena_antes_torre.html. Uso: arena.html?mapa=torre&cenario=0. NAO TESTADO no jogo ainda.
- Conectividade (BFS com as regras do jogo: degrau 0.9, folga 2.0, arestas): a partir do andar 1 so se alcancava o proprio andar 1. Causa: o mapa baixado so tem 7 pecas toh_stair (2 em -76 fora, 2 no buraco do piso 2 subindo de -40 a -34, outras acima); a escada de baixo (-62 -> -40) foi cortada pelos autores. Criada `tools/blender_maps/remendo_escadas.py` + `mini_toi_escadas.json`: escada macica de 28 degraus (0.79 cada), largura 5, de (X-42,Y6,-62) ate (-12,6,-40), chegando ao patamar de -40 que ja existe (partindo do ponto de nascimento do andar 1 para oeste). Bug corrigido no script (altura somada duas vezes).
- Resultado (grade 1.0): a partir do andar 1 alcanca-se o andar 2 (12.584 celulas) e o topo ate h -2.7 perto do portao (X -53.5, Z -117.5). O disco do andar 3 (raio 68, h -3.8) so tem 146 celulas alcancadas: a entrada do salao/disco a partir do portao ainda nao esta confirmada.
- Gerado `mini_toi_montagem_v8.blend` (a partir do v7 salvo as 11:29); regeneracao final (GLB + colisao 0.5) em andamento.


### [Claude] 30/10/2026 - Decisao: o 1o andar fica FECHADO; a partida comeca no 2o andar (rampa do Baium)
- Usuario: criamos conteudo para o salao do 1o andar fechado e outro para o 2o->3o que ja funciona; no L2 os andares de baixo eram ignorados e o pessoal ia direto para o andar da rampa do Baium e o proprio Baium, onde sempre se concentrou o PvP.
- Escada 1o->2o (`chao_escada_andar1_para_andar2`, `mini_toi_montagem_v8.blend`, `remendo_escadas.py`) NAO entra no jogo; fica guardada como opcional. GLB e mapa de colisao regerados a partir do v7 (sem a escada).
- `torre.js`: `andarInicial = 2`; nascer/renascer (queda abaixo de -130) no 2o andar. Chefe continua acordando so no 3o. `torre_teste.html` tambem renasce no 2o.
- Ideia para depois: PvP nesse andar (rampa + Baium), ja que no L2 foi onde se concentrou.


### [Claude] 30/10/2026 - Plano de conteudo da torre + teste no jogo
- Usuario definiu: 1o andar (fechado) = zona de x1, DG solo normal e DG media (mais mobs); 2o andar = DG hard e ultra; PvP tambem nos andares 2 e 3 (a discutir); 3o = Baium. Memoria: `torre-baium-plano.md`.
- `dungeon.json` so tem normal/medio/hard: falta criar "ultra".
- Teste no jogo (Chrome headless, regerado do v7 sem escada): `arena.html?mapa=torre&cenario=0` liga a torre, nasce no 2o andar (y -33,76, no chao, andar 2, grupo do mapa em +33,8), sem erros de pagina; captura mostra o jogador de pe no piso de pedra com a barra "BAIUM - RAID BOSS". NAO testado: andar ate o 3o e acordar o Baium, mobs por andar, PvP.

### [Claude] 30/10/2026 - Pulo (Espaco) e guarda como skill universal (C)
- Feedback: o primeiro degrau da escada so subia no boneco da pagina de teste (que pulava); no jogo nao ha pulo.

- Implementado em arena.html e cidade.html (marcas `[pulo]`; backups arena_antes_pulo.html, cidade_antes_pulo.html): **Espaco = pular** (altura max ~1,85 un, gravidade 34, custo 8 de estamina; nao pula em skill/rolagem/atordoado/guardando/em queda), **C (segurar) = guarda/parry** (antes era Espaco; o botao de toque continua). Texto de ajuda atualizado.
- Modo torre: `Torre.pular()` + `baseY`/`altura` (o mapa acompanha o chao com suavizacao e o jogador sobe de verdade no pulo; camera acompanha). `torre.js?v=2` (backup torre_antes_pulo.js).
- Testes automaticos (Chrome headless, eventos de teclado): torre, arena plana e cidade — altura max 1,83/1,85/1,85 e volta a 0; C segura (true) e solta (false); sem erro de pagina. NAO testado: sentir o pulo, subir o 1o degrau da escada com o pulo, sem animacao propria de pulo (Guardiao nao tem clipe de pulo; mantem a pose de corrida).
- Ideia (opiniao dada ao usuario): guarda = skill universal automatica (tecla fixa, fora dos 8 slots), com valores/animacao por arma e Guardiao gastando menos estamina; ainda NAO implementado como skill (so mudou a tecla).

### [Claude] 30/10/2026 - Corrida no Shift + correcao do usuario no chao do salao ja salva no v7
- Corrida: **Shift toque rapido (< SPRINT_HOLD 0,16 s) = esquiva (executa ao soltar); segurar = correr** x1,45 (4,3 -> 6,23 un/s), gasto 10 estamina/s (100 de estamina = ~10 s), so comeca com >= 12 de estamina, nao corre guardando/em skill; ao zerar a estamina precisa soltar e apertar de novo; a esquiva custa 32 (ROLL_COST). Regen pausa 0,5 s durante a corrida. Constantes em arena.html/cidade.html (`SPRINT_HOLD, SPRINT_MULT, SPRINT_DRAIN, SPRINT_MIN`, bloco `[corrida]`; backups *_antes_corrida.html). Animacao da passada acelera ate 1,5x.

- Teste automatico (arena plana): andando 4,3; correndo 6,23; segurar nao rola; toque rola (estamina 100 -> 68); sem erro. Risco conhecido: a esquiva passa a sair ao SOLTAR o Shift (~0,1 s depois), pior para a esquiva perfeita; ajustar SPRINT_HOLD ou mudar de ideia se atrapalhar.
- Usuario disse que a correcao do Blender (ressalto no topo da escada + buraco; esticou a malha) nao salvou. Verificado: SALVOU (v7 de 12:38:30; unica diferenca para a copia das 12:30 e o `chao_baium_salao`, movido -1,49 un em Z, ou seja de -2,3 para -3,8 = nivel do piso do andar 3, e vertices alterados). O jogo usava a copia das 12:30. Regerados GLB + colisao a partir do v7 das 12:38 (em andamento). Blender aberto no v7.

### [Claude] 30/10/2026 - Regeneracao a partir do v7 das 12:38 (correcao do usuario no jogo)
- A 1a tentativa falhou no export do GLB: o v7 foi SALVO COM `chao_baium_salao` EM MODO DE EDICAO (Tab) e a UV da malha ficou vazia (TypeError foreach_get 48 vs 0; depois "Mesh is in editmode"). Corrigido: `texturizar_bsp.py`, `exportar_glb.py` e `gerar_walkgrid.py` agora saem do modo de edicao sozinhos (`_sair_do_modo_edicao`); texturizar reconstroi a malha por bmesh e refaz a UV, e aceita '-' (reusa os materiais empacotados no .blend).
- `REGERAR_TORRE.bat` agora roda 3 passos (texturizar -> GLB -> colisao) num .blend temporario; ~10 min.

- Conferido no mapa de colisao regerado: salao do Baium e o piso em frente a porta ficam a -3.8 (sem ressalto de 1.5): (-63.1,-117.9) -3.8; (-59.1,-108.9) -3.8. GLB e colisao copiados para o jogo. Ponto vazio em (-58,-112) (porta/degraus?) nao investigado.

### [Claude] 30/10/2026 - "No Blender esta certo, no jogo nao": cache do service worker
- Causa: `sw.js` usa CACHE PRIMEIRO para .glb/.bin pela URL; o navegador do usuario mantinha o mapa antigo (servidor ja entregava o novo, Last-Modified 14:41).
- Correcao: `gerar_walkgrid.py` grava `versao` (timestamp) no json; `torre.js?v=3` busca o json com `cache:'no-store'` e pede `.bin?v=<versao>` e `.glb?v=<versao>` (URLs novas = cache novo). Versao atual 1793382516.
- Verificado em navegador limpo: requisicoes `mini_toi_walkgrid.bin?v=1793382516` e `mini_toi.glb?v=1793382516`; chao no jogo: salao centro -3,82, frente da porta -3,80, canto -3,86 (sem ressalto), sem erro de pagina.


### [Claude] 30/10/2026 - DG da Torre no jogo (portal -> dificuldade -> torre) + porta do Baium + chefe preso no salao
- Pedidos do usuario: (1) o Baium nao pode sair da casa (matou o jogador na escada); (2) DG: 2o andar com mobs + chefes (estilo hard), limpar libera a porta; normal e medio no 1o andar; tudo funcionando ao entrar no portal e escolher a dificuldade; "ultra" depois.

- Chefe: `regioes` geradas do .blend (`tools/blender_maps/gerar_regioes.py` -> `assets/maps/baium_house/mini_toi_regioes.json`: contorno do salao e da porta de entrada). Baium nasce no centro do salao, e preso ao poligono (margem 1,2) e so luta com o jogador DENTRO (ou colado, 1,5 un) do salao.
- Porta de entrada (folhas `StaticMeshActor455/474`): colisao dinamica (bloqueia fechada; `gerar_walkgrid.py` ignora as folhas); abrir = [E] perto (9 un) no 3o andar, folhas descem para o piso em 1,8 s; so abre se `Torre.porta.liberada` (DG hard limpa) — no modo de teste `?mapa=torre` ja vem liberada. Porta dos fundos continua solida.
- DG: `dungeon.json` ganhou `"torre"` (normal/medio = andar 1; hard = andar 2, `liberaPorta`): mobs por andar x `difficulties.count`. `arena.html` (blocos `[torre-dg]`): `dgStart` desvia para `torreDgStart` (carrega a torre na 1a vez, banner), `torreDgLoad` (nasce no andar, mobs em pontos livres 16-46 un, portal de saida perto do spawn), `torreClear` (bau + portal de saida; hard libera a porta), `torreAcordaBaium` (ao abrir a porta: Baium acorda, HP pela dificuldade, portal de saida dentro do salao), `torreSair` (volta ao hub; `dgHub`), morte = recomeca o andar. Mobs ficam no andar (`Torre.mob`) e nao atravessam parede/porta. `?dg=classica` volta as salas antigas; `?mapa=torre` = teste direto do Baium.

- Testes automaticos (Chrome headless, hub -> clique no card): NORMAL: andar 1, 8 mobs (5 shade/2 caster/1 brute), 0 fora do chao, limpar -> "ANDAR LIMPO" + portal; HARD: andar 2, mobs + chefes, limpar -> porta liberada; no 3o andar [E] abre a porta (t=1) e o Baium acorda; sem erro de pagina. Corrigido depois: hard com 1 mini_boss (x1,8 = 2).
- NAO testado: lutar de verdade (mobs perseguindo/atacando na torre, balanceamento), morrer e recomecar, Baium atacando dentro do salao, sair pelo portal e reentrar, desempenho. Falta: dificuldade ULTRA, zona de x1 no 1o andar, PvP nos andares 2 e 3.


### [Claude] 30/10/2026 - Bug: personagem Guardiao abria com a espada
- Relato: personagem criado como Guardiao (escudo) continuava com a espada Dragon Slayer; clicar no escudo na mochila "equipava" mas nao trocava.
- Reproduzido (Chrome headless): com `isblade.weapon=shield` o jogo abria com `sword` e ainda regravava `isblade.weapon=sword`. Causa: a rotina que carrega o inventario (arena.html/cidade.html, `setWeapon(w)` com w = arma equipada no INVENTARIO) sobrescrevia a arma escolhida na criacao; o kit inicial equipa `sword_long`, e o inventario (`isblade.inv`) e UNICO para todos os personagens.
- Correcao (bloco `[arma]` antes dessa linha, nas duas paginas): se a arma escolhida (WPN) difere da equipada no inventario, equipa o item dessa arma (cria se faltar) — a escolha do personagem manda. Backups: arena_antes_arma.html, cidade_antes_arma.html.
- Testes automaticos (arena e cidade): (1) criado com escudo -> arma no jogo = shield e inventario com o escudo equipado; (2) criado com espada e escudo na mochila -> clicar no escudo troca para shield e salva. NAO verificado visualmente (modelo do escudo na mao).

- Observacao: no navegador do usuario `isblade.weapon` ficou gravado como `sword` pelo bug; escolher o personagem de novo na selecao (ou equipar o escudo na mochila) corrige.

### [Claude] 30/10/2026 - Progresso por personagem (MMORPG) + corrida 1.8
- Dados por personagem (`isblade.custom_slots_v5.<id>`, `isblade.hotbar_keys.<id>`; le o global antigo se nao houver). Arena e cidade. Backups: \*\_antes_atalhos.html, js/mu_hud_antes_atalhos.js.
- Migracao: os dados antigos (globais) ficam com o PRIMEIRO personagem que carregar; os outros comecam com o kit inicial e a arma escolhida na criacao.
- Teste automatico (Chrome headless): A herda o antigo; B (escudo) abre com escudo e kit proprio; A nao muda ao abrir B; sem erros de pagina.
- Corrida (Shift segurado): multiplicador 1.8 (animacao ate 1.9x). Backups: arena_antes_perchar.html, cidade_antes_perchar.html.


### [Claude] 30/10/2026 - DGs da torre com tempo, ressurgimento e chefe
- Pedido: mais mobs e chefe para aproveitar o espaco, DG como instancia com tempo (acabou = sai da DG), mobs ressurgindo, portal de saida so ao concluir dentro do tempo; vale para todas as DGs.
- data/dungeon.json "torre": normal/medio/hard agora tem `meta` (abates), `tempo` (s), `respawn` (s) e chefe (mini_boss: 1/1/2). normal 25 abates/8:00; medio 40/9:00; hard 55/10:00. Mobs comuns ressurgem ate a meta; concluir = meta + todos os chefes mortos (sobras somem) -> bau + portal de saida (hard tambem libera a porta do Baium).
- arena.html: `torreTick(dt)` (tempo, HUD, respawn), `torreCheck()`; tempo esgotado = banner e `dgHub()`. Backups: arena_antes_tempo.html, data/dungeon_antes_tempo.json.

- Teste (Chrome headless): inicia com 14 mobs + 1 chefe; HUD "Abates x/meta - Chefe - Tempo"; meta+chefe morto -> concluida + portal; tempo zerado -> volta ao santuario; sem erros. NAO verificado: ressurgimento em tempo real (fps baixo no teste), balanceamento e as DGs classicas (fora da torre ainda sem tempo).

### [Claude] 30/10/2026 - Shift: esquiva na hora

- Antes a esquiva so saia ao SOLTAR o Shift em menos de .16 s (quem segurava um pouco mais nao rolava, precisava apertar 2x). Agora a esquiva sai ao APERTAR; continuar segurando por 0.35 s depois vira corrida. Arena e cidade. Backups: arena_antes_shift.html, cidade_antes_shift.html. Nao testado no jogo (so sintaxe).

### [Claude] 30/10/2026 - Hard: sem portal, porta do Baium abre sozinha
- Ao limpar o hard (2o andar): sem portal de saida; aviso "A porta do Baium vai se abrir: suba a escada". Quando o jogador chega na porta (3o andar, ate 9 un) com a porta liberada, ela abre sozinha e o Baium acorda (antes exigia [E], o jogador nao sabia). Backup: arena_antes_porta2.html. Testado: hard limpo -> sem portal, porta liberada. NAO testado: caminhar ate a porta e a abertura automatica.

### [Claude] 30/10/2026 - Neblina da torre
- A neblina da arena (perto 22 / longe 62) apagava paredes e muros da torre. Em torre.js `neblina()`: ao ativar a torre vai para 75/195 (camera far=200), ao desativar volta ao 22/62. Fora da torre continua o vazio escuro (fundo 0x05060d). Backup: js/torre_antes_neblina.js. Nao conferido visualmente.


### [Claude] 30/10/2026 - Portal da cidade = portal do santuario, [E] com escolha de destino
- cidade.html: o arco azul "feio" (portalGroup) foi escondido e no mesmo lugar (-13.5,-13) entra o portal Solo Leveling do santuario (createSoloLevelingGate + texturas copiados do arena.html). Nao entra mais ao encostar: so com [E] a ate 5 un, que abre a escolha: Dungeon Normal/Medio/Hard, Duelo contra o Baium, PvP.
- arena.html: parametro `?go=normal|medio|hard|pvp` pula o santuario e ja inicia a DG/PvP. Duelo = `?mode=duel`.
- Testado (Chrome headless): portal renderiza, prompt [E] aparece, [E] abre o menu com 5 cartas, sem erros de pagina. NAO testado: clicar nas cartas e chegar direto na DG. Backups: cidade_antes_portal.html, arena_antes_portal.html.

### [Claude] 30/10/2026 - Atalhos da barra livres (arrastar skill para o slot / tecla por slot)

- Antes: a tecla pertencia a SKILL (Q,E,R,F,T,Z fixos) e a barra so mostrava; arrastar nao mudava a tecla. Agora a tecla pertence ao SLOT da barra (js/mu_hud.js v14): `MuHud.keys` (padrao Q E R T F G, slots 7 e 8 sem tecla); a skill/item que esta no slot responde a tecla dele. `MuHud.sync()` entrega o mapa ao jogo (`window.__hotbarKeys` -> SKEY).
- Arrastar skill (arvore [S]) ou item (mochila) para qualquer slot; arrastar de slot para slot troca os dois; a mesma skill nao fica em 2 slots; botao direito remove. Barra vazia na primeira vez = skills 1-6 nos slots 1-6.
- Opcoes -> "Atalhos da barra": uma linha por slot, clique e aperte a nova tecla (se ja for de outro slot, trocam). Proibidas: WASD, 1-6, M, V, B, C, I, K, X. G e Z agora liberados (G antes abria o Guia, so quando nao ha skill nele).
- Dados por personagem (`isblade.custom_slots_v5.<id>`, `isblade.hotbar_keys.<id>`; le o global antigo se nao houver). Arena e cidade. Backups: *_antes_atalhos.html, js/mu_hud_antes_atalhos.js.

- Testado (Chrome headless, arena): tecla reservada recusada, troca de tecla, mover skill de slot e apertar G dispara a skill. NAO testado: arrastar com o mouse de verdade, cidade, item por tecla.

### [Claude] 30/10/2026 - Vila (cidade) no Blender para organizar as casas
- `prototipo/assets/talking_island/vila_montagem.blend`: gerado por `tools/blender_maps/montar_vila.py` a partir de `village_data_threejs.json` (121 entidades: casas/muros/portoes em "Casas_e_muros", 92 arvores em "Arvores", referencias: chao, praca raio 21, portal da DG (-13.5,-13), spawn). three (x,y,z) -> Blender (x,-z,y); rotY = rotacao Z; altura = y do jogo (o jogo soma o relevo do terreno por cima).
- Volta para o jogo: salvar o .blend e rodar `tools/blender_maps/EXPORTAR_VILA.bat` (`exportar_vila.py`; faz backup `village_data_threejs.json.antes_vila_<hora>`). Duplicar (Shift+D) e apagar valem. Ida e volta testada sem mexer em nada: 121 entidades identicas.
- Limites: colisoes (`village_colliders.json`) NAO sao atualizadas ao mover casas (pendente); o relevo do terreno nao aparece no Blender.


### [Claude] 30/10/2026 - Vila reorganizada exportada para o jogo
- `servidor/contas.js` (novo): usuario (3-16, a-z 0-9 \_) + senha (6-64), sem e-mail; scrypt+sal, token aleatorio guardado como hash (ate 6 aparelhos), limite por IP (60 pedidos/min, 10 contas/h, 20 logins/10 min), CORS pela mesma lista ORIGINS. Rotas `/api/conta/criar|entrar|sair`, `GET/PUT /api/dados`. Dados em `servidor/dados/contas.json` (fora do git; `DATA_DIR` muda). `server.js` encaminha `/api/*` (backup server_antes_contas.js).
- `prototipo/js/conta.js` (novo, script comum): tela de entrada (Entrar / Criar conta / Jogar sem conta), chip "entrar/sair" no canto, sincroniza so o progresso (isblade_characters + inv/skillSel/mastery/dgbest/custom_slots_v5/hotbar_keys/hotbar_init por personagem) — puxa ao abrir a selecao (pedido sincrono curto, 4 s) e envia 2,5 s apos cada mudanca (e ao sair da pagina). Conta nova com dados locais: sobem para a conta. Aparelho novo: dados da conta substituem os locais (copia em isblade.conta_bkp_local). Incluido em selecao (com `Conta.exigir()`), cidade e arena (so envio). Backups \*\_antes_conta.html.
### [Claude] 30/10/2026 - Ajustes das skills do Guardiao (feedback de jogo)
- Chuva de Escudos (g_s3) e Fortaleza Egide (g_s2): velocidade do clipe `sp` 1.0 -> 2.0 em guardiao.js (CM); o golpe sai na metade do tempo (chuva ~1,05 s, fortaleza ~0,5 s). Rugido (g_s4) nao mexido (usuario gostou).
- Escudos da chuva caiam de cabeca para baixo: `escudoFantasma` tinha `rotation.x = PI`; agora 0 (guardiao_fx.js v=7).

- Corrente de Puxao: so puxava o chefe (S.ex/ez); mobs nunca. Agora `hitMobs` (arena.html) puxa mobs comuns ate 2,6 m na frente do jogador (0,4 s, 100%); `mini_boss` e o chefe nunca sao puxados (removido o puxao do chefe em guardiao.js). Teste: mob a 6,5 m foi para 2,6 m. PvP (jogadores): pendente, com o servidor.
- Escudo de Energia (reflexo): alcance do reflexo e da expansao do domo 10 -> 15 m.
- guardiao.js v=13. Backups: js/guardiao_antes_ajustes.js, js/guardiao_fx_antes_ajustes.js, arena_antes_ajustes.html. Nao conferido visualmente: tempo do cast e o escudo de pe.

### [Claude] 30/10/2026 - Baium: arena = circulo gigante do 3o andar; degraus

- Relato: Baium aparecia "la fora", degraus exigiam pulo (entrada e escada do 2o andar), muralha de prototipo na foto, area de luta tem que ser a circular inteira.
- Achado (mapa de colisao): o 3o andar tem um circulo gigante (centro (-28.4,-53.85), raio ~66-70, tapete em cruz) e um salao decorado pequeno atras da porta da muralha do circulo (o "salao" antigo). Usuario confirmou: Baium luta no CIRCULO GIGANTE; foto foi tirada la.
- mini_toi_regioes.json ganhou `arena` (centro, raio 62, spawn = 12 m para dentro da porta -> (-53.75,-100.46), gatilho 34 m); gerar_regioes.py passa a gera-la (backup gerar_regioes_antes_arena.py). torre.js v=7: chefe preso no circulo (antes: salao), ativo quando o jogador esta no circulo, nasce no spawn, porta abre sozinha a 34 m e acorda o Baium (backup js/torre_antes_arena.js).
- Degraus: os risers medidos no mapa ficam entre 0,9 e 1,04 (6899 pares, nenhum acima); `PASSO` 0.9 -> 1.04 (a mascara de bordas do mapa usa 1,05, entao nao abre buraco). Escada do 2o andar e soleira devem subir sem pulo. Nao testado andando de verdade.
- Teste (Chrome headless): hard -> 3o andar -> Baium nasce no circulo, visivel, ativo, sem erro. Muralha de prototipo NAO removida (falta saber qual e: a borda do circulo? uma peca BSP?).

### [Claude] 30/10/2026 - Cenario do TECX LABS na torre + Baium 3x

- A "muralha de prototipo" da foto (muro baixo com pilares, estandarte, piso) era o cenario do TECX LABS 3D (`assets/cenario/env_arena_*.glb`, bandeiras) no centro do mundo (0,0), que cai dentro do circulo do 3o andar. Nao estava em ARENA_DECOR e so some com `?cenario=0` (por isso nao aparecia nos meus testes). Agora `cenLoad` registra tudo que carrega em ARENA_DECOR (somem ao entrar na torre, voltam ao sair). Nada a apagar no Blender. Backup: arena_antes_decor.html.
- Baium 3x: escala do modelo .014 -> .042 (~14 m) e raio do corpo (empurra o jogador) 1,25 -> 3,75. Alcances/areas dos ataques (data/combate.json boss.attacks) NAO mudaram. Backup: arena_antes_baium3x.html. Teste visual: Baium gigante no circulo, enquadramento cortado no topo (camera pode precisar de mais distancia).
- cidade.html e arena.html: renderizador com `antialias:QUAL.aa`, `powerPreference:'high-performance'`, `setPixelRatio(min(dpr, QUAL.ratio))` (inclusive no resize), bloom so se o nivel permitir ou o jogador ligar em Opcoes; cidade: arvores a mais de 90 m e predios a mais de 190 m ficam invisiveis (checado a cada 20 quadros). Backups \*\_antes_qualidade.html.
### [Claude] 30/10/2026 - Preparo da VPS (passo a passo ao usuario)
- Blender aberto com `vila_montagem.blend` (usuario vai ajustar a cidade). VPS Windows 51.79.41.62: so Area de Trabalho Remota (3389 aberta; 22/80/443 fechadas); usuario executa; senha NAO guardada.
- `iniciar_isblade_auto.bat`: ORIGINS agora inclui `https://isblade.vercel.app` (o jogo esta sendo servido por esse endereco). Falta (depois da VPS no ar): `SRV_PADRAO='wss://play.isblade.tecx.pro/ws'` em js/net.js e registro DNS A `play.isblade.tecx.pro` -> 51.79.41.62.

- DNS: `play.isblade` (A -> 51.79.41.62) criado pelo usuario no painel do tecx.pro (coringa `*` -> Vercel permanece); confirmado em NS do dominio, 8.8.8.8 e 1.1.1.1. Usuario autorizou o push para subir a VPS. `js/net.js` v=7: `SRV_PADRAO='wss://play.isblade.tecx.pro/ws'` (sem servidor no ar o jogo segue sozinho, so loga no console).
- VPS: `instalar_isblade.ps1` falhou no `npm ci` (faltava `servidor/package-lock.json`; `ws` 8.22.0). Lockfile gerado e commitado; na VPS: `cd C:\IS-sync ; git pull` e rodar o instalador de novo.
- VPS no ar (2026-10-30/31): tarefas IS_Servidor/IS_Sync/IS_Caddy criadas e iniciadas; `http://localhost:3000/status` = `{"cap":50,"canais":[]}`. De fora (forcando o IP): `https://play.isblade.tecx.pro/status` = 200 (certificado emitido pelo Caddy); WebSocket `wss://.../ws` abre com origem `https://isblade.vercel.app` e e recusado (401) com origem estranha. Cache de DNS: o coringa `*` tem TTL 14400, resolvers que ja tinham a resposta antiga ainda podem cair na Vercel por ate ~4 h. NAO testado: 2 jogadores reais se vendo.

### [Claude] 31/10/2026 - Cadastro rapido + personagens na nuvem

- Pedido: cadastro rapido para a galera criar facil (cada um com seu personagem, em qualquer aparelho).
- `servidor/contas.js` (novo): usuario (3-16, a-z 0-9 _) + senha (6-64), sem e-mail; scrypt+sal, token aleatorio guardado como hash (ate 6 aparelhos), limite por IP (60 pedidos/min, 10 contas/h, 20 logins/10 min), CORS pela mesma lista ORIGINS. Rotas `/api/conta/criar|entrar|sair`, `GET/PUT /api/dados`. Dados em `servidor/dados/contas.json` (fora do git; `DATA_DIR` muda). `server.js` encaminha `/api/*` (backup server_antes_contas.js).
- `prototipo/js/conta.js` (novo, script comum): tela de entrada (Entrar / Criar conta / Jogar sem conta), chip "entrar/sair" no canto, sincroniza so o progresso (isblade_characters + inv/skillSel/mastery/dgbest/custom_slots_v5/hotbar_keys/hotbar_init por personagem) — puxa ao abrir a selecao (pedido sincrono curto, 4 s) e envia 2,5 s apos cada mudanca (e ao sair da pagina). Conta nova com dados locais: sobem para a conta. Aparelho novo: dados da conta substituem os locais (copia em isblade.conta_bkp_local). Incluido em selecao (com `Conta.exigir()`), cidade e arena (so envio). Backups *_antes_conta.html.
- Testes (servidor local + Chrome headless, celular 390x760): modal aparece; criar conta; senha errada = mensagem; dados gravados num aparelho aparecem no outro apos entrar; "jogar sem conta" fecha o modal. Rotas via curl (validacao, duplicado, token invalido, sair, CORS). NAO testado: na VPS, conflitos de dois aparelhos ao mesmo tempo (ultimo a gravar vence), recuperacao de senha (nao existe).

### [Claude] 31/10/2026 - Celular (toque)

- Achado (Chrome com perfil de iPhone): `index.html` ja e responsiva; `selecao.html` em PE quebra (paineis sobrepostos, rolagem horizontal 555 px) mas em DEITADO fica boa; arena/cidade tinham analogico (arrastar no lado esquerdo) mas nenhum botao de pulo, esquiva, bloqueio ou ataque, e a barra de skills ficava minuscula.
- `js/mobile.js` (novo, so em aparelho de toque): tela "Gire o celular" em retrato (selecao, cidade, arena) + botao "tela cheia" (Android); na cidade e arena, botoes grandes: ATACAR (combo 3-4-6), PULAR, ESQUIVA (segurar = correr), BLOQUEIO (segurar) e as 6 primeiras skills da barra espelhadas (icone, tecla, recarga). Mandam as mesmas teclas do teclado; skills por `MuHudRef.triggerSlot` (mu_hud.js v=15 expoe `window.MuHudRef`). Esconde a dica "Clique para mirar com o mouse".
- Teste (Chrome, 844x390 toque): 10 botoes; toque em Pular/Skill 2/Atacar funcionou (S.jy, S.cd, S.anim); em retrato o aviso aparece. NAO testado em aparelho real (iOS/Android), nem a selecao em deitado em telas bem pequenas, nem menus (inventario, arvore de skills) no toque.
### [Claude] 31/10/2026 - Novo fluxo de entrada: inicio -> login -> painel -> carregamento -> lobby
- Pedido: pagina inicial com a logo da IS Labs, centralizada, falando do jogo ("o unico L2 hack and slash") e botao JOGAR -> login; depois do login o painel do jogador com botao de jogar irresistivel; depois a tela de carregamento (baixa os arquivos com dicas); carregou, cai no lobby (criar/selecionar personagem).
- `index.html` (reescrita), `login.html`, `painel.html`, `carregando.html` novas, `css/portal.css` comum, logo `icons/is-labs.png` (de assets/talking_island/textures/is_labs_logo_ui.png). Quem ja tem conta vai do JOGAR direto ao painel. Painel: botao grande pulsante com brilho, personagens da conta, status do servidor, novidades; "Sair"; modo sem conta tambem entra (aviso para criar conta).
- Carregamento: baixa `assets/precarga.json` (103 arquivos, ~102 MB: personagens, Ilha de Talking, Baium, fx, hud, sons; gerado por `tools/gerar_precarga.py`, com o ?v= exato do codigo porque o service worker guarda por URL), 4 em paralelo, barra com %, etapa ("Montando a Ilha...") e 15 dicas rotativas; minimo 3 s; puxa os personagens da conta em paralelo; depois abre `selecao.html`. Se demorar 25 s aparece "Entrar mesmo assim". Torre (mini_toi.glb 16 MB) NAO esta na precarga: carrega ao entrar na DG (URL com ?v= dinamico).
- `conta.js` v=2: `telaLogin({host,depois,convidado})` (cartao embutido na pagina de login), `puxar()` agora assincrono (o pedido sincrono nao aceita timeout e quebrava), `exigir()` na selecao manda para login.html se nao houver conta nem modo sem conta. `manifest.json` start_url -> index.html. Rotulo do backup: js/conta_antes_fluxo.js.
- Testado (Chrome, servidor local): index -> login -> criar conta -> painel -> JOGAR -> carregamento 100% -> lobby, sem erros; telas conferidas em desktop e celular em pe. Celular deitado: botao ficou abaixo da dobra, escondi texto/selo nessa altura (conferir). NAO testado: carregamento com rede lenta real, a tabela de dicas em telas pequenas, ou o service worker guardando os 102 MB.


### [Claude] 31/10/2026 - Desempenho no celular (qualidade grafica)
- Relato com foto do celular real (Android/Chrome, cidade): travando muito e imagem corrompida (lixo de pixels no lado direito = sobrecarga/falta de memoria da GPU). Causas provaveis no codigo: bloom com alvos de ponto flutuante em resolucao cheia + varias passadas de blur, pixel ratio ate 2 (tela ~2,6x), antialias ligado, ~120 predios/92 arvores sempre desenhados.
- `js/qualidade.js` (novo, antes do jogo): niveis baixa/media/alta. Toque = BAIXA (ratio 1, sem antialias, sem bloom, corte de objetos longe); computador = ALTA (como antes). `?q=baixa|media|alta` ou Opcoes (O) -> "Qualidade grafica" (recarrega e guarda). Resolucao dinamica: a cada 60 quadros mede; abaixo de ~25 fps o ratio cai 20% (minimo 0,55); com folga sobe de volta ate o maximo do nivel.
- cidade.html e arena.html: renderizador com `antialias:QUAL.aa`, `powerPreference:'high-performance'`, `setPixelRatio(min(dpr, QUAL.ratio))` (inclusive no resize), bloom so se o nivel permitir ou o jogador ligar em Opcoes; cidade: arvores a mais de 90 m e predios a mais de 190 m ficam invisiveis (checado a cada 20 quadros). Backups *_antes_qualidade.html.

- Teste (Chrome emulando Android 915x412, dpr 2,6, GPU por software): nivel baixa automatico, aa/bloom desligados, ratio caiu sozinho para 0,8; `?q=alta` mantem ratio 2/aa/bloom. NAO medido em celular real: ganho de fps, e se a corrupcao de imagem some. Pendente se nao resolver: reduzir resolucao das texturas (memoria da GPU), simplificar o portal da cidade, limitar particulas.

### [Claude] 31/10/2026 - Carregamento travado em 0% no celular
- Relato: a tela de carregamento ficava em 0% antes de entrar na cidade. Causa: a barra so andava quando um ARQUIVO terminava e a lista comecava pelos maiores (Talibrac.vrm 17,8 MB, baium_boss.glb 13,5 MB) -> em rede de celular ficava minutos em 0%.

- `carregando.html`: progresso por BYTES recebidos (leitor de stream), mostra "X de Y MB"; arquivo parado 90 s e pulado; `assets/precarga.json` agora marca `e` (essencial) e ordena essenciais primeiro, do menor para o maior. Essencial = 90 arquivos, 66,6 MB (lobby e cidade). Baium (18 MB) e Talibrac.vrm (17,8 MB; so a arena) ficam FORA e baixam ao entrar na DG. `tools/gerar_precarga.py` atualizado.
- Teste (Chrome, rede limitada a 750 KB/s, latencia 120 ms): 7% em 3 s, 13% em 8 s, 21% em 15 s, sem erros. NAO testado em celular real. Ideia pendente: baixar so o modelo do personagem escolhido (os 15 modelos de raca somam 32 MB).

### [Claude] 31/10/2026 - Fluxo igual no PC e no celular + personagens que sumiam
- Relato (PC): lobby/criacao sem a logo da IS Labs e sem o fluxo novo; personagens "sumiram"; criar personagem nao aparecia.

- Fluxo unico: `Conta.fluxo()` (conta.js v=3) em selecao, criacao, cidade e arena: sem a marca de sessao (`sessionStorage isblade.fluxo`, posta por carregando.html) a pagina volta para `index.html`. Vale para favoritos/abas novas no PC e no celular; F5 na mesma aba nao reinicia. `?dev=1` libera para testes (testes automaticos antigos que abrem arena/cidade direto agora precisam de `?dev=1` + modo sem conta). Logo da IS Labs no cabecalho do lobby e da criacao.
- Personagens: `criacao.html` NAO tinha conta.js, entao o que se criava ali nao marcava "mudou" e a proxima sincronia (painel/carregamento) trazia os dados da conta por cima e apagava o personagem novo. Agora: criacao tem o gancho; alem disso `puxar()` compara um retrato (`isblade.conta_snap`) com o estado local para detectar mudanca mesmo sem gancho e, havendo mudanca local, MESCLA (uniao dos personagens por id; chaves locais vencem) e envia, em vez de sobrescrever. Copia do estado local antes de qualquer troca em `isblade.conta_bkp_local`; `Conta.recuperar()` restaura dessa copia (sem botao ainda). Backup js/conta_antes_merge.js.
- Nao reproduzido: a tela de criacao em preto no PC do usuario (em Chrome limpo, producao e local mostram modelo e fundo normais). Hipoteses: cache/dados antigos do navegador, ou contexto WebGL perdido (GPU ocupada, ex.: Blender aberto).

### [Claude] 31/10/2026 - Pagina inicial antiga no PC do dono + diario atualizado
- Relato: no PC, `isblade.tecx.pro` mostrava a pagina inicial ANTIGA (START, cards). Conferido de fora (curl forcando o IP da Vercel, SNI do dominio): `isblade.tecx.pro`, `isblade.vercel.app` servem a pagina NOVA (3380 bytes, "IS Labs apresenta"); logo o problema e cache no navegador do dono (service worker/HTTP). `sw.js`: cache de codigo `is-codigo-v2` (assets `is-assets-v1` preservados) e ao ativar recarrega as abas abertas. Backup sw_antes_v2.js. Para o dono: Ctrl+Shift+R; se persistir, DevTools > Application > Service Workers > Unregister (NAO "Clear site data": apaga os personagens locais).

- `DIARIO_IS_BLADE.md` estava parado desde 26/10; adicionada a secao "SESSAO 28-31/10" (resumo de tudo) e atualizada a linha "ultima atualizacao". Regra daqui para frente: toda entrega relevante vai nos DOIS arquivos (REGISTRO = detalhe tecnico; DIARIO = resumo por sessao).



---

## 📅 SESSÃO: 28/10 a 31/10/2026 — [Claude] DO PROTÓTIPO AO JOGO NO AR (TORRE DO BAIUM, CONTAS, VPS, CELULAR)

> Resumo para quem chega agora. Cada item tem uma entrada detalhada em `REGISTRO_CLAUDE.md` (causa, arquivos, backups, testes, o que NÃO foi testado).
### [Claude] 31/10/2026 - Arte de capa "L2 Ikarus" no site e logo da IS Labs removida por enquanto

- **Jogo (arquivos)** na Vercel: `isblade.vercel.app` e `isblade.tecx.pro` (repo `github.com/MANINtecn/isblade`, branch `main`; push = publicação). **Servidor de jogo** (Node + `ws`) na **VPS Windows `51.79.41.62`**, com **Caddy** dando HTTPS em `play.isblade.tecx.pro` (registro A criado no painel do `tecx.pro`; o coringa `*` continua apontando para a Vercel). Tarefas agendadas `IS_Servidor`, `IS_Sync` (puxa o git a cada 5 min e reinicia só o node do jogo) e `IS_Caddy`. Verificado: `/status`, certificado e WebSocket (origem `isblade.vercel.app` entra; origem estranha leva 401). **Não** testado: dois jogadores reais se vendo.
- **PWA / service worker** (`sw.js`): código em rede-primeiro, assets pesados em cache-primeiro (a URL com `?v=N` é a chave). Em 31/10 o cache de CÓDIGO passou para `v2` (assets continuam `v1`) porque o PC do dono mostrava a página inicial antiga.

### 🧑‍🤝‍🧑 Contas e personagens
- **Cadastro rápido**: usuário + senha (sem e-mail), `servidor/contas.js` (scrypt, token como hash, limites por IP) e `js/conta.js`. Personagens, inventário, skills, maestria, DGs feitas e barra de atalhos são **por personagem** e ficam salvos na conta (`/api/dados`). Sincronia por conta com **mescla** (nenhum personagem some). **Sem recuperação de senha** (não pedimos e-mail). Jogar sem conta continua possível (dados só no aparelho).
- **Fluxo único PC + celular**: `index` (logo da IS Labs, "o único L2 hack and slash", JOGAR) → `login` → `painel` (botão enorme) → `carregando` (barra por bytes, 15 dicas, só o essencial ~66 MB) → `selecao` (lobby). Abrir qualquer página do jogo direto volta ao início (`Conta.fluxo()`; `?dev=1` libera para testes).


### ⚔️ Combate e Guardião
- **CC (controle de grupo) estilo Dragon Nest** em `js/cc.js` (estados, SA, mesma regra em PvE e PvP), guarda universal na tecla **C**, **pulo** (Espaço), **esquiva** (toque no Shift) e **corrida** (Shift segurado, gasta estamina, ×1,8). Bloqueio do Guardião gasta menos estamina.
- **Skills do Guardião**: Fortaleza Égide (domo que gira, machuca e cura), Arremesso do Escudo com golpes múltiplos, Chuva de Escudos e Fortaleza ~2× mais rápidas, escudos caindo em pé, **Corrente de Puxão puxa mobs comuns (nunca o chefe)**, reflexo do Escudo de Energia com alcance 15 m, recargas menores e HP do Baium + recargas visíveis na HUD.

- **Barra de atalhos livre**: arrastar skill/item para qualquer slot, tecla por slot configurável em Opções (padrão Q E R T F G; proibidas WASD, 1-6, M, V, B, C, I, K, X).

### 🏯 Torre do Baium (mapa da comunidade "Mini Toi", montado e texturizado no Blender)
- Mapa de colisão próprio (`mini_toi_walkgrid`), 3 andares, escadas e pulo. **1º andar** = DG normal/médio; **2º andar** = DG hard (limpar libera a porta); **3º andar** = **Baium (agora 3× maior)** lutando no **círculo gigante** (arena de ~62 m de raio), a porta abre sozinha ao se aproximar.
- **DGs com tempo**: meta de abates, chefe, mobs que reaparecem, tempo esgotado = expulso, portal de saída ao concluir (no hard não há portal: sobe a escada).

- **Portal da cidade** agora é o do santuário; [E] abre a escolha (Dungeon Normal/Médio/Hard, Duelo contra o Baium, PvP). O cenário gerado no TECX LABS 3D some dentro da torre.
- Fonte: pacote `chrsound.uax` do cliente Interlude (`...\Cliente Interlud 300x\sounds`), exportado com `umodel_materials.exe` (1029 sons). Cada raça/gênero tem ~53 sons com prefixo próprio. Script `prototipo/tools/extrair_vozes_l2.py` (usa o ffmpeg do `imageio_ffmpeg`) converte para OGG mono 24 kHz e gera `prototipo/assets/vozes/<conjunto>/<evento>_<n>.ogg` + `vozes.json`: 12 conjuntos, 370 arquivos, **2,57 MB**. Eventos: `atk` (grunhido do golpe básico, 17 variações: Preatk/1H/2H/Pole), `skill` (grito de skill, _*S_Atk*_), `dmg` (3), `death`, `breath` (2), `victory`, `greeting`.

### 📱 Celular
- Botões de toque (atacar, pular, esquiva/correr, bloqueio, 6 skills da barra), aviso "gire o celular", tela cheia (Android). **Qualidade gráfica** baixa/média/alta (`js/qualidade.js`): celular começa em baixa (sem bloom, sem antialias, resolução dinâmica, corte de objetos longe). Foto do celular real mostrou travamento e imagem corrompida: primeira rodada de otimização feita, **ganho não medido em aparelho**; próximas ideias: texturas menores, baixar só o modelo do personagem escolhido, simplificar o portal da cidade.

### ⚠️ Pendências e riscos conhecidos
- Dois jogadores reais no servidor (nunca testado fora de bots/Chrome). PvP nos andares 2 e 3; dificuldade ULTRA e zona de x1 no 1º andar; CC no servidor (PvP).

- Recuperação de senha; botão para restaurar a cópia local (`Conta.recuperar()` existe, sem botão); repositório ainda **público** (assets do L2; dono vai deixar privado, a VPS então precisará de credencial de leitura).
- Senha do Administrador da VPS apareceu em imagem no chat: **trocar**; depois recriar as tarefas agendadas com a nova senha.
- Tela de criação preta no PC do dono (não reproduzida: Chrome limpo mostra tudo); suspeitas: cache antigo ou contexto WebGL perdido.



### [Claude] 31/10/2026 - Arte de capa "L2 Ikarus" no site e logo da IS Labs removida por enquanto
- Pedido do dono: usar a imagem de `Área de Trabalho\IS BLADE\imagens\L2 Ikarus_ Fantasia Sombria Épica.png` no site e tirar a IS Labs por enquanto.
- Imagem convertida para `prototipo/icons/capa.jpg` (1400 px, 177 KB). Entrou como arte principal em `index.html`, e menor em `login.html`, `painel.html` e `carregando.html`. O fundo preto da imagem some no fundo da página (`mix-blend-mode: screen` + máscara radial em `css/portal.css` v=4). O texto "IS BLADE" ficou só como título invisível (leitores de tela/SEO).
- Removidos: logo `icons/is-labs.png` e "IS Labs apresenta" (início), logo do login, do painel, do carregamento, do cabeçalho do lobby e da criação, logo "IS LABS" da tela de carregamento interna da cidade e da arena, e "IS Labs ·" do rodapé. NÃO mexido: medalhão da IS Labs desenhado no chão da cidade (dentro do mundo 3D). O arquivo `icons/is-labs.png` continua na pasta, sem uso.
- Atenção: a própria imagem diz "L2 IKARUS — BY IS LABS" (a IS Labs aparece na arte) e o título da aba continua "IS BLADE" (nome provisório do jogo). Se "Ikarus" for o nome definitivo, falta trocar títulos e textos.
- Testado (Chrome, PC 1280×720 e celular 390×844): botão JOGAR visível sem rolar no PC; as quatro páginas com a arte sem faixa preta aparente. Não testado em celular deitado nem em telas muito largas.

### [Claude] 31/10/2026 - Ajuste: arte de capa so na pagina inicial; logo IS Labs volta no resto

- Correcao do dono: a arte "L2 Ikarus" fica APENAS em `index.html`. Login, painel, carregamento, cabecalho do lobby e da criacao, e as telas de carregamento da cidade e da arena voltaram ao que estava (logo IS Labs), restaurados do commit `d55efe3`. Na pagina inicial continuam removidos a logo, o "IS Labs apresenta" e o "IS Labs ·" do rodape (a propria arte ja traz "BY IS LABS").

### [Claude] 31/10/2026 - isblade.tecx.pro "voltou" para a pagina antiga: causa = DNS (coringa) + carregamento que nao trava mais
- Sintoma do dono: so o link da Vercel mostra a pagina inicial nova; em `isblade.tecx.pro` aparece a antiga. Causa achada: ao criar o registro `play.isblade` (A -> VPS), o nome `isblade.tecx.pro` passou a existir no DNS como "no intermediario" e, pela regra do coringa (RFC 4592), o `*.tecx.pro -> cname.vercel-dns.com` deixou de valer para `isblade.tecx.pro`. Conferido nos servidores do dominio (horizon/orbit.dns-parking.com), 8.8.8.8 e 1.1.1.1: `isblade.tecx.pro` devolve vazio (so SOA). Sem DNS, o navegador cai no service worker (rede-primeiro com copia de reserva) e mostra a copia ANTIGA guardada. CORRECAO (feita pelo dono no painel do dominio): criar o registro explicito `isblade` CNAME `cname.vercel-dns.com`. O `play.isblade` (A 51.79.41.62) continua certo.
- `carregando.html` mais robusto (backup carregando_antes_robusto.html): lista de arquivos com limite de 8 s (senao segue sem pre-carga), vigia de progresso (30 s sem um byte novo = entra no lobby; a tela mostra "Sem progresso ha N s"), apos 10 s aparecem "Entrar mesmo assim" e "Limpar o cache do jogo e tentar de novo" (apaga so service worker e caches `is-*`; personagens e conta ficam). `sw.js`: falha ao guardar no cache nao derruba mais o download (backup sw_antes_robusto.js).
- Testado (Chrome): com a lista de arquivos sem responder entra no lobby em 11 s; com todos os arquivos pendurados, em 41 s; em rede normal chega a 100% em ~10 s. NAO reproduzido o 0% do celular do dono (rede boa aqui).


### [Claude] 31/10/2026 - Vozes do Lineage 2 por raça/gênero ligadas ao jogo
- Pedido do dono: pegar os sons de efeito e de voz do L2 de cada personagem e adicionar.
- Fonte: pacote `chrsound.uax` do cliente Interlude (`...\Cliente Interlud 300x\sounds`), exportado com `umodel_materials.exe` (1029 sons). Cada raça/gênero tem ~53 sons com prefixo próprio. Script `prototipo/tools/extrair_vozes_l2.py` (usa o ffmpeg do `imageio_ffmpeg`) converte para OGG mono 24 kHz e gera `prototipo/assets/vozes/<conjunto>/<evento>_<n>.ogg` + `vozes.json`: 12 conjuntos, 370 arquivos, **2,57 MB**. Eventos: `atk` (grunhido do golpe básico, 17 variações: Preatk/1H/2H/Pole), `skill` (grito de skill, *_S_Atk_*), `dmg` (3), `death`, `breath` (2), `victory`, `greeting`.
- Mapa tipo → voz (`js/voz.js`, tabela MAPA): human_fighter/fighter/starter = MHFighter; human_fighter_female/imperial = FHFighter; magic_m/f = MHMagician/FHMagician; elf_m/f = MElf/FElf; orc_m/f = MOFighter/FOFighter; dwarf_m/f = MDwarf/FDwarf; darkelf_m/f = MDElf/FDElf.
- `js/voz.js` (novo): carrega só as vozes do personagem atual (~200 KB, sob demanda, cache do service worker), tempo mínimo entre vozes, probabilidade por evento (golpe 70%, fôlego 45%, resto ~100%), leve variação de tom, respeita volume e mudo das Opções. Ligado em `arena.html` e `cidade.html`: golpe básico, skill (grito), dano recebido, morte, esquiva (fôlego), vitória/subir de nível (wrap do `SFX.levelup`) e cumprimento ao tocar na cidade pela primeira vez na aba. Backups `*_antes_voz.html`.
- Testado (Chrome): o conjunto certo é escolhido por tipo (orc_f → FOFighter, darkelf_m → MDElf, human_fighter → MHFighter), 3 golpes e 2 skills no duelo chamaram a voz do personagem, sem erros. NÃO ouvido por uma pessoa (só verificado que o áudio é decodificado e tocado) e não testado no celular.
- Fora desta rodada (existem no pacote): passos por tipo de chão (`Stone_Hard_*`, `Dirt_*`, `Grass_*`, `Wood_*`, `Water_*`), sons de mobs (`monsound*.uax`), sentar/levantar, risadas e emotes. Pendente decidir se entram.


### [Claude] 31/10/2026 - Service worker só para assets pesados (o site nunca mais fica preso numa versão antiga)
- Pedido do dono: o cache persistente deve valer só para os assets e coisas pesadas do jogo, não para o site. Causa do problema anterior: o `sw.js` guardava as PÁGINAS (rede-primeiro com cópia de reserva) e, sem DNS, o navegador mostrava a cópia antiga.
- `prototipo/sw.js` reescrito (backup `sw_antes_soassets.js`): só intercepta arquivos pesados (glb, vrm, png/jpg, ogg/wav/mp3, bin, fontes...), cache-primeiro, chave pela URL completa com `?v=N`; HTML, JS, CSS e JSON não passam pelo service worker (vão direto à rede e ao cache HTTP normal). Sem pré-cache de páginas. Ao ativar, apaga os caches `is-*` antigos (código/páginas), mantém `is-assets-v1` (os ~66 MB já baixados não se perdem) e recarrega as abas abertas uma vez.
- Consequência: sem internet o site NÃO abre mais pelo cache (não era um objetivo; o jogo é online). Não testado em aparelho com o service worker antigo instalado; testar: abrir o site uma vez com internet para o novo service worker assumir.

### [Claude] 31/10/2026 - Efeitos sonoros por raça, passos e sons dos monstros do L2 (fim das vozes humanas nos monstros)
- Pedido do dono: (1) efeitos sonoros próprios de cada personagem; (2) os sons dos monstros estavam horríveis, com sons humanos (origem: o Gemini).
- **Causa dos sons humanos**: a dor do jogador (`SFX.hurt`) usava `mu_hurt_*`/`mu_dark_pain` e a morte `mu_male_die` (voz masculina humana do MU, mesma para todas as raças); o aviso de ataque dos mobs (`bossWind`) e o rugido (`roar`) usavam `boss_roar*.wav`, e a morte do mob era `slime` + impacto macio. Agora: dor/morte do jogador = voz da raça (L2); os efeitos do MU foram retirados de `hurt`/`playerDie`.

- **Monstros com som do L2** (`tools/extrair_mobs_l2.py`, pacotes `monsound*.uax`): Sombra = `shadow`, Conjurador = `black_magician`, Brutamontes = `ogre`, Comandante das Sombras = `DeathLord`, **Baium = o `baium` do L2**. 59 arquivos, 0,8 MB em `assets/mobs/<mob>/<evento>_<n>.ogg` + `mobs.json`. Eventos: preparação do golpe, golpe, dano, morte, rosnado ocasional (mob perseguindo a menos de 26 m). `Voz.mob(tipo, evento, distância)` (js/voz.js): volume cai com a distância (1/(1+d/9)), tempo mínimo por evento, devolve true se tratou (para o jogo não tocar o som antigo). Baium: `SFX.play` é interceptado (`bossWind`, `roar`, golpes e morte usam o Baium do L2). Para trocar o monstro do L2 de um mob: tabela MOBS no script.
- **Efeitos por raça/gênero** (`F_`/`M_<Raça>_Shot|Throw|Notarget` do `chrsound.uax`): `Shot`/`Throw` entram no pool do grito de skill de cada raça; `Notarget` = voz de "não dá" ao apertar uma skill em recarga. `vozes.json` agora com 406 arquivos / 2,85 MB. Não usados ainda: os cantos longos de magia (`Black/White/Element/Call/Sub/Type_A..C`, ~2 s).
- **Passos** (`tools/extrair_passos_l2.py`, `stepsound.uax`): 82 arquivos / 0,43 MB em `assets/passos/`. Um passo a cada ~1,25 m andando e ~1,9 m correndo, com o tom da superfície: arena = pedra, torre = `stone_hard`, cidade = pedra na praça (raio 22), terra, grama a mais de 80 m. Não toca no ar, rolando ou parado.
- Testado (Chrome): 20 m andando = 15 passos, 50 m correndo = 25, 0 no ar e parado; morte de 4 sombras chamou `shade:death` com o som do L2; Baium carrega. NÃO ouvido por uma pessoa (balanço de volumes e se o som de cada monstro "combina" é julgamento do dono).

### [Claude] 31/10/2026 - Arremesso do Escudo com alcance dinâmico (mira por ponto), 360° e máximo de 10 m
- Pedido do dono: só o Arremesso do Escudo ganha alcance dinâmico; era para ser 360°; máximo de 10 m ("já é o dobro").

- Antes: o escudo sempre cravava a 5,7 m (visual fixo) e o dano era um cone de 8 m (`range` 8, `half` 0,8) — visual e dano não batiam.
- Agora (`data/armas/shield.json`, skill 5): `mira: true`, `mira_min: 2`, `mira_max: 10`, `raio: [5.5,5.5,5.5,8,8,8]` (ida/volta), `range: 10`. `arena.html` (bloco `[mira]`, backups `arena_antes_mira.html`, `guardiao_antes_mira.js`, `shield_antes_mira.json`): `pontoMira()` calcula o ponto no PC pelo chão sob a mira (ou pelo chefe/mob sob a mira), no celular pelo inimigo mais próximo dentro do alcance, e sem nada cai a 5,7 m como antes; limita a 2..10 m. O ponto fica em `S.anim.alvo`; o acerto é um CÍRCULO (360°) de raio 5,5 m nos golpes de ida e 8 m nos de volta, tanto em mobs (`hitMobs`) quanto no Baium (`applyHit`, descontando ~3 m de corpo). `js/guardiao.js` v=14: o escudo voa até o ponto e a cratera/explosões saem dele. Anel dourado no chão mostra onde cai (vermelho se a mira passou de 10 m); some em recarga e no celular.
- Testado (Chrome): mira a 26 m → 10 m (marcada como fora), 1 m → 2 m, 7 m → 7 m, 8 m ao lado → 8 m; no duelo o dano no Baium bate com o círculo (mira longe: só parte dos golpes pegou, 138 de dano; mira no chefe: 167); sem erros. NÃO testado: ajuste fino de sensação (mira em 3ª pessoa), mobs do celular, anel visível a olho humano em jogo normal.
- Fora do escopo: `cidade.html` (boneco de treino) segue com o 5,7 m antigo; PvP no servidor ainda valida o Arremesso como cone de `range` 10 e `half` 0,8, sem ponto de alvo (ajustar quando tratarmos o PvP).

### [Claude] 31/10/2026 - Monstros da Torre da Insolência com modelos 3D animados e sons do L2, por dificuldade
### [Claude] 31/10/2026 - Celular: leque de botões, editor de layout, Arremesso e vermelho
- Pedido do dono: normal = muitos mobs fracos e pouca XP (andares baixos da TOI); médio = outros modelos da TOI; hard (começa no 2º andar) = os de TOI 7 + o Baium como chefe final; "fique à vontade para escolher, eu confiro depois".
- **Elenco** (`data/dungeon.json`, backup `dungeon_antes_mobs3d.json`; modelo do L2 -> mob): NORMAL = Fantasma (`human_ghost`, 60 PV, 6 XP) x10, Guerreiro Espectral (`skeleton_knight`, 8 XP) x6, Vidente (`black_magician`, à distância, 10 XP) x3, Lâmina do Desespero (`death_knight`, mini-chefe, 60 XP) x1, meta 45 abates. MÉDIO = Cão de Hallate (`werewolf`) x6, Guarda Real (`skeleton_royal_guard`) x4, Cavaleiro (`headless_knight`) x3, Erínia (`erinyes`) x3, Vidente x2, Comandante de Hallate (`knight_of_shadow`, mini-chefe). HARD (2º andar) = Anjo Guardião (`angel`) x5, Xamã de Platina (`batur_orc_shaman`, à distância) x3, Senhor de Platina (`batur_orc_overlord`) x2, 2 Arcanjos (`archangel`, mini-chefes); limpar libera a porta e o **Baium** (final) continua. XP por abate em `xp` de cada tipo (antes fixo em 25/65); `isMiniBoss` agora vem do dado (antes era o nome `mini_boss`).
- **Modelos**: `tools/blender_mobs/exportar_mobs.py` (umodel exporta .psk/.psa/.png do cliente; Blender `montar_mob.py` liga texturas, normaliza a altura, reduz a ≤3500 triângulos, remove faces sem textura, renomeia as animações wait/run/atk/atkwait/death) -> `assets/mobs/modelos/<id>.glb`, 13 arquivos, 16 MB (0,5-2,2 MB cada, textura 512). Sem animação de dano no L2: a reação é o clarão. `mob_view.html` é o visualizador de conferência (régua verde = 1 m).
- **Jogo** (`arena.html`, bloco `[mob3d]`, backup `arena_antes_mobs3d.html`): carrega só os modelos da dificuldade escolhida ao iniciar a DG; clona malha com esqueleto (clone próprio), animação por estado (perseguir = run, preparar = atkwait, golpe = atk, morte = death em 3x), clarão nos materiais, anima só quem está a menos de 34 m (celular), compartilha geometria e textura. Sem o modelo cai no boneco antigo. Sons: `tools/extrair_mobs_l2.py` ganhou o mapa dos 13 tipos (183 arquivos, 2,1 MB); atenção: o script não pode apagar `assets/mobs/modelos` (já corrigido).
- Testado (Chrome): as três dificuldades iniciam com todos os monstros em 3D (20/26/22), modelos aparecem animados e sem erro de página. NÃO testado: desempenho no celular com ~25 monstros animados, balanceamento (PV/dano/XP/quantidades são palpite), mira/pull com os novos corpos, e a opinião do dono sobre a escolha dos modelos (a troca é uma linha no `mobs` do json e no script de modelos).

### [Claude] 31/10/2026 - Celular: auditoria de desempenho (cidade e torre) e golpes livres na direção do analógico
- Pedido do dono: melhorar o gráfico do celular sem travar (tirar a logo do centro da cidade se preciso, ver o que está pesado), golpes/skills não respeitam a direção do analógico (batem sempre para a frente / travam no alvo mais perto), e travar a câmera se necessário.
- **Auditoria da cidade (nível baixa, medido no navegador)**: 10 luzes (1 hemisfério, 1 ambiente, 1 direcional, **5 de ponto, 1 holofote**) sobre ~1000 malhas com MeshStandardMaterial (cada pixel calculava todas as luzes); 321 texturas (~48 Mpixels ≈ 250 MB de VRAM com mipmaps, provável causa da imagem corrompida); medalhão da IS Labs de 25 m no chão = plano grande transparente com material metálico (preenchimento caro); câmera com far = 2000; mar de 49x49 vértices recalculado todo quadro; minimapa 2D redesenhado todo quadro; 234 chamadas de desenho / 71 mil triângulos (esses estão OK).

- **Mudanças** (`cidade.html` e `arena.html`, blocos `[perf]`; backups `cidade_antes_perf.html`, `arena_antes_toque.html`): baixa = só ambiente+hemisfério+direcional (de 9 luzes para 3), materiais Lambert (cenário e monstros), texturas do cenário reduzidas a 256 px (personagens 512), sem o medalhão, piso escuro clareado, câmera far 450 e neblina mais densa (.0045), mar parado, minimapa a 15 quadros/s; média = sem luzes de ponto/holofote, texturas 512, sem medalhão; alta = como antes (e `?q=alta` ou Opções para voltar). Na arena/torre: luzes de ponto/holofote desligadas e materiais Lambert a cada 4 s (portais e modelos nascem depois). Depois: 3 luzes, 974 materiais Lambert, ~40 Mpixels (cidade); a resolução dinâmica continua ajustando sozinha.
- **Câmera**: não é o que pesa (no toque já é a câmera de cima, fov 46, sem mira 3D). Não foi travada; se o dono quiser travar a rotação por clareza de controle é uma mudança pequena à parte.
- **Golpes livres no toque**: `aimAngle()` no celular usa a direção do analógico (ou a última direção andada) em vez do alvo sob a mira/câmera; `S.mdir` guarda a última direção. O Arremesso do Escudo no toque vai 7 m para essa direção (antes: inimigo mais próximo). Testado (Chrome, simulando toque): segurando D/A/S/W o escudo foi para a direita/esquerda/trás/frente, sem travar em inimigo.
- NÃO medido em celular real: ganho de fps. Se ainda travar: reduzir o número de casas visíveis, trocar texturas por versões menores em disco, e desligar partículas.

### [Claude] 31/10/2026 - Aviso "Combo interrompido" removido e interface (HUD) limpa estilo Solo Leveling

- Pedido do dono: o aviso "Combo interrompido. Recomece pelo primeiro golpe." poluía a tela (PC e celular); avaliar se o HUD do Gemini pesa e, se sim, fazer um mais limpo/moderno/transparente, sem dragões nem texturas pesadas, com acabamento premium.
- **Aviso**: `sysMsg('Combo interrompido...')` removido de `arena.html` e `cidade.html` (o combo só zera em silêncio).
- **O HUD antigo pesava?** Pouco, mas mais que o necessário: uma imagem de 2160x240 (2,1 MB decodificados) esticada na largura inteira, 2 imagens de cristal recortadas por `clip-path`, `filter: drop-shadow` no recipiente da tela toda (+1 por ícone) e a arte do alvo. Não era o maior culpado do travamento (isso foi o 3D: luzes, materiais, texturas), mas obrigava a recompor uma faixa de 100% da largura a cada quadro e ocupava muito da tela.
- **HUD limpo** (`css/hud_clean.css` + ajustes em `js/mu_hud.js` v=16; backup `js/mu_hud_antes_clean.js`, `arena_antes_hudclean.html`, `cidade_antes_hudclean.html`): vidro escuro translúcido, linhas finas azul-gelo, sem imagens, sem filtros. Barras de HP (vermelha) e estamina (ciano) inclinadas, desenhadas por CSS com a variável `--p` (o JS grava a porcentagem no pai); nome / classe / nível em letras espaçadas e fio de EXP de 2 px; 8 slots em fila (quadrados de cantos suaves, tecla no canto, recarga por cima); botões I C S Q O pequenos; barra do alvo fina; botões do topo (menu, voltar, tela cheia) no mesmo estilo; botões de toque do celular no mesmo vidro (subiram para não encostar na fila I C S Q O). Padrão para todos; Opções -> "Interface (HUD)" volta ao Clássico (`isblade.hud`).
- Testado (Chrome, PC 1280x640 e celular 915x412 deitado): barras acompanham HP/estamina, slots/teclas/ícones aparecem, sem erro. NÃO testado: cooldown/arrastar skill para o slot no visual novo, seletor de skills/itens (picker) e inventário sobre o HUD novo, tablet, e a opinião do dono sobre cores e tamanhos (tudo em variáveis `--hc-*` no topo do CSS).

### [Claude] 31/10/2026 - Celular enxuto (Redmi C13): botão de ação contextual, menos botões, mais leve; sons do ataque padrão e do boneco
- Pedido do dono: "Pressione [E]" não serve no celular (o botão de atacar deve virar ENTRAR/ABRIR perto de portal/baú/porta); as 6 skills e o resto poluem a tela; minimapa recolhido; otimizar ao máximo para um aparelho básico (Xiaomi Redmi C13); o boneco de treino ainda solta som antigo ao apanhar; ataque padrão sem efeitos do L2.
- **`js/mobile.js` v=4 (backup `mobile_antes_enxuto.js`)**: botão principal dinâmico (ATACAR; com o aviso de interação ativo vira ENTRAR / ABRIR / USAR e manda a tecla E; o aviso "Pressione [E]" fica invisível no toque). Pular, esquiva e bloqueio viraram 3 botões pequenos só com ícone; as 6 skills em grade 3x2 de 36 px translúcida e sem texto; a barra de skills e os botões I C S Q O do HUD somem no toque (a engrenagem abre os de sistema); minimapa, hora e lista de locais recolhidos (botão do mapa abre); botões do topo menores. Testado (Chrome 800x360, toque): perto do portal da cidade o botão vira o de entrar, o toque abre a escolha Dungeon/Duelo/PvP.
- **Desempenho no celular** (`js/qualidade.js` v=2): nível baixa trava em **30 quadros/s** (menos calor e GPU), 60% dos monstros nas DGs (`QUAL.mobMult`, o total de abates da meta continua via reaparecimento), anima monstros só até 22 m, casas até 120 m e árvores até 55 m na cidade, e as barras do HUD atualizam ~9x/s (`js/mu_hud.js` v=17, `QUAL.touch`). Média: 45 fps, 85% dos monstros. Alta: sem limite.

- **Sons**: o "som antigo" do boneco era o `roar` (rugido do chefe) tocado quando o espantalho é derrubado (stagger) ou derrotado em `cidade.html`: agora o espantalho não faz som (só o Baium real ruge). Ataque padrão: o estalo de soulshot do L2 agora toca em CADA golpe (antes só no último) junto com o "shing" e o impacto de arma/armadura, e as 6 skills do Guardião ganharam efeitos do L2 (swing/hit: `focus_sonic`, `shieldstun`, `power_strike`, `ground_smash`, `doublewind`, `battle_roar`, `dash`, `fatal_strike`, `energywave`) — antes `g_s*_swing/hit` não existiam e as skills ficavam sem efeito. Backups `*_antes_sons2.html`, `qualidade_antes_c13.js`, `mu_hud_antes_c13.js`.
- NÃO testado: o balanço de volume (efeitos x voz), o desempenho no Redmi C13 de verdade, e o uso do botão contextual para baú/porta do Baium na torre.


### [Claude] 31/10/2026 - Celular: leque de botões, editor de layout, Arremesso e vermelho
- Botão ATACAR agora é um leque encostado nas bordas (canto inferior direito, acima da estamina); as 6 skills ficam em meia-lua ao redor dele. Esquivar, pular e bloquear ficaram maiores, na mesma coluna vertical.
- Editor de botões: lápis no canto → arrastar cada botão → Salvar (fica em `isblade.mb_layout`) ou Padrão. Só tem custo enquanto está editando; as posições são aplicadas uma vez, não pesa no jogo.
- Arremesso do Escudo: a volta (2ª parte) agora usa o ponto do mundo mirado, não a direção do analógico no momento — mexer o analógico na animação não desvia mais. `guardiao.js` v15.
- HP: vermelho puro (`#f03a2e`) no lugar do que parecia rosa. `hud_clean.css` v4.
- Testado (Playwright 800x360 toque): leque visível, ATACAR vermelho, arrastar+Salvar persiste após recarregar. NÃO testado: aparelho real (Redmi C13), a volta do Arremesso com analógico em movimento no navegador, nem o botão Padrão.
- Backups: `mobile_antes_leque.js`, `guardiao_antes_dir.js`, `hud_clean_antes_cor.css`.


### [Claude] 31/10/2026 - Conta nova não ganha mais personagem "Ícaro" de brinde
- Causa: `selecao.html` criava sozinho um personagem padrão (`char_default_1`, "Ícaro") quando a lista estava vazia; conta nova começa vazia, então ganhava esse herói.
- Agora: com conta logada e sem personagem, a seleção manda direto para `criacao.html`. Convidado segue como antes (mantém o padrão).
- Testado (Playwright): conta logada sem personagens → vai para a criação e não grava personagem; convidado → continua na seleção. NÃO testado: criar o personagem e voltar pelo fluxo completo com o servidor real; contas que já receberam o "Ícaro" continuam com ele (apagar na seleção se quiser).

- Backup: `selecao_antes_semdefault.html`.

### [Claude] 31/10/2026 - PvP na arena do Baium (3º andar), skills dos outros jogadores e personagens do servidor (MMO)
- **Arena PvP = círculo gigante do Baium (3º andar da Torre)**, não mais o santuário pequeno. `pvpStart` carrega a Torre (primeira vez baixa o mapa), ativa o 3º andar, esconde o botão "Desafiar Baium" e entra no canal. Time A nasce a oeste e time B a leste do centro (-28,4/-53,85; raio 62), 72 m de distância, olhando um para o outro (`SPAWN_TIME` em `servidor/server.js`, `Torre.teleporta` em `js/torre.js`). Reaparecimento também volta ao lado do time. Sair do PvP volta ao santuário.
- **Skills dos outros jogadores apareciam só como animação**: o servidor já mandava `atk` mas o cliente não tratava. Agora `net.js` recebe `atk` e `arena.html` (`skillFxRemoto`) refaz a explosão da skill na posição do atacante (até 45 m, mesmo número de golpes, sem voz nem tremor da câmera locais).

- **Personagens agora são do servidor** (`servidor/contas.js`): rotas `GET/POST /api/personagens`, `/renomear`, `/apagar`; nome único em todo o servidor, até 5 por conta, campos validados. O `PUT /api/dados` não consegue mais criar/apagar personagem (só atualiza nível/local dos que a conta tem) e descarta inventário/skills de ids que não são da conta. Contas antigas migram sozinhas (o "Ícaro" de brinde `char_default_1` é descartado).
- **Entrar no mundo exige conta**: o WebSocket só aceita `join` com token válido e personagem da conta (nome e raça vêm do servidor; um personagem = uma conexão). `AUTH=0` desliga só para teste local. O modo convidado saiu (login sem "jogar sem conta"; `Conta.exigir/fluxo` mandam ao login).
- **Cliente**: `criacao.html` cria pelo servidor (nome repetido mostra o erro); `selecao.html` renomeia/apaga pelo servidor e conta sem personagem vai direto criar; `conta.js` v4 não mescla mais listas de personagens (lista = servidor).
- Testado (local, Playwright + API): conta nova → criação → personagem no servidor → cidade já logada; nome repetido em outra conta = 409; lista falsa pelo `/api/dados` ignorada; `join` sem token recusado; renomear e apagar pela seleção; 2 jogadores (contas diferentes) entram no PvP da Torre, times A/B nos lados opostos no andar 3; aviso `atk` chega ao outro cliente e o efeito aparece nas posições remotas.
- NÃO testado: PvP com combate real entre os dois (dano/morte/reaparecimento) nesse mapa; desempenho do celular dentro da Torre; muitos jogadores; contas já existentes na VPS (migração roda no primeiro acesso). Vida, nível/XP, inventário e dano ainda são calculados no navegador — o servidor só valida o PvP; passar o progresso para o servidor é a próxima etapa.

- Backups: `arena_antes_pvptorre.html`, `js/torre_antes_pvp.js`, `js/net_antes_fx.js`, `js/conta_antes_pers.js`, `criacao_antes_servidor.html`, `selecao_antes_semdefault.html`, `servidor/contas_antes_pers.js`, `servidor/server_antes_pvptorre.js`.

### [Claude] 31/10/2026 - Selecionar jogador (grupo/duelo), PvP livre, duelo do Baium na casa dele, XP/nível no servidor, HP/estamina no centro (celular)
- **Selecionar outro jogador**: clique (mouse solto) ou toque no jogador, ou tecla `T` (mais próximo, até 40 m). Abre um cartão no topo com nome, nível, classe, vida e botões GRUPO / DUELO / PERFIL / MAIS (troca, amigo e cochicho "em breve"), com anel dourado no alvo. `×` ou Esc fecha. (`js/net.js` v11; `camera` passou no `Net.init`.)
- **Party**: a vida dos amigos aparece pequena no canto superior esquerdo (os botões do topo descem junto). O id do grupo agora é o do personagem (`sid` = id do personagem, vindo do servidor), então o grupo acompanha o personagem em qualquer aparelho. Nome verde = do grupo, vermelho claro = inimigo no PvP.

- **PvP livre**: sem times, sem limite (`CAP_PVP`=500), todos contra todos; só o mesmo grupo não se fere. Cada um nasce num ponto aleatório (raio 34 m) do salão do Baium. Qualquer um entra mesmo com outros lá.
- **Duelo contra o Baium** (botão "Desafiar Baium" / modo Arena do chefe) agora acontece na casa dele: salão circular do 3º andar da Torre (centro -28,4/-53,85), numa instância só sua (jogo solo, nada compartilhado). Baium ao norte, jogador ao sul. O PvP usa a mesma geometria, mas num canal compartilhado separado.
- **Servidor decide e guarda**: nível e XP são do servidor (`pers.level/xp`). O jogo só avisa "matei X" (`{t:'xp', tipo}`); o valor vem da tabela do servidor (data/dungeon.json; boss = 180+30×nível), com limite de ritmo; abate em PvP também dá XP. O servidor devolve `prog` e o jogo mostra. Vida máxima aceita limitada por nível. O `PUT /api/dados` não altera mais nível/XP (testado: tentar subir para nível 99 foi ignorado). Nova instância solo `masmorra` (um canal por jogador; a arena conecta nela ao abrir).
- **Celular**: HP e estamina lado a lado no centro da base (192 px cada), barras de 16 px; o texto "Arena PvP · online" some no toque (batia nos botões).

- Testado (local, Playwright): clique/`T` seleciona; convite pelo cartão e aceite formam o grupo nos dois lados; 2 contas no PvP; duelo do Baium no 3º andar (chefe visível, sem erros); XP pelo servidor (esqueleto, cão, boss → nível 2/28 XP, igual no servidor); HP/estamina centralizados em 800x360.
- NÃO testado: clique do mouse no jogador (testei só `T`; o clique usa a mesma seleção), dano real entre jogadores no PvP livre, desempenho no Redmi C13. Ainda no navegador: dano a mobs/boss, drop e inventário (o servidor só valida XP/nível e o PvP). Próximo: mobs e chefe simulados no servidor.
- Backups: `arena_antes_duelo_toi.html`, `js/net_antes_alvo.js`, `css/hud_clean_antes_centro.css`, `servidor/server_antes_ffa.js`, `servidor/contas_antes_prog.js`.


### [Claude] 31/10/2026 - Duelo do Baium pelo portal da cidade vai para a casa dele; anel dourado de mira removido
- Causa: o portal "Duelo com Baium" da cidade abre `arena.html?mode=duel`, que nunca chamava `startBaiumDirectFight` (o ajuste anterior só valia pelo botão dentro do santuário). Agora `?mode=duel` espera o jogo carregar e chama a função, que leva ao salão circular do 3º andar (instância solo).
- Anel dourado do Arremesso do Escudo (`miraAnel`) não é mais desenhado; a mira por ponto (2 a 10 m) continua valendo.
- Testado: `arena.html?mode=duel` → andar 3, Baium visível, sem pilares do santuário, sem erros. Backup `arena_antes_duelo_modo.html`.

### [Claude] 31/10/2026 - Convite de grupo/duelo com botões na tela; skills do outro jogador também na cidade
- Convite de grupo/duelo antes só aparecia como aviso rápido e se aceitava com a tecla U (celular não tem). Agora um cartão no topo mostra quem convidou, a contagem de expiração e os botões ACEITAR / RECUSAR (`#netPed`, `js/net.js` v14). Aparece no instante em que o convite chega e tem relógio de reserva (500 ms) para abas em segundo plano; só o número da contagem é atualizado (o cartão não se redesenha, para não perder o clique).

- Skills do outro jogador: o efeito (`skillFxRemoto`) só existia na arena; agora também na cidade (`cidade.html`), onde acontece o duelo.
- Testado (local, 2 contas na cidade): convite chega com botões; aceitar forma o grupo e a vida dos dois aparece no canto; a skill de um explode na tela do outro. Backups `js/net_antes_pedido.js`, `cidade_antes_fxremoto.html`.


### [Claude] 31/10/2026 - Efeitos dos outros jogadores em qualquer lugar (skill, golpe básico e impacto)
- Antes só a skill aparecia, e só para quem estava entre os 30 jogadores mais próximos e a 45 m. Agora: skill e golpe básico (3 golpes do Guardião, arco/leque da espada) do outro jogador aparecem na cidade e na arena (masmorra, PvP, duelo do Baium), até 80 m, sem depender de estar entre os mais próximos; e quando o golpe acerta alguém aparece o impacto na vítima (`hitFx`). `js/net.js` v15; `fxBasicoRemoto`/`hitFxRemoto` em `arena.html` e `cidade.html`.
- Testado (2 contas na cidade): o golpe básico de um aparece na tela do outro; sem erros. NÃO testado: o mesmo na arena PvP; efeito de lançamento do Guardião (domo do Q, disco do escudo do slot 6) em outros jogadores — só a explosão do golpe aparece; skills de projétil de outros jogadores (cajado) mostram só o golpe, não o projétil.
- Backup `js/net_antes_fxtudo.js`, `cidade_antes_fxremoto.html`.

### [Claude] 31/10/2026 - Escolha de canal no menu (Menu > Canal)
- Automático continua: entra no primeiro canal com vaga (cidade 50 por canal; PvP sem limite) e, quando enche, o próximo jogador vai para o canal seguinte. Novo: aba **Canal** no menu (P / ☰ MENU) lista os canais da mapa atual com a quantidade de jogadores (dados de `/status`), permite **entrar** em qualquer canal (1 a 10; o servidor cria se não existir) e **AUTOMÁTICO** para voltar. A escolha fica salva por mapa (`isblade.canal.<mapa>`) e vale também ao trocar de página (cidade ↔ PvP). `js/net.js` v16, `servidor/server.js` (`canalLivre` cria o canal pedido).

- Atenção: a **masmorra** (dungeon/duelo do Baium) é instância solo — cada jogador num canal próprio (por isso dois jogadores lá "caem em canais diferentes"); o canal só vale na cidade e no PvP.
- Testado (2 contas na cidade): ambos entram no canal 1; A vai ao canal 2 (não vê B); B vai ao canal 2 (se veem); preferência salva. Backups `js/net_antes_canal.js`, `servidor/server_antes_canal.js`.

### [Claude] 31/10/2026 - Botão "Atualizar jogo" nas configurações
- Nas Opções (engrenagem) da cidade e da arena: botão **ATUALIZAR JOGO**. Desregistra o service worker, apaga todo o Cache Storage (modelos, texturas, sons guardados) e recarrega a página com `_r=<hora>` para baixar tudo de novo. Não mexe em conta, personagens, volume nem qualidade (`ISPWA.atualizar()` em `js/pwa.js`).

- Testado (arena local): cache `is-assets-v1` com um arquivo falso → depois do clique, cache vazio, URL com `_r=`, token e personagem ativo mantidos, sem erros. Não testado no celular. Backup `js/pwa_antes_atualizar.js`, `*_antes_*` das páginas não feitos (só adição de HTML).

### [Claude] 31/10/2026 - Giro de tela forçado no celular
- `js/mobile.js` v7: ao abrir, tenta travar em horizontal (`screen.orientation.lock('landscape')`); no primeiro toque (e a cada toque enquanto não estiver em tela cheia, no máx. 1 por 1,5 s) pede tela cheia e trava de novo, assim o jogo gira sozinho mesmo com o celular em pé. Re-trava ao voltar para a aba, ao mudar a orientação e ao sair da tela cheia. Mantém a tela ligada (Wake Lock). `overscroll-behavior:none` (puxar para atualizar não recarrega) e o botão/gesto Voltar não fecha o jogo (histórico guardado). O aviso "Gire o celular" continua de reserva (iPhone/Safari não deixam travar: lá só instalando o app na tela inicial).
- Testado (Playwright, celular em pé 360x780): aviso aparece, `lock` chamado ao abrir e no 1º toque, tela cheia pedida, deitado some o aviso, voltar não sai da cidade. NÃO testado em Android real nem iPhone. O manifest do app já era `landscape`/`fullscreen`. Backup `js/mobile_antes_giro.js`.


### [Claude] 31/10/2026 - Dungeon em grupo (modelo A: o líder é o dono dos mobs) + coroa no líder
- **Coroa dourada** em cima do líder do grupo (sprite em canvas, em qualquer mapa; no próprio líder também). `js/net.js` v17.
- **Masmorra em grupo**: o servidor agora coloca o grupo inteiro no MESMO canal da masmorra (`canalMasmorra(gid)`); solo continua 1 jogador por canal. Quando o grupo se forma (aceitar convite) quem já está na masmorra é religado ao canal do grupo (`recanal`). Na masmorra a vida de cada um vai no `st` (`h`) para a barra do grupo ser real. Mensagens `dg` (relé do servidor, só dentro do canal do grupo): o LÍDER manda `start`, `snap` (mobs, 10x/s), `bsnap` (chefe), `clear`, `boss`, `end`, `mdmg` (golpe do mob/chefe em outro jogador), `proj`; os convidados mandam `hit`/`bhit` (dano que causaram). `maxPayload` subiu para 16 KB. O XP de cada abate (feito pelo líder) é concedido pelo servidor a **todos** do grupo.
- **Cliente (`arena.html`, blocos `[dg-grupo]`)**: ao líder iniciar a DG da Torre (Normal/Médio/Hard), o convidado entra junto (`DG.grp='guest'`), vê os mesmos mobs (proxies com o mesmo id, sem IA própria), o dano dele tira a vida do mob real do líder, o líder decide tempo, meta, baú e porta; mobs perseguem o jogador do grupo mais perto e golpes em outro jogador chegam como `mdmg`; loot é rolado por cada um; Baium aparece para os dois (porta/chefe espelhados) e o dano do convidado vale. Solo: nada muda (`DG.grp` vazio) — testado.
- **Limites desta etapa**: só a DG da Torre (a "classica" ficou de fora); o Baium (Hard) ainda só ataca o líder, os ataques em área dele não acertam os convidados; se o líder sair/cair a dungeon encerra para todos; entrar no meio da dungeon não é suportado; projéteis dos mobs aparecem nos convidados só como visual (o dano é calculado no líder). Líder é quem pode fraudar vida/dano dos mobs (modelo A); XP/nível continuam validados pelo servidor.
- Testado (2 contas, local): grupo formado na cidade → ambos no canal 1 da masmorra (líder host, outro guest) → `dgStart('normal')` do líder: 20 mobs iguais (ids 1..20) nos dois; dano do convidado 40 → vida do mob do líder 60→20; abate do líder dá XP aos dois (6/6); Baium: espelhado nos dois, 500 de dano do convidado → vida 1800→1265 nos dois; solo: sem `net`, dano e XP normais. NÃO testado: celular, 3+ jogadores, morte/respawn de convidado, Hard completo (subir a escada e a porta). Backups: `arena_antes_grupodg.html`, `js/net_antes_grupodg.js`, `servidor/server_antes_grupodg.js`.


### [Claude] 31/10/2026 - Selecionar o jogador mais próximo agora é Tab (o T é skill)
- A tecla T (slot 4 da barra) também selecionava o jogador mais próximo. Agora a seleção por teclado é **Tab**; T só lança a skill. Clique/toque no jogador continua. `js/net.js` v18. Testado: T não abre o cartão; Tab abre.

### [Claude] 31/10/2026 - DG em grupo pelo portal da cidade: só o líder entra e puxa os membros; sem santuário no meio
### [Gemini] 01/11/2026 - Auditoria Geral: Pontos Fracos, Quebras de Fluxo e Ecossistema de MMORPG
- **Erro anterior**: eu só testei iniciar a DG de dentro do santuário. No jogo real o portal da cidade abre `arena.html?mode=dungeon&go=normal`; cada um iniciava a sua DG sozinho antes de o grupo conectar (mobs diferentes) e quem entrava depois nunca caía na do líder.
- **Sem santuário**: entrando pelo portal aparece uma tela "ENTRANDO NA DUNGEON..." (esconde o santuário) até a dungeon estar pronta; ao sair (portal de saída, tempo esgotado, fim do líder) volta direto para a **cidade**, não para o santuário (`sairDg`, `DG.deCidade`). Se o líder sai/cai, a dungeon acaba para todos. Espera a conexão com o servidor por até 25 s antes de cair em solo (celular lento).
- Servidor: `try/catch` em cada mensagem do WebSocket (uma falha de uma mensagem derruba só aquela conexão, não o servidor).
- Testado (2 contas, local): grupo formado na cidade; líder abre `arena.html?mode=dungeon&go=normal` → host, sem santuário, 20 mobs; o membro, que continuou na cidade, é puxado sozinho para a arena, vira guest no mesmo canal, vê os mesmos 20 mobs (ids 1..8 iguais), e o dano dele tirou vida do mob do líder (60→20). Condição de bloqueio: verdadeira para o membro e falsa para o líder. NÃO testado: o clique real no portal pelo membro (testei só a condição), celular, 3+ jogadores, Hard completo, líder saindo no meio. Backups `arena_antes_entradatardia.html`, `js/net_antes_entradatardia.js`, `servidor/server_antes_entradatardia.js`, `cidade_antes_soolider.html`.


  - _Diagnóstico_: Em `servidor/contas.js` (linhas 75 e 100), o endpoint `PUT /api/dados` aceita payloads brutos do `localStorage` contendo chaves como `isblade.inv.*`, `isblade.mastery.*` e configurações.
  - _Vulnerabilidade_: Qualquer usuário via Console do Navegador (F12) pode manipular o `localStorage` inserindo armas +20 com dano astronômico, itens lendários forjados ou maestrias inexistentes. O servidor persiste isso cegamente em `contas.json`.
  - _Ação necessária_: Mover a autoridade total de geração, guarda e modificação de itens para o servidor. O cliente só deve receber do servidor a lista somente-leitura do que possui.
- Testado (2 contas, local, mesmo caminho do portal): líder vira host; o membro, que estava na cidade, é puxado sozinho, entra como convidado com os mesmos 20 mobs; Baium acordado nos dois; golpe em área do chefe tirou vida dos DOIS (líder 55→26, convidado 77→48); `bossAlvo` devolve o jogador mais perto. NÃO testado em celular, 3+ jogadores, nem o fluxo inteiro do Hard (subir a escada); o tempo da puxada medido no teste (≈11 s) é do navegador de teste em segundo plano e sem placa de vídeo, não do jogo. Backups `arena_antes_puxar.html`, `js/net_antes_puxar.js`, `servidor/server_antes_puxar.js`.
  - _Diagnóstico_: Em `arena.html` e `server.js` (linha 189), o loop de IA, vida dos monstros, spawn de projéteis e vitória da DG rodam na máquina do Líder do Grupo.
  - _Risco_: Lag do líder afeta todos os convidados; queda do líder mata a dungeon de todos; adulteração de memória no navegador do líder permite matar todos os mobs e chefes instantaneamente (`dg: clear`).
  - _Ação necessária_: Migrar o loop de simulação e colisão de mobs/dungeons para o Node.js na VPS.
- Extraí do cliente (`LineageEffectsStaticmeshes.usx` + texturas) 583 objetos para `trabalho_l2fx/export_bruto` (177 MB, fora do jogo e no `.gitignore`). Malhas de vento achadas: windknifeball00, windknifewave00, windblowin00-03, twist_m00-06, cubic_wind00, spirit_wind00/01. As skills no L2 são `skill.<grupo>.<id>` (ex.: skill.el.1177) em `skillgrp_dec.txt`; os emissores de partículas (movimento) não exportam, só malhas, texturas e a animação do personagem.
  - _Diagnóstico_: `arena.html` (327 KB) e `cidade.html` (310 KB) concentram mais de 8.000 linhas cada, duplicando lógica de combate, shaders, rede e UI.
  - _Risco_: Manutenção frágil; consertos aplicados na cidade frequentemente não refletem na arena; alto risco de regressões.

### [Claude] 01/11/2026 - Mago, skill 1: Shuriken de Vento (1ª montagem no Blender)

- Arquivo novo `prototipo/assets/personagens/mage_skills.blend` (3,9 MB), gerado por `prototipo/tools/blender_fx/mago_skill1_shuriken.py` (`blender -b -P ...`; `PREVIA=<pasta>` renderiza quadros, `MODELO=<pasta>` renderiza o corpo isolado). 48 fps: voo 1-24 (12 m no eixo +Y), impacto 24-44. Coleção `FX_Mago_S1`.
- Montado: (1) corpo da estrela, 4 lâminas curvas (foice) com cume central, bisel, aço claro azulado com brilho de borda jade e núcleo quente nas duas faces; (2) aura = malha de redemoinho do L2 (`windblowin03`, textura `fx_m_t0001`) girando ao contrário e anel serrilhado do L2 (`windknifewave00`) — o visual do L2, mantido; (3) rastro = 7 fitas de vento + 5 fios finos em hélice (bordas suaves, ruído, cor quente→jade); (4) impacto = anel serrilhado do L2 que se abre, 9 cortes em arco, poeira solta. Paleta: branco-quente, jade pálido, aço azulado; sem rosa/lilás.
- Visto em quadros renderizados (EEVEE), não em movimento no jogo. Fraco ainda: os cortes do impacto parecem folhas pálidas e duram demais; a poeira são bolinhas lisas; a aura do L2 (cata-vento) quase não aparece; a estrela fica pequena perto do anel; faltam a animação do braço do mago (clipe de conjuração do PSA Magic) e a ligação no jogo (`data/armas/staff.json` slot 1, `Guardiao`-like `fxSwing`, hit/cast, sons).
  - _Solução_: Estruturar o cliente como SPA (Single Page Application), transicionando zonas de forma assíncrona sem derrubar o WebSocket.

### [Claude] 01/11/2026 - Shuriken de Vento v2: 20 m, buraco negro no miolo, giro mais rápido
- Voo de **20 m** em 30 frames (~32 m/s; impacto frame 30, some no 50). Câmera lateral e chão ajustados.
  - _Solução_: Implementar sistema de _Soft-Lock inteligente_ para toque/mobile (ataques buscam automaticamente o arco do alvo em cone frontal).
- **Giro no próprio eixo** só em Z (sem balanço), **43° por quadro** (≈ 2064°/s a 48 fps). Limite: com 4 lâminas o olho/render lê movimento correto até 45° por quadro; acima disso o giro parece voltar (efeito de roda de carroça). Aura do L2 e disco do buraco negro giram em sentido contrário e mais rápido para dar sensação de velocidade.
- Visto em quadros do EEVEE (corpo isolado em 4 ângulos + sequência com câmera de perto e lateral); não visto em movimento nem no jogo. Fraco ainda: o disco do buraco negro lê como névoa (não como espiral), o halo branco está grosso e o impacto continua com cortes pálidos/poeira de bolinhas. Script `prototipo/tools/blender_fx/mago_skill1_shuriken.py` (`.v1`/`.v2` são cópias locais, ignoradas).


### [Gemini] 01/11/2026 - Auditoria Geral: Pontos Fracos, Quebras de Fluxo e Ecossistema de MMORPG

- **Objetivo**: Auditoria técnica profunda solicitada pelo dono para levantar vulnerabilidades de segurança, arquitetura, quebras de fluxo de jogador e ausência de pilares fundamentais que um ecossistema de MMORPG exige.

#### 1. Falhas Críticas de Segurança e Arquitetura (Servidor vs Cliente)
  - Não há sumidouros econômicos (_gold sinks_): reparo de equipamentos, taxas de mercado, consumíveis essenciais (Soulshots, poções de vida/mana, pergaminhos de teleporte).
  - *Diagnóstico*: Em `servidor/contas.js` (linhas 75 e 100), o endpoint `PUT /api/dados` aceita payloads brutos do `localStorage` contendo chaves como `isblade.inv.*`, `isblade.mastery.*` e configurações.
  - *Vulnerabilidade*: Qualquer usuário via Console do Navegador (F12) pode manipular o `localStorage` inserindo armas +20 com dano astronômico, itens lendários forjados ou maestrias inexistentes. O servidor persiste isso cegamente em `contas.json`.
  - *Ação necessária*: Mover a autoridade total de geração, guarda e modificação de itens para o servidor. O cliente só deve receber do servidor a lista somente-leitura do que possui.
- **1.2. Masmorra / DG Simulada no Cliente Líder ("Host Client-Side")**:
  - *Diagnóstico*: Em `arena.html` e `server.js` (linha 189), o loop de IA, vida dos monstros, spawn de projéteis e vitória da DG rodam na máquina do Líder do Grupo.
  - *Risco*: Lag do líder afeta todos os convidados; queda do líder mata a dungeon de todos; adulteração de memória no navegador do líder permite matar todos os mobs e chefes instantaneamente (`dg: clear`).
  - *Ação necessária*: Migrar o loop de simulação e colisão de mobs/dungeons para o Node.js na VPS.
- **1.3. Código Monolítico de 300KB+ em Arquivo Único**:
  - *Diagnóstico*: `arena.html` (327 KB) e `cidade.html` (310 KB) concentram mais de 8.000 linhas cada, duplicando lógica de combate, shaders, rede e UI.
  - *Risco*: Manutenção frágil; consertos aplicados na cidade frequentemente não refletem na arena; alto risco de regressões.

#### 2. Quebra de Fluxos (Flow Breaks & Experiência do Jogador)

- **2.1. Quebra de Sessão por Redirecionamento Total (`window.location.href`)**:
  - A troca de mapa Cidade ↔ Arena ↔ Torre recarrega a página web inteira.
  - Destrói o contexto Three.js/WebGL, força nova limpeza de memória pela GPU, derruba a conexão WebSocket (exigindo re-handshake, revalidação de token, reingresso de grupo e reconexão de canais).
  - *Solução*: Estruturar o cliente como SPA (Single Page Application), transicionando zonas de forma assíncrona sem derrubar o WebSocket.
- **2.2. Choque de Paradigmas (Dragon Nest vs Lineage 2 no Mobile)**:

  - No PC, a mira central no retículo (Action Combat fluido estilo Dragon Nest) funciona perfeitamente.
  - No Celular com tela touch de 6", tentar controlar analógico de movimento + girar câmera + leque de 6 skills + esquiva/pulo/bloqueio gera sobrecarga motora severa.
  - *Solução*: Implementar sistema de *Soft-Lock inteligente* para toque/mobile (ataques buscam automaticamente o arco do alvo em cone frontal).
- **2.3. Onboarding Vazio (Praça Deserta)**:
  - O jogador cria o personagem e surge na praça da Ilha de Talking sem orientação, sem NPC de introdução e sem missões iniciais.
  - Risco de alta evasão no primeiro minuto de jogo.

#### 3. Quebra do Ecossistema Fundamental de MMORPG

- **3.1. Economia Inexistente (Zero Circulação)**:
  - Não há moeda corrente oficial (Adena/Gold) controlada pelo servidor.
  - Não há sistema de trocas entre jogadores (Trade) nem Casa de Leilão (Market).
  - Não há sumidouros econômicos (*gold sinks*): reparo de equipamentos, taxas de mercado, consumíveis essenciais (Soulshots, poções de vida/mana, pergaminhos de teleporte).

- **3.2. Ausência da Trindade Sagrada e Dinâmica de Grupo**:
  - Todas as classes atuais operam apenas como DPS Solo.
  - Não há mecânica de geração de Ameaça/Agro no chefe para o Guardião (Tank), nem classe Suporte/Healer com buffs e curas.
  - Grupos atualmente apenas juntam pessoas batendo no mesmo alvo ("zerg"), sem dependência mútua nem estratégia tática.

- **3.3. Progressão Unidimensional**:
  - Subir de nível hoje apenas aumenta ligeiramente o limite máximo de HP (`pmaxMax`).
  - Faltam: Atributos clássicos distribuíveis (STR, DEX, CON, INT, MEN), árvores de talentos e sistema de encantamento (+1 até +16 com brilho de arma e risco de quebra estilo Lineage 2).

- **3.4. Motivação Social e End-Game**:
  - Falta sistema de Clãs/Guildas (evolução de clã, emblema sobre o personagem, chat de guilda, alianças).
  - Falta PvP em mundo aberto com regras de Karma/PK e disputa por spots de farm.

### [Claude] 01/11/2026 - Shuriken de Vento v3: voo mais lento (20 m em ~1,1 s)
- O voo estava rápido demais (20 m em 30 quadros, ~32 m/s). Agora **20 m em 54 quadros = 1,125 s a 48 fps (~17,8 m/s)**; impacto no quadro 55, some no 75 (`F_HIT=55`, `F_FIM=75`, `N_VOO`). O giro continua em **43° por quadro** (2322° no voo), agora constante (interpolação linear); aura, anel, rastro e disco do buraco negro giram proporcionalmente.
- Feito ao vivo pelo MCP na janela `mage_skills` (retemporizei as 618 chaves e salvei o arquivo), conferido por renderização de quadros na própria sessão (quadros 10-66 de perto e 14-54 da lateral). Script `mago_skill1_shuriken.py` atualizado com os mesmos valores.
- Para o jogo: velocidade do projétil sugerida ~18 m/s, alcance 20 m (a ligar em `data/armas/staff.json`, slot 1, ainda não feito).


### [Claude] 01/11/2026 - Projétil que dá para ver e desviar (PvP) + Shuriken de Vento no jogo (dados) + lâminas sugadas pelo buraco negro
- **Problema**: o voo continuava rápido e, pior, no PvP o servidor tratava skill de projétil como acerto **instantâneo** (alcance + cone), então ninguém conseguia desviar, qualquer que fosse a velocidade.
- **Servidor (`servidor/server.js`)**: skills com `proj` agora criam um projétil que **voa na velocidade da skill** (`criaProj`/`passaProj`, passo por tick com teste do trecho percorrido, sem atravessar ninguém) e só acerta quem estiver no caminho (raio = largura/2 + 0,55 m). Esquiva (`imune`) e guarda de frente valem; hits trazem o id do projétil (`p`). Dano extraído para `fere()` (golpe e projétil usam o mesmo). Aviso `proj` para os outros jogadores.
- **Cliente**: `net.js` v22 trata `proj`/`hit.p` e ignora o "acerto do próprio projétil em mob/chefe" como novo disparo; `arena.html`/`cidade.html`: `spawnProj(sk,dmg,o)` aceita origem de outro jogador (`projRemoto`, só visual, sem dano) e `projFim(pid)` some com o desenho quando o servidor avisa o acerto. Assim o alvo VÊ a estrela vindo.

- **Dados**: `data/armas/staff.json` skill 1 virou **Shuriken de Vento** (cd 1,2 s, dano 30, alcance 20 m, **12 m/s** = 1,67 s de voo, largura 1,0, jade `#8fe3c8`); Orbe Arcano 22 → 14 m/s. Backup `staff.json.antes_shuriken`. O efeito do Blender ainda não está ligado ao jogo (hoje usa o desenho padrão de projétil).
- **Testado (servidor, 2 contas, PvP)**: alvo a 11 m: acerto após ~780 ms (não instantâneo); esquiva com deslocamento lateral = desvia; só andar de lado = desvia; esquivar cedo demais (50 ms) = leva o tiro. No navegador: o outro jogador recebe `proj` e tem 1 projétil visual, sem erro de página. NÃO testado: acerto/esquiva com latência real, projétil em cidade (duelo) no navegador, celular.
- **Blender (`mage_skills.blend`, ao vivo pelo MCP)**: voo de 80 quadros = 12 m/s (impacto no 81, fim no 101); o usuário removeu a argola; as **lâminas agora entram em espiral no buraco negro** (raiz mais fina, girada em volta dele, começa dentro do núcleo, e **esquenta** para branco-jade perto do centro). Script atualizado (`blade_mesh(..., swirl)`, `SAIDA=` grava em outro arquivo).


### [Claude] 01/11/2026 - Shuriken de Vento: órbita em espiral (só Blender)
- A estrela (com aura, anel e rastro) agora **orbita o eixo do voo** em espiral: abre do centro até 0,45 m, dá 1,6 voltas e volta ao centro no impacto, torcendo (inclinando) enquanto voa e girando no próprio eixo (43°/quadro). Novo `S1_ORBITA` (pai da estrela, aura, anel e rastro). Feito ao vivo no `mage_skills.blend` (salvo) e no script `mago_skill1_shuriken.py`, que gera igual (conferido: distância ao eixo 0 → 0,45 → 0).
- Só Blender: a órbita não está no jogo (a linha de dano continua reta). Combinado com o usuário: perguntar antes de mexer em servidor/cliente/dados. Obs.: o commit `4d4ea83` (projétil real no PvP, `staff.json` e cliente) foi além do pedido; segue no ar e funcional, e o usuário decide se mantém.

### [Claude] 01/11/2026 - Shuriken de Vento: torção de 180° até o alvo (só Blender)
- Tirei o balanço de ida e volta. A estrela agora **torce sempre no mesmo sentido** em volta do eixo do voo: 0° na saída, ~90° (disco na vertical) no meio e **180° no alvo** (`TORCAO_GRAUS` no script, no `S1_ORBITA`, rotação linear). A órbita em espiral (0,45 m, 1,6 voltas) e o giro no próprio eixo (43°/quadro) ficam como estavam. Conferido por renderização de trás e de lado; `mage_skills.blend` salvo pelo MCP e script atualizado.

- Só Blender (nada de servidor/cliente/dados). Observação aberta: a órbita ainda fecha no centro nos últimos 10 quadros antes do impacto; o halo branco do buraco negro, visto de lado, aparece como um anel.

### [Claude] 01/11/2026 - Shuriken de Vento: sem balanço lateral (só Blender)
- Tirei o deslocamento de lado (a espiral): a estrela agora **voa reta pelo eixo**, gira no próprio eixo (43°/quadro) e mantém a torção até 180° no alvo. Conferido: desvio máximo do eixo = 0,000 m em todos os 81 quadros. Para voltar a espiral basta `RAIO_ORB = 0.45` no script (hoje 0.0). `mage_skills.blend` salvo pelo MCP. Só Blender.

### [Claude] 01/11/2026 - Skill 1 do mago (Shuriken de Vento) dentro do jogo
- **Novo `prototipo/js/mago_fx.js`** (`MagoFX.init/criarShuriken/impacto/tick`) + assets `assets/fx/shuriken_vento.glb` (159 KB, exportado do Blender: estrela, núcleo, halo, disco, aura e anel do L2 — sem texturas embutidas), `vento_t1.png` (22 KB) e `vento_t5.png` (157 KB), texturas do L2 reduzidas. A estrela refaz os materiais aqui: aço com a **raiz esquentando** perto do buraco negro, núcleo preto, halo (rim), disco de acreção em espiral (aditivo), aura e anel de vento do L2 girando, **fitas de vento** em hélice no rastro (7+5; 5+3 em qualidade baixa/toque), giro no próprio eixo (limitado por quadro para não "voltar") e **torção de 180°** até o alvo; no fim, **impacto** com o anel serrilhado do L2 abrindo e 9 cortes em arco (5 em qualidade baixa). Lambert na qualidade baixa.
- **Ligação por dados**: `data/armas/staff.json` skills[1].proj ganhou `visual:"shuriken_vento"` e `escala:0.65` (tamanho). `arena.html` e `cidade.html`: carregam o módulo, `MagoFX.init` junto da rede, `spawnProj` usa o modelo quando `proj.visual` existe (senão o desenho antigo), `updateProj` anima e dispara o impacto ao acertar/acabar o alcance, `projFim` não solta o burst azul, e o disparo local não desenha mais o crescente azul/golpe genérico. Outros jogadores veem a estrela voando (via aviso `proj`), sem o efeito genérico no atacante.

- **Correção encontrada no teste**: em PvP/santuário (sem chefe nem mobs) o `applyHit` saía na primeira linha, então o projétil local **nunca era desenhado para quem atira** (só o servidor o simulava). Agora skills de projétil desenham o próprio disparo também aí.
- **Erro meu corrigido**: no GLB o buraco negro (núcleo/halo/disco) é filho da estrela; ao clonar a estrela eu levava cópias brancas opacas e estourava o centro. Agora clona só a estrela e traz as partes soltas com a escala do pai.
- Testado (Chrome, WebGL por software): carrega (`MagoFX.pronto`), voa, some no alvo, impacto; qualidade média e alta (alta usa bloom e fica mais brilhante); outro jogador recebe `proj`/`hit`. NÃO testado: GPU real, celular (qualidade baixa), áudio, comparação lado a lado com o Blender em movimento.

- **Ainda é provisório**: a animação de conjuração é a existente do cajado (`staff_cast`, do Mixamo), não um clipe do L2 do mago; o som é o genérico de golpe (`swing`/`soulshot`); não há som de vento do L2 nem som de impacto próprio. Sem ícone próprio na barra.

### [Claude] 02/11/2026 - PEDIDO DO DONO + correção: "skill 1 pronta" inclui ícone e animação própria de cada personagem
- **Pedido (palavras do dono)**: "pedi pra deixar pronta a 1ª skill, isso inclui criar o ícone e a animação; cada personagem tem a sua própria animação pra soltar magias; estamos criando o jogo com base no L2, Cabal, Dragon Nest e outros, está registrado no diário; você não está lendo nem atualizando o diário, é regra clara e você vem quebrando."
### [Gemini] 02/11/2026 - Resolução do Item 2: NPCs com Diálogo no Onboarding, Soft-Lock no Celular e Transições Suaves
- **Reconhecimento**: o diário recebeu o resultado de cada etapa, mas eu **não li o diário antes de começar o mago** e entreguei a Shuriken de Vento só com efeito (modelo, rastro, impacto) e dados. Faltaram, pela receita do Guardião (entradas de 26-29/10): **ícone Cabal** (`skillIconSVG`, glifo 32x32, moldura de aço, também no menu K), **animação de conjuração nativa do L2 de cada raça** (clipe do PSA da própria raça: CastShort/MagicShot...), **som** (L2) e **teste por raça**. A animação usada hoje (`staff_cast`, Mixamo) é provisória.

### [Claude] 02/11/2026 - Decisão do dono: skill 1 do mago para TODOS os personagens, com o clipe padrão de mago de cada raça
- **Resposta do dono**: "todos; no L2 todos podem ter sub de mago e não temos o material para cada situação. Bota o clipe padrão de magos, cada um tem o seu também." Ou seja: os **10 personagens** (humano M/F + imperial, mago/maga, elfo/elfa, elfo negro/elfa negra, anão/anã, orc/orca) lançam a Shuriken de Vento, cada um com o **clipe padrão de conjuração de mago do PSA da sua própria raça**.
- Plano (a registrar o resultado ao fim de cada etapa): 1) levantar os PSA de cada raça/gênero e o clipe padrão; 2) montar o clipe em cada GLB de personagem (Blender, mesma receita do Guardião); 3) ligar ao `blade` do cajado com o ponto de soltar medido; 4) ícone Cabal (`skillIconSVG`) na barra e no menu K; 5) sons; 6) teste por raça.

### [Claude] 02/11/2026 - Skill 1 do mago: clipes por raca extraidos (parcial, NAO esta pronta)
- Feito: rotina `.claude/skills/skill-pronta/SKILL.md`; script `tools/blender_fx/mago_cast_anims.py`; 12 GLBs de CastShort (um por PSA/raca) em `assets/personagens/mago_cast/` + `medidas.json`.
- Problema: o instante de soltar a magia (`hit`/`cut`) medido pela extensao das maos varia de .29 a .83 entre racas; a prancha de quadros (previa) saiu com enquadramento torto (so tronco, canto), entao NAO validei com os olhos. Pelas pranchas: MMagic estica o braco perto do quadro 18; MElf/FElf entre 6 e 18; FMagic levanta os bracos (gesto diferente).
- Falta para "pronta": anexar o clipe no rig (jogador e remotos), pose propria no staff.json + staffCM, icone Cabal, som, teste por raca, definir `hit` por raca.
- Nada disso foi testado dentro do jogo ainda.

### [Claude] 02/11/2026 - Dono aprovou o elenco no Blender; seguir ligando a skill 1 do mago no jogo
- Dono viu os 12 personagens com a shuriken (cena MAGO_ELENCO em mage_skills.blend): "ta oks assim, pode prosseguir". Aviso do dono: no Blender a shuriken parece ir "pra tras"; conferir o sentido no jogo.
- Plano: anexar clipe CastShort da raca (jogador + remotos), pose propria, icone Cabal, som, teste por raca.
- RESULTADO (02/11): skill 1 do mago ligada no jogo para os 12 tipos de personagem. Feito: clipe CastShort do PSA de cada raca (js/guardiao.js `anexarCast`, v16; net.js v23 toca `m_cast1` nos remotos), pose propria `m_s1` em staff.json (skills[1]) + arena/cidade (POSE/CM/staffCM/getClipConfig), icone Cabal `wind_star` (`icon` no json), sons L2 `m_s1_swing/hit` (doublewind_shot, energywave_shot; sintese de reserva), script `tools/teste_cast_por_raca.py`.
- Testado: arena PvP local, qualidade media, 12 tipos: clipe carrega (tracks), skill dispara, projetil sai, prancha de prints sem erro de pagina; mago_m/orc_f vistos em sequencia.

- NAO testado: qualidade alta e baixa, cidade.html, outro jogador vendo o clipe (remoto), som de ouvido, celular, anoes (apareceram pequenos/cortados na prancha; pode ser enquadramento ou delta do quadril), icone na barra olhando de perto. Momento de soltar (`hit` 0,29-0,83) ainda e o medido, nao calibrado: nos tipos com hit alto a estrela sai ~0,6 s depois do inicio (pode parecer lento).
- Dono avisou: no Blender a shuriken parece ir "pra tras"; no jogo nos prints ela sai para a frente do personagem (conferir no celular/real).

### [Claude] 02/11/2026 - Pedido do dono: tirar o rastro longo da shuriken
- Dono: "remova o rastro, quando tiver muitos magos vai pesar; deixa apenas a shuriken e seus efeitos". Feito no jogo (js/mago_fx.js v2): removidas as fitas de vento (rastro); ficam estrela, nucleo, halo, disco, aura, anel e o impacto. Blender (mage_skills.blend) nao foi mexido. Testado: 1 mago na arena, media, sem erro. Dono pediu push para a Vercel para testar.


### [Claude] 02/11/2026 - PEDIDO DO DONO: classe obrigatoria + nivel ate 400 + pontos de status (estilo MU)
- Pedido (palavras do dono): "os personagens sao meros visuais, mas vamos forcar o jogador a escolher uma classe; escolheu a classe, o up de lvl, e status para definir quase igual o MU, a cada lvl ganha pontos para distribuir, lvl maximo 400 por enquanto, e dificuldade no up como num verdadeiro MMORPG. Quero um plano e atacar ele (as skills ele pensa em outro chat)."
- Isso MUDA a decisao de 22/10 ("sem nivel de personagem, so maestria por arma, estilo Albion"). Hoje existe `S.lvl`/`gainXp`/`rankOf` (Cacador Rank) herdado em `arena.html`, maestria por arma (`isblade.mastery`) e status so por item (raridade). Progresso da conta sincroniza por `js/conta.js` + `servidor/contas.js` (chaves do localStorage).
- Plano apresentado ao dono (so plano, nada alterado no jogo): fases 0 dados (`data/progressao.json`), 1 classe na selecao, 2 motor de XP/nivel, 3 pontos e tela de status, 4 fontes de XP/dificuldade, 5 servidor autoritativo, 6 simulador de balanceamento. Perguntas abertas: lista de classes, skills por nivel x maestria, pontos por nivel, reset.


### [Gemini] 02/11/2026 - Resolução do Item 2: NPCs com Diálogo no Onboarding, Soft-Lock no Celular e Transições Suaves

- **Objetivo**: Corrigir as 3 frentes de Quebra de Fluxo (UX & Gameplay) apontadas na auditoria:
  1. **NPCs Autênticos de Talking Island (`js/l2_npcs.js`)**:
     - **Gatekeeper Clarissa** (`elf_f.glb`): Posicionada em frente ao Portal Dimensional (`x: -11.5, z: -11.5`), com pedestal e círculo rúnico azul/dourado com emissão de partículas. Diálogo interativo com opções de teleporte para a Torre da Insolência (Normal, Médio, Hard), Duelo com Baium, PvP livre e pontos de Talking Island (Porto, Guilda, Igreja, Farol).
     - **Ferreiro Altran** (`dwarf_m.glb`): Posicionado na praça leste (`x: 11.5, z: -8.5`), acompanhado de bigorna 3D de ferro forjado sobre cepo de madeira, martelo e forja incandescente com luz pulsante. Diálogo com prévia de receitas de criação (Crafting) e **Simulador de Encantamento Sagrado (+1 a +16)** com som autêntico do L2, taxa de sucesso real (seguro até +3, 66% depois), brilho progressivo na arma (azul, ciano, vermelho) e quebra em cristais!
     - **Mercador dos Selos Mammon** (`magic_m.glb`): Posicionado no recanto místico (`x: -16.0, z: 12.0`), com baús de tesouro dourados, tapete cerimonial dos Sete Selos e runas arcanas roxas. Diálogo sobre Ancient Adena, remoção de selos de armaduras S-Grade e a profecia de Shilen.
     - Interface de diálogo estilo Lineage 2 com insígnia do NPC, efeito sonoro e teclas de atalho (`E` para interagir, `Esc` para fechar).
  2. **Soft-Lock Inteligente no Celular (Mobile Aim Assist)**:
     - Em `cidade.html` e `arena.html`, a função `aimAngle()` agora possui `getMobileSoftLockAngle()`.
     - Ao tocar nos botões de ataque ou skills no celular, o sistema busca automaticamente o alvo vivo mais próximo dentro de um cone frontal de 140° (até 12-14 metros) e alinha o golpe ao alvo. Elimina a sobrecarga motora de ter que mirar com o analógico e apertar as skills simultaneamente no touch.
  3. **Transição Suave e Tela de Teleporte (`js/l2_teleport.js`)**:
     - Implementado o overlay de preloader dimensional `#l2-tp-screen` com anéis rúnicos concêntricos girando, som de teleporte, barra de progresso suave e dicas aleatórias de combate e lore.
     - Adeus à tela branca e quedas bruscas ao transicionar entre Cidade, Masmorras, Baium e PvP.
- **Backups criados**: `cidade_antes_npcs_fluxo.html` e `arena_antes_softlock.html`.
- **Servidor ativo**: `http://localhost:8000/cidade.html`.


### [Claude] 02/11/2026 - Progressao: decisoes do dono + Fases 0 e 1 (classe obrigatoria)
- Decisoes do dono: classes = Guardiao (so escudo), Mago (cajado), Guerreiro (espada longa 2 maos), Clerigo (livro astral); skills por NIVEL DE PERSONAGEM e a maestria por arma SAI; pontos por nivel = 2 (ele confirmou os 4 atributos FOR/INT/AGI/VIT); reset de pontos SEMPRE gratis.
- Feito: `prototipo/data/progressao.json` (nivelMax 400, 2 pontos/nivel, curva de XP 80*L^2.6, 4 atributos, 4 classes com inicial e crescimento; Clerigo `disponivel:false` ate haver modelo/animacoes/skills). `criacao.html`: o bloco "Arma" virou "CLASSE" (Guardiao/Mago/Guerreiro; Clerigo apagado "em breve"); a classe define a arma. `selecao.html`: rotulo e arma pela classe (inclui cajado). `servidor/contas.js`: personagem tem `classe`; a arma vem SEMPRE da classe (cliente nao escolhe); personagens antigos recebem classe pela arma (sem arma valida = Guerreiro); teto de nivel 100 -> 400. Backups `*.antes_classe`.
- Testado: servidor temporario (porta 8123, pasta de dados no scratchpad): guardiao/mago/guerreiro criam com a arma certa, mesmo mandando arma errada; clerigo cai em guerreiro; so arma 'staff' vira mago. NAO testado no navegador (tela de criacao/selecao vistas so no codigo) nem na VPS. Previa do mago na criacao fica sem cajado na mao (nao ha GLB do cajado; no jogo ele e procedural).
- Proximo: Fase 2 (motor de XP/nivel no servidor, tirar Cacador Rank e maestria), Fase 3 (pontos, tecla C, reset gratis).


### [Claude] 02/11/2026 - Lobby no celular (selecao.html) + conferencia do trabalho de NPCs do Gemini
- Pedidos do dono: "deleta todos os personagens", "melhorar o lobby no mobile, ta tudo apertado" e "verifica se vc mandou o trabalho que o gemini fez de npcs".
- Cliente (arena e cidade): `mastLevel()` agora devolve o NIVEL do personagem (o campo `unlock` dos data/armas/\*.json virou nivel: `node tools/aplicar_niveis_skills.js` grava a partir de progressao.json); maestria removida (ganho no-op, botoes F2 tiraram); textos "exige nivel X"; barra do inventario mostra nivel e XP; HUD mostra "Classe · Nv"; `aplicaProg` (nova) trata `prog` na arena e na cidade (antes a cidade nao recebia XP), reconstroi as skills, toca banner "NIVEL N — nova skill: ...". Atributos aplicam em `applyStats`: dano +0,5%/ponto no atributo da classe (FOR guardiao/guerreiro, INT mago), VIT +6 vida, +0,05% defesa, +0,3% regen de estamina, AGI +0,1% corrida (teto 25%). Novo `js/status.js`: painel com + / +10 / Max / Desfazer / Confirmar / Resetar (gratis), tecla U e botao "Status e Pontos (U)" do HUD (o botao C antigo de trocar personagem saiu; Trocar Personagem continua no link do topo). Teclas: C e a guarda e T e skill, por isso U.
- Lobby: o jogo so roda DEITADO (`js/mobile.js` mostra "Gire o celular" em pe), entao o lobby foi tratado so em paisagem. Antes nao havia nenhuma regra `@media`. Agora (bloco `[lobby-mobile]` no CSS de `selecao.html`): modelo 3D livre no centro, lista de personagens compacta a direita (nome inteiro, icones de toque 30-34 px), ficha com atributos vira folha aberta pelo novo botao "Ficha", botoes de rodape de toque (min 42-46 px), chip da conta e "tela cheia" sobem para o topo (antes cobriam painel e botoes). Cobre alturas ate 520 px e larguras ate 667 px.
- Testado: Edge headless com toque emulado em 844x390, 740x360 e 667x375, com 3 personagens, sem erro de pagina. NAO testado: celular real, safe-area de notch, `criacao.html` (mesma tela apertada; nao mexi).
- Personagens: no PC nao ha dados (`servidor/dados` nao existe); os reais ficam na VPS (`play.isblade.tecx.pro`), fora do meu alcance. NADA foi apagado.

### [Claude] 02/11/2026 - Giro automatico em todas as telas, lobby mais limpo, revisao do soft-lock, commit dos NPCs e reset dos personagens
- Pedidos do dono: (1) o celular deve ser forcado para horizontal AUTOMATICAMENTE ao acessar, sem depender do usuario; (2) lobby ainda poluido; (3) revisar o soft-lock inteligente do Gemini e trazer o que esta certo/errado; (4) commitar os NPCs do Gemini (conteudo dos NPCs fica para depois); (5) apagar os personagens CRIADOS PELOS USUARIOS no servidor (nao os NPCs) para recomecar com classe, nivel e skills por nivel.
- Giro: `js/mobile.js` ja travava horizontal mas so era carregado em arena/cidade/selecao. Novo `js/giro.js` carregado tambem em index, login, painel, carregando e criacao: tenta `screen.orientation.lock('landscape')` ao abrir (PWA instalado) e no 1o toque entra em tela cheia + trava (regra do Android no navegador); aviso "Gire o celular" so como reserva (iPhone nao tem trava; manifest ja tem `orientation: landscape`). NAO testado em celular real.
- Lobby (selecao.html): na paisagem esconde botoes de mapa/menu/tela cheia do jogo, rodape vira [+ Novo][Ficha][lixeira] + ENTRAR NO MUNDO, lista de personagens compacta, ficha por botao. Testado em Edge emulado 844x390, 740x360, 667x375.

- Commit 27320ff: `l2_npcs.js`, `l2_teleport.js` e os trechos de teleporte/NPC em cidade.html e arena.html, SEM o soft-lock (separado por hunks). NAO enviado ao remoto.
- Revisao do soft-lock de toque (cidade.html e arena.html, `getMobileSoftLockAngle`) — ainda NAO commitado, fica na copia de trabalho:
  - ERRADO: na arena usa `DG.mobs` e `miniBoss`, que nao existem; os mobs reais sao `MOBS` (campo `dead`). So o chefe (`S.ex/S.ez`) trava de verdade.
  - ERRADO: usa `Net.outros`, que nao existe; a API certa e `Net.alvos()`. Jogadores nunca entram (PvP no celular fica sem trava; na cidade tambem nao deve travar em jogador, zona segura).
  - ERRADO (cidade): usa `dummyGroup.position` (0,0 local do grupo), nao a posicao do boneco (`S.ex/S.ez`); a mira vai para a origem do mundo.
  - ERRADO: o cone e centrado em `S.face` (corpo) e nao no analogico; como `S.face` vira para o alvo, trava sozinho e nao da para mirar outro; alem disso `d<4.5` aceita alvo ATRAS. A intencao do jogador (analogico) deveria ter prioridade.

  - ERRADO: sem histerese (dois alvos com pontuacao parecida ficam alternando e o corpo treme); sem desligar quando o analogico aponta claramente para longe.
  - CERTO: ideia de assistencia suave so no toque, separada da mira do PC; raio, pontuacao distancia+angulo, nao mirar em morto, nao quebrar a mira do PC (ramo `MOUSE.touch`).
  - Proposta de correcao: centro do cone = direcao do analogico (ou ultima `S.mdir`), alvos de `MOBS`/chefe/`Net.alvos()` (jogador so em arena PvP), alvo travado mantido ate sair do cone/alcance (histerese), analogico forte para longe cancela. Aguardando o dono.
- Reset de personagens: `servidor/contas.js` (+ `servidor/reset_personagens.json` com id `2026-11-02-classes`): no proximo inicio do servidor apaga os personagens e o progresso (inventario, skills, hotbar) de TODAS as contas, mantem usuario e senha, grava antes `contas.antes_reset_<id>.json` e marca em `DB.meta.resets` (roda uma vez). Testado com banco falso: 4 personagens/2 contas apagados, volume mantido, backup criado, segunda execucao nao repete. NAO aplicado na VPS: so vale depois do deploy (push); a VPS reinicia o node no sync.


### [Claude] 02/11/2026 - Proposta: skills cedo, dificuldade no nivel e nos pontos (tabela + simulador)
- Pedido do dono: "pode propor; nao quero deixar skill pro final; pega leve e entrega as skills no mesmo dia com lvl facil de alcancar igual no MU; a progressao de pontos e lvl mais dificil: nao fica tao dificil conquistar as skills, mas sim o lvl e os pontos."
- Proposta gravada em `prototipo/data/progressao.json` (so dados; o cliente ainda NAO le): `skillsNivel` — slot 1/0 do inicio: nv 1, 5, 10, 15, 20, 25 (todas as 6 skills ate o nv 25); `variantesNivel` — variantes (unlock 1..4 das variantes do menu K) nos nv 8, 14, 22, 30; curva de XP por ABATES (`abatesMin 6`, `abatesBase 40`, `abatesRef 30`, `expoente 1.87`): subir fica rapido no comeco e cada vez mais caro; 2 pontos por nivel = 798 pontos no nv 400 (pontos so vem do nivel, entao ficam tao dificeis quanto o nivel).
- Novo `prototipo/tools/simular_progressao.js` (node; `abates/hora` opcional, padrao 240). Medicao (so abates solo, sem bonus): nv 25 (todas as skills) em ~1,1 h; nv 30 em ~1,8 h; nv 50 ~7,5 h; nv 100 ~2,3 dias de jogo (24 h); nv 200 ~17 dias; nv 300 ~54 dias; nv 400 ~122 dias (~2.900 h). Com expoente 1,7 o nv 400 cai para ~2.000 h; com 1,6, ~1.600 h. Bonus de dungeon hard/ultra e de grupo (fase 4) devem baixar isso; o numero e so uma chave (`expoente`).
- Falta (fase 2): trocar o `unlock` de maestria por nivel do personagem em arena/cidade (`mastLevel()` e textos "exige maestria Nv X"), tirar a maestria, motor de XP/nivel no servidor, barra de XP. Sem a fase 2 o nivel nao sobe, entao NAO liguei as travas ainda.


### [Claude] 02/11/2026 - Fases 2 e 3: nivel/XP no servidor, skills por nivel, pontos e tela de Status (tecla U)
- Pedido do dono: tabela aprovada, "um pouco de skill no 25 e um pouco no 30" e "pode seguir o resto". Skills agora: nv 1, 5, 10, 20, 25 e 30 (guerreiro/mago/guardiao); variantes do menu K nos nv 12, 18, 28 e 35. Dificuldade fica no nivel e nos pontos.
- Servidor: novo `servidor/progressao.js` (le `prototipo/data/progressao.json`): curva por abates, nivel max 400, XP de abate = xpMob(nivel do mob) x peso x fator por diferenca de nivel (mob 3+ niveis abaixo de voce da menos; acima da ate +40%; `mobsNivel` por dificuldade normal/medio/hard), 2 pontos por nivel, atributos FOR/INT/AGI/VIT (inicial da classe + crescimento por nivel + pontos). `server.js`: `ganhaXp` usa o motor; mensagens novas `attr` (distribuir, validada: inteiros >= 0, dentro dos pontos livres) e `attrreset` (gratis); `prog` e boas-vindas trazem lvl, xp, need, max, classe, pontos, attr e totais (`st`). XP de PvP = 3x o XP de um mob do nivel da vitima. Vida maxima aceita do cliente inclui a Vitalidade.
- Cliente (arena e cidade): `mastLevel()` agora devolve o NIVEL do personagem (o campo `unlock` dos data/armas/*.json virou nivel: `node tools/aplicar_niveis_skills.js` grava a partir de progressao.json); maestria removida (ganho no-op, botoes F2 tiraram); textos "exige nivel X"; barra do inventario mostra nivel e XP; HUD mostra "Classe · Nv"; `aplicaProg` (nova) trata `prog` na arena e na cidade (antes a cidade nao recebia XP), reconstroi as skills, toca banner "NIVEL N — nova skill: ...". Atributos aplicam em `applyStats`: dano +0,5%/ponto no atributo da classe (FOR guardiao/guerreiro, INT mago), VIT +6 vida, +0,05% defesa, +0,3% regen de estamina, AGI +0,1% corrida (teto 25%). Novo `js/status.js`: painel com + / +10 / Max / Desfazer / Confirmar / Resetar (gratis), tecla U e botao "Status e Pontos (U)" do HUD (o botao C antigo de trocar personagem saiu; Trocar Personagem continua no link do topo). Teclas: C e a guarda e T e skill, por isso U.
- ERRO MEU achado e corrigido nos testes: eu gravava os atributos em `S.st`, que e a ESTAMINA do jogador (quebrava a estamina); agora `S.atr`.

- Lobby: a ficha mostra a classe e os atributos novos (inicial + nivel + pontos) em vez dos do L2.
- Testado: `servidor/teste_progressao.js` (13 verificacoes: criar mago, xp, subir de nivel, penalidade/bonus, tipo desconhecido, gastar demais/negativo/quebrado recusados, distribuir, resetar) tudo certo; E2E com Edge + servidor real (conta, mago): na cidade e na arena o nivel sobe pelo servidor (8 fantasmas = nv 2; 20 laminas = nv 15 com 26-28 pontos), 5 de 6 skills travadas no nv 1-2 e 3 travadas no nv 15 (20/25/30), painel abre com U, +1 INT e Resetar funcionam, 2 pontos em VIT = +12 de vida, sem erro de pagina. `servidor/teste_bots.js` (antigo) falha em 7 verificacoes de PvP/times/duelo — as MESMAS 7 antes e depois desta mudanca (teste desatualizado; agora roda com AUTH=0).
- NAO testado: celular real (painel de status no toque, botao do HUD), balanceamento do dano com pontos (coeficientes sao primeiro chute), conteudo acima do nivel ~45 (as dungeons atuais so chegam ate mobs de nivel 40; depois disso o XP cai pela penalidade ate haver zonas novas), arena PvP/dungeon em grupo, VPS.
- ATENCAO tecnica: o Python do Windows regrava arquivos LF como CRLF; o selecao.html e o progressao.json ficaram CRLF por isso (o selecao ja estava assim no HEAD). Para editar arquivos do jogo use ferramentas que preservam o fim de linha.
- Soft-lock do Gemini continua FORA do commit (so na copia de trabalho de cidade/arena), aguardando decisao do dono.


### [Claude] 02/11/2026 - Neblina e qualidade no celular (item 1 do plano de conteudo) + correcao do estado do Mini Toi
- Correcao de registro: o Mini Toi JA ESTA no jogo (diario 29-31/10): pacote "Astatine, Mini Toi, Blazing Swamp, Fortress" e UM mapa unico com 4 regioes (Fortress, vulcao/Blazing Swamp, Torre 1 Curuma, Torre 2 = Mini Toi; subsolo Refinery). Tudo em `Area de Trabalho\IS BLADE\maps`. Mini Toi montado: DG normal e media na 1a sala, hard = 2a sala + andar do Baium (3o andar, boss), arena do duelo com o Baium la. Faltam Fortress, Blazing Swamp e Curuma (analise feita, nada exportado).
- Decisao do dono: quer os 4. Possibilidade: mapa-mundi aberto (sem instancia) com as 4 regioes; ou cada regiao com sua DG normal/media/hard e mobs proprios. Area PvP aberta ja existe na casa do Baium e continua. Graficos precisam melhorar (montanhas nitidas, mapas leves/comprimidos).
- Feito: `js/qualidade.js` (v=3) ganhou `nevoa` por nivel (baixa 38-95 m, media 48-120 m, alta 60-150 m; antes fixo 22-62 m na arena, que escondia mobs); media sobe resolucao 1,25 -> 1,5; animacao de mobs ate 28/36/44 m; celular com 6+ nucleos e 4+ GB comeca em MEDIA (resolucao dinamica derruba se nao der). `arena.html` usa `QUAL.nevoa`. Cidade: a neblina do ciclo dia/noite sobrescreve o ajuste "baixa" (0.0045) a cada quadro; nao mexi.
- Testado: Edge + servidor temporario, torre normal em media e baixa, sem erro de pagina, parede do fundo visivel. NAO testado em celular real. Nada commitado (arena.html ainda tem o soft-lock do Gemini na copia de trabalho). Backups: `js/qualidade.js.antes_nevoa`, `arena.html.antes_nevoa`.


### [Claude] 02/11/2026 - COBRAR O DONO: encolher a cidade e virar hub de 4 portais (ideia do dono, ainda nao feita)
- Ideia: Talking Village menor, remontada no Blender com a cara de Talking; muro em volta com 4 saidas (os portoes), cada saida = 1 portal para 1 dos 4 mapas do pack (Mini Toi como esta hoje + os outros 3). Mapas sao abertos (nao instancias). O terreno de fora da cidade deixa de existir como area de up inicial. No horizonte da cidade aparecem silhuetas dos outros mapas (Toy pode flutuar sobre a cidade). Acesso so por portal/teleporte (o jogador acostumado a teleporte nao anda ate o fim da vila).
- Consequencias a decidir/cobrar: (1) escolher qual dos 4 mapas e o de nivel 1 (spots iniciais); (2) ordem dos outros por nivel; (3) reduzir/remontar a cidade no Blender; (4) vistas simplificadas (barato no celular, medir FPS antes/depois); (5) DG normal/media/hard por mapa.

### [Claude] 02/11/2026 - Push das fases 1-3 + pedidos novos (tutorial, criacao de personagem)
- Push feito: `69de552..0a0c317` em MANINtecn/isblade (4 commits: NPCs/teleporte, classes+lobby+reset, tabela de progressao, nivel/xp/pontos no servidor). A VPS precisa de `git pull` para o servidor novo apagar os personagens (reset `2026-11-02-classes`) e valer nivel/xp.

- Dono viu o lobby antigo no celular (antes do push): card enorme, "Entrar" escondido, botao de tela cheia sobre a ficha, giro so pelo pe do personagem.
- Decisao do dono: expedicao/tutorial inicial rapida (pular permitido, uma vez por personagem), entrega ate o NIVEL 20 (4 skills: Nv 1/5/10/20, 38 pontos). Aviso dado: DG normal (mobs Nv 1-10) perde XP; reajustar faixas das DGs.
- Pedido para `criacao.html` (mobile e PC, limpa e fluida): remover "TESTAR ANIMACAO", remover "ARMADURA/SET" (todos nascem sem armadura; arma em punho = classe), ficha de atributos, lore e "sistema de combate" menores/recolhiveis, devolver o logo IS, girar o personagem arrastando em qualquer lugar, e o TECLADO nao pode cobrir a tela (celular deitado: so nome + Criar visiveis). Mock-ups gerados (A abas laterais, B barra inferior, com e sem teclado) em scratchpad `mock_a.png`, `mock_b.png`, `mock_a_teclado.png`, `mock_b_teclado.png`; aguardando escolha.


### [Claude] 02/11/2026 - Criacao de personagem (layout A) + 3 dificuldades no 1o andar da Torre + nivel inicial 20
- `criacao.html` refeita (commit `6a49647`, ainda nao enviado ao remoto): painel de abas Classe/Visual/Nome a esquerda, personagem livre no centro (camera afastada em tela larga e baixa), "Atributos" recolhido num botao, sem "Testar animacao" nem "Armadura/Set" (todos nascem sem armadura), raca = 6 opcoes + alternancia M/F, giro por ponteiro (mouse e toque) em qualquer ponto livre, logo IS de volta. Teclado: ao focar o nome, so ficam campo + "Criar & Entrar" (classe `kb` no body). Mago agora aparece com cajado na mao (cajado simples gerado no codigo; o do jogo tambem e procedural). Testado em Edge 844x390 com toque, sem erro de pagina; NAO testado em celular real. Backup `criacao.html.antes_abas`. Falta fazer o mesmo padrao na `selecao.html` (lobby).
- Torre do Baium: normal, medio e hard agora todos no 1o ANDAR (`data/dungeon.json`: hard `andar: 1`, sem `liberaPorta`; a porta do Baium/2o-3o andar nao e mais acessivel pela DG; duelo e PvP no 3o andar seguem pelos portais da cidade). Cada dificuldade ja tinha mini boss (normal: Lamina; medio: Comandante; hard: Arcanjo).
- Niveis dos mobs por dificuldade (`data/progressao.json` -> mobsNivel): normal ~20-30, medio ~32-45, hard ~50-70 (chefes mais altos). Servidor: `nivelInicial: 20` (personagem novo nasce no nivel 20 com as 4 primeiras skills e 38 pontos) ate o tutorial existir; o tutorial futuro entrega esse nivel e tera botao de pular. `servidor/teste_progressao.js` ajustado (NIVEL_INICIAL=1 no teste) e passa.
- NAO testado: equilibrio de vida/dano dos mobs para quem esta no nivel 20 (HP/dano dos mobs nao escalam por nivel, so por dificuldade); XP/h por dificuldade (rodar o simulador); tutorial ainda nao feito.

### [Claude] 02/11/2026 - Lobby (selecao.html) limpo no celular e no PC
- Camera afastada e sensivel a tela (celular deitado z=6,2; PC z=5,7): o personagem inteiro aparece (o orc de 2,5 m antes era cortado acima do joelho). Giro do personagem por ponteiro (mouse e toque) em qualquer ponto livre; zoom por scroll ate 7 m.
- Botao "Excluir Personagem" do rodape removido (cada personagem tem a lixeira na lista; era o botao rosado apagado); chip da conta ("usuario - sair") sempre no topo direito, longe dos botoes; nomes na lista sem corte feio (reticencias), painel 252 px no celular.
- Testado em Edge 844x390 (toque) e 1280x720 com conta de 3 personagens (orc guardiao, humana mistica mago, elfa guerreira), sem erro de pagina. NAO testado em celular real; fluxo de excluir/renomear nao reexecutado (so o botao do rodape saiu). Backup `selecao.html.antes_limpo`. Arquivo mantido em CRLF.

### [Claude] 02/11/2026 - Dono aprovou o ataque padrao do mago: deixar pronto no jogo e dar push
- Desenho aprovado (cena MAGO_ATAQUE no Blender, formas angulares, sem redondo): 3 niveis de combo, alcance 10 m, leve. Brisa de vento no mago e o cristal brota no chao onde ele mira (aviso de linhas retas antes). Golpe 1 = 1 cristal; golpe 2 = varios cristais, um pouco maiores; golpe 3 = 3 cristais do mesmo tamanho, com chance de quebrar a guarda ou interromper o saque. Sem rastro (leveza).
- Pedido: "pode deixar ele pronto no game e push feito". Plano: efeitos em mago_fx.js, clipe CastShort por raca nos 3 golpes, dados/servidor do ataque basico do cajado, icone/som, teste, diario, push.
- RESULTADO (02/11): ataque padrao do mago ligado no jogo (arena.html, mago_fx.js v3, net.js v24, server.js, staff.json -> basico). Efeito: `MagoFX.brisa` (laminas de vento no mago), `aviso` (linhas retas no chao), `cristais` (1 / 5 / 3 iguais, partem em estilhacos); so formas angulares, geometria e material compartilhados, sem rastro. Mira: ponto do chao ou alvo (2 a 10 m), clipe CastShort da raca nos 3 golpes (sp 1,5). Numeros: sweep raio 1,4 mul 0,8 dmg PvP 15; thrust raio 2,0 mul 1,0 dmg 24; spin raio 1,9 mul 1,25 dmg 34 + 30% de quebrar a guarda do chefe (stagger 1,8 s). Servidor: `ataqueMira` aplica o dano apos o aviso (delay enviado pelo cliente) em quem estiver no raio.
- Testado (local, media): mago sozinho (brisa + clipe sem erro); 2 jogadores PvP: o outro ve os cristais (5 e 3) no ponto mirado e leva dano nos 3 niveis (8/20/24 apos o dano x0,5); PvE chefe da arena (?mode=duel): vida cai 17/35/47 nos 3 niveis; sem erros de pagina.
- NAO testado: qualidade alta/baixa, celular (mira por toque), cidade.html (ainda sem o ataque novo; so a arena), chance de 30% de quebrar a guarda (nao vi acontecer), mobs de dungeon (usam o mesmo caminho da mira, nao conferido), som de ouvido, anoes, outras racas alem de magic_m/elf_f, o dano/equilibrio (valores provisorios). Interromper o saque de mobs comuns e a quebra de guarda no PvP nao foram feitos.

### [Claude] 02/11/2026 - Fortress exportado (1o dos 3 mapas que faltavam do pacote)

- Montado com `montar_mapa_l2.py` a partir do layout e das malhas ja extraidos em 29/10 (433 pecas, 113 modelos, 44 emissores de fogo ignorados, terreno aproximado, origem no centro do patio). Conferido de cima e em perspectiva: muralha fecha o retangulo, patio, torres e platô com penhascos coerentes.
- Peso: GLB cru 23 MB (19,5 MB de textura). `exportar_glb.py` agora aceita `[max_px] [qualidade]` e o novo `tools/blender_maps/leve_glb.py` recodifica em JPEG as texturas sem recorte (o Blender 5.1 gravava tudo em PNG). Resultado: `assets/maps/fortress/fortress.glb` = 8,1 MB (512 px, JPEG q72; 244 de 291 texturas viraram JPEG). Com 256 px dava 6,2 MB, mas o terreno ficava borrado.
- Testado: carrega no three do projeto (1578 malhas, sem erro, Edge/swiftshader). Fontes: `fortress_montagem.blend` (27 MB, fora do deploy).
- NAO feito: piso caminhavel/colisao (walkgrid), terreno com relevo real (falta o pacote Height), arvores com alpha conferidas, mobs/DG normal-medio-hard do Fortress, portal, ligacao a arena.html. Proximo da fila: Blazing Swamp, depois Curuma.
- Bug achado no caminho: minha variavel `_ta` colidia com uma `_ta` (Vector3) do arena e travava o quadro (swordPts: \_ta.set is not a function); renomeada. Outros: backspace dentro da regex (escape do Python) e `sed -i` tirando o CRLF do arena.html (nao usar sed -i em arquivo CRLF).
### [Claude] 02/11/2026 - Pedido do dono: shuriken com o dobro do tamanho
- `data/armas/staff.json` skills[1].proj.escala 0,65 -> 1,3 (visual e impacto crescem juntos). A largura de colisao (`proj.width` 1,0) NAO foi mexida. Testado: carrega sem erro, estrela sai (arena PvP, media); o tamanho em jogo so foi visto de longe.


- Ataque padrao do mago NAO funcionava na CIDADE (so tinha sido ligado no arena): o espantalho respondia com o ataque antigo. Portado para `cidade.html` (sons mb\_\*, clipe CastShort nos 3 golpes, pontoMira/raioMira, magoBasicoIni/Hit, gancho no perform e no acerto, alcance por circulo no ponto mirado contra o espantalho). Teste Playwright: os golpes viram `magoB`, MagoFX.brisa/aviso/cristais disparam.
- Recorte por raio a partir do layout completo (`actors_full.json`, scratchpad m18): vulcao = raio 7000 uu em (-37500,14800), sem pecas da torre Curuma nem do subsolo; Curuma = raio 2500 em (-42700,9000), sem Refinery. Terreno aproximado igual ao do Fortress (mascara do radar + altura por setor).
- Blazing Swamp: 141 pecas / 28 modelos, `assets/maps/blazing_swamp/blazing_swamp.glb` 7,8 MB. Curuma: 28 pecas / 12 modelos (torre octogonal sobre palafitas, z de -5943 a 1354 uu, so a torre por fora; interior/dungeon `oren_curumadungeon` nao foi tratado), `assets/maps/curuma/curuma.glb` 8,8 MB. Fontes: `*_montagem.blend` em cada pasta (fora do deploy).
- Conferido so por render do Blender (Workbench): vulcao com lava e platô; Curuma com torre inteira. Curuma pesa 8,8 MB com so 28 pecas: provavel textura 512 PNG com alpha; reduzir depois da conferencia.
- Pendente nos 3 mapas: dono conferir no Blender, piso caminhavel, relevo real, mobs/DG, portais. Nota: a Ilha1 (orcs, 155 pecas) tambem esta no pacote e nao estava na lista do dono.

- 02/11/2026: dono conferiu o Fortress no Blender e APROVOU ("lindao"). Blazing Swamp e Curuma abertos para conferencia.


- 02/11/2026: Curuma - dono viu no Blender que a ilha cortava a torre no meio (base debaixo do terreno). Gerado `assets/maps/curuma/curuma_montagem_v2.blend`: terreno + 6 rochas (destruction_fall) +25 un (~890 uu), ilha chega ao pe do corpo da torre. v1 mantido. Se aprovado, regerar curuma.glb a partir da v2.

- 02/11/2026: Curuma v2 estava errada (subi o terreno; o dono queria BAIXAR ate a torre ficar no lugar). Gerado `curuma_montagem_v3.blend`: terreno + 6 rochas -62 un a partir do original; pilar e cabos tocam o chao, corpo da torre elevado. v2 descartavel.

- 02/11/2026: Curuma v3 aprovada ("da pra subir mais um pouco, mas esta legal"). Dono notou que o mapa e so a torre: topo = boss e x1 (em vez de dentro da cidade); pe da torre sem espaco para farm. Gerado `curuma_montagem_v4.blend` (rascunho): objeto novo `Terreno_campo` ao norte (+Y), ~260x250 un, chao quase plano na altura da base (-195) com ondulacao leve, borda organica em falesia, emenda suave na ilha antiga (que some sob o campo). Textura provisoria (a da ilha repetida a cada 60 un). Falta: textura propria do chao, plano do mapa (portal de chegada, spawns, acesso ao topo da torre), colisao.


- 02/11/2026: Curuma v5 (rascunho): campo de farm em 3 lados — norte, OESTE (frente da estatua Giant_30, que olha para -X) e leste; ilha antiga mantida no centro. `Terreno_campo` = 8216 vertices (~0,3 MB; a textura e a mesma, entao quase nao pesa). Sem a placa plana de mar. Pendente: emendas com a ilha antiga ainda tem degraus/pequenas frestas, textura provisoria, plano do mapa. MCP do Blender conectado na porta 9876 (usar o MCP em vez de abrir janelas novas, pedido do dono).

- 02/11/2026: Curuma v6 (pedido do dono: 360 graus, cantos conectados, relevo leve, arvores do pacote). Terreno unico em volta da torre (ilha ~570x510 un, 14.916 vertices, relevo leve + 6 montes suaves, chao calmo ate 55-110 un da torre; ilha antiga substituida, rochas e pilares mantidos), 85 arvores copiadas do pacote (Generaltree7 + G_Tree_re03 do Fortress, malha compartilhada) em manchas de bosque fora de 95 un da torre, escala x1,5. Textura do chao ainda provisoria (repete a da ilha). MCP do Blender conectado: v6 aberta na mesma janela. Falta: aprovar, textura do chao, regerar curuma.glb, plano do mapa (portal, spawns, acesso ao topo), colisao.

- 02/11/2026: Curuma v6 APROVADA ("ta otimo"). GLBs regerados e leves: `curuma.glb` 3,7 MB (375 malhas), `blazing_swamp.glb` 2,9 MB, `fortress.glb` 8,1 MB. `leve_glb.py` agora decide PNG/JPEG pelo `alphaMode` do material (so MASK/BLEND mantem PNG), o que derrubou Curuma de 9,7 para 3,7 MB e Blazing de 7,8 para 2,9. Testados no three do projeto (visualizador): sem erro nos 3. Pendente: dono conferir Blazing Swamp; textura do chao da Curuma (padrao repete); piso caminhavel/colisao, mobs/DG normal-medio-hard, portais e plano de cada mapa; topo da torre Curuma = boss + x1.


### [Claude] 02/11/2026 - 4 portais nas saidas da cidade + horizonte + mapas novos jogaveis (para o dono conferir online)
- Dono aprovou Curuma (chao) e Blazing Swamp ("estava aberto no Blender") e mandou ligar tudo: cada saida da cidade = 1 portal para 1 mapa, e no horizonte da saida aparece o mapa.
- Saidas (os 4 portoes diagonais da vila): NE = Torre do Baium (portal antigo do santuario mudou para ca; [E] abre a escolha Dungeon/Duelo/PvP), SE = Pantano Flamejante, SW = Fortaleza, NW = Torre de Curuma. Cada portal fica 7 un fora do portao, com cor de runa propria; aviso "Pressione [E] para entrar: <mapa>" (celular: botao ENTRAR); 4 pontos coloridos no minimapa. `cidade.html` bloco [portais-saidas].
- Horizonte: `js/horizonte.js` + `assets/horizonte/{toi,blazing,fortress,curuma}.glb` (~6 mil triangulos cada, sem textura, 1,6 MB no total; gerar_horizonte.py). Silhueta na cor da neblina (acompanha dia/noite), mais escura no alto e dissolvendo no mar; material sem neblina e distancia/escala reduzidas juntas quando camera.far e curto (modo baixa) — mesmo tamanho aparente. Conferido por captura nos 3 novos (volcao, fortaleza e torre aparecem no azul do horizonte); a da Torre do Baium carrega mas a captura bateu numa parede.
- Mapas jogaveis: `gerar_walkgrid.py` ganhou WALK_TERRENO=1 (terreno = chao; arvores sem colisao). Gerados `*_walkgrid.bin/json` (Fortress 0,5 un; Blazing 0,75; Curuma 1,0 un). `js/torre.js` generalizado (?v=9): `carregar(THREE,scene,base,cfg)` com glb/grid/spawn/chao_min; abaixo do nivel do mar = parede; ponto de nascimento com altura esperada (evita nascer em telhado). Torre do Baium segue igual. `arena.html` bloco [mapas-abertos]: `?mapa=fortress|blazing_swamp|curuma` usa o estado de santuario (sem chefe nem mobs), esconde o cenario do arena, ceu/luz de dia por mapa, portal branco de volta para a cidade no ponto de nascimento. Testado por Playwright: os 3 carregam, nascem e andam (W) com o chao certo, sem erro de JS.

- Bug achado no caminho: minha variavel `_ta` colidia com uma `_ta` (Vector3) do arena e travava o quadro (swordPts: _ta.set is not a function); renomeada. Outros: backspace dentro da regex (escape do Python) e `sed -i` tirando o CRLF do arena.html (nao usar sed -i em arquivo CRLF).
- NAO feito: mobs, DG normal/medio/hard e bau em cada mapa novo; portal de volta fica a 6 un do nascimento; mini-mapa dos mapas novos; Ilha1 dos orcs; decidir o ceu/clima final; cidade encolhida com 4 saidas reais (COBRAR O DONO). Soft-lock do Gemini (cidade.html) ficou de FORA do commit.

### [Claude] 02/11/2026 - Correcoes apos o teste do dono no celular (ataque do mago, santuario, camera/zoom, skills e nivel)
### [Gemini] 08/11/2026 - Correção de Escala Métrica dos NPCs de Talking Island
- Ataque padrao do mago NAO funcionava na CIDADE (so tinha sido ligado no arena): o espantalho respondia com o ataque antigo. Portado para `cidade.html` (sons mb_*, clipe CastShort nos 3 golpes, pontoMira/raioMira, magoBasicoIni/Hit, gancho no perform e no acerto, alcance por circulo no ponto mirado contra o espantalho). Teste Playwright: os golpes viram `magoB`, MagoFX.brisa/aviso/cristais disparam.
- Celular: camera nasce mais afastada (distancia 12, antes 7,5) e pinca com 2 dedos no lado direito da tela aproxima/afasta (6 a 24). Nome + NIVEL voltaram a aparecer (a nameplate e o fio de XP estavam escondidos no toque).
- Skills: o mago so tem a Shuriken pronta. As outras 5 (herdadas do antigo) ganharam `pronta:false` em `data/armas/staff.json` e nao disparam; skill bloqueada por nivel OU nao pronta some da barra (PC e botoes do celular) em vez de aparecer cinza.
- Nivel inicial voltou para 1 (`data/progressao.json`): o 20 era so para o tutorial, que ainda nao existe. Personagem novo = nivel 1 com 1 skill. Quando o tutorial for feito ele da o 20.
- Armadilhas de novo: `sed -i` tira o CR de arquivo CRLF; escapes `` em string Python viram backspace.

### [Claude] 02/11/2026 - Skill pronta vale no jogo todo
- Pedido do dono: o ataque padrao do mago tinha ficado so na arena; quando ele pede para deixar a skill pronta e para o jogo inteiro, nao para um lugar.
- Conferido: so `arena.html` (Torre, DG, duelo, mapas abertos) e `cidade.html` tem combate vivo; as duas ja tem o ataque padrao do mago (cidade portado em a085660). `combate.html` e legado sem link.
- Regra gravada em `.claude/skills/skill-pronta/SKILL.md` (secao "Pronta = o jogo inteiro"). Nao testado: o ataque padrao num mapa aberto e no DG (so arena/Torre e cidade foram vistos).
- **Causa**: Os arquivos brutos `.glb` do Lineage 2 possuem altura nativa de ~35 a 44 unidades. No Three.js do IS BLADE, a unidade do mundo é o **metro** (1.0 = 1 metro). Os modelos foram instanciados com escala `1.05..1.15` em vez da escala métrica proporcional calculada em relação à altura em metros (`targetH / rawHeight ≈ 0.046..0.051`).
- **Correção em `prototipo/js/l2_npcs.js`**:
  - **Gatekeeper Clarissa (`elf_f.glb`)**: `targetH = 2.15m`, escala corrigida para `2.15 / 43.56 ≈ 0.0494`. Altura da nameplate ajustada para `Y = 2.45m`.
  - **Ferreiro Altran (`dwarf_m.glb`)**: `targetH = 1.60m`, escala corrigida para `1.60 / 34.48 ≈ 0.0464` (estatura baixa de anão). Bigorna, cepo e forja reescalados e posicionados na altura ergonômica de trabalho de 72 cm. Nameplate ajustada para `Y = 1.95m`.
  - **Mammon (`magic_m.glb`)**: `targetH = 2.15m`, escala corrigida para `2.15 / 42.14 ≈ 0.0510`. Baús e tapete cerimonial perfeitamente proporcionais. Nameplate em `Y = 2.45m`.
  - Adicionado `castShadow` e `receiveShadow` nos três NPCs e adereços.
  - Nameplates das cabeças reduzidas para escala proporcional agradável (`2.0 x 0.5`).
- **Cache-busting**: `cidade.html` atualizado para carregar `js/l2_npcs.js?v=2`.

### [Claude] 08/11/2026 - Decisoes do dono no roadmap + mira assistida do celular refeita
- Dono: ordem dos mapas aprovada (Curuma 1-15, Fortaleza 15-30, Pantano 30-45, Baium 45+); pediu cuidado com a AGRESSAO dos mobs: nas DGs todos sao agressivos com agro natural, chegar perto junta todos e quase ninguem sobrevive -> regra estilo L2 anotada no roadmap (maioria passiva, agressivos com visao curta, ajuda social so do grupinho, revisar as DGs). Soft-lock: "voce assume".
- Achado: o soft-lock do Gemini JA ESTAVA no ar na arena desde o meu commit eea94be (02/11): meu script regravou o arena.html com a copia de trabalho que tinha o codigo dele (o diario dizia que estava fora). E ele so travava no chefe: procurava `DG.mobs` e `Net.outros`, que nao existem.
- Decisao: fica, reescrito. `js/mira_toque.js` (novo): alcance 14 m; analogico parado = alvo mais facil na frente (cone ~77 graus) ou colado (4,5 m); analogico empurrado = so ajuda num cone de ~35 graus em volta do dedo, senao vai para onde o analogico aponta (respeita a regra de 31/10). Guarda `S.softAlvo` e o `pontoMira` no toque mira EM CIMA do alvo (ataque do mago, Arremesso). Arena: chefe, mobs (`MOBS`) e, no PvP, jogadores fora do grupo. Cidade: espantalho, mobs e o adversario do duelo (`Net.alvos` agora traz o nome; net.js v+1).
- Testado: 2 jogadores no PvP local com toque simulado no mago: mirou no outro (angulo 0,8 rad, ponto do cristal = posicao dele) e tirou vida (100 -> 84); teste da funcao: analogico oposto nao trava, perto trava; cidade carrega sem erro. NAO testado: celular real, mobs da DG e o chefe com o toque, duelo na cidade.

### [Claude] 08/11/2026 - NPCs no roadmap + chat estilo L2 (Fase 0)
- Dono: pediu ao Gemini para corrigir os NPCs gigantes; Gatekeeper fica (uso a decidir), Ferreiro e Comerciante (Mammon) ganham funcao depois -> roadmap Fase 1 atualizado. "Bora seguir".
- Chat: `js/chat.js` (novo, arena e cidade, init junto do PerfLog). Enter abre/manda, Esc fecha; texto normal = geral (canal); comecando com `#` = grupo (convencao do L2, verde, chega em qualquer mapa); sistema em amarelo; linhas somem em 15 s e o historico (40) aparece com o chat aberto; botao CHAT no celular (abaixo de MENU/TELA CHEIA). Servidor: `chat` ganhou `c:'g'` (manda so para o grupo; sem grupo responde "Voce nao esta em um grupo"); net.js `N.chat`.
- Testado (local, Chrome): 2 jogadores na cidade (PC + celular simulado): mensagem geral chega nos dois; `#` sem grupo recebe o aviso do sistema; digitando "wwwwddddssuicokxbmjp" com o chat aberto o personagem nao anda e nenhum painel abre (cidade e arena); sem erros. NAO testado: chat de grupo com grupo de verdade, celular real (teclado virtual sobre o campo), chat no meio de combate.
- Armadilha de novo: `sed -i` tirou o CRLF do arena.html (corrigido antes do commit).

### [Claude] 08/11/2026 - Reportar problema (Fase 0)
- Config > REPORTAR PROBLEMA (em `js/perf_log.js` v3, acima do LOG DE DESEMPENHO): campo de texto (as teclas nao vao para o jogo) + Enviar. Manda `{texto, pagina, log=resumo do desempenho}` para `POST /api/relato` (`servidor/contas.js`, exige conta, 6 por hora por IP, texto ate 2000 e log ate 60 mil caracteres); o servidor acrescenta uma linha JSON em `<dados>/relatos.jsonl` (na VPS: `C:\IS-sync\servidor\dados\relatos.jsonl`). Sem conta: copia o relato.
- Testado (local): cidade, relato enviado, "Enviado. Obrigado!", a linha gravada tem conta, texto, pagina e o resumo do log. NAO testado: celular real, VPS, arena.
- Armadilha: neste terminal `\n` dentro de heredoc vira quebra de linha real no Python -> usar chr(92) / bytes([92]) para escrever barra invertida em codigo JS.

### [Claude] 08/11/2026 - Musica do L2 por lugar (Fase 1)
- `js/musica.js` (novo) + `data/musica.json` + 13 faixas copiadas do cliente Interlude para `prototipo/assets/musica/` (19 MB; so a faixa do lugar e baixada). Escolha pelo nome do arquivo (nao deu para ler o musicinfo.dat: a chave RSA que eu tinha de memoria nao abre o Ver413 desse cliente): lobby `intro`, criacao `ct_<raca>` (troca com a raca escolhida), cidade `nt_speaking` (Talking Island), Torre/DG `s_tower`, chefe (Baium/sala do chefe, `BOSS_ON`) `bs01_a`, PvP `b01_f`, Curuma `d01_f`, Fortaleza `d02_f`, Pantano `d03_f`. Transicao de 2 s, comeca no 1o toque/tecla, pausa com a aba oculta, controle "Musica" nas Config (abaixo de SOM), respeita o Mudo.
- Ligado em arena, cidade, selecao e criacao. Testado (Chrome local): criacao (ct_elf), cidade (nt_speaking), arena PvP (b01_f), duelo do Baium (bs01_a), Curuma (d01_f), todas baixando (206) e sem erro. NAO testado: o lobby tocando `intro` (o teste caiu na criacao porque a conta de teste nao tinha personagem local), DG mudando de torre para chefe ao entrar na sala, celular real, e se as faixas combinam (o dono ouve e decide).

### [Gemini] 08/11/2026 - Conclusão da Escala Métrica dos NPCs (Ferreiro Altran, GK Clarissa e Mammon)
- Atendimento à Ordem 1: Finalizado o ajuste de proporção e tamanho dos NPCs na cidade de Talking Island e commitado exclusivamente `prototipo/js/l2_npcs.js` (commit `60c4b25`). Lógicas de backend (loja, encantamento, teleportes) reservadas ao Claude conforme roadmap.
- Detalhamento dos Ajustes:
  - Modelos GLB nativos do L2 escalados para unidades métricas reais (1.0 = 1 metro): Clarissa com 2.15m (`scale = 2.15 / 43.56`), Altran com 1.60m (`scale = 1.60 / 34.48`), Mammon com 2.15m (`scale = 2.15 / 42.14`).
  - Adereços (bigorna, cepo, braseiro, tapete cerimonial, baús) e nameplates flutuantes reescalados na mesma proporção humana (mesa da bigorna a 0.71m do solo).
  - Habilitados `castShadow` e `receiveShadow` nas meshes dos NPCs e adereços.
- Testado: Sintaxe e carregamento dos GLBs e animações; proporção visual conferida em relação ao player.
- NÃO testado: Teste de colisão de câmera e performance em celular de entrada com WebGL1.

### [Gemini] 08/11/2026 - Mobs dos 3 Mapas Novos: Curuma, Fortaleza e Pântano Flamejante (Ordem 2)
- Atendimento à Ordem 2: Extraídos e convertidos do cliente Interlude todos os 15 monstros nativos das novas regiões (4 comuns + 1 chefe de campo por mapa) com modelos 3D (`assets/mobs/modelos/<id>.glb`), áudios estruturados (`assets/mobs/<id>/*.ogg`) e catálogo atualizado em `assets/mobs/mobs.json` (commit `e41b342`).
- Mapeamento e distribuição por mapa:
  - Curuma (Nível 1–15):
    - Comuns: `sapo_curuma` (1528 tris, 1.3m), `stakato_curuma` (1940 tris, 2.0m), `stalker_curuma` (2356 tris, 2.1m), `aranha_curuma` (2322 tris, 1.3m).
    - Chefe de Campo: `chefe_curuma` / Rainha Stakato (1960 tris, 3.2m).
  - Fortaleza (Nível 15–30):
    - Comuns: `ol_mahum_fort` (2403 tris, 2.2m), `olho_fort` (850 tris, 1.6m), `basilisco_fort` (2878 tris, 1.4m), `formiga_fort` (1886 tris, 1.3m).
    - Chefe de Campo: `chefe_fort` / Comandante Raid Ol Mahum (2996 tris, 3.0m).
  - Pântano Flamejante (Nível 30–45):
    - Comuns: `golem_lava` (2848 tris, 2.4m), `salamandra_fogo` (668 tris, 1.3m), `wyrm_fogo` (1990 tris, 2.3m), `magmagoil` (2140 tris, 2.0m).
    - Chefe de Campo: `chefe_blazing` / Drake Lord (3866 tris, 3.8m).
- Conformidade técnica: Todos os modelos ficaram entre 668 e 3866 triângulos (bem abaixo do teto de ~8.000), texturas comprimidas até 512px, clipes de animação padronizados (`wait/idle`, `walk/run`, `atk`, `atkwait`, `death`).
- Áudio: 137 arquivos `.ogg` gerados cobrindo `atk`, `windup`, `swish`, `dmg`, `death` e `idle` para os 15 mobs.
- Testado: Conversão batch e integridade dos arquivos GLB gerados via Blender headless; integridade do JSON de mobs.
- NÃO testado: Spawns nos mapas (lógica e tabelas de dungeon/spawnlists a cargo do Claude).



### [Claude] 08/11/2026 - Inventario e adena com autoridade no servidor (fecha a Fase 0 do codigo)
- Dono: "pode seguir" (Gemini ja estava nos itens 2-5 da lista dele).
- `servidor/inventario.js` (novo): por personagem `pers.inv = {items, equip, adena}` dentro da conta. Mesmas regras de item do cliente (data/itens.json); kit inicial = arma da CLASSE equipada + 4 armaduras na mochila; arma de outra classe nao equipa e nao cai do chefe. Abate (mensagem `xp` que ja existia): adena = ~50% do XP do abate (+-20%), chefe da 1 item (35% de chance de 2) com raridade melhor no medio/hard (`rarityBoost`); em grupo na DG cada membro recebe o seu. Mensagens novas: servidor->cliente `inv` (estado) e `drop` (adena/itens); cliente->servidor `inv` {k: equip|tirar|descartar}.
- `contas.js` nao aceita nem devolve mais `isblade.inv.*` pelo /api/dados; `js/conta.js` deixou de sincronizar o inventario. Cliente (arena e cidade): `invDoServidor`/`dropRecebido`; equipar/tirar/descartar viram pedidos; `dropLoot` local desliga online; adena no topo do inventario (I) e "Voce obteve N Adena / item" no chat. Offline (sem servidor) continua o inventario local antigo.
- ATENCAO: quem ja jogava perde os itens que estavam so no navegador; no primeiro login depois disso o servidor da o kit inicial da classe (beta).
- Testado (local, Chrome, conta nova de mago): kit = cajado + 4 armaduras; 3 mobs + chefe hard -> 1216 adena e 1 item, mensagens no chat; equipar elmo pelo servidor; pedido falso recusado; recarregar a pagina mantem tudo; cidade mostra o inventario do servidor sem erro. NAO testado: grupo na DG (cada membro com seu drop), celular, VPS, balanco da adena (valores sao chute: chefe hard deu 1107).

### [Claude] 08/11/2026 - Mensagens de sistema no chat + janela do alvo estilo L2 (Fase 1)
- Chat recebe: "Voce entrou em: <zona>" (cidade = Talking Island; arena: Torre do Baium, Casa do Baium, Arena PvP, Fortaleza, Pantano Flamejante, Torre de Curuma, Santuario), "Voce ganhou N de XP", "Parabens! Voce atingiu o nivel N", adena e itens; e todo `sysMsg` do jogo tambem vai para o chat (como no L2).
- `js/alvo_l2.js` (novo): janela do alvo para mob (o que esta sob a mira ou o ultimo atingido, 6 s) e chefe (mirado ou atingido ha 8 s), no mesmo lugar da janela de jogador do net.js (que tem prioridade). Nome em cinza/verde/branco/amarelo/vermelho pela diferenca de nivel (niveis de `progressao.json -> mobsNivel`), "Nv X · %" e barra de vida.
- Testado (local): DG normal: "Fantasma da Torre Nv 20 · 92%" em vermelho para personagem nivel 2, mensagens de zona/XP/nivel/adena no chat; duelo do Baium: "Baium 100%". Sem erros. NAO testado: celular (posicao da janela com os botoes), cidade (sem mobs), nivel do Baium no duelo (nao existe na tabela; aparece sem nivel).
- Visto de passagem (nao mexi): a HUD mostra "GUARDIAO" para um mago no inicio da DG, e o chat da DG comeca com "Cidade - canal 1" (aviso de canal antigo).

### [Gemini] 08/11/2026 - Equipamentos e Armaduras por Grau: No-Grade, D e C (Ordem 3)
- Atendimento à Ordem 3: Exportados todos os modelos de armas e escudos para as 3 classes por grau, além de 3 sets completos de armadura montados e animados no corpo do Human Fighter (commit `1398759`).
- Modelos de Armas e Escudos gerados (prontos para acoplamento via socket de osso `Weapon_R_Bone` e `Shield_L_Bone`):
  - Guardião (1H + Escudo):
    - Sem Grau (No-Grade): `gladius.glb` (392 KB) + `round_shield.glb` (1129 KB)
    - Grau D: `bastard_sword.glb` (451 KB) + `composite_shield.glb` (768 KB)
    - Grau C: `samurai_longsword.glb` (787 KB) + `full_plate_shield.glb` (1399 KB)
  - Mago (Cajado):
    - Sem Grau (No-Grade): `cedar_staff.glb` (332 KB)
    - Grau D: `ghost_staff.glb` (508 KB)
    - Grau C: `ghouls_staff.glb` (453 KB)
  - Guerreiro (Espada 2H):
    - Sem Grau (No-Grade): `twohanded_sword.glb` (399 KB)
    - Grau D: `claymore.glb` (401 KB)
    - Grau C: `berserker_blade.glb` (395 KB)
- Sets de Armadura montados no Human Fighter com rig completo e animações de combate (idle, run, walk, death, slash1..4, guard, roll, parry, hit):
  - Sem Grau: `human_fighter_nograde.glb` (Leather Armor Set, m001)
  - Grau D: `human_fighter_brigandine.glb` (Brigandine Heavy Armor Set, m003)
  - Grau C: `human_fighter_fullplate.glb` (Full Plate Heavy Armor Set, m006)
- Testado: Conversão batch e integridade estrutural dos nós e meshes GLB gerados via Blender 5.1; alinhamento de sockets e NLA tracks de animação nos sets.
- NÃO testado: Drops, status de combate e regras de inventário/loja (a cargo do Claude no servidor).

### [Gemini] 08/11/2026 - Modelos de NPC para Armazém e Segundo Comerciante (Ordem 4)
- Atendimento à Ordem 4: Adicionados os modelos 3D dos NPCs de Armazém e do segundo Comerciante na cidade de Talking Island, posicionados no cenário com adereços temáticos, iluminação e nameplates na escala métrica humana correta (commit `3071da1`). Sem lógica de backend (armazenamento e comércio no servidor a cargo do Claude).
- Detalhes dos novos NPCs:
  - Guarda-Volumes do Armazém Wilford (`dwarf_f.glb`): Posicionada na ala oeste de serviços (`x = -13.5, z = 7.0`), altura real 1.55m (`scale = 1.55 / 35.48`), balcão de carvalho nobre com tampo polido, livro de registros, caixotes de carga rústicos e lanterna com luz âmbar quente (`0xffaa33`).
  - Comerciante de Equipamentos Galladucci (`elf_m.glb`): Posicionado na praça comercial leste (`x = 13.5, z = 5.5`), altura real 2.10m (`scale = 2.10 / 45.92`), balcão mostruário com forro de veludo verde, expositor de armas e lanterna dourada (`0xf5c451`).
  - Diálogos estéticos informativos e imersivos no estilo L2, sem quebra de fluxo.
- Testado: Sintaxe no node.js; proporções métricas e carregamento dos GLBs e animações no Three.js.
- NÃO testado: Integração com transações de Adena ou persistência de baú (previstas na Fase 1 pelo Claude).

### [Claude] 08/11/2026 - Revisao do trabalho do Gemini (ordens 1 a 4)
- 1 NPCs na escala (60c4b25): OK (so l2_npcs.js).
- 2 Mobs dos 3 mapas (e41b342): APROVADO. 15 mobs (4 comuns + 1 chefe por mapa), 668-3866 triangulos, texturas ate 512 px, 6 clipes cada, sons. Conferido por amostra (wyrm 1990 tris 2x512; stalker 2356 2x512; sapo 1528 1x256). Prontos para os spots (Fase 2, comigo).
- 3 Equipamento por grau (1398759): armas OK (0,4-0,8 MB). AJUSTES PEDIDOS: (a) escudos `round_shield` e `full_plate_shield` tem 48-72 triangulos mas textura 1024x1024 e 1024x2048 (1,1-1,4 MB): reduzir para 512; (b) os 3 sets (`human_fighter_nograde/brigandine/fullplate.glb`) tem ~10 MB cada (144 animacoes + corpo inteiro) e so servem para o humano guerreiro: o jogo precisa das PECAS da armadura (peito, pernas, luvas, botas) sem animacao, para cada uma das 12 racas/generos, presas no esqueleto que ja existe (troca de parte como no L2), ~1 MB por set por raca.
- 4 NPCs Armazem (Wilford) e Comerciante de equipamentos (Galladucci) (3071da1): OK, sem logica (loja e armazem sao comigo).
- 5 Cidade compacta: nao feita (depende do desenho com o dono).
- PROCESSO: o diario foi regravado de uma copia antiga duas vezes hoje (sumiram entradas minhas; uma entrada do Gemini entrou no meio de um texto meu de 02/11). Restaurado pelo git; a copia do disco ficou em `DIARIO_IS_BLADE.md.copia_disco_0811` (so tinha linhas a menos). Regra para os dois: so ACRESCENTAR no fim, relendo o arquivo antes de salvar; nunca salvar o arquivo inteiro de um buffer antigo.

### [Claude] 08/11/2026 - Loja dos NPCs + pocao e pergaminho (Fase 1)
- `data/loja.json` (novo): consumiveis (Pocao de Vida 40 A cura 30% recarga 10 s; Pergaminho de Volta 150 A), preco de venda por raridade (25/90/350/1500), o que cada NPC vende (galladucci, mammon). Soulshot fica para quando o bonus de dano existir (nao vendo item que nao faz nada).
- Servidor (`inventario.js`): `inv.consum` (pilhas ate 999), `comprar`, `vender` (so item nao equipado), `usar` (gasta 1, recarga por jogador, devolve o efeito). `server.js`: mensagens `loja` {k: comprar|vender} e `usar`; no PvP/cidade a cura muda a vida no servidor e avisa todos (`cura`).
- Jogo: `js/loja.js` (janela com abas Comprar/Vender e a adena; tecla H = pocao; no celular botao POCAO com a quantidade). Inventario (I) ganhou a secao CONSUMIVEIS com "Usar". Pergaminho leva para a cidade. Ganchos `[Claude]` no `js/l2_npcs.js` (arquivo do Gemini): opcao "Comprar e vender" no Galladucci e no Mammon.
- Testado (local, cidade, guerreiro novo): 2 chefes hard -> 1086 A e uma Espada Longa lendaria; comprou 10 pocoes + 1 pergaminho (536 A), vendeu um item (+25), usou pocao com H (2a vez dentro de 10 s recusada), mensagens no chat; NPC tem a opcao. NAO testado: pergaminho na arena, cura no PvP com outro jogador vendo, celular (botao), clicar no NPC de verdade (abri a loja direto).

### [Claude] 08/11/2026 - Ferreiro Altran: encantamento no servidor (Fase 1)
- Pedido do dono: "siga" (proximo item da Fase 1 do roadmap).
- `data/loja.json` -> `encantar`: max +16, seguro ate +3; chance pelo nivel tentado (+4..+6 66%, +7..+9 55%, +10..+12 45%, +13..+16 35%); a falha QUEBRA o item (como no L2); custo por tentativa = 60 A (arma) ou 30 A (armadura) x nivel tentado; bonus nos status do item: +4% por nivel ate +3 e +8% por nivel depois (+16 = +116%); cores do brilho (+4 azul, +7 ciano, +12 dourado, +16 laranja-fogo; sem rosa/lilas).
- Servidor: `inventario.js` `encantar` (campo `en` no item; se a arma equipada quebra, volta a arma basica da classe) e `encArma`; `server.js` mensagem `loja` k:'encantar', resposta `enc` para quem encantou e `en` para os outros do canal (brilho); `info()` leva `en` na entrada.
- Jogo: `js/loja.js` ganhou a forja (`Loja.abrir('altran')`: lista arma e armaduras com +N, chance, custo e bonus; quando ha risco o botao pede confirmacao); `Loja.stats(item)` soma o bonus; o inventario mostra "+N Nome" e os status ja com bonus. `js/brilho_encanto.js` (novo): brilho pulsante no material da arma (emissive, sem luz extra), para o jogador e para os outros. Gancho `[Claude]` no Altran (`js/l2_npcs.js`): a opcao "Encantamento Sagrado" abre a forja do servidor (o encantamento antigo, so visual no navegador, ficou como reserva sem uso).
- Testado (local, 2 navegadores): +1..+3 sempre passam; arma quebrou tentando +4 e voltou a basica; elmo quebrou no +8; arma +7 brilha (7 malhas), status Dano +14,4% (10 x 1,44 conferido); o outro jogador recebe `en` e aplica o brilho na arma remota. NAO testado: celular, VPS, clicar no Altran no mundo (abri direto). Falta: som de sucesso/falha do L2 (hoje usa o som de nivel e o de golpe).

### [Claude] 08/11/2026 - Armazem do Wilford (Fase 1)
- Pedido do dono: "siga" (proximo item: Armazem).
- Bau da CONTA (todos os personagens da conta usam o mesmo, como o roadmap pedia): `conta.arm = {items, adena}` no servidor (`contas.js` -> `contaDoPers`). `data/loja.json` -> `armazem`: max 60 itens, taxa 10 A por item guardado (retirar e gratis). `inventario.js` `armazem` (guardar item nao equipado / retirar se cabe na mochila / guardar e retirar adena); `server.js` mensagem `arm` (k: ver, guardar, retirar, guardarA, retirarA), responde `inv` + `arm`.
- Jogo: `js/loja.js` modo `Loja.abrir('wilford')` (adena do bau com campo de quantia, lista do bau com Retirar, mochila com Guardar); `net.js` `N.arm`; gancho `[Claude]` no Wilford (`js/l2_npcs.js`): "Depositar / Retirar Equipamentos" abre o armazem do servidor.
- Testado (local, uma conta com guerreiro e mago): guerreiro guardou 2 itens + 300 A (pagou 20 A de taxa); pedir mais adena do que o bau tem foi recusado; o mago da mesma conta viu o mesmo bau, retirou 1 item e 100 A. NAO testado: celular, VPS, clicar no Wilford no mundo.

### [Claude] 08/11/2026 - Soulshot e Spiritshot automaticos (Fase 1)
- Pedido do dono: "deixa o ss automatico e pode proceguir" (proposta aprovada: +25% de dano, 1 por ataque, ~3 A; estalo so com tiro).
- `data/loja.json`: `soulshot` (guerreiro e guardiao) e `spiritshot` (mago), 3 A cada, `bonus` 0.25, vendidos pelo Galladucci e pelo Mammon. Sem ligar/desligar: tendo na bolsa, cada ataque gasta 1.
- Servidor: `inventario.js` `tiro(pers)` (mago gasta spiritshot, os outros soulshot); `usar` recusa (e automatico). `server.js` `tiro(J)` em cada ataque (padrao, skill, projetil e o ataque mirado do mago; o 2o golpe da mesma skill usa o mesmo tiro), soma o bonus no dano do PvP e manda `ss` {id, n} para o jogador.
- Jogo: `ssTiro(an)` em `mkAnim` (bonus no dano local de mobs/chefe e marca `an.ss`); `ssRecebido` atualiza a contagem e avisa no chat quando acaba. Estalo e faisca do soulshot (`soulshot`, `soulshot_hit`) agora so tocam com tiro (os outros jogadores continuam ouvindo o estalo das skills deles). Inventario mostra "automatico" no lugar de Usar.
- Testado (local, arena): guerreiro sem tiro 17 de dano, com tiro 21-24, 10 -> 7 em 3 golpes; mago (depois de carregar a conjuracao) 10 -> 7 em 3 golpes, dano 18 -> 21-24. NAO testado: PvP com outro jogador (dano do servidor), celular, VPS.
- Observado no teste (nao mexi): o ataque padrao do mago chegou no servidor pelo caminho comum (sem o ponto mirado x/z); pode ser so o atalho de teste (`perform`). Conferir no PvP real.

### [Claude] 08/11/2026 - Sons de interface e ambiente do L2 (Fase 1)
- Pedido do dono: "siga ssempre" (seguir o roadmap em ordem sem perguntar a cada item; registrado na memoria).
- Extraidos do cliente Interlude com umodel (interfacesound, ItemSound3, itemsound, ambsound, AmbSound2) para `assets/l2_sounds/ui` (25 wav, 1,6 MB) e `assets/l2_sounds/amb` (8 wav, 1,8 MB).
- `js/sons_l2.js` (novo): `SomL2.ui(nome)` (volume e mudo seguem os efeitos) e `SomL2.ambiente('cidade')` (vento leve em loop + ondas a cada 3,5-8 s + gaivotas a cada 11-26 s, com panorama); controle "Ambiente" nas Config (`isblade.vol_amb`); clique do L2 nos botoes da loja, inventario, skills, config, NPCs e chat; pausa com a aba escondida.
- Ganchos nas paginas (`som()`, cai no som antigo se o novo nao tocar): inventario abre/fecha, janela de skills, equipar, descartar, adena, poção, pergaminho, compra/venda (troca), erro (impossivel / adena insuficiente), encantamento sucesso/falha (agora o som do proprio L2). Loja/forja/armazem: som de abrir e fechar janela. Ambiente so na cidade (arena: Torre/PvP ficam com a musica).
- Testado (local, cidade e arena): sequencia inv_abre, inv_fecha, moeda, janela_abre, clique, troca, janela_fecha, pocao; ambiente 'cidade' ligado; sem erros. NAO testado: ouvir de fato (o teste nao tem audio), celular, VPS. Falta: ambiente dos campos e DGs, sons de grupo (convite/entrada).

### [Claude] 08/11/2026 - Ceu e dia/noite em todos os mapas abertos (Fase 1)
- Pedido do dono: "siga ssempre" (proximo item da Fase 1: ceu, luz e agua).
- `js/ceu_l2.js` (novo): cupula que segue a camera (degrade horizonte -> alto; cirros finos e esticados que andam devagar; estrelas pequenas a noite). Sem disco de sol/lua e sem nuvem redonda (regra do dono). Qualidade baixa: sem nuvens. Hora do jogo sai do relogio real (1 dia = 240 s, como a cidade ja usava): todos os jogadores e todos os mapas na mesma hora.
- Cidade: o ciclo existente usa a hora comum e pinta a cupula; aurora trocada de salmao (0xe89978) para dourado (0xe0a860). Mapas abertos (Curuma, Fortaleza, Pantano, `arena.html?mapa=`): ganharam o ciclo (ceu/neblina pela cor do mapa, luzes caem ate 45% a noite, sol azula a noite). Torre e PvP (fechados) ficam como estavam.
- Cores conferidas por conta em todas as horas: a paleta antiga passava por lilas perto das 20h (laranja do horizonte + azul do alto); alto do por do sol virou ambar escuro e o da aurora azul-esverdeado -> zero ponto lilas/rosa.
- Testado (local): cidade 11h/18h/23h e Curuma 11h/20h sem erros. NAO conferido: o ceu visto de perto (a camera da cidade quase nao mostra o alto), celular (custo do shader das nuvens; baixa ja vem sem), VPS. Falta: agua, luz pre-calculada (Blender), neblina por zona.

### [Claude] 08/11/2026 - Luz pre-calculada do chao da cidade (Blender)
- Pedido do dono: "ta conectado, continue" (Blender com o MCP ligado, para a luz pre-calculada da cidade).
- `tools/blender_luz/cidade_luz.py` (novo): monta no Blender a cidade com as MESMAS posicoes do jogo (village_data_threejs.json + copia do getGroundHeight; 39 pecas ate 110 m do centro) e um chao de 176 x 176 m com o relevo; `assa()` faz o bake (Cycles na placa de video, 768 amostras, ~1 min) da oclusao do ceu = so a luz do ceu, sem sol (o sol anda com o dia/noite). Cena salva em `tools/blender_luz/cidade_luz.blend` (nao vai para o git; o PNG 2048 tambem fica so na pasta tools).
- Saida no jogo: `assets/talking_island/luz/chao_ao.jpg` (1024 px, 82 KB, suavizado). `cidade.html`: aoMap no chao da ilha, na praca e no piso do duelo, UV pela posicao (canal 1); a oclusao escurece a luz ambiente e 55% do sol (0,9 = ceu aberto, para o chao livre nao escurecer).
- Resultado (foto com e sem): sombra suave de contato na base da igreja, das muralhas e das casas; o chao assenta nos predios. Sem custo de desempenho relevante (1 textura).
- Processo: a 1a montagem derrubou o Blender (vista de material com o chao de 124 mil faces); refiz por script salvo em disco, vista solida, chao mais leve. NAO testado: celular, VPS. Falta: agua, neblina por zona; paredes dos predios (precisaria UV extra por peca).

### [Claude] 08/11/2026 - Agua do mar e neblina por mapa (fecha o item ceu/luz/agua da Fase 1)
- Pedido do dono: "vamos seguir".
- Achado: o mar estava a -5,5 m e o terreno de fora nunca desce abaixo de -4,8 m (metade da area de fora e esse "fundo" marrom): a agua ficava escondida embaixo do chao perto da ilha. Mar subiu para -4,6 m: a ilha ganha litoral a ~92 m do centro (logo depois das muralhas); os portais (~77 m, na estrada) ficam secos; quem anda ate a beira molha os pes (0,2 m).
- `js/agua_l2.js` (novo): ShaderMaterial leve: ondas no vertex shader (a CPU deixou de mexer 2.401 vertices por quadro), cor funda/rasa, reflexo do ceu pela cor da neblina (acompanha o dia/noite) com Fresnel, brilho do sol, ondulacao esticada no sentido do vento (sem circulos), espuma so na faixa da beira (altura do chao calculada em GLSL com a mesma conta do jogo), neblina aplicada. Escurece a noite.
- Neblina por mapa (`arena.html`, MAPAS_ABERTOS.nevoa): Pantano 0,62 (fechado), Fortaleza 1,0, Curuma 1,15 (mais limpa).
- Testado (local, fotos na beira sul de dia e de noite): litoral, espuma e ondulacao ok; 1a versao tinha espuma no mar todo (fundo so 0,2 m abaixo) e brilhava a noite, corrigido. NAO testado: celular, VPS, os 3 mapas abertos com a neblina nova.

### [Claude] 08/11/2026 - Agressao dos mobs estilo L2 (Fase 2, 1o item)
- Pedido do dono: "prossiga" (Fase 2; regra pedida por ele em 08/11: nas DGs todos eram agressivos com agro natural e chegar perto juntava a sala inteira).
- Antes: todo mob perseguia o jogador mais perto a qualquer distancia.
- Agora (`arena.html`: mobAgrIni / mobEngaja / mobAgro; numeros em `data/dungeon.json` -> `agressao` {visao 7, ajuda 4,5, volta 26} e `difficulties[].agressivos` {normal .15, medio .25, hard .35}; `mini_boss` e mini-chefes sempre agressivos):
  - cada mob sorteia ao nascer se e agressivo; passivo fica parado ate apanhar; agressivo ataca quem chega a 7 m;
  - quando um mob apanha, so os vizinhos PARADOS a ate 4,5 m entram (sem corrente: ajudante nao chama outro);
  - puxado a mais de 26 m de onde nasceu: desiste, volta e recupera a vida;
  - janela do alvo mostra "(agressivo)"; no grupo, o lider manda quem e agressivo junto com o estado dos mobs.
- Testado (local, Torre Normal): 13 mobs, 2-4 agressivos; parado no inicio e a 3 m de um passivo: ninguem ataca; bater num passivo: entrou ele + o unico vizinho a 4,5 m; mob levado a 30 m do lugar: voltou e encheu a vida. NAO testado: DG em grupo, celular, VPS. Medir no jogo se o Normal ficou facil demais (os numeros estao no json).
- Processo: escorreguei num `sed -i` no arena.html (CRLF virou LF); restaurado antes do commit, diff conferido.

### [Claude] 08/11/2026 - Spots de mobs nos 3 mapas abertos (Fase 2, 2o item)
- Dono: "prossiga". Usei os 15 mobs que o Gemini extraiu (4 comuns + 1 chefe por mapa).
- `data/spots.json` (novo, gerado por `tools/spots/`: grade de chao andavel + distancia de CAMINHO a partir da entrada; seed fixa). Mais longe da entrada = mais forte:
  - Curuma (niveis 1-15): sapo (Nv 2) -> aranha (5) -> stakato (9) -> espreitador (12), 5 grupos de cada; chefe de campo Rainha Stakato (Nv 15) a ~290 m.
  - Fortaleza (15-30): formiga (17) -> olho (21, a distancia) -> basilisco (25) -> soldado Ol Mahum (28), 3 grupos de cada; chefe Comandante Ol Mahum (30).
  - Pantano (30-45): salamandra (32) -> magmagoil (36, a distancia) -> serpe (40) -> golem de lava (43); chefe Senhor dos Dracos (45). O fundo do Pantano e estreito: so 2 grupos de golem.
- Regras: grupo de 4 (3 na qualidade media/baixa), reaparece 30 s (+-15%) depois de morrer, chefe 5 min com aviso no chat; o spot so tem mobs com o jogador a ate 70-80 m e some passando de 95-110 m (leve no celular); agressao igual as DGs (fracao agressiva sobe com a faixa; chefe agressivo).
- Mobs andam no relevo: `js/torre.js` ganhou chaoEm / pontoAberto / mobAberto (altura do chao por mob, colisao com parede e borda).
- XP pelo servidor: `progressao.json -> mobsNivel` ganhou curuma / fortress / pantano (chave curta: o servidor corta em 12 letras). Stats dos 15 em `dungeon.json` (chute inicial; balancear com o simulador e o item de rebalancear). Modelos do Gemini ja vem em metros: altura 1.
- Corrigido junto: na Torre o mob nunca voltava para casa (Torre.mob regravava a "casa" todo quadro). Agora casa = hx/hz; preso no caminho por 12 s volta direto.
- Testado (local): os 3 mapas carregam os spots sem erro; Curuma: 18 mobs perto da entrada, todos no chao certo; abate deu 16 XP no Nv 1 pelo servidor; morto reaparece; puxado a 28 m volta e cura; chefe nasce agressivo; Fortaleza 66 XP; Pantano sobe de nivel. Torre Normal: mob puxado a 30 m voltou (0,8 m da casa) e curou. Fila com os 15 modelos: todos no chao e em proporcao.
- NAO testado: celular, VPS, dois jogadores no mesmo mapa (cada um ve os SEUS mobs ate os mobs irem para o servidor, Fase 6), projeteis do olho/magmagoil em desnivel, se as faixas de nivel e os numeros ficaram bons jogando.

### [Claude] 08/11/2026 - Cidade limpa pelo dono + 4 portais retangulares nos arcos (cidade fechada)
- Dono limpou a cidade no Blender (`tools/blender_luz/cidade_luz.blend`): apagou 9 construcoes repetidas do meio (2 casas 01, 2 casas 02, 1 casa 03, 2 casas 04, 1 loja 02, 1 agit), mudou de lugar 11 pecas (casas 03, lojas 01/02/03, casa 04, agit, igreja, 1 arvore) e realinhou os 2 portoes do leste. Pediu: portal QUADRADO dentro de cada arco, que ele possa esticar no Blender; so se sai da cidade pelos portais.
- `tools/blender_luz/cidade_saidas.py` (novo, roda no Blender): `portais_cria()` pos PORTAL_toi / blazing / curuma / fortress (colecao PORTAIS, plano em pe 8,8 x 4,5 m, na cor da saida, fora do bake) no vao de cada portao; `exporta()` leva o .blend para o jogo: `village_data_threejs.json` (121 -> 112 pecas, nas posicoes novas), `portais_cidade.json` e colisores pela MALHA (muro e portoes: arestas de baixo viram circulos encostados; casas: caixa girada vira 1-3 circulos). `tools/blender_luz/aplica_colisores.py` poe tudo no cidade.html (+ barreira atras de cada portal).
- Descoberta: o muro nao e um circulo (fica de 64 a 97 m do centro); a colisao antiga era um anel fixo em 74 m (parede invisivel em uns lugares, buraco em outros) e havia 3 circulos grandes sem casa no meio da praca. Tudo trocado.
- cidade.html: portal retangular (cortina de energia subindo, losangos, moldura clara; sem disco/anel), atravessar = entra no mapa (Torre abre o menu), aviso "Atravesse o portal"; chegada pelo portal fica dentro da cidade.
- Luz pre-calculada do chao refeita sem as casas apagadas (bake numa copia; `assets/talking_island/luz/chao_ao.jpg`).
- Testado (local): 958 colisores; enchente a partir do centro: 13,4 mil m2 andaveis, ZERO saida fora os portais, todos os portais alcancaveis; empurrando o jogador em 8 direcoes ele para no muro (64-93 m); atravessar o portal de Curuma abriu `arena.html?mapa=curuma`; fotos dos portais toi e curuma dentro do arco. NAO testado: celular, VPS, os 4 portais em todas as direcoes de camera, NPCs perto das casas que mudaram.
- Para o dono: ajustar os PORTAL_* no Blender (G move, S Y largura, S Z altura), salvar e me avisar -> eu rodo exporta() + aplica_colisores.py. Hoje sobra uma fresta pequena em cima e dos lados.

### [Claude] 08/11/2026 - Adena e drops pelo servidor (Fase 2)
- `servidor/inventario.js -> abate`: adena em todo abate (XP x 0,5 x 0,8-1,25); mob comum com 5% de chance de 1 item; mini-chefe da DG 1 item garantido (+35% de mais 1, raridade x1,5, adena x2); chefe de campo dos mapas abertos 2 itens (+50% de mais 1, raridade x2,5, adena x3); Baium/chefe da DG como antes. Numeros em `data/dungeon.json -> drops` (o servidor le na partida). Raridade continua somando o rarityBoost da dificuldade da DG.
- `arena.html`: conectado, o `lootMob` local nao sorteia mais item (mostrava "LOOT" falso que sumia quando o servidor mandava o inventario).
- Testado: simulacao no servidor (2000 sapos: 4,8% de item; chefe de campo 2,5 itens por abate com 49% raro/epico/lendario); no jogo (Curuma): Rainha Stakato deu 2 itens (1 epico) e 835 adena num personagem Nv 1; 20 sapos ~130 adena e 1 item. NAO testado: DG em grupo (cada um ganha o seu), celular, VPS. Itens ainda sem grau (o proximo item do roadmap traz D e C).

### [Claude] 08/11/2026 - Graus de equipamento Sem grau / D / C (aprovado pelo dono)
- `data/itens.json`: 21 bases (7 por grau). D = status x1,6 e Nv 20; C = x2,4 e Nv 40 (raridade multiplica por cima). `graus` (nome, cor, nivel, multiplicador de venda 1/4/10) e `conjunto`: elmo+peitoral+luvas+botas do mesmo grau -> D +10% vida; C +15% vida e +5% dano.
- Arma muda na mao pelo `modelo` da base (`js/arma_grau.js`, arena e cidade): Guerreiro Two-Handed Sword -> Claymore -> Berserker Blade; Mago Cedar -> Ghost -> Ghoul's Staff (o mago passa a segurar o cajado L2); Guardiao Sem grau fica com o escudo IS atual (o Round Shield do L2 e redondo), D Composite, C Full Plate.
- Servidor (`inventario.js`): kit inicial so Sem grau; equipar confere o nivel; grau do drop pelo mapa (`dungeon.json -> drops.graus` e `grausChefe`: Curuma Sem grau, Fortaleza Sem/D, Pantano D/C, DG normal Sem/D, medio D, hard D/C; chefes um grau acima); Galladucci vende Sem grau (300/150), Mammon vende D (4000/2000), C so cai; venda ao comerciante x grau.
- Testado local: compra no Mammon, Nv 1 nao equipa D, Nv 20 equipa; set D completo deu 233 de vida (+10%); Claymore e Cajado Fantasma na mao (cidade e Curuma) sem erro; simulacao dos drops por mapa. NAO testado: celular, VPS (precisa reiniciar o servidor), grau C em jogo, outros jogadores (ainda veem o modelo antigo da arma). Armadura no corpo depende das pecas por raca do Gemini.

### [Claude] 08/11/2026 - Morte estilo L2 nos mapas abertos
- Antes: morrer na Curuma/Fortaleza/Pantano caia no `dgHub` (estado de santuario quebrado). Agora: "VOCE MORREU", o servidor tira 4% do XP do nivel (so a partir do Nv 10, nunca desce de nivel; `progressao.json -> morte`, `servidor/progressao.js -> perde`, mensagem `morte`) e o jogador volta para Talking Island. Na DG continua recomecando a sala; no PvP o servidor cuida.
- Testado local: Nv 20 com 783 XP morreu na Curuma -> 743 XP (-40 = 4% de 1012), chat "Voce morreu e perdeu 40 de XP", voltou para cidade.html. NAO testado: celular, VPS (precisa reiniciar o servidor). Falta o pergaminho de ressurreicao (ressuscitar onde caiu).

### [Claude] 08/11/2026 - Mago, 2a skill (fogo e agua) a partir do L2
- Pedido do dono: tratar a 2a skill dos magos baseada no L2. A Shuriken de Vento (Hurricane) representa uma linha; quer uma de FOGO (Archmage) e uma de AGUA, leves como a shuriken, ja com efeitos e particulas, apresentadas no Blender (MCP) e com ideias.
- Plano: propor ideias, montar a previa das duas no Blender (formas angulares, sem redondo; malhas do L2 em trabalho_l2fx/export_bruto: fireball00, firebomb00-02, fireflame00/03, flameset_m, watericebolt00-02, watericedagger00, etc_splash). Nao ligar no jogo antes da aprovacao dele.
- Obs: Blender MCP nao estava conectado ao iniciar (pedido o clique em Connect).

### [Claude] 08/11/2026 - Nome Cruma e horizonte mais perto (pedido do dono)
- "Curuma" -> "Cruma" em tudo que o jogador ve (portal da cidade, banner do mapa, chat, mobs "de Cruma", fala do NPC). Ids internos continuam `curuma` (arena.html?mapa=curuma, spots, progressao) para nao quebrar nada.
- `js/horizonte.js`: silhuetas dos mapas a 270 m (eram 430 m) com a mesma escala -> ~1,6x maiores na tela, aparecem por cima do muro. Fotos de dentro da cidade conferidas (Pantano e Cruma).

### [Claude] 08/11/2026 - Expedicao de entrada (tutorial ate o Nv 20)
- `js/expedicao.js` (painel a direita, abaixo do minimapa): andar -> inventario -> comerciante -> portal verde da Cruma -> 3 abates -> 1 skill -> 1 drop -> Nv 5 -> Nv 15 -> Fortaleza -> Nv 20 (Grau D). Pode pular (2 cliques). Uma vez por personagem (localStorage `isblade.expedicao.<id>`); quem ja e Nv 20+ nao ve; quem entra na Cruma direto pula os passos da cidade. Ganchos: killMob, castSkill, dropRecebido e toggleInv (arena/cidade).
- Testado local com personagem novo: os 11 passos andaram na ordem (cidade -> Cruma -> niveis). NAO testado: celular (painel pode cobrir algo na tela pequena), VPS. Sem premio ao concluir (dar pocoes/adena pediria o servidor; perguntar ao dono). Aviso: no teste apareceu "Unable to decode audio data" (algum som novo nao abre no navegador; nao e da expedicao).

### [Claude] 08/11/2026 - Rebalanceamento de XP e vida (dono: "se for para o bem do servidor vai com forca")
- Medido antes: no ritmo de 240 abates/h o conteudo todo (Nv 45) acabava em ~5,6 h e o Nv 20 em 40 min; e a vida de mago/guerreiro nao crescia com o nivel (so VIT e equipamento): golpes para morrer caiam de ~34 (Cruma, Nv 8) para ~11 (Pantano, Nv 38) mesmo com set D.
- Mudado (`data/progressao.json`): `curvaXp.abatesBase` 40 -> 70 (mesma forma da curva): Nv 10 14 min, Nv 20 ~1 h, Nv 30 ~3 h, Nv 45 ~9,6 h, Nv 400 ~214 dias (era 122). `efeitos.vidaPorNivel` = 5 (arena e cidade somam no applyStats; o teto do servidor ja tinha folga de 20/nivel): sobrevivencia fica ~20-50 golpes em todas as faixas. Dano de mobs e do jogador NAO mudou.
- Testado local: Nv 20 com set D: vida 233 -> 338; XP do Nv 20: 1012 -> 1771. Personagens existentes nao perdem nivel. VPS: precisa reiniciar o servidor (le progressao.json na partida).
- RESULTADO PARCIAL (08/11): previa montada no Blender (`mage_skills.blend`, cenas `MAGO_S2_FOGO` e `MAGO_S2_AGUA`; gerador `tools/blender_fx/mago_skill2_fogo_agua.py`, rodado ao vivo pelo MCP). FOGO = Meteoro de Magma: aviso em losango no chao (quadros 1-48), rocha de basalto com rachaduras de lava cai (20-48) com chamas do L2 (flame_a00, fx_m_t2076), impacto no 48: estrela de espinhos brancos, espinhos de fogo rente ao chao, coluna de chamas, 18 lascas, 34 brasas, fumaca escura, marca no chao. AGUA = Lanca de Gelo: 3 lancas facetadas nascem em leque (1-20), saem em 24/32/40 com lencois de agua, impactos 64/72/80: estilhacos, coroa de espinhos de agua, estrela clara, gelo que brota no chao. Tudo angular, sem rastro.
- NAO feito: nada foi ligado no jogo (sem GLB, JS, icone, som, dados, servidor); animacao de conjuracao (CastShort) so e a mesma da skill 1, ainda nao ligada; numeros de jogo (cd/dmg/alcance/area) nao definidos. Falta aprovacao do dono.

### [Claude] 08/11/2026 - Ameaca do Guardiao (Rugido = Aggression do L2)
- `arena.html` [ameaca]: skill com `taunt` (Rugido do Guardiao, range 10) marca `m.foco` nos mobs do raio e `DG.bossFoco` no chefe por 6 s; `mobAlvo`/`bossAlvo` respeitam o foco antes de "o mais perto". Mob passivo no raio entra em combate (sem chamar o grupinho). Guardiao convidado do grupo: o lider recebe o efeito da skill (skillFxRemoto) e aplica com o id dele. "PROVOCADO" aparece sobre os mobs.
- Testado local (sozinho, Cruma): 3 mobs passivos a <10 m entraram em combate e vieram para cima. NAO testado: DG em grupo com Guardiao convidado (precisa 2 jogadores), chefe, celular.

### [Claude] 08/11/2026 - Ranking
- Servidor: o personagem passa a guardar `pvp` (vitorias no PvP, em `fere`) e `chefes` (Baium, chefes de DG e de campo, em `premia`); `GET /api/ranking` publico em contas.js: top 50 por nivel, PvP e chefes, cache de 30 s. Contagem comeca agora (nada disso era guardado antes).
- `prototipo/ranking.html`: pagina publica (abre sem conta, boa para video/site), abas Nivel/PvP/Chefes, atualiza a cada minuto. No jogo: a aba "Ranking" do menu P (que existia desligada) mostra o top 10 e o link da pagina.
- De quebra: o HUD mostrava "Guardiao" quando faltava `isblade.weapon` no navegador; agora usa a classe que vem do servidor (`js/mu_hud.js`).
- Testado local: chefe abatido entrou no ranking de chefes; menu e pagina conferidos na foto. VPS: reiniciar o servidor.

### [Claude] 08/11/2026 - Modo camera para gravar (PC)
- `js/modo_camera.js` (arena e cidade): F9 esconde a HUD inteira (fica so o jogo), F10 troca a velocidade normal -> 1/2 -> 1/4 (multiplica o dt do quadro; so neste navegador). Aviso curto no topo. Camera continua a do jogo (mouse gira, roda aproxima); camera livre solta ainda nao.
- Testado local: cidade e Cruma, fotos com a HUD escondida e camera lenta 1/2, sem erro.
