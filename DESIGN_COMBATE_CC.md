# Combate: controle (CC) e counters — árvore do Guardião (base: Dragon Nest)

Documento de **design** (nada disto está implementado). Versão 2: reescrita para seguir as regras do **Dragon Nest**, e não regras inventadas.

## 0. De onde vêm as regras (leia isto primeiro)
- **Fonte**: um guia de PvP da comunidade do Dragon Nest (2014/2015) — <https://onlineshopperslounge.blogspot.com/2015/03/dragon-nest-pvp-basics-fundamentals-w.html>. Ele descreve as regras **qualitativamente** e quase não dá números (nem durações, nem valores de super armadura). Procurei guias e wikis oficiais e **não achei** os números.
- **Marcação**: 🟢 = está no guia (regra do DN). 🟡 = número **nosso**, proposta para testar, porque o DN não diz. 🔴 = o DN não diz nada sobre isso (decisão nossa, ou melhor, do usuário que jogou).
- O que o guia **não** diz: tempo de invulnerabilidade ao levantar, imunidade depois de um stun ou derrubada, limite de combo no ar, resistências (stiff/float). **Eu tinha colocado "tenacidade de 4 s" e "levantada invulnerável de 0,5 s" na versão 1; isso era invenção minha, não do DN.** Saiu daqui. Ficam só como opção, no fim, se o teste mostrar que o controle virou prisão.

## 1. Os 7 estados de golpe do DN (o que acontece com quem leva o golpe)
| Estado | Regra (🟢 guia) | Duração |
|---|---|---|
| **Impacto leve** | congela por um instante: não dá para usar skill nem atacar; defesas passivas ainda funcionam; vários seguidos prendem a vítima | 🟡 0,2 s |
| **Impacto médio** | um pouco mais longo que o leve; serve para preparar um stagger ou um lift | 🟡 0,35 s |
| **Stagger (flinch)** | não pode usar skill ativa durante toda a duração (só habilidades especiais de escape); bem mais longo que o impacto | 🟡 0,6 s |
| **Empurrão (knock-back)** | algumas defesas ativas e passivas não funcionam (só as de escape, como um blink); um pouco mais longo que o stagger; parede quica e pode "levantar" de novo; **lentidão aumenta a duração** | 🟡 0,8 s |
| **Derrubado (knock down)** | vem de acumular stagger ou depois de cair no chão; **algumas skills não acertam quem já está no chão**; há um instante antes de cair totalmente em que ainda dá para acertar | 🟡 1,2 s |
| **Lift (no ar)** | o estado mais importante para combos; algumas skills de lift não levantam quem já está derrubado | 🟡 1,5 s (só para classes de combo) |
| **Stun** | **só acontece com a super armadura quebrada** (exceto stuns raros aleatórios); algumas skills têm 100% de chance; o alvo fica atordoado por **exatamente 3 s** e depois cai; quebrar a super armadura de quem está atordoado acaba o stun na hora; um derrubado pode ser atordoado e forçado a levantar | 🟢 3 s (o DN); 🟡 nós podemos usar menos |

## 2. Super armadura (SA): quem consegue interromper quem 🟢
- **SA Defesa**: quanto a skill aguenta antes de ser cancelada. Skills de animação **longa** costumam ter SA Defesa **alta**.
- **SA Quebra**: a chance/força de interromper a skill do outro. Skills **rápidas** costumam ter SA Quebra **alta** e SA Defesa **baixa**.
- Se a SA é quebrada, o estado de golpe da skill que quebrou é aplicado (stagger, empurrão, derrubado, etc.).
- A SA some se o alvo estiver congelado, com tempo parado ou em choque. Algumas skills **ignoram** SA Defesa (as que atravessam bloqueio ou i-frames).
- Os **valores** não estão no guia (ele aponta para uma planilha externa). 🟡 Proposta nossa: escala de 0 a 3. Regra simples: **a skill só aplica o estado de golpe se SA Quebra ≥ SA Defesa de quem está lançando**; senão, só causa dano e a vítima continua a skill.
- 🟡 **Guardião** (skills lentas e pesadas): Defesa **alta (2 a 3)** durante o preparo das skills 1, 2 e 3 e Quebra média. É o que dá a "sensação de tanque": você não é interrompido por golpe leve, mas as skills são lentas e dá para ver.

