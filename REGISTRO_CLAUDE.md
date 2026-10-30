# REGISTRO DO CLAUDE — o que eu mexi e onde (trabalho em paralelo com o Gemini)

> **Convenção de assinatura (vale para as duas IAs):**
> Todo trecho que o Claude alterar ou criar dentro de arquivos compartilhados (`arena.html`, `cidade.html`, `criacao.html`, `selecao.html`, JSONs) fica entre marcadores:
>
> ```js
> /* >>> CLAUDE [guardiao] 2026-10-27 — motivo curto */
> ... codigo ...
> /* <<< CLAUDE [guardiao] */
> ```
> (em HTML: `<!-- >>> CLAUDE ... -->`, em JSON: campo `"_claude": "..."`). **Gemini: não edite o que estiver dentro desses marcadores sem avisar o usuário; eu faço o mesmo com o que for seu.**
> O código novo do Claude mora, sempre que der, em **arquivos próprios** (`prototipo/js/guardiao.js`, `prototipo/data/armas/shield.json`) e os HTMLs só ganham pequenos ganchos assinados. Assim não há conflito de edição.

## Divisão de áreas

| Área | Dono | Arquivos / trechos |
|---|---|---|
| Jogabilidade: combate, skills, classes por arma, estado de combate, troca de arma | **Claude** | `js/guardiao.js`, `data/armas/shield.json`, `data/combate.json`, trechos `>>> CLAUDE` |
| Animações e efeitos do Guardião (Blender → glTF) | **Claude** | `tools/blender_fx/*`, `assets/personagens/guardian_anims.glb`, `assets/personagens/guardian_skills.blend` |
| Visual dos personagens (rosto, cabelo, modelos, cenário) | **Gemini** | `criacao.html`, `selecao.html`, modelos `.glb`, `loadL2Player` (carregamento do modelo) |

Os ganchos do Claude dentro do que é do Gemini (ex.: `loadL2Player`) são só para juntar os clipes do Guardião e estão assinados.

## Registro (mais novo em cima)

### 2026-10-27 (noite, 4) — Escudo por raca na pose parada + combate ao atacar (Claude)
- `js/guardiao.js` (`G.ajusteParado`, tabela `AJ`): na pose parada o escudo e deslocado por raca (darkelf_f, dwarf_f, dwarf_m, orc_f, orc_m); em combate volta ao encaixe original com transicao suave. Offsets em metros do jogo. Ajustes feitos olhando capturas por tras; **o giro "horario" da anã (`rx -0,25`) foi um palpite, nao confirmado**. `Guardiao.shd(x,y,z,rx,ry,rz)` no console permite testar offsets.
- `arena.html` e `cidade.html`: 1 linha assinada no inicio de `mkAnim` (`Guardiao.tocar('ataque')`): qualquer ataque padrao ou skill coloca em combate (antes so contava dano dado/recebido). Corrida nao mexida.

### 2026-10-27 (noite, 3) — Guarda de combate calibrada por raca (Claude)
- `js/guardiao.js` (`anexarClipes`): ao carregar o personagem, mede onde caem os pes na guarda (`g_guard`) e ajusta a escala do movimento do quadril por busca binaria ate os pes pousarem no chao (referencia: o descanso `idle` da propria raca). Valores medidos: humano 1,29; humana 1,31; elfa 1,32; orc 1,40; anao 0,71 (`Guardiao.rig()` no console mostra `ky`). Os eixos do quadril sao locais, entao escala o vetor inteiro, e a referencia e o quadril em pe do humano (nao o 1o quadro do clipe).
- **Limite:** so a altura do quadril e calibrada. A abertura das pernas vem das rotacoes feitas para o humano; em humana e elfa (pernas longas) a guarda ainda fica larga e agachada.

### 2026-10-27 (noite, 2) — Corrigido: modelo esticado nas outras racas (Claude)
- **Causa:** os clipes `g_*` foram gravados no corpo do humano com posicao/escala de ossos, e eram aplicados a todas as racas.
- **Correcao** em `js/guardiao.js` (`anexarClipes`): os clipes ficam so com **rotacao** dos ossos; escala removida; posicao removida, exceto o quadril (movimento relativo, escalado pela altura do quadril da raca) e o osso do escudo (voo da skill 6). Fora de combate cada raca usa **a propria** animacao de descanso (`Wait_1HS`/`Run_1HS`, ou `idle_hand`); `clipeLoco` em `guardiao.js`, e 1 linha trocada em `playerLoco` (arena e cidade, assinada).
- **Testado** (capturas): humano, humana, elfa e anao fora de combate nao ficam mais esticados. **Ainda errado:** a guarda de combate nas racas de perna longa (humana, elfa) fica agachada demais/pernas muito abertas; precisa de ajuste por raca. Orc nao conferido.

### 2026-10-27 (noite) — Efeitos 3D das skills do Guardiao (Claude)
- **Novo:** `prototipo/js/guardiao_fx.js` (biblioteca de efeitos em three.js com shaders proprios: espetos 3D de secao redonda que giram e diminuem, cascas com ruido para coluna e ondas de choque, cupula hexagonal, aneis, rachaduras com veios brilhando, bacia queimada, pedras angulares com gravidade, brasas, fumaca, runas, rastro em fita, correntes de elos reais com garra, escudo fantasma, luz pontual). Sem texturas de arquivo: tudo procedural.
- **Alterado:** `js/guardiao.js` (orquestra cada skill com os efeitos novos; `Guardiao.teste(1..6)` toca a skill sem precisar de chefe); `arena.html` e `cidade.html` ganharam 2 ganchos assinados (`getScene/getCamera` no `Guardiao.init` e `Guardiao.aoCastar(sk)` no `castSkill`).
- **Testado** (Chrome headless, capturas por tempo): as 6 skills disparam os efeitos sem erro de JS/shader. **Fraco / nao visto como pretendido:** escudos fantasmas da skill 3 parecem cones de longe; correntes da skill 5 saem em arco alto na captura; nao ha texto de dano nem som novo; a camera de teste nao mostra bem a volta do escudo da skill 6; custo de desempenho nao medido em maquina real (so Chrome sem GPU).

### 2026-10-27 (tarde) — Guardião no jogo, 1ª passada (Claude)
**Arquivos novos (só meus):** `js/guardiao.js` (módulo ES: estado de combate, bloqueio de troca de arma, clipes, regras e efeitos das skills), `data/armas/shield.json` (as 6 skills), `assets/personagens/guardian_anims.glb` (15 clipes `g_*`).
**Arquivos alterados (trechos entre `>>> CLAUDE [guardiao]` … `<<< CLAUDE [guardiao]`):**
- `arena.html` e `cidade.html` (mesmos ganchos nos dois): `import { Guardiao }` no topo do módulo; `Guardiao.anexarClipes(r, THREE)` dentro de `onReady` (junta os clipes ao personagem carregado — **é o único ponto dentro do carregamento de personagem, Gemini**); `Guardiao.tick(dt)` ao lado de `updateVfx(dt)`; `Guardiao.init({...})` antes do primeiro frame; `getPlayerIdleClip`, `getClipConfig`, `playerLoco`, `applyWeaponVis`, `skillSwingFx`, `skillHitFx`, `cycleWeapon`, `setWeapon`, `hurtPlayer`, `applyHit`, `bossOnState`, `initInv` (cada um com 1–3 linhas assinadas). `swordshield` virou `shield` em todo o código; o Guardião não usa mais espada.
- `criacao.html` e `selecao.html`: só o card/rótulo da arma (`swordshield` → `shield`, "Escudo") e a espada tirada do encaixe de preview. **Nada do rosto/cabelo/modelo foi tocado.** Personagens salvos com `swordshield` continuam funcionando (viram `shield`).
- `data/combate.json` (`weapons`, `estadoCombate`), `data/itens.json` (`sword_shield` → `shield_guardian`). `data/armas/swordshield.json` renomeado para `.antigo`.
- Backups: `arena_antes_guardiao.html`, `cidade_antes_guardiao.html`, `criacao_antes_guardiao.html`, `selecao_antes_guardiao.html`.
**Testado** (Chrome headless + Playwright, servidor `python -m http.server 8000`): as 4 páginas carregam sem erro de JS; clipes `g_*` entram no personagem (arena e cidade); `X` troca para o escudo; fora de combate toca `g_idle`, ao tomar/dar dano entra em combate e toca `g_draw` e `g_guard`; **troca de arma em combate é bloqueada**; as 6 skills (Q E R F T Z) tocam o clipe certo e entram em cooldown.
**Não testado / fraco (honesto):** acertar o chefe de verdade (só confirmei o disparo e as animações, sem chefe na tela); os efeitos visuais das skills são uma 1ª versão simples feita com os efeitos que o jogo já tem (anéis, faíscas, riscos), **bem mais pobres que os do Blender**; Escudo de Energia ainda sem a carga segurando a tecla e sem o reflexo 50/100/200 % (hoje absorve 50 % por 3 s); a corrente puxa o alvo mas não há garra individual; o clipe do Guardião foi feito para o corpo humano (outras raças usam os mesmos ossos, mas as proporções podem pedir ajuste); o 1º golpe do ataque básico e a skill 6 não foram vistos em movimento dentro do jogo.

### 2026-10-27 — Guardião (Claude)
- **Feito no Blender** (`assets/personagens/guardian_skills.blend`): ataque básico (3 golpes) + 6 skills (Energy Force, Aegis Fortress, Shield Rain, Guardian Roar, Chain Pull, Shield Throw), pose de descanso do Lineage 2 com o escudo de lado, e `Rest_DrawShield`/`Rest_SheatheShield` (levantar o escudo para a guarda, sem giro). Escudo animado direto no osso `Shield_L_Bone`.
- **Exportado**: `assets/personagens/guardian_anims.glb` (só esqueleto + 15 clipes `g_*`, sem malhas; mesmos nomes de osso do `human_fighter.glb`). Gerado por `tools/blender_fx/export_guardian.py`.
- **Regras de jogo definidas com o usuário** (estilo Albion Online): a **arma define a classe** (escudo = Guardião, cajado = mago…); **em combate não troca de arma**; fora de combate ~60 s sem hit/debuff libera a troca; trocar não zera o cooldown das skills; sets (estilo Lineage 2) ficam para depois.
- **A fazer (em ordem):** (1) módulo `js/guardiao.js` com estado de combate e bloqueio de troca de arma; (2) arma `shield` no lugar de `swordshield` (`shield.json`, `itens.json`, `combate.json`, `criacao`/`selecao`); (3) carregar `guardian_anims.glb` e ligar os clipes às skills; (4) efeitos das skills em three.js.

### 2026-10-27 (noite, 5) — Escudo IS do Blender no jogo, so para ver nos personagens (Claude)
- `assets/personagens/shield_is.glb` (novo): estagio 0% (aco) exportado do Blender ja no espaco do osso `Shield_L_Bone` (materiais lisos, sem o ruido procedural; 655 KB). Gerado por codigo no Blender, nao ha script salvo ainda.
- `js/guardiao.js`: `G.escudoModelo()` escolhe o modelo (padrao `shield_is.glb`, `localStorage isblade.escudo = 'l2'` volta ao `composite_shield.glb`) e `G.cena()` (depuracao). `arena.html` e `cidade.html`: 3 linhas assinadas no encaixe do escudo (`isL2` vem do modelo). `criacao.html`/`selecao.html` NAO foram mexidos (continuam com o composite).
- Visto em captura headless: humano e anao; orientacao parece certa, mas falta ver de perto e em combate. Tamanho ainda e o do Blender (41 un, ~1,4 m equivalente), grande no anao; o de 1 m ainda nao entrou.

### 2026-10-27 (noite, 6) — Guarda e corrida de combate do Guardiao com clipes do L2 (Claude)
- `js/guardiao.js` (`clipeLoco`): em combate, parado = `guard` (AtkWait_2HS da raca) e correndo = `run` (Run_2HS da raca), no lugar de `g_guard` (loop do Blender, parado demais) e `g_run_rest`. `localStorage isblade.guardaL2 = '0'` volta aos clipes do Blender. Tambem `G.cena()` ganhou `wpn`. Fora de combate segue `idle_hand`/`run_hand` (o glb do jogo nao traz Wait_1HS/Run_1HS).
- Testado so por captura (humano): os clipes tocam; o escudo (osso do antebraco esquerdo) acompanha o braco, mas nas poses de 2 maos ele fica baixo, ao longo da perna; nao foi ajustado.
- (mesma rodada) `js/guardiao.js` `G.guarda` + `guardaPose()`: no clipe `guard` o escudo e posto em relacao ao CORPO (em pe, face para a frente, `off` da mao esquerda em unidades do modelo x `guardiaoK` da raca) em vez do osso, cujos eixos mudam por raca; transicao suave (`gK`). Visto em captura: humano, anao, orc, elfa negra. Afinar no console com `Guardiao.guarda`. A tecla de defesa (`S.guard`) ainda usa `g_guard` do Blender (nao mexi). Escudo ainda no tamanho de 41 un (grande), e no orc fica um pouco afastado do corpo.
- (mesma rodada, 2) Escudo reduzido para ~1 m (29 un, escala em torno da empunhadura) e materiais mais claros: script salvo em `tools/blender_fx/export_shield_is.py` (roda dentro do Blender, regrava `shield_is.glb`; url com `?v=2`). `G.guarda.off` baixado para `[-3.1, 7, 6]`. Visto: anã, humano, orc em guarda.
- (mesma rodada, 3) Escudo de volta a 41 un (tamanho original, a pedido). Aparencia: `js/guardiao.js` `ESTILO`/`vestirEscudo()` pinta cada material do glb (aco, ouro nas bordas/espetos, miolo "IS" com brilho azul, couro, empunhadura); o escudo estava preto por metal puro sem reflexo. Bug corrigido em `export_shield_is.py`: `materials.clear()` zerava os indices e o glb saia com 1 material so (agora 5). url `?v=4`.

