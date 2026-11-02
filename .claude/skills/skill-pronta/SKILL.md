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
- No jogo: anexar o clipe ao rig do personagem (mesmo mecanismo de `Guardiao.anexarClipes`: nomes de osso, só rotações + delta do quadril calibrado pela altura do quadril da raça) para o jogador **e** para os remotos; ligar a pose da skill ao clipe com `hit`/`cut` da raça (ponto onde sai o projétil/efeito).

## 4. Ícone (Cabal)
- `skillIconSVG` (em `arena.html` e `cidade.html`): novo glifo 32x32 em `SKILL_ICONS` (moldura aço `#0b121e`/`#2c3d55`, traços nítidos, acento ciano `#4fc3f7`/âmbar `#ffe082`, sem saturação de desenho animado) e `"icon":"<chave>"` na skill em `data/armas/<arma>.json`. Aparece na barra, no seletor (tecla K) e no HUD limpo. Conferir com print.

## 5. Som
- Efeitos por `pose_fase` na tabela `SFX` de `arena.html`/`cidade.html` (ex.: `g_s1_swing`, `g_s1_hit` usando `smp('<arquivo>',vol,taxa)` com WAVs do L2 em `assets/l2_sounds/`); voz de conjuração por personagem já existe (`Voz.tocar('skill')`). Procurar o som do L2 que combina com o efeito (vento, impacto etc.); se não houver, avisar.

## 6. Dados e servidor
- `data/armas/<arma>.json`: `name`, `pose` (usar pose própria da skill, não reaproveitar a de outra), `cd`, `dmg`, `range`, `half`, `dur`, `hitk`, `css`, `icon`, `proj:{speed,width,pierce,visual,escala}`, `desc`. O servidor lê o MESMO json (PvP): projétil voa de verdade (`criaProj`/`passaProj` em `servidor/server.js`, dá para ver e esquivar); golpe em cone usa `range`/`half`. Não mexer em regra do servidor sem perguntar.

## 7. Teste por raça (obrigatório)
- Servidor local: `PVP_R=3 DATA_DIR=$TEMP/isb_dados_teste PORT=8000 node servidor/server.js` (matar o processo ao fim; reiniciar se der 429/409: limite de 10 contas/h por IP).
- Playwright (Chrome, WebGL por software; fps baixo, esperar com `evaluate` em laço, não com `wait_for_function`): criar conta e personagem pelo API, `sessionStorage.isblade.fluxo=1` + token no `localStorage`, abrir `arena.html?go=pvp&wpn=<arma>`, `__torreDbg().castSkill(i)`, conferir: clipe tocando, projétil/efeito saindo no instante do `hit`, sem erro de página. Repetir para **cada tipo de personagem** (mínimo: 1 por raça e os dois gêneros se o clipe diferir) e capturar prints; ver qualidade média e alta.
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
