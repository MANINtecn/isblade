# Levantamento do jogo — 17/11/2026 (Claude)

Base: ROADMAP_IS_BLADE.md, fim do DIARIO_IS_BLADE.md, medição de pastas e leitura de `progressao.json`, `combate.json`, `status_l2.json`, `status.js`.
Nada foi alterado no jogo; só este arquivo foi criado. Itens marcados (?) não foram verificados.

## 1. O que pesa

| Item | Medido | Problema | Ação sugerida |
|---|---|---|---|
| Pasta `prototipo` | 3,6 GB local (`assets/` 3,1 GB; `assets_web/` 101 MB gerado) | `assets/` é origem; o que o jogador baixa é `assets_web/` | Confirmar que `assets/` não sobe para a Vercel (?) |
| Repositório git | 505 MiB soltos (6.295 objetos, 0 pacotes), 2.826 arquivos | Nunca foi compactado; clone e deploy lentos | `git gc`; tirar da árvore o que é só origem pesada |
| Cópias de segurança `.antes_*` | 134 arquivos na pasta, 33 dentro do git | `arena.html` e `cidade.html` têm dezenas de cópias; `js/` tem `guardiao_antes_*` (~48 KB cada) e `guardiao_fx_antes_ajustes.js` (62 KB) | O git já é o backup: mover para uma pasta fora do repo e apagar do git |
| `arena.html` e `cidade.html` | 9.738 e 18.361 linhas, tudo inline | Difícil de manter; cada ajuste vira cópia nova | Extrair para `js/` por módulo, aos poucos |
| `js/` | 113 arquivos, 1,8 MB; `net.js` 75 KB, `guardiao_fx.js` 72 KB | Metade é cópia de backup | Limpar as cópias |
| Texturas | 0 arquivos KTX2 (regra em `REGRAS_ASSETS_WEB.md`); Fortaleza chegou a 291 texturas | Pesa na memória de vídeo do celular | Conversão KTX2 (precisa do `KTX2Loader` no `vendor.js`) |
| Modelos de personagem | 152 GLB; `human_fighter_*` com ~6 MB cada em 4 graus | Um personagem baixa várias dezenas de MB | Compartilhar malha e trocar só textura; Draco/meshopt |
| Mapas | `fortress.glb` 5 MB, `mini_toi.glb` 4 MB; Fortaleza ainda com ~600 peças | Chamadas de desenho altas no celular | Medir com o log de desempenho do jogo |
| Medição real | Nenhuma em celular de verdade (as medidas foram em placa por software) | Não dá para saber o gargalo | Dono joga e envia o log (Config > LOG DE DESEMPENHO) |

## 2. O que falta — status dos personagens (prioridade do dono)

Hoje:
- 4 atributos (FOR/INT/AGI/VIT), **2 pontos por nível**, nível máximo **99**. O dono quer 5 pontos por nível e atributos do L2.
- A tela de Status (`js/status.js`, 184 linhas) mostra só P.Atk, Vida máxima, P.Def e Estamina.
- Crítico é fixo: 10% × 1,5 em `data/combate.json`. Não há Precisão, Evasão ("Errou"), M.Atk, M.Def, Vel. de Ataque, Vel. de Conjuração, nem CP. O servidor não tem regra de acerto ou esquiva.
- A fórmula L2 de `status_l2.json` e `servidor/combate_l2.js` (arma × grau × encantamento × FOR/INT × nível contra a defesa) só entrou no **PvP**. Se o PvE usa a mesma conta, não conferi (?).
- Itens e encantamento somam só "dano" e "defesa%", nada de crítico ou evasão.
- O roadmap está desatualizado: ainda fala em nível 400 e 2 pontos por nível.

Falta para fechar o item "Status igual ao L2" (roadmap, Fase 3) e o CP (Fase 4):
1. Decidir com o dono: pontos por nível para distribuir (hoje) ou base fixa por raça/classe como no L2. A memória do projeto diz 5 pontos por nível, com status reais do L2 depois.
2. Atributos STR/DEX/CON/INT/WIT/MEN gerando P.Atk, M.Atk, P.Def, M.Def, Precisão, Evasão, Crítico, Vel. de Atq/Conj., Velocidade, HP/MP/CP e regeneração.
3. Servidor como juiz de acerto, esquiva e crítico (hoje o cliente sorteia o crítico).
4. Barra de CP que absorve só dano de jogador.
5. Janela de Character Status completa.

## 3. Outras lacunas (do roadmap e do diário)

Combate e classes:
- **Mago:** 1 de 6 skills prontas (o dono desenha as outras no Blender). Ajuste de dano do Mago no PvP ficou para depois.
- **Guerreiro:** as skills novas N0-N6 substituem as antigas; ligar e conferir por raça.
- **Clérigo:** falta testar celular, outras raças, flag em PvP, Ressurreição na DG e o Escudo Astral absorvendo golpe.
- Pose de cajado errada em algumas raças (Dark Elf segura como espada).
- Shuriken do mago saindo como quadrado preto na máquina do dono, sem confirmação.

PvP e servidor:
- Fórmula de dano PvP nova **não testada** em X1 real nem entre 2 jogadores, e a VPS precisa reiniciar para valer.
- Mobs de DG antigas por sala ainda comandados pelo líder do grupo.
- Itens: inventário agora com autoridade no servidor, mas falta balancear a adena.

Beta e conta:
- Critérios do beta abertos: 2 celulares de referência medidos, recuperação de conta, página do beta, vídeos, evento de abertura.
- Pendências de infra: DNS `jogar.l2ikarus.com`, trocar a senha da VPS (apareceu em imagem), repositório privado, renomear para L2 IKARUS ACTION.
- Dois agentes (Gemini e Claude) editam o mesmo repo: risco de conflito e de arquivos de cópia.
- Armadura no corpo (peças por raça) e armadura PBR ainda não feitas.

## 4. Ordem sugerida

1. **Limpeza do repositório** (cópias `.antes_*`, `git gc`, `.gitignore`): rápida e não mexe no jogo.
2. **Medir no celular** e atacar o peso real (KTX2, GLB de personagem, Fortaleza).
3. **Sistema de status L2** (itens da seção 2), com plano aprovado pelo dono antes de mexer no combate.
4. Skills do Mago e do Guerreiro com o que o dono entregar.
5. Fechar critérios do beta.

## 5. O que preciso do dono

- Pontos por nível: manter distribuição (5/nível) ou base fixa estilo L2?
- Autorização para apagar do git as cópias `.antes_*` (ficam guardadas numa pasta local).
- Log de desempenho de 1 celular médio e 1 fraco.
- As skills que o dono for juntar: quais classes e em que formato (.blend, ícone, som).
