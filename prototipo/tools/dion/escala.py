"""Fator de escala unico de Dion (decisao 22/11/2026): a cidade L2 fica K vezes maior para o humano de 2,25 m do jogo caber nas portas (porta grande 2,7 m -> 3,4 m).
Aplicado no FIM de cada gerador (posicoes do jogo * K): montar_chao, montar_cidade, montar_brushes e gerar_walkgrid_dion. Voltar a 1.0 e regerar desfaz."""
K = 2.0
GEO_UU = 22.0      # [alinhamento 23/11/2026] a geodata L2 fica ~22 uu da UE (0,44 m; 0,88 m do jogo com K=2) ACIMA das malhas desenhadas (medido por ray cast no Blender em 1500 pontos: castelo, fortaleza e cidade, mediana 0,86-1,04 m). O terreno e o chao andavel saem da geodata, entao descem GEO_UU para encostar nas estruturas (que vem do mapa UE). Regerar: montar_chao, montar_brushes, montar_cidade e gerar_walkgrid_dion.
