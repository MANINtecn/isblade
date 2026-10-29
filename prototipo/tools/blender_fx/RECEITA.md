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
