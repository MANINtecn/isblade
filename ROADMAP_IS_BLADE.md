# ROADMAP IS BLADE

Plano para avancar no jogo enquanto o TECX LABS 3D (cenario, itens, personagens) amadurece. Tudo aqui e feito DENTRO do jogo e depois recebe os assets reais quando chegarem.
Quem fizer algo marca `[x]` e registra no `DIARIO_IS_BLADE.md` (assinando Claude ou Gemini).
Criado em 22/10/2026 por Claude. Foco: PC, combate fluido estilo Dragon Nest.

Legenda: [ ] a fazer, [~] em andamento, [x] feito, (D) depende de asset do TECX LABS 3D.

---

## Fase 1 - Configuracoes e base de interface (agora)
- [x] Botao de Config (engrenagem) e interface de combos/gestos desligada por padrao.
- [x] Atalhos das skills reatribuiveis (Q E R F T Z), salvos no navegador, troca automatica se repetir tecla.
- [ ] Atalhos para as outras acoes: esquivar, bloquear, camera 1a/3a pessoa, cone, reguas.
- [~] Config: volume feito; falta sensibilidade do mouse, FOV, mostrar/ocultar FPS e dicas.
- [ ] Config: qualidade grafica (sombras, particulas, escala de render) para PCs fracos.
- [ ] Salvar tudo num objeto unico de configuracao (hoje cada opcao tem sua chave no localStorage).

## Fase 2 - Skills e efeitos (prioridade do dono: "falta efeito nas skills")
- [x] Dados de combate em JSON (`prototipo/data/combate.json`) + painel F2 de ajuste so em localhost (Claude, 22/10).
- [x] Skills por arma em arquivos separados (`data/armas/*.json`); trocar de arma troca as skills (Claude, 22/10).
- [~] Progressao estilo Albion: MAESTRIA POR ARMA feita (XP por arma, niveis liberam skills, barra na tela). Falta: arvore de variacoes por skill (escolher versao), balancear XP/niveis, e DEFINIR: 6 ou 8 slots? (decidido: armadura NAO da skills)
- [ ] Painel de ADMIN no servidor (futuro, com o site da ISLABS) para ajustar os valores; o F2 so existe para desenvolvimento.
- [x] Sistema de efeitos reutilizavel: anel no chao, coluna de luz, faixa de luz, flash de tela (Claude, 22/10).
- [x] SUÍTE DOS 3 MOTORES DE VFX INTEGRADA (Gemini, 23/10): `lib/three.quarks.min.js`, `lib/effekseer.min.js` (+ wasm) e Procedural Three.js, testados em `prototipo/teste_vfx_engines.html`. Regra combinada para Claude e Gemini:
  * Motor 1 (`three.quarks`): trilhas de armas, auras contínuas, efeito no set completo (MU Online +11/+15), faíscas turbulentas.
  * Motor 2 (`Effekseer`): magias e habilidades complexas anime/MMO carregadas de `.efkefc`.
  * Motor 3 (`Procedural Three.js`): relâmpagos contínuos em fitas 3D cruzadas, círculos rúnicos de canvas, decalques de crateras no solo e física de detritos 3D.
- [x] Som de Batalha e Soulshot autênticos do Lineage 2 extraídos de pacotes .uax e integrados no SFX (Gemini, 23/10).
- [x] Som de dano ("Urh! Urh!"), morte e level-up autênticos do MU Online integrados no SFX (Gemini, 23/10).
- [x] Variantes de skill por slot e refatoração completa do Guardião (Espada & Escudo 1HS) no estilo Cabal Online / Dragon Nest: Investida 8.5m, Corte Cruzado em X, Demolidor de Escudo (Shield Break com fissura e quebra de guarda), Execução Celestial em 2 tempos, Dança das Lâminas em 4 tempos coreografados e as 3 opções no slot Z (Barreira de Retribuição, Grito de Provocação e Lança Astral) — Gemini, 25/10.
- [x] Tela de selecao de skills (tecla K): escolher a versao de cada skill, com descricao, alcance, recarga e trava por maestria (Claude, 22/10). Ícones vetoriais estilo Cabal Online (sóbrios, moldura metálica escura) integrados tanto no HUD quanto no menu K (Gemini, 25/10).
- [ ] Melhorar efeitos gráficos das skills de Baium usando a nova suíte three.quarks + Effekseer (agendado com o dono).
- [ ] Balancear: Tempestade no ar tira ~26% da vida (pode estar forte).

## Fase 3 - Personagem: status, inventario, progressao
- [x] Itens com 4 raridades (normal, raro, epico, lendario), equipamento por slot, status (dano, vida, defesa, regen. estamina), drops do chefe e inventario (tecla I) — Claude, 22/10. Arma equipada define as skills.
- [ ] Itens: icones/modelos 3D (D), efeito visual por raridade, mais status (critico, velocidade), sets, venda/crafting, remover ou trocar o Rank/Nv do cacador.
- [x] Inventario (I), equipamento por 5 slots, drops do chefe e save no navegador feitos (Claude, 22/10). Falta: empilhar, comparar item, acessorios, tela de recompensa.
- [ ] Atributos: Forca, Agilidade, Vitalidade, Inteligencia/Foco (afetam dano, estamina, vida, recarga).
- [ ] Tela de status (tecla C) com atributos, vida, estamina, dano, defesa.
- [ ] Nivel e XP reais (hoje ha barra e Rank E, sem efeito), pontos para distribuir.
- [ ] Sets de equipamento com bonus por pecas equipadas.
- [ ] Efeito visual nos sets fechados (aura brilhante estilo MU Online quando o kit completo estiver equipado, usando three.quarks MeshSurfaceEmitter).

