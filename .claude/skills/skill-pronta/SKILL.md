---
name: skill-pronta
description: Deixa uma skill do IS BLADE PRONTA dentro do jogo (efeito + animação própria de cada personagem + ícone + som + dados + teste por raça + diário). Use quando o dono disser "deixa a skill X pronta", "bota a skill X no jogo" ou "finaliza a skill X", depois de ele ter definido a animação e o visual no Blender. Argumento: classe/arma e número ou nome da skill (ex.: "mago 2", "guardião 4", "staff skills[2]").
---

# Deixar uma skill pronta no jogo (IS BLADE)

O dono define a **animação e o visual no Blender**; esta rotina leva tudo para o jogo. "Pronta" = **todos** os itens da seção *Definição de pronto*. Nada de entregar só o efeito.

## 0. Regras do dono (valem sempre; já foram quebradas, não quebre)
- **Ler o diário ANTES de começar**: `DIARIO_IS_BLADE.md` (raiz). `grep -n -i "<classe>\|<skill>"` e ler as entradas da classe de referência (Guardião: 26-29/10; Mago: 01-02/11). Ler também as memórias `skills-base-l2`, `guardian-skill-recipe`, `fx-quality-standard`, `fx-color-direction` (sem rosa/lilás; paleta de explosão real, não uma cor só), `combat-rules-dn`.
- **Registrar o PEDIDO no diário no INÍCIO** (palavras do dono + plano) e o RESULTADO no fim (feito / não testado / falta). Formato: `### [Claude] DD/MM/AAAA - Título`, no fim do arquivo (padrão do projeto).
- **Fazer só o pedido. Perguntar antes de ampliar** (servidor, balanceamento, outras skills). O que o dono já definiu no Blender não se refaz.
- **Commit sem linha de co-autoria** (nunca Co-Authored-By/Generated with). `.blend` não vai para o git. Push só com autorização já dada pelo dono na conversa.
- **Blender pelo MCP** (`mcp__blender__execute_blender_code`/`look`); `get_addon_status` primeiro. Se não conectar, pedir o clique "Connect to Claude" (N > aba Claude); **nunca abrir janela nova**. Conferir `bpy.data.is_dirty` e editar ao vivo; salvar com `bpy.ops.wm.save_mainfile()`. O que se renderiza na sessão (`bpy.ops.render.render`) é lido como PNG.
- Skills do L2 são a base ([[skills-base-l2]]): animação de conjuração/ataque NATIVA do L2 de cada raça; estilo Cabal na identidade (ícone/efeito), Dragon Nest no comportamento.
- Falar a verdade no relatório: o que foi visto em movimento, o que foi só renderizado, o que **não** foi testado.

## 1. Entradas (confirmar; só perguntar o que faltar)
- Arma/classe e índice da skill em `prototipo/data/armas/<arma>.json` → `skills[i]`.
- `.blend` da classe aberto no MCP (`prototipo/assets/personagens/<classe>_skills.blend`; mago: `mage_skills.blend` / `tools/blender_fx/mago_skill1_shuriken.py`; Guardião: `guardian_skills.blend`), coleção do efeito, quadros de voo/impacto.
- Qual clipe do L2 é a animação (padrão de mago: **CastShort**; outros: CastMid/CastLong/MagicShot/MagicThrow...). Se o dono não disse, usar o padrão da classe e avisar no relatório.
- Números de jogo se ainda não existem: `cd`, `dmg`, `range`, `dur`, `half`, velocidade/largura do projétil. Se faltar, propor e perguntar.

