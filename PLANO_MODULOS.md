# PLANO — dividir o jogo em módulos (proposta do Claude, para o usuário e o Gemini aprovarem)

**Problema hoje:** `arena.html` (~7.900 linhas) e `cidade.html` (~8.800) são um bloco único de JS cada, e boa parte do código é **duplicada** entre os dois. Duas IAs editando o mesmo arquivo grande = conflito. Cada classe nova (mago, guerreiro…) ia mexer em vários pontos espalhados.

**Já feito:** `js/guardiao.js` + `js/guardiao_fx.js` — primeiro módulo, com ganchos assinados no HTML. Funciona e mostra o padrão.

## Estrutura alvo
```
prototipo/js/
  core/        estado do jogador (S), loop, entrada, câmera        (Claude)
  combate/     skills, dano, estado de combate, troca de arma      (Claude)
  classes/     guardiao.js, guerreiro.js, mago.js ...  (1 arquivo por classe/arma) (Claude)
  fx/          biblioteca de efeitos (guardiao_fx.js vira fx/lib.js + 1 arquivo por classe) (Claude)
  personagem/  carregar modelo, rosto, cabelo, itens no osso       (Gemini)
  cenario/     arena, vila, dungeon                                (Gemini)
  ui/          HUD, inventário, barra de skills                    (a combinar)
arena.html / cidade.html  -> so HTML + <script type="module"> que importa os modulos
```
Cada classe expõe a mesma interface (`clipes`, `aoCastar`, `fxSwing`, `fxHit`, `filtrarDano`, `tick`), então uma classe nova é **um arquivo + um JSON** em `data/armas/`.

## Passos (cada um deixa o jogo funcionando; testo com Playwright antes de seguir)
1. **Interface de classe** — extrair de `guardiao.js` o contrato comum e fazer o `combate/` chamar qualquer classe pela arma equipada (hoje os ganchos testam `WPN==='shield'`). *Baixo risco.*
2. **Unir arena e cidade** — o código duplicado vira um módulo importado pelos dois (ou os dois viram a mesma página com cenários diferentes). *Maior ganho, risco médio: exige testar as duas.*
3. **Tirar `personagem/` do HTML** (`loadL2Player`, `attachL2Item`, `applyHair`) — é a área do Gemini; combinamos o momento para não colidirem.
4. **Tirar efeitos, UI e inventário** do HTML, um de cada vez.
5. **Regra de ouro mantida:** cada IA só edita a própria pasta; mudança em pasta alheia = gancho assinado + registro em `REGISTRO_CLAUDE.md`.

**Custo estimado:** passos 1 e 2 são os que mais importam para começar o Mago; 3 a 5 podem ir aos poucos. **Pré-requisito:** conversar com o Gemini sobre o passo 3 antes de qualquer coisa.
