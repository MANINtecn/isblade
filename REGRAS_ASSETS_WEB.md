# Regras de assets e carregamento (IS BLADE)

Valem para todo mundo que mexe no jogo (dono, Claude, Gemini, Antigravity). Criadas em 16/11/2026, depois de medir o jogo e comparar com um cliente de L2 que roda no navegador.

Ideia central: **o navegador nunca recebe o arquivo que o Blender exporta.** Existe a ORIGEM (o que a gente edita) e a ENTREGA (o que o jogador baixa), e uma ferramenta gera uma a partir da outra.

## 1. Origem e entrega

| | Pasta | Quem escreve | Vai para o jogador |
|---|---|---|---|
| Origem | `prototipo/assets/` | Blender e ferramentas de extração | Só quando não existe entrega |
| Entrega | `prototipo/assets_web/` | Só o `otimizar.mjs` | Sim |

- Nunca editar nada em `assets_web/` nem o `js/assets_manifesto.js` à mão. São gerados.
- O código do jogo cita **sempre o caminho de origem** (`assets/personagens/elf_f.glb?v=7`). Nunca escrever `assets_web/` em HTML ou JS. A troca é feita pelo `js/assets_web.js`.
- Se a entrega falhar, o jogo cai sozinho na origem e avisa no console (`[assets-web]`). Aviso desses é defeito a corrigir, não ruído.

## 2. O que fazer depois de exportar ou trocar um GLB

Na pasta `prototipo`:

```
node tools/assets_web/otimizar.mjs
node tools/assets_web/verificar.mjs
```

1. O primeiro converte só o que mudou e atualiza o manifesto e a pré-carga.
2. O segundo abre cada modelo num navegador sem janela, com o three.js do jogo, e compara origem e entrega: malhas, vértices, ossos, nomes dos nós, texturas e animações.
3. Só entra no commit se o verificador disser que **todos** estão iguais. Origem, entrega, manifesto e pré-carga vão no mesmo commit.

Primeira vez na máquina: `npm install` dentro de `prototipo/tools/assets_web`.

## 3. O que a entrega faz hoje

- Malha e animação comprimidas com **meshopt**. A malha não é quantizada (os números continuam float), então colisão, grade de caminhada e fusão de peças do `mapa_vivo.js` não mudam.
- Rotação das animações em 16 bits. Diferença máxima medida: 0,0005 (o verificador reprova acima de 0,001).
- Texturas embutidas em **WebP** (qualidade 86), com teto de 2048 px.
- **Não usar `resample()`** nas animações: testado em 16/11, piorou a precisão (0,003) e não reduziu o arquivo.
- Não juntar materiais nem malhas na conversão: o jogo mexe neles por peça.

## 4. Código: como carregar

- Todo GLB passa por `THREE.GLTFLoader` (o gancho cobre `load`, `loadAsync` e `parse`).
- GLB baixado por `fetch` (como no `mapa_vivo.js`) usa `AssetsWeb.busca(url, opcoes)` no lugar de `fetch`.
- Página nova que carrega modelo 3D inclui, antes do script do jogo:
  ```html
  <script src="lib/meshopt_decoder.js"></script>
  <script src="js/assets_manifesto.js"></script>
  <script src="js/assets_web.js?v=1"></script>
  ```
  e, se usa o `vendor.js`, chama `AssetsWeb.instala(THREE.GLTFLoader);` logo depois do import.
- Para comparar com os arquivos de origem: abrir a página com `?brutos=1`.

## 5. Orçamentos (medidos em 16/11; não passar sem decisão do dono)

| Item | Teto | Hoje |
|---|---|---|
| Pré-carga essencial (até o lobby), no fio | 20 MB | 19,1 MB (era 51,1) |
| Um GLB de entrega | 6,5 MB | maior: 6,2 MB (humano com armadura) |
| Lado maior de textura | 2048 px | respeitado pelo conversor |

- "No fio" = depois da compressão do servidor. O Vercel já comprime GLB com Brotli, então **comparar tamanho em disco engana**: medir sempre o que trafega.
- A pré-carga só leva o que aparece até o lobby e a cidade. Mapa, chefe, armadura e skill que o jogador ainda não usa baixam na hora (`e: 0` no `precarga.json` ou carregamento sob demanda).
- `tools/gerar_precarga.py` refaz a LISTA da pré-carga. Rodar só de propósito e conferir o total: em 16/11 ele levaria a lista de 103 para 266 arquivos (112 MB), por incluir todas as variações de armadura.

## 6. Áudio e imagens soltas

- Som novo entra em **OGG**. Não adicionar WAV novo (hoje são 220 WAV, 24,5 MB, a converter).
- Imagem nova de textura 3D: até 2048 px. Interface (HUD, ícones) fica em PNG.

## 7. Cache

- `assets/` e `assets_web/` têm cache de 1 ano no Vercel. Arquivo de origem trocado precisa subir o `?v=N` no código, como já era; a entrega usa `?h=<hash>` automático.
- `js/assets_manifesto.js` fica em `js/` justamente para **não** pegar o cache de 1 ano.

## 8. O que ainda falta (em ordem de ganho)

Ordem revista em 16/11 depois do HAR do concorrente: os modelos deles vão **sem compressão** (GLB cru com PNG embutido). O que eles fazem é cortar o mundo em pacotes pequenos (0,5 a 2 MB por objeto), baixar só a região do jogador (13 pacotes, 10,7 MB, em 4 s), nomear cada arquivo pelo hash do conteúdo com cache eterno e usar workers. Regra que sai daí: **nenhum arquivo novo de mapa acima de 2 MB na entrega; mapa grande se corta em peças carregadas por distância.**

1. **Animações compartilhadas.** Cada armadura do mesmo corpo repete as mesmas 144 animações (cerca de 6 MB por arquivo na entrega). Separar em um arquivo de animação por raça/sexo. Mexe em como o personagem é montado: fazer com teste no jogo.
2. **Mapas e cidade em peças.** Hoje o `mapa_vivo.js` carrega o mapa inteiro num GLB (Fortaleza: 5,0 MB; mini_toi: 4,1 MB). Cortar em peças por região e carregar por distância.
3. **Texturas KTX2 (Basis).** WebP reduz o download, mas na placa de vídeo a textura continua descomprimida. KTX2 reduz a memória de vídeo, que é o que pesa no celular. Precisa de: `KTX2Loader` dentro do `vendor.js` (hoje não tem) e o codificador da Khronos instalado.
4. **WAV para OGG** e **PNG/JPG soltos para WebP** (11,7 MB da pré-carga essencial ainda são imagens e sons soltos).
5. **Decodificação fora da thread principal** (workers) para carregar modelo sem travar o quadro.
6. **Arquivos com hash no nome e cache longo**, no lugar de `?v=N` manual em 25 scripts.