### 2026-10-27 (noite, 7) — Skill 1 (Escudo de Energia) refeita no jogo (Claude)
- `js/guardiao_fx.js`: novo `escudoEnergia(x, z, face, o)` (placa 3D em formato de escudo, malha hexagonal por shader, energia correndo, fresnel na borda, nucleo branco; cresce saindo da mao, anda `range` m em 1,2 s e estilhaca em espetos+faiscas). `js/guardiao.js` (`aoCastar`/`fxSwing`, `g_s1`): carga em branco/azul, escudo de energia + 3 rastros nas pontas + cone baixo no chao + clarao; saiu o anel chapado. Paleta nova `COR.gelo/azulE/branco/ceu` (uma cor-base por skill, a pedido; azul-aco com nucleo branco na 1).
- Visto por captura (de costas, humano). Nao visto: a face da frente do escudo, em movimento fluido, nem o reflexo 50/100/200 %.
- (Skill 1, ajuste) O escudo de energia usa a silhueta do escudo equipado (`geoEscudo()` em `js/guardiao.js`, cache em `shd.userData.geoEn`, sem couro/empunhadura, achatado em z), cresce durante todo o lancamento (30% -> ~125%), sai reto (sem balanco) e deitado (`tilt` .4 rad, topo recua). Altura do centro 1,0 m.
- (Skill 1, refeita conforme a ideia do usuario) `js/guardiao_fx.js`: `escudoCarga` (o desenho do escudo equipado vira energia SOBRE o escudo do personagem durante a carga, acompanhando a mao, trocando de cor branco -> ciano -> azul eletrico -> azul profundo) e `escudoEnergia` (solta da posicao real do escudo, anda 5 m e CRESCE em leque de 90 graus: largura ate ~80% de 2*range*tan(half), curvo pelo `uBend`, hexagonos corrigidos pelo `uAsp`, vai deitando ate `tilt` .4). `js/guardiao.js`: `geoEscudo` guarda `rinv/c/s` para sobrepor; `aoCastar`/`fxSwing` ligam as duas fases; rastros das pontas mais finos. Tempos reais: carga ~1,9 s (frame 20 a 260 a 2,7x), saida 1,2 s. Capturas headless sao lentas, entao a troca de cor da carga NAO foi vista quadro a quadro.
- (Skill 1, v3) A saida deixou de ser o desenho espinhoso esticado (parecia objeto geometrico): `limpoGeo()` em `js/guardiao_fx.js` = escudo classico (topo reto, ponta embaixo, borda, painel em relevo, umbo, nervuras, relevo nos dois lados) e `fxSwing` solta 5 deles em leque de 90 graus (`escudoEnergia({limpo:true})`, cada um cresce de 75% a 135% andando 5 m, 1 rastro fino por escudo, defasagem de .07 s do centro para fora). A carga continua sobre o escudo real equipado. `geoEscudo()` segue valendo so para a carga.

## 2026-10-28 — Skill 1 v4: kamehameha (Claude)
- `prototipo/js/guardiao_fx.js`: novo `FX.feixe(x,z,face,{range,life,from})`: 4 camadas de energia fluindo num cilindro (shader com fbm), esfera na ponta que avanca, clarao na saida e impacto no fim (espetos, brasas, luz).
- `prototipo/js/guardiao.js`: `fxSwing` de `g_s1` agora solta o feixe em vez do leque de escudos; `G.cena()` passou a expor `fx` (depuracao). A carga (escudo trocando de cor) continua igual.
- Hitbox da skill continua o cone de 90 graus (gameplay nao mexido).

## 2026-10-28 — Skill 1 v5: Escudo de Energia canalizada (domo de colmeia + escudo astral) (Claude)
- Mecanica nova: segurar a tecla da skill = canalizar ate 5 s. Todo dano que vem da FRENTE (180 graus, atacante = inimigo mais proximo) e absorvido (0 de dano, sem interromper) e acumulado; dano de tras nao acumula e interrompe a canalizacao. Ao soltar (ou aos 5 s) o golpe causa o acumulado x 50% (0-3 s) / 100% (3-5 s) / 200% (5 s) em 180 graus por 10 m. Nada acumulado = nada acontece.
- `js/guardiao.js`: `canal`, `G.canalTick(an,dt)` (congela a animacao do clipe na pose de carga, frame 120), `G.canalAtivo()`, absorcao em `G.filtrarDano`, `G.canal` exposto para depuracao. Removido o `buffs.reflexoT` e o leque/feixe da skill 1.
- `js/guardiao_fx.js`: `FX.domo({getPos})` = meio domo de ~40 celulas hexagonais (encaixam com "pop" a cada golpe, cor por tempo de carga branco->ciano->azul) + escudo astral do IS (textura de canvas, frente e verso). `enc(n)`, `tempo(t)`, `pulso()`, `soltar()`, `kill()`. `FX.feixe` (kamehameha) continua na biblioteca, sem uso.
- `arena.html` (assinado): `S.skHeld` (tecla da skill segurada, keydown/keyup/blur), `Guardiao.canalTick` no tick do clipe, retorno antecipado em `hurtPlayer` quando absorvido, `getFoes` no `Guardiao.init`.
- `data/armas/shield.json`: descricao da skill atualizada.
- Calibracao pendente: `CANAL_CAP` (.4 = dano de 40% da vida maxima fecha o domo), `CANAL_FRAME` (120, pose de carga), atacante por proximidade (projeteis/area nao tem origem exata).

## 2026-10-28 — Ataque padrao do Guardiao com efeitos 3D (Claude)
- Antes: o ataque padrao (sweep/thrust/spin) so tinha o arco e o leque genericos de espada; nenhum efeito do Guardiao.
- `js/guardiao.js`: `G.aoAtacar(an)` (inicio do golpe: rastro do escudo, poeira, aneis de vento) e `G.fxBasico(an)` (impacto). sweep = investida + pancada; thrust = giro de 360 com onda de vento; spin = pancada no chao (so o golpe final racha o chao: cratera, rachaduras, rochas angulares). `G.testeAtaque(id)` para teste visual.
- `arena.html` (assinado): chama `Guardiao.aoAtacar` ao criar o golpe e `Guardiao.fxBasico` no impacto; para o escudo nao desenha mais o leque/arco genericos.
- Ainda fraco: a poeira (`humo`) esta escura e em bolhas; o rastro do escudo mal aparece no headless; efeitos nao conferidos em movimento.

## 2026-10-28 — Esquiva por classe: rolagem do Mixamo no esqueleto L2 (Claude)
- Causa: o personagem L2 usa o esqueleto Bip01; o `roll.fbx` do Mixamo so serve no esqueleto Mixamo. No L2 o jogo caia no clipe `roll` do proprio L2, que e um clipe de ataque reaproveitado (SpAtk11).
- `tools/blender_fx/dodge_roll.py` (novo): retarget do `roll.fbx` para `HumanFighter_Armature` -> acao `Dodge_Roll` (76 quadros, no lugar; so a descida vertical do quadril fica). Rotacao de mundo por osso (preserva torcao) + correcao de DIRECAO nos membros (compensa T-pose x pose de repouso). Verificado: membros a 0 graus do original, tronco a 4-6 graus. Zera os ossos fora do mapeamento (o `Bip01` raiz estava girado por uma acao anterior). Restaura o fps da cena (o importador de FBX muda para 30).
- `tools/blender_fx/export_guardian.py`: `Dodge_Roll` -> clipe `g_roll`. `assets/personagens/guardian_anims.glb` reexportado (v=2).
- `js/guardiao.js`: `G.clipeEsquiva(rig, dur)` escolhe o clipe pela classe (`isblade.char_type` com "magic" = `m_blink`, senao `g_roll`) e ajusta a velocidade a duracao da esquiva (`rollDur` 0,4 s). `arena.html` (assinado) usa isso em `doRoll`; sem clipe, cai no comportamento antigo.
- Testado no jogo: humano e anao (clipe congelado em 8 tempos). Mago: `m_blink` ainda nao existe, cai no clipe antigo.
- Pendente: blink do mago (saltinho, giro vertical no ar, aparece a frente no mesmo alcance da rolagem).

## 2026-10-28 — Esquiva no cidade.html + ligacoes do arena portadas (Claude)
- Bug: o Shift continuava dando um "dashzinho" (clipe de ataque do L2) porque o `cidade.html` tem o proprio `doRoll` e eu so tinha corrigido o `arena.html`.
- `cidade.html` (assinado): `doRoll` usa `Guardiao.clipeEsquiva` (g_roll). Portadas tambem as ligacoes que so existiam no arena: `Guardiao.aoAtacar`/`fxBasico` (ataque padrao com efeitos), `canalTick`/`canalAtivo`/`S.skHeld`/`getFoes`/retorno antecipado em `hurtPlayer` (skill 1 canalizada).
- Verificado em Playwright: cidade carrega sem erro de script, 16 clipes g_* anexados (incluindo g_roll) e, com escudo equipado, o Shift toca `g_roll`.
- Licao: arena.html e cidade.html sao copias; toda ligacao nova do Guardiao precisa entrar nos dois.

## 2026-10-28 — Escudo em repouso por raca (Claude)
- Problema (dark elf femea): fora de combate o escudo ficava como uma tabua na diagonal (so a elfa ficava boa); o repouso do L2 deixa a mao em lugar diferente em cada raca e o ajuste `AJ` por raca nao fechava.
- `js/guardiao.js`: nova pose de repouso relativa ao CORPO, igual a da guarda: `G.repouso = { off: [3, 7, -2], yaw: 1.5708 }` (escudo em pe ao lado da perna esquerda, face para fora; yaw gira a pose da guarda em torno do vertical). `guardaPose` generalizada (off, quaternion, peso). `rK` faz a transicao suave repouso <-> combate. `AJ` continua existindo mas o repouso agora o sobrepoe.
- Brilho do escudo reduzido (`is_logo` ei 1,2 -> .75; `is_trim` .9 -> .55): estourava em branco/amarelo na cidade.
- Verificado de costas em humano e dark elf femea. Nao vi de frente nem nas outras racas.

## 2026-10-28 — Skill 1 v6 (escudo na hora, astral geometrico, domo maior) + Fortaleza Egide drena vida (Claude)
- Feedback do usuario apos testar: o escudo/domo demoravam (so nasciam na pose de carga, ~0,9 s); o astral devia ter as quinas geometricas do escudo de prototipo; o domo devia ser maior.
- `js/guardiao.js`: o canal comeca NO CAST (`aoCastar` cria o domo; `canalTick` so congela a animacao na pose de carga). `FX.domo` recebe `info: geoEscudo(...)`.
- `js/guardiao_fx.js`: o escudo astral agora usa a geometria do escudo equipado (quinas e espetos) com o shader de energia (cor por tempo de carga); a placa de canvas "IS" ficou como reserva. Domo: R 2,3 -> 3,6 m e celulas menores (ds .30 -> .25, ~58 celulas), assentado perto do chao.
- Fortaleza Egide (skill 2): dentro da zona de 8 s o jogador recupera 10% do dano que causa (`G.drenar`, constante `DRENO`). Ganchos assinados em `arena.html` e `cidade.html` (chefe e mobs): cura `S.php`, texto verde "+N", brasas verdes. Descricao em `data/armas/shield.json` atualizada.
- Interpretacao: "drenasse vidro" = drenar vida (lifesteal). Valor 10% e palpite de equilibrio; so vale dano causado dentro da zona.

## 2026-10-28 — Esquiva: rolagem para a FRENTE feita por codigo (Claude)
- Problema: "duas piruetas". Medido no Blender: o `roll.fbx` do Mixamo e um rolamento para TRAS com salto (o quadril anda ~2,3 m contra a frente do personagem e o corpo gira ao contrario do deslocamento do jogo).
- `tools/blender_fx/dodge_roll_proc.py` (novo): rolagem para a frente no esqueleto L2, 41 quadros (0,85 s, 48 fps), no lugar: pronto agachado -> mergulho -> encolhe e rola sobre as costas (giro de 360 graus do corpo em torno do eixo lateral do quadril) -> pousa agachado -> levanta. Poses por direcao de osso no espaco do corpo.
- Achado importante: nos ossos do L2 o eixo Y NAO aponta para o osso filho (o deslocamento e por outro eixo); apontar o eixo Y deixava as pernas fora do lugar. O script usa a direcao real ate o filho (`limb_dir`). O `dodge_roll.py` antigo (retarget do Mixamo) tem o mesmo defeito e fica so como referencia.
- Exportado como `g_roll` em `guardian_anims.glb` (v=3). Conferido no jogo (humano e anao, clipe congelado em 8 instantes, camera de tras).