## 2. Efeito visual (Blender → jogo)
1. No Blender (frame 1, sem animação): selecionar os objetos do efeito e exportar GLB: `bpy.ops.export_scene.gltf(filepath=.../prototipo/assets/fx/<nome>.glb, export_format='GLB', use_selection=True, export_apply=True, export_animations=False, export_yup=True, export_image_format='NONE')`. **Sem texturas embutidas**; texturas do L2 (`trabalho_l2fx/export_bruto/...`, não vai ao git) reduzidas com PIL para ≤512 px e salvas em `assets/fx/`.
2. **Lição**: no GLB, objetos que eram filhos no Blender viram **filhos** da malha pai. Clonar com `clone(false)` e trazer os filhos soltos com a escala do pai (senão vêm cópias opacas brancas).
3. Módulo JS `prototipo/js/<classe>_fx.js` no molde de `js/mago_fx.js`: `init(THREE, scene)`, `criar...(escala)` → `{group, update(dt, prog), dispose()}`, `impacto(...)`, `tick(dt)`. Materiais REFEITOS no JS (aditivo/ShaderMaterial; Lambert na qualidade baixa; menos fitas em toque). Brilho: testar em qualidade **média e alta** (bloom estoura o aditivo); só mexer em intensidade depois de achar o culpado desligando parte por parte.
4. Ligar em `arena.html` **e** `cidade.html` (código duplicado): `<script src="js/<classe>_fx.js?v=N">`, `<Classe>FX.init(THREE,scene)` antes de `Net.init`, e para projétil o gancho em `spawnProj` (campo `proj.visual` nos dados), `updateProj` (anima/impacto), `projFim`. Para golpe/área: gancho em `skillSwingFx`/`skillHitFx`. Outro jogador vê o efeito pelo aviso `proj`/`atk` (`skillFxRemoto`, `projRemoto`).
5. Subir `?v=` de cada JS/GLB alterado nas duas páginas.

## 3. Animação própria de CADA personagem (L2)
- Cada raça/gênero tem o próprio PSA; usar o clipe da **própria** raça. Script: `prototipo/tools/blender_fx/mago_cast_anims.py` (rodar headless: `blender -b -P ... -- <Nome> <malha.psk> <anim.psa> <saida.glb> <medidas.json>`; troque o clipe procurado se não for CastShort). Saída: `assets/personagens/mago_cast/<PSA>.glb` (só esqueleto + clipe, 48 fps, ~100 KB) e `medidas.json` (`dur`, `hit`, `cut` em fração da duração, instante em que as mãos mais se esticam).
- Mapa tipo do personagem → PSA: `human_fighter`/`fighter`/`starter` → MFighter; `human_fighter_female`/`imperial` → FFighter; `magic_m` → MMagic; `magic_f` → FMagic; `elf_m` → MElf; `elf_f` → FElf; `darkelf_m` → MDarkElf; `darkelf_f` → FDarkElf; `dwarf_m` → MDwarf; `dwarf_f` → FDwarf; `orc_m` → MOrc; `orc_f` → FOrc. PSAs/PSKs brutos ficam em `prototipo/assets/personagens/raw_*` (fora do git).
- FEITO para o mago skill 1: `Guardiao.anexarCast(rig,THREE)` (js/guardiao.js) carrega `mago_cast/<PSA>.glb` pelo `rig.tipo`/`char_type`, deixa so rotacoes + delta do quadril e cria `rig.clips.m_cast1` + `rig.mCast{hit,cut}` (tabela `CAST_T`, vinda de medidas.json); `getClipConfig` (arena/cidade) devolve `vrm.mCast` para a pose `m_s1`; remotos tocam o clipe pelo nome (`m_cast` esta no regex ONCE do net.js). Para outra skill: novo clipe/GLB no mesmo molde, nova pose, entrada em `CAST_T`.
- (original) anexar o clipe ao rig do personagem (mesmo mecanismo de `Guardiao.anexarClipes`: nomes de osso, só rotações + delta do quadril calibrado pela altura do quadril da raça) para o jogador **e** para os remotos; ligar a pose da skill ao clipe com `hit`/`cut` da raça (ponto onde sai o projétil/efeito).

## 4. Ícone (Cabal)
- `skillIconSVG` (em `arena.html` e `cidade.html`): novo glifo 32x32 em `SKILL_ICONS` (moldura aço `#0b121e`/`#2c3d55`, traços nítidos, acento ciano `#4fc3f7`/âmbar `#ffe082`, sem saturação de desenho animado) e `"icon":"<chave>"` na skill em `data/armas/<arma>.json`. Aparece na barra, no seletor (tecla K) e no HUD limpo. Conferir com print.

