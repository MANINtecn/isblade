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