## Fase 4 - Inimigos e arena
- [x] Ilha de Talking (Cidade Inicial do Jogo) integrada em `prototipo/cidade.html` (Gemini, 23/10):
  * Praça central aberta transformada na **Arena de Duelo** com o emblema/logo oficial **IS BLADE** esculpido e iluminado no piso.
  * **Sem Obelisco** e **Sem NPCs** (espaço limpo e desobstruído para exploração, testes de combate e duelos).
  * Arquitetura autêntica de Lineage 2 extraída com 247 modelos glTF e 263 texturas (Guilda dos Guerreiros ao norte, casas medievais a leste/oeste, cais do porto ao sul e farol na ponta rochosa).
  * Oceano 3D dinâmico em Three.js circundando a ilha inteira, com controle de atmosfera (Dia, Pôr do Sol, Noite) e minimapa funcional.
  * Conexão direta entre `cidade.html` e `arena.html` através de botões de teleporte rápido.
- [x] Santuario com portal e escolha de dificuldade (Normal/Medio/Hard) para a dungeon (Claude, 22/10).

- [x] Efeitos macios com bloom (texturas suaves + brilho), maos na espada longa/cajado (IK), escudo vertical, troca de arma com X (Claude, 22/10).
- [x] Pegada real de duas mãos (Great Sword Idle) e cajado com mãos afastadas na haste + animações mágicas (Gemini, 22/10).
- [~] Dungeon jogavel (3 salas: obstaculos, mobs e chefe) feita em 22/10 (Claude, data/dungeon.json). Falta: mais chefes e variacoes de ataque, fases do chefe (50% / 25% de vida), mais salas e tipos de mob.
- [x] Inimigos comuns: Sombra (corpo a corpo), Brutamontes (armadura, golpe em area) e Conjurador (projetil a distancia), com barra de vida, IA, parry/bloqueio, drop (Claude, 22/10). Falta: modelos 3D proprios (D) e mais tipos.
- [x] Modo treino (Config): alvo que nao ataca nem morre, medidor de dano/DPS/combo, sem recarga e estamina infinita (Claude, 22/10).
- [ ] Ondas / sequencia de lutas com dificuldade crescente.
- [~] Arena: piso, muralha e 4 mastros instalados em 22/10 (Claude). Faltam: pilar, braseiro, ceu, colisao da camera com a muralha. (D) novas pecas do TECX LABS 3D.
- [ ] Iluminacao e ceu da arena. (D) ceu / skybox.

## Fase 5 - Polimento e "game feel"
- [ ] Camera: tremor nos impactos, leve zoom em golpes fortes, colisao da camera com cenario.
- [ ] 1a pessoa: mostrar espada e maos. (D) espada propria.
- [ ] Animacoes extras: pulo com golpes aereos (definir tecla), acao do botao direito do mouse.
- [x] (feito) fluidez: andar enquanto ataca, mira independente do corpo, memoria da esquiva (Claude, 22/10).
- [ ] Dano flutuante melhor, indicadores de ataque do chefe (telegrafo no chao).
- [ ] Limpar logs de diagnostico (`DBG`, `JSERR`, `JSREJ`, `FRAMEERR`, `?dbg=1`).
- [ ] Colocar a pasta do jogo em git.

## Fase 6 - Encaixe dos assets do TECX LABS 3D (quando chegarem)
- [ ] Cenario: carregar `.glb` em `assets\cenario\`, ajustar escala, colisao e iluminacao.
- [ ] Armas: prender na mao da Talibrac (`assets\armas\`), uma por tipo, trocar conforme o equipamento.
- [ ] Itens e sets: modelos 3D/icones substituindo os provisorios.
- [x] Novos personagens e sets do Lineage 2 integrados: Human Fighter (Base e Set Imperial Crusader S) com combate Dragon Nest 100% ativo e corrida/idle nativos do L2 (Gemini, 24/10).
- [x] Tela de Criação e Seleção 3D de Personagens (`criacao.html`): pedestal com runas, iluminação nobre, partículas, áudio de skills do L2, seleção de armadura/arma/destino e persistência de nome (Gemini, 24/10).
- [ ] Regras de entrega do `.glb`: metros, Y para cima, frente +Z, nos nomeados, normais exportadas, menos de ~30 mil triangulos por peca.

## Fase 7 - Mais tarde
- [ ] Celular/tablet: joystick, botoes de esquivar/bloquear, skills com toque, mira.
- [ ] Interface de combos/gestos (hoje em Config, desligada e em espera).
- [ ] Multiplayer / servidor (o projeto se chama IS "ONLINE" na origem; so depois do single player estavel).
- [ ] Teste de gerador de mundos pago (US$ 20) com criterios: estilizado, menos de 200 mil triangulos, combina com os personagens.

---

## Ordem sugerida (proximos passos)
1. Efeitos das skills (Fase 2): maior impacto na sensacao de jogo.
2. Atalhos das demais acoes e opcoes de Config (Fase 1).
3. Status + inventario basicos com itens provisorios (Fase 3).
4. Modo treino (Fase 4), para testar os efeitos e o balanceamento.