## 2026-10-28 — PWA + preparo de deploy (Claude)
- PWA: `prototipo/manifest.json` (fullscreen, paisagem, start em selecao.html), `sw.js` (codigo: rede primeiro com cache de reserva; assets pesados: cache primeiro, guardados na 1a vez; `VERSAO` no topo limpa tudo), `js/pwa.js` (registra o sw; botao "Instalar app" na selecao/criacao; dica do iPhone; em localhost NAO registra, use `?pwa=1` para testar), `icons/` (192, 512, 180, maskable) gerados por `tools/gerar_icones.py` (escudo IS; o nome do jogo ainda e provisorio).
- 5 paginas (index, selecao, criacao, arena, cidade) ganharam link do manifesto + `js/pwa.js` (bloco assinado no `</head>`).
- Deploy: `vercel.json` (cabecalhos: sw e manifesto sem cache, assets 1 h) e `.vercelignore` (fora: fontes brutas, backups, .blend, tools, baium_export, .unr/.psa/.md5anim). Deploy limpo = 1023 arquivos, ~214 MB (a pasta inteira tem 1,5 GB). `.gitignore` na raiz do repo.
- Testado (Playwright, `?pwa=1`): sw ativo, manifesto valido, sem erros nas paginas, abre offline.
- Nao testado: instalacao de verdade em Android/iPhone, limites de tamanho da Vercel (confirmar na documentacao antes do primeiro deploy).

## 2026-10-28 — Servidor de PvP (etapa 1: servidor) (Claude)
- Meta do usuario: cidade inicial com ate ~100 jogadores; grupo de teste ~20. Decisao: CANAIS (copias da cidade, ~50 por canal, configuravel) em vez de um mapa unico gigante; dungeons instanciadas depois.
- `servidor/server.js` (novo, Node 20 + `ws`): serve `prototipo/` e o WebSocket em `/ws` no MESMO endereco (`/status` mostra jogadores por canal). Canais com limite (`CAP`), fotos do mundo a 12 Hz so de quem esta perto (`AOI` 90 m). O servidor decide o dano: alcance, cone, recarga das skills (lidas de `data/armas/*.json`), guarda de frente (x0,2), esquiva (imunidade 0,34 s), morte e reaparecimento (4 s, imune 2 s), velocidade maxima (`VMAX`), limite de mensagens, chat. Posicao ainda e do cliente (so limitada); anti-trapaca real fica para depois.
- `servidor/teste_bots.js`: 12 verificacoes com bots (canais, acerto, direcao, intervalo, esquiva, guarda, skill, morte, reaparecimento, teleporte) — todas passam. Achado e corrigido: ficar parado juntava "credito" de movimento (agora o intervalo conta no maximo 0,5 s).
- `servidor/INICIAR_SERVIDOR.bat`. Ainda NAO ligado ao cliente: falta mostrar os outros jogadores, enviar posicao/ataques e aplicar `hit`/`die`/`resp` na cidade.
- Efeitos especiais das skills do Guardiao (canal da skill 1, dreno, reflexo) continuam locais; no PvP o servidor so aplica o dano base da skill.

## 2026-10-28 — Servidor v2: mapas, duelo e times (Claude)
- Decisoes do usuario: canais (estilo MU) + um mapa de PvP compartilhado; no futuro castelo disputado por guildas (vencedora da semana ganha acesso); de inicio o jogo roda no site l2ikarus.com, entrando pela Talking Island; PvP na cidade por DUELO ou TIME; portal central escolhe entre DG (com dificuldades) e mapa de PvP.
- `servidor/server.js` v2: mapas `cidade` (zona segura: so fere em duelo combinado: desafio -> aceite -> contagem 3 s -> luta; ninguem morre, vida minima 1; fim com vencedor; fuga a >45 m perde; desistir/sair = derrota; vida cheia 3 s depois) e `pvp` (times A/B equilibrados, sem fogo amigo, morte real e reaparecimento em 4 s no lado do time). Skills de varios golpes (campo `p`) sem nova recarga; dano por golpe.
- `servidor/teste_bots.js`: 22 verificacoes, todas passam (canais, zona segura, duelo completo, esquiva, guarda, skills, times, morte, reaparecimento, limite de velocidade).
- Falta: cliente (js/net.js + cidade.html), mapa de PvP (arena.html ?modo=pvp), portal de escolha, hospedagem em subdominio de l2ikarus.com.

## 2026-10-28 — Cliente multiplayer: cidade com duelo + mapa de PvP (Claude)
- `prototipo/js/net.js` (novo): conecta ao servidor (mesmo endereco, `/ws`; `?srv=wss://...` ou localStorage `isblade.srv` para servidor em outro lugar; `?online=0` desliga), mostra os outros jogadores (mesmo modelo L2 da raca, nome + barra de vida, ate 30 renderizados por perto), envia posicao/clipe/guarda a 12 Hz, envia ataque (no `applyHit`) e esquiva, aplica dano/morte/reaparecimento decididos pelo servidor, duelo (J desafia o mais proximo ate 20 m, U aceita, N recusa, H desiste), HUD de canal no canto. Sem servidor o jogo segue sozinho.
- `js/guardiao.js`: `G.ajusteRemoto` — o escudo dos jogadores remotos usa a mesma pose de repouso/guarda do jogador local.
- `cidade.html` e `arena.html` (blocos assinados `[net]`): import, `Net.init(ctx)`, `Net.tick`, `Net.atacou` em `applyHit`, `Net.rolou`, reaparecimento do PvP vem do servidor. Cidade entra sozinha no canal `cidade`.
- `arena.html`: MAPA DE PVP (`pvpStart`/`pvpSair`, obstaculos simetricos, carta "ARENA PVP" no menu do portal central ao lado das dificuldades da dungeon, botao "Sair do PvP"). A arena tem raio 13,5 m (pequena): serve para ~10x10; mapa maior e proxima etapa. Times nascem em z=-9 (azul) e z=+9 (vermelho).
- Verificado (Playwright, 2 navegadores reais): ambos se veem na cidade, desafio/aceite de duelo, 2 golpes de verdade (vida 100 -> 91 -> 82) vistos pelos dois lados; mapa de PvP com times diferentes e HUD correto; teste dos bots 22/22.
- NAO verificado: PvP com mais de 2 pessoas, desempenho com muitos personagens no celular, efeitos visuais das skills dos outros jogadores (so animacao e dano; os efeitos 3D ficam so no tela de quem ataca), skills especiais do Guardiao no PvP (canal da skill 1, dreno, reflexo: no PvP vale so o dano base), trapaca (posicao e do cliente), hospedagem real.
- Rodar com varios jogadores: `servidor\INICIAR_SERVIDOR.bat` (substitui o INICIAR.bat; porta 8000).

## 2026-10-28 — Menu estilo MU + grupo (party) (Claude)
- `prototipo/js/net.js` v4: MENU (tecla P ou botao "MENU (P)" no canto superior esquerdo; so CSS, nenhuma imagem). Em destaque dourado "ATIVO": Duelo e Grupo; apagados "em breve": Troca, Loja, Amigos, Guilda, Mensagem, Ranking. Duelo: lista jogadores ate 40 m com [Desafiar]. Grupo: membros com vida, ★ lider, [Expulsar] (lider), [Sair do grupo], convidar ate 60 m. Painel do grupo (nomes + barra de vida) no canto da tela. U/N aceitam/recusam o pedido mais recente (duelo ou grupo). Redesenha so quando o conteudo muda (senao o clique perde o elemento).
- `servidor/server.js`: GRUPO ligado a SESSAO (`sid` no localStorage `isblade.sid`), nao a conexao: sobrevive a troca de pagina cidade<->arena (90 s de tolerancia; quem cai fica "offline" no grupo); ate 6; so o lider convida e expulsa; grupo com 1 membro se desfaz; no mapa de PvP colegas de grupo caem no mesmo canal e no MESMO time. Estado do grupo reenviado a cada 1 s.
- `servidor/teste_bots.js`: 33 verificacoes, todas passam (11 novas do grupo).
- Verificado em 2 navegadores reais: menu abre/fecha (P, Esc), 2 itens ativos e 6 apagados, convite pelo menu, aceite com U, grupo com os 2 nos dois lados, painel do grupo.
- NAO verificado: layout em tela de celular, grupo com 3+ pessoas em navegador real, troca de pagina com grupo em navegador real (so no teste de bots), expulsar por clique.
- Decisao do usuario (hospedagem): teste na Vercel (so cliente estatico); entrada bonita no site l2ikarus (git do site); cliente baixa em segundo plano e guarda em cache. Carga esperada na apresentacao: ate ~10 simultaneos.

## 2026-10-28 — Servidor de teste gratuito (PC + tunel) e site l2ikarus (Claude)
- Contexto: o usuario nao pagou a VPS (sem jogadores ainda) e esta sem dinheiro; apresentacao com ate ~10 jogadores. Caminho de custo zero: cliente na Vercel (estatico) + servidor de jogo no PC do usuario + tunel gratuito do Cloudflare (`cloudflared`, sem conta). A VPS existente pode ser reativada quando houver publico.
- `servidor/iniciar_online.ps1` + `servidor/INICIAR_ONLINE.bat`: liga `servidor/server.js` (se a porta 8000 estiver livre), mostra o link local e o da rede Wi-Fi e, se `cloudflared` estiver instalado, abre o tunel e mostra o link publico para os amigos (tambem o sufixo `?srv=wss://HOST/ws` para quem abrir o jogo pela Vercel). Sem `cloudflared` mostra o comando de instalacao (`winget install --id Cloudflare.cloudflared`). Validado so a sintaxe do script: NAO foi executado de ponta a ponta (cloudflared nao esta instalado e o teste mexeria na porta 8000 do usuario).
- `js/net.js` v5: `?srv=wss://...` agora e GUARDADO (localStorage `isblade.srv`), porque cidade -> arena recarrega a pagina e perderia o parametro; `?srv=off` volta ao padrao.
- Site de producao do L2 Ikarus: `C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\site` (React/Vite na Vercel, repo MANINtecn/l2ikarus, branch main, com arquivos do usuario nao commitados). Nada foi alterado nele. Plano: jogo em projeto/subdominio proprio (ex.: jogar.l2ikarus.com) com a entrada bonita + barra de progresso; o site so ganha um link "Jogar" (alteracao pequena, so com pedido e revisao do usuario).

## 2026-10-28 — Preparo para VPS propria (Claude)
- Decisao do usuario: pagar uma VPS propria para o servidor de jogo, cliente na Vercel e, depois, divulgacao na itch.io (a itch deve levar ao jogo hospedado por nos; service worker/PWA pode nao funcionar dentro do iframe da itch).
- `servidor/server.js`: `STATIC=0` (so a conexao em tempo real, sem entregar arquivos) e `ORIGINS=` (lista de sites permitidos; `*` = um nivel de subdominio). Testado: aceita jogar.l2ikarus.com e *.vercel.app, recusa site.malicioso.com, `x.vercel.app.evil.com` e conexao sem origem; arquivos 404 com STATIC=0; `/status` 200. Teste dos bots continua 33/33.
- `servidor/package.json` (dependencia `ws`) e `servidor/DEPLOY_VPS.md` (DNS, Node, systemd/pm2, Caddy para wss, variaveis).
- `js/net.js` v6: constante `SRV_PADRAO` (vazia) para apontar o cliente da Vercel para a VPS; `?srv=` continua valendo.
- Nao verificado: nada disto foi instalado numa VPS de verdade (so testado em localhost).

## 2026-10-28 — Deploy da VPS por git (Claude)
- Pergunta do usuario: usar o git para mandar os arquivos para a VPS. Resposta: sim (a VPS puxa do git). Nada foi enviado nem commitado; sem acesso a VPS nem credenciais.
- `servidor/atualizar_vps.sh` (rodar NA VPS: git pull --ff-only, npm ci, reinicia o systemd `isblade`, confere /status; para se o pull nao for limpo), `servidor/deploy-vps.yml.exemplo` (GitHub Actions + SSH, NAO ativo; precisa de 3 secrets e chave exclusiva de deploy), e secao no `DEPLOY_VPS.md` (clone parcial so de `servidor/`, deploy key somente leitura, nao usar o repo do site).
- Nao testado: os dois arquivos nao foram executados (nao ha VPS nem Linux aqui); so revisados.

