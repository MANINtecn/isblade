# ⚔️ Tutorial: Criando Animações de Skills no Blender 5.1 (IS BLADE)

Este guia prático ensina passo a passo como você pode criar suas próprias coreografias de combate para o Guardião e testá-las diretamente dentro do **IS BLADE**.

---

## 🎬 1. Abrindo o Studio
1. Feche qualquer instância anterior do Blender.
2. Dê dois cliques em:
   👉 **`prototipo/ABRIR_BLENDER_SKILLS.bat`** (ou abra `prototipo/IS_BLADE_SKILLS_STUDIO.blend`).
3. O boneco carregará com:
   * Armadura Imperial completa e limpa (sem deformações nem esferas).
   * **Espada Bastarda** empunhada na mão direita (`Weapon_R_Bone`).
   * **Escudo Composto** acoplado no antebraço esquerdo (`Shield_L_Bone`).
   * Postura de prontidão com armas em punho (`Wait_1HS_MFighter`).

---

## 🦴 2. Entrando no Modo de Animação (Pose Mode)

1. No canto superior esquerdo da tela 3D, veja se está escrito **Object Mode** ou **Pose Mode**.
2. Clique no boneco / esqueleto e aperte o atalho:
   👉 **`Ctrl + Tab`**
3. Você entrará no **Pose Mode**:
   * Agora, ao clicar em qualquer parte do corpo (braço, mão, cabeça, perna), você seleciona o osso daquela junta.

---

## ⚡ 3. Atalhos Essenciais para Posicionar o Boneco

| Tecla / Atalho | O que faz |
| :--- | :--- |
| **`R`** | **Girar o osso** no plano da câmera |
| **`R` seguido de `R` (`R R`)** | **Giro Livre (Trackball)**: O melhor jeito de rotacionar braços e pernas naturalmente em 360° |
| **`G`** | **Mover o osso**: Use principalmente no osso da cintura (**`Bip01_Pelvis`**) para fazer o boneco agachar, afundar no chão ou saltar |
| **`Alt + R`** | **Limpar Rotação**: Devolve o osso selecionado para a pose reta original |
| **`Alt + G`** | **Limpar Posição**: Devolve o osso para a altura original |
| **`A`** | Seleciona todos os ossos do corpo |
| **`Alt + A`** | Desmarca todos os ossos |
| **`Barra de Espaço`** | **Play / Pause** da animação |
| **Botão do meio do mouse (Scroll)** | Gira a câmera ao redor do boneco |
| **`Shift + Scroll pressionado`** | Arrasta a visão da câmera para os lados |

---

## ⏺️ 4. O Segredo: Gravando os Movimentos (Auto-Keying)

Para você não ter que ficar apertando teclas chatas para salvar cada pose:

1. Na barra da **Linha do Tempo (Timeline)** na parte inferior da tela, procure o **botão redondo de gravação** (círculo de Record / Auto Keying).
2. Clique nele para **deixar azul (Ativado)**.
3. Agora, todo movimento que você fizer em qualquer frame será **gravado automaticamente**!

---

## 🎨 5. Como Criar uma Nova Animação do Zero (Passo a Passo)

1. Na janela inferior de animação (**Dope Sheet** / **Action Editor**), você verá o nome da animação atual (ex: `Wait_1HS_MFighter`).
2. Clique no botão de **Duas Folhas (Duplicate Action)** ou clique no **`+`** para criar uma nova ação.
3. Dê um nome bem claro para ela, por exemplo:
   * `minha_skill_corte_x`
   * `minha_skill_escudo_slam`
   * `minha_skill_danca`
4. Clique no **ícone de Escudo (Fake User)** ao lado do nome da ação (ele garante que o Blender nunca apagará sua animação, mesmo que você troque de ação).
5. Defina a duração da skill na barra inferior:
   * **Start**: `1`
   * **End**: `35` (ou `45` dependendo da velocidade que você quiser).

---

## ⏱️ 6. Coreografando o Golpe (Exemplo de Corte em X)

* **Frame 1**: Selecione os ossos do braço e coloque o boneco levantando a lâmina para o alto à direita (preparação do corte).
* **Frame 10**: Mude a agulha do tempo para o frame 10. Desça o braço riscando a lâmina para baixo na diagonal esquerda (primeiro golpe do X!).
* **Frame 18**: Mude para o frame 18. Gire o pulso e levante a espada para o alto à esquerda.
* **Frame 26**: Mude para o frame 26. Puxe a lâmina riscando para baixo na diagonal direita (segundo golpe cruzando o X!).
* **Frame 35**: Mude para o frame 35. Retorne o braço para a guarda de combate.

Aperte a **Barra de Espaço** e veja o boneco executar o golpe com vida própria! Se quiser acelerar um pedaço, basta arrastar as bolinhas amarelas (keyframes) na linha do tempo para mais perto.

---

## 🚀 7. Como Passar para o Jogo:

Assim que você terminar de criar ou ajustar sua animação:
1. Aperte **`Ctrl + S`** no Blender para salvar o arquivo `IS_BLADE_SKILLS_STUDIO.blend`.
2. Basta me mandar uma mensagem dizendo:
   > *"Terminei a animação da skill, ela está salva como `minha_skill_corte_x`"*
3. Eu rodo o processo automatizado que exporta os arquivos para o Three.js e conecto a sua animação na tecla da skill (E, R, F, T ou Z) imediatamente!
