---
name: estilo-fx-refinado
description: Diretrizes mandatórias de acabamento visual refinado e efeitos leves para criação de habilidades (skills) e FX de todos os personagens no IS BLADE. Proíbe peças maciças geométricas e estabelece o padrão de elegância visual, luz pura, geometria esbelta e alinhamento estético.
---

# 💎 PADRÃO DE EFEITOS LEVES E ACABAMENTO REFINADO (IS BLADE)

> **LEI FUNDAMENTAL DO PROJETO**:
> *"Todas as skills têm muita peça maciça ao invés de um efeito leve visivelmente falando. O acabamento fino e refinado é o nível padrão obrigatório para Claude e Antigravity."*

Este documento rege a modelagem 3D (Blender), os shaders procedurais (Three.js) e as animações de todas as habilidades de classes (Mago, Clérigo/Healer, Arqueiro, Guerreiro, Guardião e futuras raças).

---

## 🛑 1. O QUE É TERMINANTEMENTE PROIBIDO (PEÇAS MACIÇAS)

1. **PROIBIDO Sólidos Maciços Brutalistas**:
   - Nunca use cones de 4 lados, cubos pesados, prismas grossos ou cilindros opacos simulando magia.
   - Magia não é concreto, madeira ou plástico. Habilidades devem parecer feitas de **energia pura, luz celestial, fogo etéreo ou névoa mágica**.
2. **PROIBIDO Engrenagens e Serras Giratórias**:
   - Magia celestial/sagrada é solene, graciosa e nobre.
   - Nunca crie mandalas com dentes de serra triangulares no chão ou discos que fiquem girando freneticamente como uma serra elétrica.
3. **PROIBIDO Duplicação Conflitante de Formas**:
   - Nunca empilhe um elemento 3D rotacionado junto com um sprite 2D billboard que gire para a câmera com a mesma forma (ex: cruzes 3D + cruzes 2D billboard = efeito desalinhado de "3 cruzes brigando").
   - O elemento 3D deve ser **ÚNICO**.
4. **PROIBIDO Formas Orgânicas Tosquinhas**:
   - Asas de anjo não são tiras ou chifres curvados simplórios. Devem ter **anatomia de penas reais em camadas articuladas** (primárias longas fanning, secundárias e plumas de ombro).

---

## ✨ 2. OS PILARES DO ACABAMENTO REFINADO (EFEITOS LEVES)

### A. Geometria Esbelta e Lapidação Diamante
- **Proporções Nobres**: Hastes esbeltas e delgadas com espinha central em relevo (crista facetada estilo diamante que reflete a iluminação).
- **Proporção Clássica em Cruzes**: Haste inferior mais longa e afilada (estilo crucifixo sagrado relicário), permitindo que a cruz caia e se finque com firmeza no chão.
- **Bordas e Chanfros**: Todo modelo deve ter chanfros (*bevel*) para que as quinas peguem brilho de espéculo/bloom.

### B. Luz Pura, Gradientes e Miolo Incandescente
- **Núcleo Branco Incandescente**: O centro da magia deve ser branco puro ultra-luminoso (temperatura alta de energia).
- **Gradiente de Cor Suave**: O núcleo decai suavemente para a cor temática da habilidade (ouro imperial para luz, esmeralda para cura, azul etéreo para mana, carmesim para guerreiro).
- **Queda Suave (*Falloff*)**: Bordas suaves com Fresnel aditivo ou ShaderMaterial transparente aditivo (`depthWrite: false`).

### C. Alinhamento Visual Absoluto
- Se o projétil ou objeto mágico é 3D:
  - Ele deve ser construído com simetria limpa centrada em `(0, 0, 0)`.
  - Halos luminosos anexados devem ser **radialmente simétricos** (círculos/esferas de luz suave), de modo que, mesmo olhando em qualquer ângulo ou girando para a câmera, **nunca ocorra desalinhamento**.
  - Luz pontual (*point light*) posicionada exatamente no centro de gravidade da energia.

### D. Volumetria Translúcida
- Se houver colunas de luz descendo do céu ou cúpulas protetoras:
  - Elas devem ser **altamente translúcidas e etéreas**, permitindo que o personagem, as asas e o efeito principal sejam vistos claramente através da luz.
  - Nunca use cilindros 100% brancos opacos que tapem a visão do jogador.

### E. Movimentos e Dinâmica com Propósito
- **Cura Mirada**: A cruz de cura cai do céu em pé, vertical, fincando sua haste inferior no chão com impacto sagrado e abrindo uma onda suave de bênção ao redor.
- **Ressurreição**: Abertura em leque majestosa de asas angelicais de penas reais, erguendo o aliado e coroando seu despertar no feixe celestial.
- **Projéteis**: Voo limpo, reto e veloz com rastro estelar tênue, explodindo em faíscas cintilantes no impacto.

---

## 🌟 2.1 REGRA OBRIGATORIA: OPTICAL LENS FLARE EM TODA HABILIDADE

Todo efeito visual de habilidade de personagem **deve conter** o efeito tecnicamente chamado **Optical Lens Flare** (tambem: *Starburst Flare Anamorfico* / *Feixe Radioso de Luz Pura*). Componentes:

1. **Nucleo incandescente**: centro em losango/diamante de altissima intensidade luminosa.
2. **Feixes anamorficos afilados**: estendem-se do nucleo e se dissolvem suavemente no ar (queda exponencial de luz / *soft falloff*).
3. **Zero arestas poligonais**: nao pode ter cara de "peca 3D dura"; deve se comportar como pura energia luminosa (aditivo, `depthWrite: false`, bordas dissolvendo).

Aplica-se a todas as classes e skills (ataque basico incluso), com a cor tematica da skill nos feixes e o nucleo em branco quente. Cor/forma dos feixes segue as demais regras (sem rosa/lilas, sem esfera/anel).

---

## 📋 3. CHECKLIST ANTES DE CONSIDERAR UMA SKILL PRONTA
- [ ] O efeito parece leve e luminoso, ou parece um pedaço maciço de plástico/concreto?
- [ ] O modelo 3D é único e sem geometrias duplicadas desalinhadas?
- [ ] O chão é sagrado e calmo, livre de dentes de serra ou giros de engrenagem?
- [ ] A iluminação e os materiais possuem miolo incandescente e queda suave?
- [ ] As formas orgânicas (asas, penas, lâminas) possuem acabamento lapidado e profissional?
- [ ] Contem o Optical Lens Flare (nucleo losango incandescente + feixes anamorficos com soft falloff, sem arestas poligonais)?