## 5. Som
- Efeitos por `pose_fase` na tabela `SFX` de `arena.html`/`cidade.html` (ex.: `g_s1_swing`, `g_s1_hit` usando `smp('<arquivo>',vol,taxa)` com WAVs do L2 em `assets/l2_sounds/`); voz de conjuração por personagem já existe (`Voz.tocar('skill')`). Procurar o som do L2 que combina com o efeito (vento, impacto etc.); se não houver, avisar.

## 6. Dados e servidor
- `data/armas/<arma>.json`: `name`, `pose` (usar pose própria da skill, não reaproveitar a de outra), `cd`, `dmg`, `range`, `half`, `dur`, `hitk`, `css`, `icon`, `proj:{speed,width,pierce,visual,escala}`, `desc`. O servidor lê o MESMO json (PvP): projétil voa de verdade (`criaProj`/`passaProj` em `servidor/server.js`, dá para ver e esquivar); golpe em cone usa `range`/`half`. Não mexer em regra do servidor sem perguntar.

## 7. Teste por raça (obrigatório)
- Servidor local: `PVP_R=3 DATA_DIR=$TEMP/isb_dados_teste PORT=8000 node servidor/server.js` (matar o processo ao fim; reiniciar se der 429/409: limite de 10 contas/h por IP).
- Playwright (Chrome, WebGL por software; fps baixo, esperar com `evaluate` em laço, não com `wait_for_function`): criar conta e personagem pelo API, `sessionStorage.isblade.fluxo=1` + token no `localStorage`, abrir `arena.html?go=pvp&wpn=<arma>`, `__torreDbg().castSkill(i)`, conferir: clipe tocando, projétil/efeito saindo no instante do `hit`, sem erro de página. Repetir para **cada tipo de personagem** (mínimo: 1 por raça e os dois gêneros se o clipe diferir) e capturar prints; ver qualidade média e alta.
- Script pronto: `python prototipo/tools/teste_cast_por_raca.py <pasta_prints> tipo1,tipo2,...` (servidor local no ar; uma conta, varios personagens; o limite e 10 contas/h; nomes repetidos dao 409). Exige `__torreDbg().rig()`.
- Dois jogadores: o outro vê o efeito e o projétil.

## Definição de pronto (marcar cada item no relatório)
1. Efeito no jogo (GLB + JS + ganchos arena/cidade), brilho ok em média e alta.
2. Animação própria de cada personagem (clipe do PSA da raça, `hit`/`cut` medidos) e ligada à pose da skill.
3. Ícone Cabal na barra, menu K e HUD.
4. Som (L2) no disparo e no impacto.
5. Dados no `.json` (`icon`, pose própria, valores) e coerência com o servidor.
6. Teste por raça com prints; outro jogador vê.
7. Diário: pedido no início, resultado no fim (o que NÃO foi testado), commit sem co-autoria.
8. Relatório curto ao dono: o que mudou, o que ficou fora, o que decidir.

## Quando algo desta rotina estiver desatualizado
Corrija este arquivo (`.claude/skills/skill-pronta/SKILL.md`) no mesmo commit e anote no diário.

## Ataque padrao (basico) de uma classe: o que o mago ensinou
- Combo de 3 niveis = poses `sweep/thrust/spin` (arvore de combo do jogo). Para efeito em PONTO MIRADO: `perform()` chama `magoBasicoIni` (usa `pontoMira`, guarda `an.alvo`/`an.raioM`/`an.magoB`; o dano de area reaproveita o sistema `mira` de `hitMobs`/`applyHit`). O aviso aparece do inicio do golpe ate o `hit`; no `hit` brotam os efeitos (`magoBasicoHit`).
- Numeros em `data/armas/<arma>.json -> basico` (cliente e servidor leem o mesmo). Servidor: `ataqueMira` (server.js) aplica o dano no PvP depois do aviso (`d` enviado pelo cliente), para dar tempo de sair. Remotos: `fxBasicoRemoto(e,id,f,m)` com `m.x,m.z,m.d`.
- Testes: `tools/teste_mago_basico_pvp.py` (2 jogadores, dano e visual no remoto) e `tools/teste_mago_basico_pve.py` (chefe da arena, `?mode=duel`). Em teste, a mira segue a camera: leia `S.face` depois de um `perform` antes de posicionar o alvo.
- Dono tem fobia a redondo: so formas angulares (memoria `evitar-formas-redondas`).