## 2026-10-28 — Dominio proprio, entrada do jogo e scripts da VPS Windows (Claude)
- Decisoes do usuario: jogo + entrada ficam JUNTOS no dominio proprio `www.isblade.tecx.pro` (Vercel); NAO editar o site l2ikarus; launcher aposentado (IKARUS.MD desatualizado); VPS e Windows (HeavyHost); o usuario liga o servidor pela VPS; repositorio novo `https://github.com/MANINtecn/isblade.git`.
- `prototipo/index.html`: agora e a pagina de entrada do jogo (visual da home aprovada do l2ikarus: fundo escuro, dourado, azul; botao START -> `selecao.html`; mostra se o servidor esta online lendo `https://play.isblade.tecx.pro/status` ou o `?srv=` guardado). O app instalado (PWA) abre direto em `selecao.html` (start_url). A pagina `public/isblade.html` que eu tinha criado no site l2ikarus foi APAGADA (arquivo novo meu, sem commit); o site ficou inalterado.
- `servidor/vps_windows/`: `auto_sync_isblade.ps1` (sync por git a cada 5 min; reinicia SO o node deste servidor, conferindo o caminho completo; TESTADO com repositorios de mentira: sem mudanca = nada, commit novo = atualiza e reinicia, outro node fora do caminho continua vivo; o teste achou um bug de recursao no nome da funcao `Git`, corrigido), `iniciar_isblade_auto.bat` (loop de reinicio; STATIC=0, ORIGINS dos dominios isblade.tecx.pro), `Caddyfile` (play.isblade.tecx.pro -> localhost:3000), `instalar_isblade.ps1` (firewall 80/443, tarefas IS_Servidor/IS_Sync/IS_Caddy; so sintaxe verificada, NAO executado).
- Push para o GitHub: NAO feito. O repositorio esta PUBLICO (responde sem login) e o jogo tem assets do Lineage 2 (NCSoft); aguardando o usuario deixar PRIVADO ou confirmar. Verificado antes: remoto vazio, 1154 arquivos / ~219 MB, nenhum segredo/chave, identidade git do usuario presente. Commit SEM atribuicao a IA (regra do usuario).

## 2026-10-28 — Primeiro envio ao GitHub (Claude)
- Autorizado pelo usuario (que deixara o repo publico por enquanto e vai deixar PRIVADO depois). `git init -b main` na raiz `IS ONLINE`, `core.autocrlf=false` (arquivos vao byte a byte), 1155 arquivos / ~219 MB (maior 16,9 MB), commit `cb5c680` SEM atribuicao a IA (regra do usuario), push para `https://github.com/MANINtecn/isblade.git` branch `main`.
- Aviso dado: o conteudo ficou publico ate o repo virar privado (historico ja pode ter sido clonado/cacheado). Depois de privado, a VPS precisa de credencial (deploy key somente leitura ou token) para o `git fetch` do `auto_sync_isblade.ps1`.
- Pergunta do usuario: o sync do 300x nao cobre este repo. Resposta: o sync do IS e independente (clone em `C:\IS-sync`, tarefas `IS_Sync`/`IS_Servidor`/`IS_Caddy`, reinicia so o node pelo caminho completo); NAO usa o caminho nem os scripts do 300x (`l2ikarus300x-sync`, `auto_sync_300x.ps1`).

## 2026-10-29 — Skill 1 com animacao nativa do L2 (CastMid) (Claude)
- Pedido: tirar a "pose de batalha antiga" ao lancar skills (o Blender `g_guard` agachado de pernas abertas, em que varios clipes `g_skillN` ja comecam: 4 e 6 no 1o quadro) e usar animacoes de conjuracao do proprio L2. Diagnostico: ao apertar a skill o corpo sai da guarda L2 (`guard` = AtkWait_2HS, de lado, com espada) para a postura agachada do Blender, e fica nela.
- Inventario do L2 (PSA original, `raw_fighter/.../MFighter_anim.psa`, 114 clipes; CastShort 0,83 s / CastMid 1,83 s / CastLong 3,83 s / CastEnd / MagicShot / MagicThrow / MagicNotarget / ShieldAtk_1HS / Social_Atk / Social_victory; cast a 30 fps). Importados no Blender (`guardian_skills.blend`, importador io_scene_psk_psa) 13 acoes, guardadas com fake user.
- Skill 1 agora usa `CastMid` (acao `L2_Cast_Skill1`, tempo x1,6 para 48 fps, exportada como `l2_cast1`, 1,79 s): escudo vem ao peito -> ergue os dois bracos (pose segurada, congela em 1,1 s) -> impulso para a frente (golpe em ~1,53 s). Pes no chao conferidos (pelve 19-23 contra 14,6 do g_guard).
- `js/guardiao.js`: `CM.g_s1 = { c:'l2_cast1', sp:1, hit:.86, cut:.98, fz:1.1 }`; `canalTick` congela em `cfg.fz` s; glb `?v=4`. `tools/blender_fx/export_guardian.py`: `'L2_Cast_Skill1': 'l2_cast1'`.
- ACHADO: a acao `Dodge_Roll` (rolagem) NAO estava salva no `.blend` (criada em sessao anterior). Recriada com `dodge_roll_proc.py` antes do export (senao o export teria apagado `g_roll`); agora salva no .blend junto com `L2_Cast_Skill1`. `guardian_anims.glb` com 17 clipes (g_roll 0,83 s e l2_cast1 1,79 s).
- Verificado no jogo (Playwright; humano, anao, orc, elfa negra): segura em 1,15 s (clipe pausado), 5 golpes de 40 acumulam 100, solta, volta para `guard`. NAO verificado: ritmo em tempo real (headless e lento), sensacao da pose parada, skills 2-6 (ainda com os clipes do Blender).

## 2026-10-29 — DIRETRIZ: skills de todas as classes em cima das animacoes de braco do L2 (usuario)
- Decisao: usar as animacoes de bracos que o L2 ja tem (CastShort/Mid/Long, MagicShot/Throw, ShieldAtk_1HS, Social_*) e criar as skills das outras classes em cima delas, para ficar natural. Anotado para quando formos mexer nas skills (memoria `skills-base-l2`).
- O usuario esta olhando o catalogo e ja achou um clipe que deixa o arremesso do escudo (skill 6) mais fluido (levantar o escudo e baixar o braco "redondos"); aguardar qual e antes de mexer na skill 6.

## 2026-10-29 — Travadas ao soltar skills: shaders compilando na hora (Claude)
- Medicao (Playwright + contador de `gl.linkProgram`; o headless e lento demais para medir quadros, mas conta shaders): a 1a skill compilava 13 shaders na cidade e 10 na arena (luz dos efeitos); a 2a vez da skill 1 chegou a 23; cada efeito novo compilava o seu na hora de aparecer. Cada compilacao e um travao (dezenas a centenas de ms numa GPU real).
- Causas: (1) a luz dos efeitos (`PointLight` em `guardiao_fx.js`) era criada so no 1o uso e depois ligava/desligava (`visible`), mudando o numero de luzes e recompilando shaders da cena toda; (2) nenhum efeito era pre-compilado; (3) o `dispose` ao fim de cada efeito destroi o programa do shader quando o ultimo material dele sai (o three.js conta uso) — entao compilar e descartar nao adianta.
- Correcao: `js/guardiao_fx.js` — a luz entra na cena no carregamento e NUNCA liga/desliga (intensidade 0 quando apagada); `FX.aquecer(extra)` cria um efeito de cada tipo, forca visivel os com `lag`, compila e tira da cena SEM dispose (instancias "sentinela" mantem os programas vivos). `js/guardiao.js` — `G.aquecer()` roda o codigo real de `fxSwing` das 6 skills e de `fxBasico` dos 3 golpes LONGE do jogador (x=z=4000), guarda e devolve posicao, buffs, tremor e arma; agendado em 2 s, 6 s e 12 s (o cenario da cidade termina de carregar depois). `cidade.html`/`arena.html` — `ctx.compile` compila para o alvo do bloom (`BLOOM.rt`; para a tela os shaders saem diferentes e recompilariam) e versoes dos scripts subidas (`guardiao.js?v=6`, `guardiao_fx.js?v=4`).
- Resultado medido: compilacoes durante as 6 skills em duas rodadas = 0 na cidade e 0 na arena (antes 4-23 por skill). O custo foi para o carregamento (~+20-40 shaders compilados nos primeiros segundos).
- NAO resolvido / nao medido: a travada ao GIRAR A CAMERA e ANDAR (sem skill). O cenario da cidade tem 993 malhas, 986 materiais e 7 luzes, e o jogo desenha em alvo do bloom (HalfFloat, MSAA 4x, 2 passes de blur, pixel ratio ate 2, antialias). Sombras em tempo real NAO sao usadas. Pedir ao usuario os numeros do F3 (fps/pico/draws/tri) andando e girando, com e sem bloom (`isblade.bloom`).

## 2026-10-29 — Referencia registrada: G3D-Editor (usuario)
- https://github.com/LuizRafael79/G3D-Editor — editor de geodata para usar em qualquer projeto de L2 e tambem no L2web (palavras do usuario). Repositorio de TERCEIRO (LuizRafael79).
- Status: so registrado. Nao foi lido, clonado nem executado. Antes de usar: ler README/licenca/codigo, rodar em pasta separada e nao executar binarios sem revisar.

## 2026-10-29 — Skills 2-6 do Guardiao com animacoes NATIVAS do L2 (Claude)
- Levantamento: importadas do PSA do lutador (`raw_fighter/.../MFighter_anim.psa`, 114 clipes, 30 fps) 32 candidatas; medidas no Blender (alcance/altura das maos, pico de velocidade, queda da pelve) e as principais vistas em quadros. Escolhas: 2 Fortaleza Egide = `SpAtk03_2HS` (pulo + pancada ajoelhado com o escudo no chao, impacto 1,03 s); 3 Chuva = `CastLong` recortado x1,6 (invocacao, bracos erguidos, desce em 2,10 s); 4 Rugido = `Social_Atk` x1,3 (gesto de desafio, impacto 0,85 s); 5 Corrente = `Magicshot` (soco para a frente e braco subindo, impacto 0,67 s); 6 Arremesso = `ShieldAtk_1HS` + pausa final de 1,1 s (o braco do escudo faz todo o movimento: arco, passa o ombro e dispara; solta em 1,13 s). Skill 1 ja era `CastMid`.
- `tools/blender_fx/skills_l2.py` (novo) cria as acoes `L2_Skill*`; `export_guardian.py` ganhou `l2_s2..l2_s6`; `guardian_anims.glb` com 22 clipes (`?v=5`).
- `js/guardiao.js`: `CM.g_s2..g_s6` apontam para `l2_s2..l2_s6` com hit/cut pelos impactos; skill 6: o clipe do L2 nao voa o escudo, entao o escudo do braco vira um disco de energia (`FX.escudoVoo`, novo em `guardiao_fx.js`, com o desenho do escudo equipado) que voa ate 5,7 m, segura e volta; o escudo real some do braco durante o voo e e devolvido em `onEnd`; agendado em tempo de jogo (`FX.add(null,...)`). `data/armas/shield.json`: skill 6 `hits` [0.554, 0.767] (antes [0.28, 0.47]).
- Verificado no jogo (Playwright, humano): as 5 tocam o clipe novo e voltam para `guard`; skill 6 escudo some e volta; na cidade (com boneco) a Fortaleza mostra salto -> pancada -> domo/runas/rachaduras. NAO verificado: skills 3, 4, 5 vistas quadro a quadro, outras racas, sincronia fina do impacto, sensacao em tempo real. O `.blend` foi salvo.

## 2026-10-29 — Liberacao do personagem depois das skills do Guardiao (agilidade) (Claude)
- Queixa do usuario: depois de uma skill (principalmente a Z, arremesso do escudo) ha uma "travadinha" ate poder bater normal ou engatar outra, e ele NAO quer skill saindo em cima de skill. Obs.: a primeira tentativa (cancelar no meio da skill + disparar o golpe na hora) estava errada e foi DESFEITA.
- Causa (mapeada no codigo): o jogo tem DOIS criterios de liberacao. As teclas (`perform`/`castSkill`) usam `canCancel` (libera apos o golpe); o ataque basico com o mouse segurado (`basicTick`) e o andar normal/guarda so liberam quando `S.anim` acaba (`an.total = duracao x cut`), e ate la o personagem anda a 55% (`MOVE_CAST`). Os clipes do L2 tem "cauda" de relaxamento. Medido em tempo de jogo (`S.anim.tt`): liberava 0,57 s apos o golpe (skill 2), 1,15 s (4), 0,79 s (5) e 0,43 s depois de o escudo voltar (6).
- Correcao em `js/guardiao.js`: `cut` de cada skill = ultimo golpe + recuperacao (s1 .15 s, s2 .20, s3 .10, s4 .25, s5 .20, s6 .10): `cut` s1 .94, s2 .75, s3 .995, s4 .53, s5 .58, s6 .81. Novo `G.podeCancelar(an)`: so libera DEPOIS do ultimo golpe (a regra padrao liberava aos 60% do clipe, o que deixava a Chuva de Escudos ser cancelada antes de cair e perder o efeito); skill 1 canalizando nao cancela. `canCancel` (arena/cidade) consulta `Guardiao.podeCancelar`; `G.cena()` expoe `S` para depuracao.
- Medido depois: libera em 1,22 s (s2, antes 1,59), 1,09 s (s4, antes 2,00), 0,87 s (s5, antes 1,46), 2,09 s (s6, antes 2,53), com todos os efeitos ja disparados. Chuva e Arremesso: 0 amostras liberadas antes do golpe.
- NAO verificado: a sensacao em tempo real (headless e lento), a corrida/ataque basico logo apos a skill com mouse de verdade, o corte da cauda visualmente (blend para a guarda), skills 1 e 3 (cut quase igual ao de antes). Valores de recuperacao sao palpites ajustaveis no comentario de `CM`.

