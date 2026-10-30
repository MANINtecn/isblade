# Receita de skill do Guardiao (Blender)

Padrao fechado no ataque basico (golpes 1, 2 e 3). Toda skill nova segue isto.

## Animacao
- 48 fps. Poses-chave em `atk.py` (dicionario ATKS), todos os frames calculados (`dense`).
- Antecipacao antes do golpe, excesso no impacto e assentamento (`add_overshoot`).
- Corpo conduz 2 a 3 frames antes; escudo e bracos chegam depois (`LEAD`).
- Respiracao e troca de peso sutis durante todo o golpe.
- Giro de corpo inteiro: usar `rigid=1`, `fy=yaw`, `fo=yaw` (quadril gira tudo, pes acompanham).
- Escudo acompanhando o giro: `sf=1` (syaw fica relativo ao corpo).
- Deslocamento (corrida, salto para frente) e feito pelo codigo do jogo; a animacao fica no lugar.

## Efeitos (atk_fx2.py)
- Cada golpe = uma colecao FX_Atk0X. Mostrar so a colecao do golpe que esta tocando.
- Tudo sincronizado ao frame de impacto medido (escudo toca/atinge no frame exato).
- Fora do seu tempo, todo efeito encolhe a escala 0 (aparece certo no modo Solid).
- Poeira: esfera com material de fumaca (ruido + borda suave), girada aleatoriamente.
- Faiscas e riscos: espetos afilados com degrade (`mesh_spike`, `grad_alpha`).
- Onda de choque: anel plano fino, centro transparente, brilho na borda (`wave_ring`).
- Clarao: disco com degrade radial (`glow_disc`); estrela fina dourada (`star`).
- Faixas de movimento: `arc_band` com `bell_alpha` (some nas bordas).
- Chao quebrado (so no golpe final da sequencia): lascas angulares de pedra (casco convexo),
  lajes, cratera, rachaduras em 3 camadas que se abrem do centro (`add_reveal`).
- Pedra: textura `assets/personagens/fx_rock_albedo.png` + bump, projecao em caixa.

## Entrega de cada skill
Acao no Blender + colecao de FX + textura usada + frames de dano e de encadeamento anotados.

---

# Receita v2 — skills em cima das animações NATIVAS do L2 (vale para as próximas skills e classes)

Decisão do usuário (2026-10-29): partir dos clipes de braço/conjuração que o L2 já tem, em vez de animar do zero (os `g_skillN` do Blender começavam na postura agachada de pernas abertas e "travavam" o personagem).

1. **Escolher o clipe.** Importar o PSA da raça no Blender (`guardian_skills.blend`, addon `io_scene_psk_psa`, `bpy.ops.psa_import.import(filepath=...)`; traz as 114, guardar só as candidatas). Medir (alcance e altura das duas mãos, quadro do pico de velocidade, queda da pelve) e **ver os quadros**. O pico de velocidade costuma ser o impacto. PSA do lutador: `assets/personagens/raw_fighter/Fighter/MeshAnimation/MFighter_anim.psa` (30 fps; os "Social_" são 20 fps).
2. **Montar a ação** com `tools/blender_fx/skills_l2.py`: recorte [a,b], velocidade, pausa final (se a skill tem efeito depois do braço, como o escudo voando) e conversão para 48 fps. Anotar o **quadro do impacto**.
3. **Exportar** com `export_guardian.py` (nome do clipe no jogo: `l2_sN`) e **salvar o .blend** (uma vez perdemos a `Dodge_Roll` por não salvar).
4. **Ligar no jogo** (`js/guardiao.js`, tabela `CM`): `c` (clipe), `sp` (velocidade), `hit` (impacto / duração do clipe), `cut` (**último golpe + recuperação de 0,10 a 0,25 s**, e não o fim do clipe: o resto é a "cauda" de relaxamento que trava o personagem), `solta` (instante em que algo sai da mão), `fz` (congelar para segurar a pose, skill de canalizar). Skills de vários golpes: `hits` no JSON da arma.
5. **Cancelamento**: `G.podeCancelar` só libera **depois do último golpe**. Nunca skill em cima de skill nem efeito perdido.
6. **Efeitos** entram em `fxSwing` (no impacto), `aoCastar` (antes do golpe) ou `fxBasico` (golpes). O **pré-aquecimento** (`G.aquecer`) roda esses mesmos códigos uma vez ao carregar e compila os shaders; não precisa fazer nada para ele cobrir um efeito novo, mas **nunca dar `dispose` em material de efeito** logo após usar (o three.js destrói o programa do shader quando o último material dele sai).
7. **O que o clipe do L2 não faz**: mover objetos. O escudo não voa mais pelo clipe, então voo/projétil é efeito separado (`FX.escudoVoo`), escondendo o escudo real do braço durante o voo.
8. **Testar sem GPU real**: ler `Guardiao.cena().S` (`S.anim.tt`, `S.anim.total`, `hit`) em tempo de jogo; contar `gl.linkProgram` para achar compilação de shader durante a skill; fotos de cada instante com Playwright. O headless roda a ~1 fps: não serve para cronometrar quadro.