## Pronta = o jogo inteiro (regra do dono, 02/11)
- Skill ou ataque padrao pronto vale em TODO lugar onde ha combate, nao so na arena. Hoje as unicas paginas com combate ao vivo sao `arena.html` (Torre, DG, duelo, mapas abertos `?mapa=`) e `cidade.html` (espantalho, PvP da cidade); `combate.html` e legado, sem link. Ao ligar uma skill, conferir as DUAS: `grep -c "<Classe>FX\|magoBasicoIni" prototipo/arena.html prototipo/cidade.html` e testar nas duas (e num mapa aberto). Se surgir pagina nova de combate, entra nesta lista.
- Nada de entregar so onde foi pedido primeiro: a rota inteligente e perguntar "onde mais o jogador luta?" antes de dizer que esta pronta.

## Skills do mago 2 a 5 (o que o Meteoro/Disco/Coluna/Espinho ensinaram)
- Efeito em JS procedural quando o desenho do Blender e so formas simples: `js/mago_fx2.js` (`MagoFX2.meteoro/coluna` para ponto mirado com aviso; `MagoFX2.cria[proj.visual]` para projetil; `paralisia/zona` para estados). O projetil recebe `p` em `update(dt, prog, p)` e pode trazer `impacto(p)` (ganchos em `spawnProj`/`updateProj`).
- Skill de AREA em ponto mirado: no json `mira:true, mira_min, mira_max, raio:[r], area:{delay, raio}` + `golpe` (CC). `applyHit` faz duas passadas (`an._tarde`): na 1a comeca o efeito e agenda; na 2a, `delay` s depois, cai o dano (mobs/chefe). O servidor (`areaSkill`) usa x,z,d enviados por `Net.atacou`. Na CIDADE o `castSkill` precisa do trecho `[mira]` (ja tem).
- Paralisia/zona: `proj.paralisa` (s) + `zona:{raio,dur,tick,dmg}`; cliente (`paralisaAlvo`, `zonasTick`) para PvE e servidor (`paralisa`, aviso `cc`) para PvP.
- Teste: `python tools/teste_mago_skills2.py <prints> <url> arena|cidade` e `tools/teste_mago_skills2_pvp.py` (cria o mago com `weapon:'staff'`; se criar com 'sword' ele joga com skills de espada).

## Skills do Guerreiro (espada 2 maos, Humano M): o que a Furia/Redemoinho ensinaram
- Clipes baked no Blender (`tools/blender_fx/guerreiro_skills.py` -> acoes W_*), exportados por `guerreiro_clips_export.py` para `assets/personagens/guerreiro_clips/<PSA>.glb` (clipes `w_s1,w_s3,w_s4,w_s5,w_s6`; `medidas.json` = duracoes). O jogo anexa com `Guardiao.anexarGuerreiro` (so rotacoes + delta do quadril e da raiz) e usa `vrm.wClips[pose]` em `getClipConfig`. Outras racas caem nos clipes de reserva da tabela de poses (`w_s*`).
- Redemoinho multi-golpe: `hits` no json = instantes medidos / duracao do clipe; cada golpe e uma "parte" enviada ao servidor (janela de 3 s desde o 1o). Instantes (s): 0,424 0,691 0,957 1,223 1,489 1,756 2,022 2,288 2,554 2,821.
- Grito de Guerra = `suporte:{tipo:'grito'}` (mesmo caminho da Prece do Clerigo, mensagem `sup k:'grito'`), efeito em `GuerreiroFX.hit('w_s5')`/`grito`.
- `js/guerreiro_fx.js`: trilha da espada pelo caminho real da ponta (`swd2h`), fenda/ondas/colunas/lascas; hooks `[guerreiro]` em arena.html e cidade.html (`tools/patch_guerreiro_paginas.py`).
- No Blender 5.1: acao de um objeto nao toca em copia dele sem `animation_data.action_slot = acao.slots[0]`.