## 2026-10-29 — Design de CC e counters do Guardiao + receita v2 (Claude)
- `DESIGN_COMBATE_CC.md` (raiz): documento de DESIGN (nada implementado). Vocabulario de controle (interromper, empurrao, puxao, derrubar, atordoar, lancar), regras anti-lock (tenacidade 4 s, levantada invulneravel 0,5 s, super armadura em 3 niveis que nunca ignora derrubar/atordoar, esquiva nega, guarda nao bloqueia puxao/derrubada, cancelar skill do outro so por controle ou esquiva, telegrafia >= 0,6 s), mapa de CC das 6 skills do Guardiao (1 = onda em cone escalada pela carga 50/100/200% empurrao/empurrao+interromper/derruba; 2 = derruba a 2,5 m do impacto + lentidao na zona; 3 = lentidao 30%; 4 = provocar/aggro; 5 = puxao + unico stun 0,9 s; 6 = empurrao leve na ida e puxao leve na volta), janela de combo (puxao -> basico e Rugido cabem; Fortaleza nao), counters entre arquetipos (Guardiao > Mago > Espadachim > Guardiao, soft), exigencias de codigo e 4 decisoes abertas. Base: campos ja existentes `intr`, `launch`, `armor`, `gauge->stagger`, `S.stun`.
- Receita v2 registrada em `prototipo/tools/blender_fx/RECEITA.md` e na memoria (`guardian-skill-recipe`).