## 3. I-frames e defesas passivas 🟢
- **I-frames**: uma janela curta, no meio da animação de uma skill, em que o personagem quase não pode ser atingido.
- **Defesas passivas** são skills de escape com **recarga longa**. Toda classe tem:
  - **Esquiva** (Dodge/Blink/Tumble), com Shift + direção. 🟢 Nós já temos: rolagem com 0,34 s de imunidade e custo de estamina.
  - **Esquiva aérea**: só dá para usar **no estado lift**. 🟢
  - **Uma ou mais específicas da classe**, normalmente usáveis em certos estados de golpe (ex.: um blink extra para a feiticeira; uma granada de luz que tem chance de atordoar durante o stagger). 🟢
- **"Wake attack"** (golpe ao levantar) é uma defesa passiva do DN para escapar do chão: **é isso que corresponde à "levantada invulnerável"**. No DN **não é automático**: é uma habilidade com recarga. 🟡 Proposta nossa: cada classe tem um escape do chão com recarga de 25 s e meio segundo de i-frame.
- Quem não tem skill ativa com i-frames ganha uma defesa passiva extra (regra do DN) — dá equilíbrio entre as classes.

## 4. Combos (como o DN faz) 🟢
- Stagger e lift abrem combo; o impacto médio prepara stagger ou lift.
- Quem sabe jogar faz 2 ou 3 ataques normais no alvo atordoado antes de usar a skill grande.
- O timing do stun e da derrubada é o centro de "pegar" o adversário de novo.

## 5. Mapa do Guardião (só as 6 skills que já existem)
Tempos medidos no jogo: "golpe" = quanto depois de apertar o golpe acerta. SA = Defesa (D) e Quebra (Q) na escala de 0 a 3 🟡.

| Skill | Papel | Golpe | Recarga | D / Q | Estado de golpe aplicado | Como é counterada |
|---|---|---|---|---|---|---|
| **1 Escudo de Energia** (segurar) | reflexo / proteção | segura até 5 s, golpe 1,5 s depois | 15 s | D 3 / Q 1 | ao soltar, onda em cone de 180° e 10 m; a força cresce com a carga: **50% = impacto médio**, **100% = empurrão**, **200% = derrubado** | atacar por trás; quebrar a SA enquanto segura (precisa de Q ≥ 3); esquiva |
| **2 Fortaleza Égide** | zona + dreno de vida | 1,02 s | 25 s | D 2 / Q 2 | o impacto **derruba** a até 2,5 m do centro; a zona dá lentidão leve | sair do raio, esquivar na hora do impacto; a pose de salto de ~1 s é o aviso |
| **3 Chuva de Escudos** | dano em área | 2,10 s | 14 s | D 2 / Q 1 | cada escudo: **impacto leve**; zona com lentidão de 30% | sair da área; é a mais lenta e a mais fácil de ver |
| **4 Rugido** | aggro | 0,85 s | 20 s | D 1 / Q 2 | PvE: provocar. PvP: **stagger** em quem está conjurando por perto, e "provocado" 4 s (-35% de dano contra quem não é o Guardião) | SA de Defesa alta aguenta o stagger; esperar a provocação passar |
| **5 Corrente de Puxão** | engate | 0,67 s | 18 s | D 1 / Q 3 | **puxa** e **atordoa** (quebra a SA) | esquivar na hora do disparo; SA de Defesa 3 (rara) impede o stun |
| **6 Arremesso do Escudo** | dano à distância | 1,43 s (ida) e 1,98 s (volta) | 16 s | D 1 / Q 2 | ida: **empurrão**; volta: **impacto médio** que puxa um pouco | desviar do disco; esquiva |

**Janela de combo** (como no DN: atordoa, mete 2 ou 3 normais, depois a skill grande): puxão (0,67 s) → stun → **2 ou 3 ataques básicos (≈0,3 s cada)** → **Rugido (0,85 s)**. Com stun de 🟡 1,5 s cabem os básicos e o Rugido, mas não a Fortaleza (1,02 s). Se quisermos o 3 s do DN, cabe a Fortaleza e o combo fica longo demais: **precisa ser decidido** (pergunta 1).

