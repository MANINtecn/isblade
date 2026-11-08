# ROADMAP IS BLADE — rumo ao BETA DEMO (versão 2)

Escrito por Claude em 08/11/2026, depois de verificar o jogo (código, dados, servidor, assets) e ler o diário inteiro de 26/10 a 08/11.
Substitui a versão de 22/10 (que era do tempo do jogo solo e só PC; continua no git, commit `cb5c680`).

**Objetivo:** abrir um **Beta Demo** que pareça Lineage 2 por dentro (imersão) e jogue como Dragon Nest (ação), no PC e no celular pelo navegador, com conteúdo para segurar o jogador e para render vídeo no TikTok.

**Como usar:** seguir as fases NA ORDEM (cada uma deixa o jogo melhor para mostrar). Quem fizer marca `[x]` e registra no `DIARIO_IS_BLADE.md`. Skill/sistema só está "pronto" quando funciona no jogo inteiro (arena e cidade), no PC e no celular (regra `skill-pronta`).
Legenda: `[ ]` a fazer · `[~]` em andamento · `[x]` feito · **P** pequeno (horas) · **M** médio (1 a 3 dias) · **G** grande (semana) · quem: (Claude) (Gemini) (Dono).

---

## 1. Onde estamos (verificado em 08/11)

**Já funciona:**
- Jogo no ar (Vercel) + servidor Node na VPS com HTTPS (`play.isblade.tecx.pro`), religando sozinho se cair (vigia no IS_Sync, tarefas sem limite de 72 h — 08/11).
- Contas e personagens no servidor; criação de personagem (6 raças × M/F) e lobby limpos no PC e no celular.
- Classes obrigatórias: Guardião (escudo), Mago (cajado), Guerreiro (espada 2 mãos); Clérigo previsto. Nível até 400 no servidor, XP por abate, 2 pontos/nível em FOR/INT/AGI/VIT, tela de Status (U), skills por nível (1/5/10/20/25/30).
- Multiplayer: canais, PvP livre na casa do Baium, party com vida no canto, DG em grupo (líder puxa), duelo, efeitos dos outros jogadores em todo lugar.
- Mapas: cidade (Talking Island) com 4 portais e o horizonte dos mapas; Torre do Baium (DG normal/médio/hard + Baium + PvP); Fortaleza, Pântano Flamejante e Curuma jogáveis (só o terreno).
- Combate: CC estilo Dragon Nest (`cc.js`), guarda, esquiva, pulo, corrida; Guardião com 6 skills prontas; Mago com Shuriken de Vento + ataque padrão de cristais; 12 tipos de mob com modelo e som do L2.
- Celular: botões em leque com editor de layout, giro forçado, qualidade gráfica automática, log de desempenho (Config > LOG DE DESEMPENHO).

**O que a verificação mostrou que falta (com a prova):**
- **Silêncio:** não existe música nenhuma no jogo (busca por música/BGM nos HTML e JS = 0). Só efeitos sonoros.
- **Chat:** o servidor já aceita e repassa chat (`server.js`, mensagem `chat`), mas não há campo para digitar no jogo.
- **Cidade sem função:** os 3 NPCs (Gatekeeper, Ferreiro, Mammon em `js/l2_npcs.js`) são de enfeite: o encantamento +1/+16 fica só no navegador (`localStorage isblade_weapon_enchant`) e não muda o dano; não há loja, poção nem soulshot.
- **Sem dinheiro:** não existe adena no jogo (só aparece em texto dos NPCs). Itens: 7 bases e 4 raridades (`data/itens.json`), guardados no navegador e sincronizados sem conferência (dá para forjar pelo F12 — auditoria do Gemini 01/11).
- **Mapas vazios:** Fortaleza, Pântano e Curuma não têm mobs, DG nem baú; as DGs da Torre vão só até mobs de nível ~40.
- **Classes incompletas:** Mago com 1 de 6 skills (as outras 5 marcadas `pronta:false`); Guerreiro com as 6 skills antigas (clipes genéricos, sem ícone próprio, sem clipe por raça); Clérigo não existe.
- **Entrada fraca:** o tutorial/expedição até o nível 20 foi decidido em 02/11 mas não existe; personagem novo nasce no nível 1 sem guia.
- **Gráfico no celular:** sem medida real ainda (o log foi colocado hoje); `assets/maps` tem 572 MB de origem.
- **Pendências antigas do diário:** colisões da cidade não seguem as casas movidas; soft-lock do celular (Gemini) está na cópia de trabalho sem commit, esperando decisão.