## 2026-10-29 — Design de CC reescrito com as regras REAIS do Dragon Nest (Claude)
- O usuario pediu para basear nas regras do Dragon Nest (nao lembra 100%). Pesquisado: so achei UM guia de PvP da comunidade (2014/15, https://onlineshopperslounge.blogspot.com/2015/03/dragon-nest-pvp-basics-fundamentals-w.html), qualitativo, sem numeros. Confirmado la: 7 estados de golpe (impacto leve, medio, stagger, empurrao, derrubado, lift, stun), super armadura com SA Defesa (skill lenta = alta) x SA Quebra (skill rapida = alta), stun so com SA quebrada e fixo em 3 s, i-frames nas skills, defesas passivas por classe com recarga longa (esquiva, esquiva aerea so em lift, escape especifico, "wake attack").
- NAO esta no guia (e eu tinha inventado na v1): tenacidade/imunidade apos stun, levantada invulneravel automatica, limite de combo, resistencias. Movidos para a secao 9 do `DESIGN_COMBATE_CC.md` como opcao. A "levantada invulneravel" do DN e o "wake attack", uma defesa passiva COM recarga, nao automatica.
- Numeros (duracoes, escala 0-3 de SA) sao propostas nossas marcadas no documento; as 4 decisoes abertas foram refeitas (duracao do stun, escape do chao, counters, PvP x PvE).

## 2026-10-29 — Decisoes de combate registradas (usuario)
- Stun entre 1,5 e 2 s (padrao 1,8 s). Regras de combate do Dragon Nest, rapido e na mira; skills com identidade Cabal e comportamento DN; Guardiao unico. `DESIGN_COMBATE_CC.md` secao 7b e memoria `combat-rules-dn`.

## 2026-10-29 — CC no PvE (camada de dados) + bloqueio do Guardiao
- Bloqueio: com escudo (WPN==='shield') cada golpe bloqueado custa 60% da estamina (arena.html e cidade.html, variavel gcost). So PvE; o PvP decide guarda no servidor e ainda nao tem isso.
- Novo `prototipo/js/cc.js` (estados leve .2 / medio .35 / stagger .6 / empurrao .8 / derrubado 1.2 / lift 1.5 / stun 1.8 s; regra "SA Quebra >= SA Defesa do alvo"). Ligado ao `damageMob` e ao loop dos mobs em arena.html e cidade.html (import cc.js?v=1).
- `data/armas/shield.json`: skills 2-6 com `q` e `golpe` (2 derruba, 3 impacto leve, 4 stagger, 5 stun, 6 empurrao+medio). Skill 1 (escudo de energia, forca pela carga) ainda sem golpe: falta ligar a carga.
- Testado so a regra em Node (SA, duracao, nao encurta controle maior, deslocamento). NAO testado no jogo rodando. Falta: servidor PvP, animacoes cair/deitar/levantar, wake attack (espaco), icone de status.

## 2026-10-29 — Fortaleza Egide: domo gira e corta
- Correcao: arena.html `damageMob` estava sem o gancho `Guardiao.drenar` (cura da Fortaleza nao funcionava contra mobs na arena); recolocado.
- Domo girando: a cada 0,5 s, quem esta dentro do raio (6 m) leva 30% do dano da skill (mobs e chefe, via `domoDano` nas paginas) e a cura do Guardiao e de 35% desse dano (golpe comum: 10%). Visual: cupula gira (guardiao_fx.js) e dois arcos varrem (slashArc). Giro nao gera estamina, maestria, hitstop nem tremor. guardiao.js?v=11, guardiao_fx.js?v=6.
- Verificado: sintaxe dos scripts (node --check). NAO rodado no jogo (Chromium do Playwright nao instalado nesta maquina).

## 2026-10-29 — Arremesso do Escudo com golpes multiplos (estilo Cabal)
- shield.json skill 6: dmg 55 -> 22 por golpe; `hits` = [.554,.59,.626 (ida, 3 golpes), .745,.77,.795 (volta, 3 golpes)] (total ~132 contra 110 antes). `golpe` por parte: empurrao no 1o, impacto medio no 4o.
- guardiao.js: partes 2,3,5,6 fazem um pulso curto (anel, espetos, brasas, luz) no ponto de impacto; 1 e 4 mantem a explosao grande. guardiao.js?v=12.
- Servidor PvP le o dano por golpe do mesmo JSON, entao acompanha sem mudar codigo. NAO rodado no jogo; so sintaxe verificada.

## 2026-10-29 — HUD do MU na arena (vida do Baium e recargas) + recargas menores
- Causa: o script da arena e `type="module"`, entao `var S={...}` nao vira `window.S`; o mu_hud.js le `window.S` (barra do alvo e recargas dos slots) e nao via nada. Correcao: `var S=window.S={` em arena.html (a cidade ja tinha).
- Recargas do Guardiao (shield.json, o servidor PvP le o mesmo arquivo): s1 15->12, s2 25->20, s3 14->10, s4 20->16, s5 18->12, s6 16->12.
- Nao rodado no jogo (so sintaxe). Se o Baium ainda nao morrer, checar o "Modo treino" (localStorage isblade.train): com ele ligado o chefe nunca cai.

## 2026-10-29 — Barra de vida do Baium invisivel (HUD do MU)
- Reproduzido no Chrome (Playwright, channel chrome): a placa "BAIUM - RAID BOSS" aparecia sem barra nem numero. Causa: mu_hud.js insere a div `#l2-target-name` antes da barra, e o CSS usava `.bar:first-of-type` (primeira DIV), entao a barra de vida era escondida por `.bar:not(:first-of-type)`. Correcao: classe `mu-hp-bar` (js) e seletores `#top > .bar.mu-hp-bar` / `.bar:not(.mu-hp-bar)` (css). mu_hud.css?v=15, mu_hud.js?v=12.
- Com a correcao e o `window.S`, a recarga aparece nos slots do HUD (testado: 8.6 / 14 / 3.7 s com skills equipadas nos slots). Slots vazios nao mostram recarga: skill precisa estar equipada na hotbar.
- Teste da dungeon (sala 4, Baium): chefe leva dano e MORRE no fluxo normal (dgBossDown). Nao consegui reproduzir "nao morre"; provavel que fosse a barra invisivel + possivel modo treino ligado.

## 2026-10-29 — Pacote de mapas "Astatine, Mini Toi, Blazing Swamp, Fortress" (analise, nada integrado ao jogo)
- Origem: `Desktop\IS BLADE\maps\...` (nao alterada). Trabalho todo na scratchpad da sessao (`...\scratchpad\m18`): parser do `18_18.unr` (reusa parse_unr.py com leitura de propriedades Location/Rotation/DrawScale/DrawScale3D), export dos 323 StaticMesh do Amfa_S.usx via umodel (glTF + 822 PNG), cena montada no Blender (cenas separadas Fort18 e Tower2, nao salvas).
- Regioes do mapa unico (coordenadas L2): Dungeon subsolo (z~-8900, 1027 pecas Refinery), Ilha1 orcs (155), Ilha2 = FORTRESS (477 atores), Ilha3 = vulcao/Blazing Swamp (143), Torre1 Curuma (29), Torre2 = MINI TOI/casa do Baium (201 atores, 59 malhas toh_*). Confirmado pelo dono: Torre 2 = casa do Baium.
- Fortress: montou coerente (muralha, predios, patio). Peso: 113 malhas unicas, 58 mil vertices, 93 mil triangulos com instancias, 299 texturas (21,6 MB em PNG, max 1024 px) -> alvo ~5-10 MB comprimido.
- Escala/orientacao: mesma convencao da Talking Island (1 unidade = 100/2.8 uu; malha x2.8). Blender X/Y/Z = UE X/Y/Z apos import glTF; yaw direto.
- Falta: terreno (256 TerrainSector) e BSP (170 Model/70 Brush) nao extraidos (chao e salas); alguns props flutuam (21 com pitch/roll, sinal nao validado); arvores sem alpha; emissores de fogo ignorados.

## 2026-10-29 — Terreno do Fortress e da Torre 2 (aproximado) — o que falta para ficar identico
- Terreno L2: TerrainInfo decodificado (10 camadas Texture+AlphaMap, escala 128x128x76, origem -65536,0; mapa 256x256 quads). Texturas de camada e mascaras (1024) exportadas do Amfa_T.utx; textura final composta por regiao (mascara com y NAO invertido: topo da imagem = y baixo, igual ao radar).
- NAO existe o mapa de altura: o TerrainMap `18_18` esta no pacote `Height` (import), que nao vem no pacote do mapa e nao existe no cliente 300x nem no PC. Aproximacao usada: mascara terra/mar tirada do radar `map_18_18_zs01.bmp` (4096x4096, topo = y 0) + altura por setor (bbox dos 256 TerrainSector: min/max z), suavizada; mar a -4704, agua em -4256 (WaterVolume). Relevo interno das ilhas fica plano. Para ficar identico: achar Height.utx (cliente L2 completo).
- Fortress: ilha + muralha + predios conferem com o radar (comparacao lado a lado em m18/cmp_fort.png).
- Torre 2 (Mini Toi): faltam o piso circular central e partes das paredes (visiveis no radar, nao na reconstrucao). Brushes CSG (40 na regiao) nao geram geometria (sem BSP compilado no arquivo). Hipoteses: o piso e outra malha fora da janela de busca, ou o subsolo "Refinery" (z -8900) faz parte do Mini Toi. Investigar.
- Nada convertido para GLB final nem integrado ao jogo ainda.

## 2026-10-29 — Casa do Baium exportada para o projeto (GLB + visualizador)
- Mascara de terra do radar corrigida (piso escuro da torre tinha cor parecida com o mar): agora o terreno sob a Torre 2 existe como plataforma (sector zmax); relevo interno ainda aproximado (falta o pacote Height).
- Exportado `prototipo/assets/maps/baium_house/baium_house.glb` (18 MB, 895 malhas, texturas <=512 px, terreno 1024, opacas em JPEG) e `baium_house.json` (origem = toh_boss02 em 0,0,0; escala 1 un = 35.714 uu; nivel da agua; 4 spawns de PlayerStart em coordenadas do glTF, nao validados). Unidade igual a da Talking Island.
- Novo `prototipo/baium_house_view.html`: visualizador (three.min.js + lib/GLTFLoader.js do projeto) — carrega 895 malhas sem erro (testado no Chrome). Nao ligado a arena/cidade/dungeon.
- Falta para jogar: colisao/piso caminhavel (hoje so visual), decidir o andar da luta (toh_boss02 em z -1045 uu; PlayerStart perto em -1072), posicionar o Baium, reduzir peso, portal/canal do mapa, e o lado esquerdo do mini-mapa (Fortress) idem.

## 2026-10-29 — Casa do Baium REAL (cliente 300x, mapa 23_18 = Torre da Insolencia)
- Usuario indicou que o cliente 300x tem a torre inteira. Cliente usa Lineage2Ver111: arquivo = 28 bytes de cabecalho + corpo XOR 0xAC -> vira pacote UE2 normal (parser parse_unr.py funciona). Mapa 23_18.unr: 2559 atores (1074 toh_*), toh_boss02 (pedestal do Baium) em L2 (116100, 17514, 10187); torre vai de z -6000 a 11175 (andares a cada ~1000 uu). Todos os modelos estao em staticmeshes/aden_tower_of_hubris_s.usx (131 malhas) + so 38 texturas (exportados via umodel).
- Recorte "casa do Baium": atores com z>=7200 e a menos de 4800 uu do pedestal (182 atores, 52 malhas): escada em espiral, plataforma em cruz com 2 estatuas gigantes (salao aberto), pilares/cercas, aneis em ruina. Exportado `assets/maps/baium_house/baium_house.glb` (11,7 MB, texturas <=512, centrado no pedestal) + `baium_house.json` (spawns de PlayerStart do topo, nao validados). A versao da comunidade (ilha Torre 2) ficou como `baium_house_comunidade.glb/json`.
- Visualizador `prototipo/baium_house_view.html` carrega 926 malhas no three do projeto (testado Chrome). Sem colisao/piso caminhavel ainda; ponte do ultimo andar (abaixo de z 7200) ainda nao incluida.
- Cliente tem 159 mapas na mesma criptografia (XOR 0xAC): da para extrair qualquer outro mapa do jogo original com este metodo.

## 2026-10-29 — CAUSA DA BAGUNCA NAS PECAS: malhas do umodel vem espeladas em Y
- Sintoma: so pecas simetricas (cruz, portao) ficavam certas; o resto nao encaixava. Posicoes e rotacao (yaw sinal A) ja estavam certas (validado contra o radar no Fortress: muralha fecha o retangulo).
- Teste decisivo (m18/cmp_chir.png, radar x montagem normal x montagem com cada malha espelhada em Y): so a versao espelhada bate com o radar (patio, escadas, torres).
- Correcao: ao importar cada malha glTF do umodel, espelhar vertices em Y e inverter normais (`transform(Scale(-1,4,(0,1,0)))` + `flip_normals`) uma vez por modelo (sem escala negativa). Scripts da scratchpad blender_{fort,top,hall,house,tower2}.py atualizados com MIRROR_Y.
- Casa do Baium (cliente 300x) reexportada ja corrigida: `assets/maps/baium_house/baium_house.glb` 11,7 MB; agora e uma torre circular coerente (aneis de pilares, paredes de 16 lados, espiral, cruz central com estatuas). `baium_house_comunidade.glb` (Torre 2) continua da exportacao ANTIGA (espelhada): refazer se for usar. Fortress idem (so renders, nada exportado).

## 2026-10-29 — .blend da casa do Baium para montar a mao (MCP do Blender caiu)
- Usuario: a casa ainda nao encaixou direito e quer arrastar/montar as pecas no Blender. MCP do Blender desconectou; geramos o .blend por linha de comando (blender -b --python).
- Novos: `prototipo/tools/blender_maps/montar_casa_baium.py` (gera o .blend: 1 objeto por ator, colecao por andar de 500 uu relativo ao pedestal, malhas ja espelhadas em Y, texturas empacotadas no .blend, props l2_malha / l2_pos_original_uu), `casa_baium_layout.json` (182 atores), `exportar_glb.py` (volta do .blend editado para GLB leve).
- Gerado `assets/maps/baium_house/baium_house_montagem.blend` (11,5 MB; 182 pecas / 52 modelos) e aberto no Blender 5.1 do usuario.
- Fluxo: usuario edita e salva o .blend; depois `blender -b baium_house_montagem.blend --python exportar_glb.py -- baium_house.glb`.

## 2026-10-29 — .blend do pacote da comunidade (Mini Toi) para montar a mao
- Usuario prefere o pacote baixado (menor; diz que vem com video de como foi feito). Verificado: NAO ha video na pasta nem dentro do .rar (so 18_18.unr, Amfa_S/T/A/SND, radar bmp e TP data.txt); o video deve estar na pagina de download.
- Novo `tools/blender_maps/montar_mapa_l2.py` (generico: layout + pasta do umodel + pacotes de malha/textura + origem [+ terreno]) e `mini_toi_layout.json` (201 atores da Torre 2). Gerado `assets/maps/baium_house/mini_toi_montagem.blend` (22,8 MB: 201 pecas, 59 modelos, terreno aproximado, malhas espelhadas em Y, texturas empacotadas, colecoes por andar de 500 uu relativo ao pedestal toh_boss02) e aberto no Blender 5.1.
- Nota: `Dungeon` (subsolo Refinery, z -8900, 1027 pecas) NAO esta nesse .blend; o usuario disse que o Mini Toi e o andar de baixo + o andar do Baium, entao pode ser necessario adicionar.

## 2026-10-29 — Pisos e paredes grandes = BSP (brushes CSG), agora reconstruidos
- Causa do "chao que falta" no Mini Toi: pisos/paredes circulares nao sao StaticMesh; sao Brushes do UnrealEd (classe Brush, CsgOper 1=Add, 2=Subtract) — cilindros de 16 lados (diametro 5073/4870 uu, alturas 26..1059). Polys parseados (formato: 1 byte, Num/Max int, poly = n(byte)+Base+Normal+TexU+TexV+n verts + trailer fixo) -> `scratchpad/m18/polys18.py`, `brush18.py`.
- Posicao dos vertices no mundo = Location + v - PrePivot (rot 0, escala 1) — validado: todos os brushes da torre convergem para o mesmo centro (-50303, 3475). Ordem CSG = ordem dos atores no `Level` (array maior: 3848 refs; achado por varredura de refs compactos).
- `montar_mapa_l2.py` ganhou arg opcional de brushes (`construir_bsp`: Add=UNION, Subtract=DIFFERENCE, solver EXACT, na ordem do nivel; 38 operacoes OK, 0 falhas). Material de pedra com `toh_tile01` em projecao BOX (texturas reais das faces nao aplicadas ainda).
- Gerado `assets/maps/baium_house/mini_toi_montagem_v2.blend` (23 MB) com pecas + terreno + BSP; render de cima agora bate com o radar (tambor circular com 3 telhados e rochas). Aberto no Blender do usuario.

## 2026-10-30 — Pisos de baixo do Mini Toi (v3)
- Bug no v2: a uniao sequencial de todos os brushes num so objeto perdia os pisos finos (varias ADD nao mudavam o resultado). Corrigido em `construir_bsp`: cada brush ADD vira UM objeto (`BSP_<nome>`) e so os SUB posteriores na ordem do nivel que tocam a bbox dele o cortam (21 pecas, 21 cortes, 0 falhas). Isso tambem deixa cada piso/parede editavel separado no Blender.
- Pisos (discos 16 lados, 5073 uu): Brush405 (z -3272, base), Brush170 (z -2264), Brush186 (z -1186, nivel do pedestal), + aneis/paredes Brush7/22/13/159. Verificado por render em corte (floor_f1/f2.png).
- Terreno aproximado furava os pisos (subia ate z -2738 dentro da torre): `DEPRIMIR="x,y,raio,z"` (env) afunda o terreno dentro do raio; usado -50303,3475,2900,-4300.
- Gerado `assets/maps/baium_house/mini_toi_montagem_v3.blend` e aberto no Blender. Nota: textura dos brushes ainda e generica (toh_tile01 box).

## 2026-10-30 — Torre inteira jogavel: plano + gerador do mapa de chao andavel (passo 1)
- Decisao do usuario: a torre INTEIRA, andar por andar (3 pisos: bases z -62/-34/-4 em unidades do jogo relativas ao pedestal). Cerca (toh_fence11) confirmada como necessaria como barreira (sem ela o jogador cai da passarela).
- Plano: (1) mapa de chao andavel multi-camada gerado do .blend; (2) modulo de motor (js/torre.js) que le o mapa: altura do chao, subir escadas, cair, bloqueio por espaco livre baixo (paredes/cercas); mapa movido na vertical em vez de subir o jogador (o jogo assume chao em y=0: skills/FX/boss ficam no mesmo nivel); (3) ligar a portal/Baium/dungeon.
- Novo `tools/blender_maps/gerar_walkgrid.py`: raycast para baixo por celula, guarda topo de cada superficie com normal.z>0.35 + espaco livre acima (ate 12 un); saida .bin (offsets uint32 + camadas int16/uint8) + .json. Teste com celula 1.0, raio 90: 180x180 celulas, 81.817 camadas, 10 s. Visualizacao (scratchpad m18/walk_levels.png) mostra os 3 pisos como discos completos, o buraco retangular da escada no piso do meio e bloqueios (espaco livre baixo) nas bordas/obstaculos.
- Ainda NAO feito: motor (torre.js), validar escadas/rampas, resolucao final (0.5), ligar ao jogo, posicionar o Baium.

## 2026-10-30 — Pagina de teste da torre (andar nos 3 pisos) + v4 do Mini Toi
- Usuario aprovou fazer "do meu jeito": pagina separada para testar andar e anotar por onde deve passar (sem mexer em arena.html).
- Bug achado e corrigido no BSP: o corte coplanar (SUB de mesma altura do ADD) falhava e deixava lajes macicas (piso do topo virava laje de 125 uu). Agora: cada SUB tem versao justa; so para o ADD "parceiro" de mesma altura usa-se uma versao alargada +-0.05 un em Z (`montar_mapa_l2.py`). Resultado: 3 pisos finos = -62 / -33.8 / -3.8 (un. do jogo rel. ao pedestal) + borda (parapeito) do topo em -1. Gerado `mini_toi_montagem_v4.blend` (v3 fica como estava).
- Gerados com v4: `mini_toi_walkgrid.bin/.json` (celula 0.5, raio 85 centrado em (-27,51) Blender; 310.482 camadas; 1,7 MB) e `mini_toi.glb` (16,7 MB, 223 objetos). `gerar_walkgrid.py`: agora tambem marca "dentro de solido" (raio para cima bate no verso de face) e aceita centro da grade.
- Nova `prototipo/torre_teste.html` (three r128 do projeto): jogador capsula, WASD/Shift/Espaco, camera arrastavel, subir degraus <=0.9 un, cair de bordas sem parede, bloqueio por espaco livre < 2.4 un e por superficie alta na altura do corpo; teclas 1/2/3 (andar), R, T (trilha), N (anotar ponto), E (baixar torre_notas.json), M (minimapa). Testes automaticos (Chrome headless): assenta nos 3 andares (y -62.04 / -33.76 / -3.78) e, no andar 1, as 8 direcoes ficam contidas em raio ~67 (parede da base). NAO testado: subir as escadas reais entre andares, passarela com cerca, desempenho em GPU real.

## 2026-10-30 — Paredes finas atravessadas (pontilhado no minimapa)
- Causa: mapa de chao so tinha raios verticais no centro da celula; parede/cerca fina e inclinada so era pega "por sorte" (pontilhado). Correcao: `gerar_walkgrid.py` agora lanca raios HORIZONTAIS (+x e +y, ate o centro da vizinha, em h+1.05 e h+1.8 — acima de um degrau de 0.9) e grava 1 byte de mascara por camada (bit0=aresta +x, bit1=aresta +y), 4 bytes/camada. `torre_teste.html`: `arestaBloq/cruza` impedem cruzar a aresta (5 pontos do corpo); minimapa mostra laranja = parede fina.
- Resultado no andar 1: as 8 direcoes agora param em raio ~54 (antes ~67): ha uma parede circular interna (Brush159, 4059 uu de diametro, z -62..-34.5) que antes passava pelas frestas. Regerado `mini_toi_walkgrid.*` (96 s).

## 2026-10-30 — Feedback do teste: escadas OK; buraco de chao em um piso
- Usuario confirmou: sobe os degraus das escadas; em uma area circulada falta o chao do piso (cai e renasce). Na ToI original as escadas ligam cada sala a proxima ate o Baium.
- `torre_teste.html`: tecla V = sobreposicao 3D do chao que o jogo enxerga (verde anda / vermelho bloqueado ou baixo / laranja parede fina na aresta; raio 22 un, +-7 de altura). Serve para separar "chao existe no desenho mas nao na colisao" (bug meu) de "chao nao existe no mapa" (precisa remendo).
- Metodo de remendo planejado: criar planos `chao_*` no .blend (colecao Remendos) e regerar GLB + walkgrid; ainda nao feito (aguardando notas com N/E).

## 2026-10-30 — Chao da passarela (toh_fence11) criado + colisao de 5 raios
- Notas do usuario (`torre_notas.json` no Desktop): 1 nota "buraco aqui" em (-41.39, -18.16, -71.43). O `toh_fence11` so traz os 2 corrimaos; o chao da passarela nao existe no pacote. Criado por `tools/blender_maps/remendo_pontes.py`: separa os corrimaos por componentes conectados, linha central por faixas, poligono entre as fileiras, extrudado 0.3; topo no ponto mais baixo do corrimao (mundo -18,25). Colecao "Remendos", objeto `chao_ponte_StaticMeshActor132`. Unica instancia no mapa. `mini_toi_montagem_v5.blend`.
- `gerar_walkgrid.py`: agora 5 amostras por celula (centro + 4 cantos, funde camadas +-0.15: folga minima, aresta OR) para nao perder passarelas finas/diagonais. Regerado `mini_toi_walkgrid.*` (1,9 MB) e `mini_toi.glb` (16,7 MB) a partir do v5.
- Teste automatico: do ponto da nota (patamar, y -18.16) anda em linha reta ate o centro da passarela (y -18.26) sem cair; ao longo da passarela mantem y -18.26 por ~52 un para cada lado. NAO testado: extremidades (liga a que?), outras passarelas finas.

## 2026-10-30 — Textura nos pisos/paredes de brush e na passarela; tour de vaos; buraco na frente do portao
- Usuario: passarela "invisivel" (na verdade piso liso bege: os BSP_* e chao_* nao tinham UV, o glTF exportava so a cor); e um buraco na frente do portao do Baium lá em cima (caiu no limbo).
- Novo `tools/blender_maps/texturizar_bsp.py`: UV triplanar pelo mundo (0.08) e 2 materiais (PISO toh_tile01 nas faces voltadas para cima/baixo, PAREDE toh_wall_05 nas verticais) em todos os BSP_* e chao_*; gera `mini_toi_montagem_v6.blend`; `mini_toi.glb` reexportado do v6 (16,7 MB). Verificado por captura: a passarela agora aparece com pedra rachada.
- Buraco do portao: posicao exata NAO conhecida (sem nota N). Analise do mapa de colisao (componentes conectados por altura): 17 vaos pequenos entre areas grandes de mesma altura; o vao 1 (largura 8 un, altura 21.2, ~(-92.8,-28..-36)) fica no telhado ao lado de um portao em arco (toh_gate*). Adicionado a `torre_teste.html` o tour de vaos (G / Shift+G: teleporta ate o vao e poe uma coluna vermelha no meio).
- Detalhe: portoes toh_gate02 ficam nos 3 telhados (alt ~28-29), nao dentro da torre; o mapa de colisao cobre X -112..58, Z -136..34 (gate C em X 60.5 fica fora da grade: ampliar se precisar).

## 2026-10-30 — Chao do salao do Baium (nota "frente do portao")
- Nota do usuario (`torre_notas (1).json`): {x -59.11, y -3.8, z -108.92, andar 3, "frente do portao"}. Vista de cima (render do v6 com cortes) mostrou: piso na frente da porta ornamentada (toh_gate) existe; logo APOS a porta ha um vazio retangular ~9,2 x 14,5 un entre lajes escuras (topo -2.3) e o piso do andar 3 (-3.8), com faixa de degraus de tijolo entre eles.
- Criado `tools/blender_maps/remendo_chaos.py` (lista de poligonos -> lajes `chao_*` na colecao Remendos) + `mini_toi_remendos.json` (1 remendo: baium_salao, 4 cantos medidos na imagem, topo -2.3, folga 1.04) + texturizar_bsp.py. `mini_toi_montagem_v7.blend`; `mini_toi.glb` e `mini_toi_walkgrid.*` regerados do v7.
- Teste automatico: no centro do salao fica no chao a -2.3; dos 4 cantos (80% do caminho) anda sem cair. NAO confirmado: acesso a partir da frente da porta (do ponto da nota, andar em linha reta ate o centro e bloqueado imediatamente: porta solida/degraus > 0.9). Formato real do salao do Baium e incerto (medido so pelo contorno do vazio).

## 2026-10-30 — Torre no jogo (?mapa=torre) + escada que faltava (1o -> 2o andar)
- Usuario: ja pode usar no jogo; o 1o andar devia ter a passagem aberta para subir ao 2o e chegar ao 3o (Baium).
- Integracao no jogo: novo `js/torre.js` (carrega GLB + mapa de colisao; mapa sobe/desce em vez do jogador; colisao por camadas/arestas; chefe so acorda no andar 3 e fica no chao dele; nasce no andar 1). Ganchos `[torre]` em arena.html (import, TORRE_MODE=?mapa=torre, ARENA=1e6, esconder chao/aneis/pilares, Torre.depois() em separate(), enemyThink/chefe, torreStart()). Backup: arena_antes_torre.html. Uso: arena.html?mapa=torre&cenario=0. NAO TESTADO no jogo ainda.
- Conectividade (BFS com as regras do jogo: degrau 0.9, folga 2.0, arestas): a partir do andar 1 so se alcancava o proprio andar 1. Causa: o mapa baixado so tem 7 pecas toh_stair (2 em -76 fora, 2 no buraco do piso 2 subindo de -40 a -34, outras acima); a escada de baixo (-62 -> -40) foi cortada pelos autores. Criada `tools/blender_maps/remendo_escadas.py` + `mini_toi_escadas.json`: escada macica de 28 degraus (0.79 cada), largura 5, de (X-42,Y6,-62) ate (-12,6,-40), chegando ao patamar de -40 que ja existe (partindo do ponto de nascimento do andar 1 para oeste). Bug corrigido no script (altura somada duas vezes).
- Resultado (grade 1.0): a partir do andar 1 alcanca-se o andar 2 (12.584 celulas) e o topo ate h -2.7 perto do portao (X -53.5, Z -117.5). O disco do andar 3 (raio 68, h -3.8) so tem 146 celulas alcancadas: a entrada do salao/disco a partir do portao ainda nao esta confirmada.
- Gerado `mini_toi_montagem_v8.blend` (a partir do v7 salvo as 11:29); regeneracao final (GLB + colisao 0.5) em andamento.

## 2026-10-30 — Decisao: o 1o andar fica FECHADO; a partida comeca no 2o andar (rampa do Baium)
- Usuario: criamos conteudo para o salao do 1o andar fechado e outro para o 2o->3o que ja funciona; no L2 os andares de baixo eram ignorados e o pessoal ia direto para o andar da rampa do Baium e o proprio Baium, onde sempre se concentrou o PvP.
- Escada 1o->2o (`chao_escada_andar1_para_andar2`, `mini_toi_montagem_v8.blend`, `remendo_escadas.py`) NAO entra no jogo; fica guardada como opcional. GLB e mapa de colisao regerados a partir do v7 (sem a escada).
- `torre.js`: `andarInicial = 2`; nascer/renascer (queda abaixo de -130) no 2o andar. Chefe continua acordando so no 3o. `torre_teste.html` tambem renasce no 2o.
- Ideia para depois: PvP nesse andar (rampa + Baium), ja que no L2 foi onde se concentrou.

## 2026-10-30 — Plano de conteudo da torre + teste no jogo
- Usuario definiu: 1o andar (fechado) = zona de x1, DG solo normal e DG media (mais mobs); 2o andar = DG hard e ultra; PvP tambem nos andares 2 e 3 (a discutir); 3o = Baium. Memoria: `torre-baium-plano.md`.
- `dungeon.json` so tem normal/medio/hard: falta criar "ultra".
- Teste no jogo (Chrome headless, regerado do v7 sem escada): `arena.html?mapa=torre&cenario=0` liga a torre, nasce no 2o andar (y -33,76, no chao, andar 2, grupo do mapa em +33,8), sem erros de pagina; captura mostra o jogador de pe no piso de pedra com a barra "BAIUM - RAID BOSS". NAO testado: andar ate o 3o e acordar o Baium, mobs por andar, PvP.

## 2026-10-30 — Pulo (Espaco) e guarda como skill universal (C)
- Feedback: o primeiro degrau da escada so subia no boneco da pagina de teste (que pulava); no jogo nao ha pulo.
- Implementado em arena.html e cidade.html (marcas `[pulo]`; backups arena_antes_pulo.html, cidade_antes_pulo.html): **Espaco = pular** (altura max ~1,85 un, gravidade 34, custo 8 de estamina; nao pula em skill/rolagem/atordoado/guardando/em queda), **C (segurar) = guarda/parry** (antes era Espaco; o botao de toque continua). Texto de ajuda atualizado.
- Modo torre: `Torre.pular()` + `baseY`/`altura` (o mapa acompanha o chao com suavizacao e o jogador sobe de verdade no pulo; camera acompanha). `torre.js?v=2` (backup torre_antes_pulo.js).
- Testes automaticos (Chrome headless, eventos de teclado): torre, arena plana e cidade — altura max 1,83/1,85/1,85 e volta a 0; C segura (true) e solta (false); sem erro de pagina. NAO testado: sentir o pulo, subir o 1o degrau da escada com o pulo, sem animacao propria de pulo (Guardiao nao tem clipe de pulo; mantem a pose de corrida).
- Ideia (opiniao dada ao usuario): guarda = skill universal automatica (tecla fixa, fora dos 8 slots), com valores/animacao por arma e Guardiao gastando menos estamina; ainda NAO implementado como skill (so mudou a tecla).

## 2026-10-30 — Corrida no Shift + correcao do usuario no chao do salao ja salva no v7
- Corrida: **Shift toque rapido (< SPRINT_HOLD 0,16 s) = esquiva (executa ao soltar); segurar = correr** x1,45 (4,3 -> 6,23 un/s), gasto 10 estamina/s (100 de estamina = ~10 s), so comeca com >= 12 de estamina, nao corre guardando/em skill; ao zerar a estamina precisa soltar e apertar de novo; a esquiva custa 32 (ROLL_COST). Regen pausa 0,5 s durante a corrida. Constantes em arena.html/cidade.html (`SPRINT_HOLD, SPRINT_MULT, SPRINT_DRAIN, SPRINT_MIN`, bloco `[corrida]`; backups *_antes_corrida.html). Animacao da passada acelera ate 1,5x.
- Teste automatico (arena plana): andando 4,3; correndo 6,23; segurar nao rola; toque rola (estamina 100 -> 68); sem erro. Risco conhecido: a esquiva passa a sair ao SOLTAR o Shift (~0,1 s depois), pior para a esquiva perfeita; ajustar SPRINT_HOLD ou mudar de ideia se atrapalhar.
- Usuario disse que a correcao do Blender (ressalto no topo da escada + buraco; esticou a malha) nao salvou. Verificado: SALVOU (v7 de 12:38:30; unica diferenca para a copia das 12:30 e o `chao_baium_salao`, movido -1,49 un em Z, ou seja de -2,3 para -3,8 = nivel do piso do andar 3, e vertices alterados). O jogo usava a copia das 12:30. Regerados GLB + colisao a partir do v7 das 12:38 (em andamento). Blender aberto no v7.

## 2026-10-30 — Regeneracao a partir do v7 das 12:38 (correcao do usuario no jogo)
- A 1a tentativa falhou no export do GLB: o v7 foi SALVO COM `chao_baium_salao` EM MODO DE EDICAO (Tab) e a UV da malha ficou vazia (TypeError foreach_get 48 vs 0; depois "Mesh is in editmode"). Corrigido: `texturizar_bsp.py`, `exportar_glb.py` e `gerar_walkgrid.py` agora saem do modo de edicao sozinhos (`_sair_do_modo_edicao`); texturizar reconstroi a malha por bmesh e refaz a UV, e aceita '-' (reusa os materiais empacotados no .blend).
- `REGERAR_TORRE.bat` agora roda 3 passos (texturizar -> GLB -> colisao) num .blend temporario; ~10 min.
- Conferido no mapa de colisao regerado: salao do Baium e o piso em frente a porta ficam a -3.8 (sem ressalto de 1.5): (-63.1,-117.9) -3.8; (-59.1,-108.9) -3.8. GLB e colisao copiados para o jogo. Ponto vazio em (-58,-112) (porta/degraus?) nao investigado.

## 2026-10-30 — "No Blender esta certo, no jogo nao": cache do service worker
- Causa: `sw.js` usa CACHE PRIMEIRO para .glb/.bin pela URL; o navegador do usuario mantinha o mapa antigo (servidor ja entregava o novo, Last-Modified 14:41).
- Correcao: `gerar_walkgrid.py` grava `versao` (timestamp) no json; `torre.js?v=3` busca o json com `cache:'no-store'` e pede `.bin?v=<versao>` e `.glb?v=<versao>` (URLs novas = cache novo). Versao atual 1793382516.
- Verificado em navegador limpo: requisicoes `mini_toi_walkgrid.bin?v=1793382516` e `mini_toi.glb?v=1793382516`; chao no jogo: salao centro -3,82, frente da porta -3,80, canto -3,86 (sem ressalto), sem erro de pagina.

## 2026-10-30 — DG da Torre no jogo (portal -> dificuldade -> torre) + porta do Baium + chefe preso no salao
- Pedidos do usuario: (1) o Baium nao pode sair da casa (matou o jogador na escada); (2) DG: 2o andar com mobs + chefes (estilo hard), limpar libera a porta; normal e medio no 1o andar; tudo funcionando ao entrar no portal e escolher a dificuldade; "ultra" depois.
- Chefe: `regioes` geradas do .blend (`tools/blender_maps/gerar_regioes.py` -> `assets/maps/baium_house/mini_toi_regioes.json`: contorno do salao e da porta de entrada). Baium nasce no centro do salao, e preso ao poligono (margem 1,2) e so luta com o jogador DENTRO (ou colado, 1,5 un) do salao.
- Porta de entrada (folhas `StaticMeshActor455/474`): colisao dinamica (bloqueia fechada; `gerar_walkgrid.py` ignora as folhas); abrir = [E] perto (9 un) no 3o andar, folhas descem para o piso em 1,8 s; so abre se `Torre.porta.liberada` (DG hard limpa) — no modo de teste `?mapa=torre` ja vem liberada. Porta dos fundos continua solida.
- DG: `dungeon.json` ganhou `"torre"` (normal/medio = andar 1; hard = andar 2, `liberaPorta`): mobs por andar x `difficulties.count`. `arena.html` (blocos `[torre-dg]`): `dgStart` desvia para `torreDgStart` (carrega a torre na 1a vez, banner), `torreDgLoad` (nasce no andar, mobs em pontos livres 16-46 un, portal de saida perto do spawn), `torreClear` (bau + portal de saida; hard libera a porta), `torreAcordaBaium` (ao abrir a porta: Baium acorda, HP pela dificuldade, portal de saida dentro do salao), `torreSair` (volta ao hub; `dgHub`), morte = recomeca o andar. Mobs ficam no andar (`Torre.mob`) e nao atravessam parede/porta. `?dg=classica` volta as salas antigas; `?mapa=torre` = teste direto do Baium.
- Testes automaticos (Chrome headless, hub -> clique no card): NORMAL: andar 1, 8 mobs (5 shade/2 caster/1 brute), 0 fora do chao, limpar -> "ANDAR LIMPO" + portal; HARD: andar 2, mobs + chefes, limpar -> porta liberada; no 3o andar [E] abre a porta (t=1) e o Baium acorda; sem erro de pagina. Corrigido depois: hard com 1 mini_boss (x1,8 = 2).
- NAO testado: lutar de verdade (mobs perseguindo/atacando na torre, balanceamento), morrer e recomecar, Baium atacando dentro do salao, sair pelo portal e reentrar, desempenho. Falta: dificuldade ULTRA, zona de x1 no 1o andar, PvP nos andares 2 e 3.

## 2026-10-30 — Bug: personagem Guardiao abria com a espada
- Relato: personagem criado como Guardiao (escudo) continuava com a espada Dragon Slayer; clicar no escudo na mochila "equipava" mas nao trocava.
- Reproduzido (Chrome headless): com `isblade.weapon=shield` o jogo abria com `sword` e ainda regravava `isblade.weapon=sword`. Causa: a rotina que carrega o inventario (arena.html/cidade.html, `setWeapon(w)` com w = arma equipada no INVENTARIO) sobrescrevia a arma escolhida na criacao; o kit inicial equipa `sword_long`, e o inventario (`isblade.inv`) e UNICO para todos os personagens.
- Correcao (bloco `[arma]` antes dessa linha, nas duas paginas): se a arma escolhida (WPN) difere da equipada no inventario, equipa o item dessa arma (cria se faltar) — a escolha do personagem manda. Backups: arena_antes_arma.html, cidade_antes_arma.html.
- Testes automaticos (arena e cidade): (1) criado com escudo -> arma no jogo = shield e inventario com o escudo equipado; (2) criado com espada e escudo na mochila -> clicar no escudo troca para shield e salva. NAO verificado visualmente (modelo do escudo na mao).
- Observacao: no navegador do usuario `isblade.weapon` ficou gravado como `sword` pelo bug; escolher o personagem de novo na selecao (ou equipar o escudo na mochila) corrige.

## 2026-10-30 — Progresso por personagem (MMORPG) + corrida 1.8
- Inventario, escolha de skills (`skillSel`), maestria (`mastery`) e melhores tempos de DG (`dgbest`) agora sao gravados por personagem: chave `isblade.<dado>.<id do personagem ativo>` (helper `[perchar]` em arena.html e cidade.html; mu_hud.js le o inventario do personagem; apagar personagem na selecao apaga as chaves).
- Migracao: os dados antigos (globais) ficam com o PRIMEIRO personagem que carregar; os outros comecam com o kit inicial e a arma escolhida na criacao.
- Teste automatico (Chrome headless): A herda o antigo; B (escudo) abre com escudo e kit proprio; A nao muda ao abrir B; sem erros de pagina.
- Corrida (Shift segurado): multiplicador 1.8 (animacao ate 1.9x). Backups: arena_antes_perchar.html, cidade_antes_perchar.html.

## 2026-10-30 — DGs da torre com tempo, ressurgimento e chefe
- Pedido: mais mobs e chefe para aproveitar o espaco, DG como instancia com tempo (acabou = sai da DG), mobs ressurgindo, portal de saida so ao concluir dentro do tempo; vale para todas as DGs.
- data/dungeon.json "torre": normal/medio/hard agora tem `meta` (abates), `tempo` (s), `respawn` (s) e chefe (mini_boss: 1/1/2). normal 25 abates/8:00; medio 40/9:00; hard 55/10:00. Mobs comuns ressurgem ate a meta; concluir = meta + todos os chefes mortos (sobras somem) -> bau + portal de saida (hard tambem libera a porta do Baium).
- arena.html: `torreTick(dt)` (tempo, HUD, respawn), `torreCheck()`; tempo esgotado = banner e `dgHub()`. Backups: arena_antes_tempo.html, data/dungeon_antes_tempo.json.
- Teste (Chrome headless): inicia com 14 mobs + 1 chefe; HUD "Abates x/meta - Chefe - Tempo"; meta+chefe morto -> concluida + portal; tempo zerado -> volta ao santuario; sem erros. NAO verificado: ressurgimento em tempo real (fps baixo no teste), balanceamento e as DGs classicas (fora da torre ainda sem tempo).

## 2026-10-30 — Shift: esquiva na hora
- Antes a esquiva so saia ao SOLTAR o Shift em menos de .16 s (quem segurava um pouco mais nao rolava, precisava apertar 2x). Agora a esquiva sai ao APERTAR; continuar segurando por 0.35 s depois vira corrida. Arena e cidade. Backups: arena_antes_shift.html, cidade_antes_shift.html. Nao testado no jogo (so sintaxe).

## 2026-10-30 — Hard: sem portal, porta do Baium abre sozinha
- Ao limpar o hard (2o andar): sem portal de saida; aviso "A porta do Baium vai se abrir: suba a escada". Quando o jogador chega na porta (3o andar, ate 9 un) com a porta liberada, ela abre sozinha e o Baium acorda (antes exigia [E], o jogador nao sabia). Backup: arena_antes_porta2.html. Testado: hard limpo -> sem portal, porta liberada. NAO testado: caminhar ate a porta e a abertura automatica.

## 2026-10-30 — Neblina da torre
- A neblina da arena (perto 22 / longe 62) apagava paredes e muros da torre. Em torre.js `neblina()`: ao ativar a torre vai para 75/195 (camera far=200), ao desativar volta ao 22/62. Fora da torre continua o vazio escuro (fundo 0x05060d). Backup: js/torre_antes_neblina.js. Nao conferido visualmente.

## 2026-10-30 — Portal da cidade = portal do santuario, [E] com escolha de destino
- cidade.html: o arco azul "feio" (portalGroup) foi escondido e no mesmo lugar (-13.5,-13) entra o portal Solo Leveling do santuario (createSoloLevelingGate + texturas copiados do arena.html). Nao entra mais ao encostar: so com [E] a ate 5 un, que abre a escolha: Dungeon Normal/Medio/Hard, Duelo contra o Baium, PvP.
- arena.html: parametro `?go=normal|medio|hard|pvp` pula o santuario e ja inicia a DG/PvP. Duelo = `?mode=duel`.
- Testado (Chrome headless): portal renderiza, prompt [E] aparece, [E] abre o menu com 5 cartas, sem erros de pagina. NAO testado: clicar nas cartas e chegar direto na DG. Backups: cidade_antes_portal.html, arena_antes_portal.html.

## 2026-10-30 — Atalhos da barra livres (arrastar skill para o slot / tecla por slot)
- Antes: a tecla pertencia a SKILL (Q,E,R,F,T,Z fixos) e a barra so mostrava; arrastar nao mudava a tecla. Agora a tecla pertence ao SLOT da barra (js/mu_hud.js v14): `MuHud.keys` (padrao Q E R T F G, slots 7 e 8 sem tecla); a skill/item que esta no slot responde a tecla dele. `MuHud.sync()` entrega o mapa ao jogo (`window.__hotbarKeys` -> SKEY).
- Arrastar skill (arvore [S]) ou item (mochila) para qualquer slot; arrastar de slot para slot troca os dois; a mesma skill nao fica em 2 slots; botao direito remove. Barra vazia na primeira vez = skills 1-6 nos slots 1-6.
- Opcoes -> "Atalhos da barra": uma linha por slot, clique e aperte a nova tecla (se ja for de outro slot, trocam). Proibidas: WASD, 1-6, M, V, B, C, I, K, X. G e Z agora liberados (G antes abria o Guia, so quando nao ha skill nele).
- Dados por personagem (`isblade.custom_slots_v5.<id>`, `isblade.hotbar_keys.<id>`; le o global antigo se nao houver). Arena e cidade. Backups: *_antes_atalhos.html, js/mu_hud_antes_atalhos.js.
- Testado (Chrome headless, arena): tecla reservada recusada, troca de tecla, mover skill de slot e apertar G dispara a skill. NAO testado: arrastar com o mouse de verdade, cidade, item por tecla.

## 2026-10-30 — Vila (cidade) no Blender para organizar as casas
- `prototipo/assets/talking_island/vila_montagem.blend`: gerado por `tools/blender_maps/montar_vila.py` a partir de `village_data_threejs.json` (121 entidades: casas/muros/portoes em "Casas_e_muros", 92 arvores em "Arvores", referencias: chao, praca raio 21, portal da DG (-13.5,-13), spawn). three (x,y,z) -> Blender (x,-z,y); rotY = rotacao Z; altura = y do jogo (o jogo soma o relevo do terreno por cima).
- Volta para o jogo: salvar o .blend e rodar `tools/blender_maps/EXPORTAR_VILA.bat` (`exportar_vila.py`; faz backup `village_data_threejs.json.antes_vila_<hora>`). Duplicar (Shift+D) e apagar valem. Ida e volta testada sem mexer em nada: 121 entidades identicas.
- Limites: colisoes (`village_colliders.json`) NAO sao atualizadas ao mover casas (pendente); o relevo do terreno nao aparece no Blender.

## 2026-10-30 — Vila reorganizada exportada para o jogo
- Usuario moveu casas no Blender (vila_montagem.blend, salvo 17:19) e exportei para `village_data_threejs.json` (121 entidades; 13 mudaram: lojas, agit, casas, portao, arvores). Backup: `village_data_threejs.json.antes_vila_1793391585`. Colisoes (`village_colliders.json`) ainda NAO acompanham.

## 2026-10-30 — Ajustes das skills do Guardiao (feedback de jogo)
- Chuva de Escudos (g_s3) e Fortaleza Egide (g_s2): velocidade do clipe `sp` 1.0 -> 2.0 em guardiao.js (CM); o golpe sai na metade do tempo (chuva ~1,05 s, fortaleza ~0,5 s). Rugido (g_s4) nao mexido (usuario gostou).
- Escudos da chuva caiam de cabeca para baixo: `escudoFantasma` tinha `rotation.x = PI`; agora 0 (guardiao_fx.js v=7).
- Corrente de Puxao: so puxava o chefe (S.ex/ez); mobs nunca. Agora `hitMobs` (arena.html) puxa mobs comuns ate 2,6 m na frente do jogador (0,4 s, 100%); `mini_boss` e o chefe nunca sao puxados (removido o puxao do chefe em guardiao.js). Teste: mob a 6,5 m foi para 2,6 m. PvP (jogadores): pendente, com o servidor.
- Escudo de Energia (reflexo): alcance do reflexo e da expansao do domo 10 -> 15 m.
- guardiao.js v=13. Backups: js/guardiao_antes_ajustes.js, js/guardiao_fx_antes_ajustes.js, arena_antes_ajustes.html. Nao conferido visualmente: tempo do cast e o escudo de pe.

## 2026-10-30 — Baium: arena = circulo gigante do 3o andar; degraus
- Relato: Baium aparecia "la fora", degraus exigiam pulo (entrada e escada do 2o andar), muralha de prototipo na foto, area de luta tem que ser a circular inteira.
- Achado (mapa de colisao): o 3o andar tem um circulo gigante (centro (-28.4,-53.85), raio ~66-70, tapete em cruz) e um salao decorado pequeno atras da porta da muralha do circulo (o "salao" antigo). Usuario confirmou: Baium luta no CIRCULO GIGANTE; foto foi tirada la.
- mini_toi_regioes.json ganhou `arena` (centro, raio 62, spawn = 12 m para dentro da porta -> (-53.75,-100.46), gatilho 34 m); gerar_regioes.py passa a gera-la (backup gerar_regioes_antes_arena.py). torre.js v=7: chefe preso no circulo (antes: salao), ativo quando o jogador esta no circulo, nasce no spawn, porta abre sozinha a 34 m e acorda o Baium (backup js/torre_antes_arena.js).
- Degraus: os risers medidos no mapa ficam entre 0,9 e 1,04 (6899 pares, nenhum acima); `PASSO` 0.9 -> 1.04 (a mascara de bordas do mapa usa 1,05, entao nao abre buraco). Escada do 2o andar e soleira devem subir sem pulo. Nao testado andando de verdade.
- Teste (Chrome headless): hard -> 3o andar -> Baium nasce no circulo, visivel, ativo, sem erro. Muralha de prototipo NAO removida (falta saber qual e: a borda do circulo? uma peca BSP?).

## 2026-10-30 — Cenario do TECX LABS na torre + Baium 3x
- A "muralha de prototipo" da foto (muro baixo com pilares, estandarte, piso) era o cenario do TECX LABS 3D (`assets/cenario/env_arena_*.glb`, bandeiras) no centro do mundo (0,0), que cai dentro do circulo do 3o andar. Nao estava em ARENA_DECOR e so some com `?cenario=0` (por isso nao aparecia nos meus testes). Agora `cenLoad` registra tudo que carrega em ARENA_DECOR (somem ao entrar na torre, voltam ao sair). Nada a apagar no Blender. Backup: arena_antes_decor.html.
- Baium 3x: escala do modelo .014 -> .042 (~14 m) e raio do corpo (empurra o jogador) 1,25 -> 3,75. Alcances/areas dos ataques (data/combate.json boss.attacks) NAO mudaram. Backup: arena_antes_baium3x.html. Teste visual: Baium gigante no circulo, enquadramento cortado no topo (camera pode precisar de mais distancia).