## 6. Counters entre classes (hipótese, a validar jogando) 🟡
No DN o equilíbrio vem de SA, i-frames e mobilidade. Com os 3 arquétipos que temos:
```
Guardião (escudo)  >  Mago (cajado)  >  Espadachim (espada)  >  Guardião
```
| Quem ganha | Por quê | Como o perdedor ainda vence |
|---|---|---|
| **Guardião > Mago** | puxão alcança 14 m e quebra SA; Rugido e empurrão interrompem conjuração (o mago tem SA baixa) | blink/esquiva na hora do puxão; o mago mantém distância |
| **Mago > Espadachim** | dano de longe e lentidão; kite | o espadachim fecha a distância com a esquiva/investida e usa skills com SA alta para atravessar |
| **Espadachim > Guardião** | mais rápido, tem lift (o Guardião não tem esquiva aérea de classe), skill com Quebra alta e i-frames atravessam as skills lentas do Guardião | o Guardião usa a Defesa alta, o dreno de vida e o Rugido para forçar a luta no corpo a corpo |

## 7. O que isso exige no código (quando aprovarmos)
1. **Dados**: em cada skill (`data/armas/*.json`): `sa: { defesa, quebra }`, `golpe: { estado, duracao, deslocamento, quando }`, `iframes` (janela).
2. **Servidor** (PvP): a vítima ganha um estado de golpe com duração; a regra "SA Quebra ≥ SA Defesa" é decidida no servidor, que também ignora ações de quem está controlado e limita o movimento; evento `cc` para o cliente.
3. **Cliente**: animações nativas do L2 (`Damagefly`, `DeathWait`+`Rebirth`, `hit_large`); ícone de status; defesas passivas com recarga (a esquiva já existe).
4. **PvE**: reaproveitar medidor de guarda, `stagger`, `launch` e `stun` dos mobs.
5. **Testes**: bots no servidor para SA, estados, esquiva e combos.

## 7b. Decisões já tomadas (2026-10-29)
- **Stun curto**: entre 1,5 e 2 s (o DN usa 3 s, mas o que decidia a luta lá era **saber combar**, não aguentar o stun). Valor padrão: **1,8 s**, ajustável por skill. Com 1,8 s o combo do Guardião cabe inteiro: puxão → stun → 3 ataques básicos (≈0,9 s) → Rugido (0,85 s).
- **Combate**: regras do **Dragon Nest** (estados de golpe, super armadura Defesa x Quebra, i-frames, defesas passivas com recarga, combo), **rápido e na mira**. Sem sorte: o resultado de um golpe é determinístico, para o combo ser aprendível.
- **Estilo das skills**: **Cabal** para a identidade (fantasia, nome, efeito grande e chamativo, buffs e áreas); **Dragon Nest** para o comportamento (papel, estado de golpe, SA, combo, mobilidade). O Guardião é **único** (não é cópia de nenhuma classe do DN).

## 8. Decisões do usuário
1. ~~Duração do stun~~ → decidido: 1,5 a 2 s (padrão 1,8 s).
2. ~~Escape do chão~~ → **decidido: SIM**, "wake attack" em todas as classes, recarga 🟡 25 s + 0,5 s de i-frame.
   Animações L2 (medidas no `MFighter_anim.psa`): cair = início de `Death` (~0,6 s); deitado = `DeathWait`; levantar = `Rebirth` (1,03 s, acelerável); golpe = `Rebirth` acelerado emendado na pancada da arma da classe (Guardião: pancada de escudo da skill 2).
3. **Counters entre classes**: a relação do item 6 serve? Do DN, o que você lembra de quem ganhava de quem?
4. ~~PvP x PvE~~ → **decidido: mesmos números** nos dois ("padrãozão"); revisitar depois.

## 9. Opcional, NÃO é do DN (só se o teste mostrar controle infinito)
- Tenacidade: depois de stun ou derrubada, 4 s em que o próximo controle forte dura 50%.
- Levantada invulnerável automática de 0,5 s.