## 2. Recursos que temos e ainda não usamos

- **Cliente Interlude** (`L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x`): **250 músicas `.ogg` prontas** (`music\`), pacotes de som (`sounds\`), interface e ícones (`systextures\Icon.utx`), modelos de NPC/mob e animações (`animations\`), malhas de efeito (`staticmeshes\`).
- **aCis** (`aCis 384 Dev V4\gameserver\data\xml\skills`): a ficha de TODAS as skills do L2 (nome, nível, alcance, recarga, efeito). Serve de base para desenhar as nossas com nomes e sensação familiares.
- **CABAL** e **MU_ONLINE** na mesma pasta: referência de ícone (Cabal) e sons/HUD (MU).
- **Sobre as skills do L2 no Blender:** o que não abre é o **emissor de partículas** (a lógica do efeito). As **malhas e texturas** dos efeitos abrem — foi assim que a Shuriken de Vento usou `windblowin03` e `fx_m_t0001`. Receita para todas as classes: **clipe nativo da raça + malhas/texturas do efeito do L2 + som do L2 + comportamento refeito no three.js** (formas angulares, sem esfera/anel/disco).

## 3. Pilares da imersão L2 (o que faz o jogador sentir "isso é L2")

1. **Som:** música por lugar (cidade, campo, dungeon, chefe), sons de interface do L2, passos e ambiente.
2. **Cidade viva:** NPCs com função de verdade (teleporte com custo, loja, ferreiro, armazém), mensagens de sistema no estilo L2 ("Você ganhou 120 de XP", "Adquiriu 35 Adena"), janela do alvo com vida.
3. **Campo com spots:** cada mapa com faixas de nível, mobs em grupos que reaparecem, outros jogadores farmando ao lado, chefes de campo.
4. **Ciclo de equipamento:** adena, drops, graus (Sem grau → D → C → B), soulshot e poção, encantamento com risco de quebrar.
5. **Morte com peso:** perde um pouco de XP e volta para a cidade.
6. **Social:** chat, party (feito), clã com sigla sobre o nome, PvP com nome roxo/vermelho (flag/karma).
7. **Ação Dragon Nest em cima disso:** combate rápido e na mira, CC de 1,5 a 2 s, skills com identidade Cabal.

---

## 4. Fases, em ordem

### FASE 0 — Base firme para mostrar (agora, ~1 semana)
- [x] VPS religa sozinha se cair (vigia + sem limite de 72 h) (Claude, 08/11)
- [x] Log de desempenho no jogo (Claude, 08/11)
- [ ] **Medir no celular e fazer a 1ª rodada de gráfico/desempenho** com o log que o dono trouxer (comprimir texturas e modelos dos mapas, ajustar níveis de qualidade, corte por distância). **M** (Dono testa, Claude ajusta)
- [x] **Chat** estilo L2 (`js/chat.js`): Enter abre/manda, Esc fecha; geral = canal; `#` no começo = grupo (verde, em qualquer mapa); mensagens do sistema em amarelo; botão CHAT no celular; teclas não vazam para o jogo; limite de 1 mensagem a cada 0,8 s no servidor. (Claude, 08/11)
- [x] **"Reportar problema"** nas Config: o jogador escreve o que aconteceu e envia; vai junto o resumo do desempenho; o servidor grava em `servidor/dados/relatos.jsonl` (uma linha por relato, com conta e página; 6 por hora por IP). Na VPS: `Get-Content C:\IS-sync\servidor\dados\relatos.jsonl -Tail 5`. (Claude, 08/11)
- [x] **Inventário e adena com autoridade no servidor** (`servidor/inventario.js`): o servidor cria o kit da classe, sorteia adena em todo abate e os itens do chefe, guarda no personagem e valida equipar/tirar/descartar (só a arma da própria classe); o navegador não envia mais inventário. Adena aparece no inventário (I) e no chat ("Você obteve N Adena"). (Claude, 08/11) — falta balancear quanto de adena cai.
- [x] **Mira assistida no celular** (soft-lock): dono deixou a decisão comigo; ficou, reescrita em `js/mira_toque.js` — trava em chefe, mobs e jogadores hostis; com o analógico empurrado só ajuda perto da direção dele; skills de ponto mirado caem em cima do alvo. (Claude, 08/11)
- [ ] Trocar a senha da VPS (apareceu em imagem) e deixar o repositório privado. **P** (Dono)

### FASE 1 — Imersão na cidade (Talking Island vira o coração do jogo, ~2 semanas)
- [~] **Música e ambiente:** FEITO (08/11): faixas do cliente Interlude por lugar (`js/musica.js` + `data/musica.json`): lobby `intro`, criação `ct_<raça>`, cidade `nt_speaking`, Torre `s_tower`, chefe `bs01_a`, PvP `b01_f`, Curuma/Fortaleza/Pântano `d01/d02/d03_f`; troca suave, controle "Música" nas Config, respeita o Mudo. O dono confere ouvindo e troca no json. FALTA: sons de interface do L2 (abrir janela, clique, item) e ambiente (vento, água, pássaros). **M** (Claude)
- [x] **Mensagens de sistema estilo L2** no chat (XP, adena, item, nível, "Você entrou em: ..." e todos os avisos do sistema) e **janela do alvo** para mob e chefe (`js/alvo_l2.js`): nome colorido pela diferença de nível como no L2, nível e vida. (Claude, 08/11)
- [ ] **NPCs com função real** (os 3 do Gemini viram de verdade + 1 novo). Em 08/11 o dono pediu ao Gemini para corrigir o tamanho (estavam gigantes); a função vem depois:
  - Gatekeeper Clarissa: fica na cidade; uso ainda a decidir (talvez teleporte pago para os 4 mapas, os portais continuam). **P**
  - [x] Comerciante: **Galladucci e Mammon** abrem a loja (`js/loja.js` + `data/loja.json`, tudo validado no servidor): Poção de Vida (40 A, cura 30%, recarga 10 s, tecla H / botão POÇÃO no celular) e Pergaminho de Volta (150 A); compram equipamento por raridade (25/90/350/1500 A). (Claude, 08/11) FALTA: soulshot (quando o bônus de dano existir).
  - ✅ Ferreiro Altran: encantamento no servidor (+1..+16, seguro até +3, risco de quebra depois), com brilho na arma a partir de +4. **M** — feito 08/11 (arma e armadura; adena por tentativa; brilho visto pelos outros; falta som L2 de sucesso/falha)
  - ✅ Armazém (Wilford): guardar itens da conta. **M** — feito 08/11 (baú da conta, 60 itens + adena, taxa 10 A por item guardado)
  (Gemini: modelos/cenário dos NPCs · Claude: regras no servidor)
- [ ] **Cidade menor com 4 portões** (ideia do dono de 02/11, "COBRAR O DONO"): remontar no Blender, colisões refeitas. **G** (Dono + Gemini)
- [ ] **Céu, luz e água no padrão L2:** céu com nuvens e ciclo dia/noite em todos os mapas (hoje só na cidade), luz pré-calculada na cidade (Blender), névoa por zona. **M** (Claude)

### FASE 2 — O ciclo de jogo (o que segura o jogador, ~3 semanas)
- [x] **Ordem dos mapas por nível** (dono aprovou em 08/11): Curuma 1–15 · Fortaleza 15–30 · Pântano Flamejante 30–45 · Torre do Baium DGs 20–45 e Baium 45+.
- [ ] **Agressão dos mobs no estilo L2** (pedido do dono, 08/11: hoje nas DGs todos são agressivos com agro natural; chegar perto junta a sala inteira e quase nenhum personagem sobrevive): a maioria **passiva** (só ataca se apanhar); alguns **agressivos** com visão curta (~6–8 m) e marcados no nome; **ajuda social** só do mesmo grupinho e em raio pequeno; mob volta ao lugar se for puxado longe. Vale para os spots novos e para **revisar as DGs** da Torre. **M** (Claude)
- [ ] **Spots de mobs nos 3 mapas novos:** grupos por faixa de nível, reaparecimento, um chefe de campo por mapa; reaproveitar os 15+ mobs que já têm modelo; seguir a regra de agressão acima. **G** (Claude; Gemini nos modelos novos)
- [ ] **Adena e drops:** mob dá adena e chance de item; chefe dá item garantido; tudo pelo servidor. **M** (Claude)
- [ ] **Graus de equipamento:** Sem grau, D e C (armas e armaduras das 3 classes, sets com bônus), vendidos no Mercador ou caídos; modelos do L2 na mão/corpo. **G** (Claude + Gemini nos modelos)
- [ ] **Consumíveis:** poção (cura com tempo de recarga), soulshot (o som e o brilho já existem: passa a dar dano), pergaminho de volta. **M** (Claude)
- [ ] **Morte estilo L2:** perde um pouco de XP fora de DG e volta para a cidade (ou ressuscita onde caiu com pergaminho). **P** (Claude)
- [ ] **Expedição de entrada (tutorial rápido até o nível 20)**, decidida em 02/11: guia pelos botões, primeiro mob, primeira skill, primeiro drop, primeiro portal; pode pular; uma vez por personagem. **M** (Claude)
- [ ] Rebalancear XP e dano com o simulador (`tools/simular_progressao.js`) depois dos spots. **P** (Claude)

### FASE 3 — Classes completas (paralelo às fases 1 e 2; o dono desenha, Claude liga)
**Meta para o beta: Guardião, Mago e Guerreiro com 6 skills prontas cada + ataque padrão próprio.**

Guia de desenho de skills (para ficar familiar e divertido):
- **Molde de 6 skills por classe:** 1 de uso rápido (recarga curta) · 1 de mobilidade · 1 de controle (atordoa/derruba 1,5–2 s) · 1 em área · 1 defensiva ou buff · 1 "ultimate".
- **Familiar:** partir de uma skill conhecida do L2 da mesma linha (ficha no aCis) e manter o nome e a sensação; o comportamento é de ação (mira, esquiva, combo).
  - Mago (linha Mago/Feiticeiro): Wind Strike, Hurricane, Blaze/Prominence, Ice Bolt/Frost Wall, Aura Flare, Surrender to Wind.
  - Guerreiro (linha Gladiador/Senhor da Guerra): Power Strike, Triple Slash, Whirlwind, War Cry, Thunder Storm, Stun Attack.
  - Guardião (linha Cavaleiro/Paladino): Aggression, Shield Stun, Ultimate Defense, Holy Strike, Shield Fortress (o kit atual já cobre boa parte).
- **Cada skill pronta tem:** efeito (Blender → jogo), clipe nativo de cada raça, ícone Cabal, som do L2, dados e teste por raça (rotina `skill-pronta`).

- [~] **Mago:** skills 2–6 (dono está desenhando no Blender). **G** (Dono + Claude)
- [ ] **Guerreiro:** refazer as 6 skills no molde acima, com clipes do L2 por raça, ícones e efeitos próprios; ataque padrão próprio (hoje é o genérico da espada). **G** (Dono + Claude)
- [ ] **Guardião:** ameaça de verdade (Rugido/Aggression faz mobs e chefe focarem nele) — dá função de tanque na party. **M** (Claude)
- [ ] Ícones Cabal para todas as skills do Guerreiro e as que faltam. **P** (Claude)

### FASE 4 — Social e PvP (~2 semanas)
- [ ] **PvP com flag e karma nos mapas abertos:** atacar outro jogador deixa o nome roxo; matar inocente dá karma (nome vermelho), quem tem karma pode perder item ao morrer. A casa do Baium segue PvP livre. **M** (Claude)
- [ ] **Clã simples:** criar com nome e sigla sobre o nome, chat do clã, lista de membros. **M** (Claude)
- [ ] **Ranking** (nível, PvP, abates do Baium) no jogo e numa página pública — bom para vídeo. **P** (Claude)
- [ ] Party com papéis: XP dividido por perto, bônus por classe diferente no grupo. **P** (Claude)

### FASE 5 — Lançar o Beta Demo e divulgar
**Critérios para abrir o beta** (todos marcados):
- [ ] Fases 0, 1 e 2 completas; Guardião, Mago e Guerreiro com 6 skills prontas.
- [ ] Teste de carga com bots (`servidor/teste_bots.js`): 50 jogadores por canal sem travar.
- [ ] Rodando bem em 2 celulares de referência (um médio e um fraco), medido pelo log.
- [ ] Recuperação de conta (o admin redefine a senha) e aviso "beta: o progresso pode ser zerado no lançamento".

Divulgação:
- [ ] **Página do beta** no site L2 IKARUS: botão Jogar, vídeo curto, Discord, requisitos. **M** (Claude)
- [ ] **Modo câmera para gravar** (esconde a HUD, câmera livre, câmera lenta). **P** (Claude)
- [ ] **Anúncio do servidor** dentro do jogo (manutenção, eventos). **P** (Claude)
- [ ] **Roteiro de vídeos** (pode começar JÁ como diário de desenvolvimento): skill do Blender ao jogo · luta do Baium · PvP na casa do Baium · DG em party · "MMO do L2 no navegador, abre no celular". (Dono)
- [ ] Evento de abertura do beta (ex.: primeiro a matar o Baium ganha título). (Dono)

### FASE 6 — Depois do beta
- [ ] Trocar de mapa sem recarregar a página (uma página só, conexão mantida).
- [ ] Mobs e DGs simulados no servidor (hoje o líder do grupo comanda os mobs).
- [ ] Clérigo (cura e buff) — fecha a trindade tanque/dano/suporte.
- [ ] Troca entre jogadores, loja pessoal (private store do L2) e mercado.
- [ ] Mais DGs e chefes de raide; grau B; encantamento de armadura.
- [ ] Cerco/castelo (o grande evento de clã do L2).
- [ ] Troca do nome para **L2 IKARUS ACTION** (decisão do dono) em todo o jogo, site e PWA.

---

## 5. Ordem de execução sugerida (o que fazer primeiro, semana a semana)
1. **Semana 1:** log no celular → 1ª rodada de gráfico · chat · reportar problema · decidir soft-lock · (dono: skills 2–6 do mago no Blender).
2. **Semana 2:** música e sons de interface · mensagens de sistema e janela do alvo · inventário/adena no servidor.
3. **Semanas 3–4:** NPCs com função (Gatekeeper, Mercador, Ferreiro) · consumíveis · ordem dos mapas · spots de mobs em Curuma.
4. **Semanas 5–6:** spots na Fortaleza e no Pântano · graus D/C · morte estilo L2 · expedição de entrada · skills do mago ligadas.
5. **Semanas 7–8:** Guerreiro refeito · ameaça do Guardião · PvP flag/karma · ranking · modo câmera.
6. **Semana 9:** teste de carga, critérios do beta, página do beta → **abrir o Beta Demo**.

Vídeos de bastidores podem sair desde a semana 1; o convite para jogar fica para a semana 9.
