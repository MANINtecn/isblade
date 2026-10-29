# 🏛️ ARQUITETURA DO SISTEMA DE PERSONAGENS & LOBBY — IS BLADE (TECX SOFTHOUSE)

> **LEI DE OURO E CONTRATO DE CO-WORKING (ANTIGRAVITY & CLAUDE):**  
> Nenhuma IA deve modificar, sobrescrever ou refatorar o código ou estrutura criada pela outra IA **A NÃO SER QUE O USUÁRIO PEÇA EXPLICITAMENTE PARA MODIFICAR**. Ambas as IAs devem ler este documento antes de qualquer alteração no sistema de personagens, garantindo a integridade dos 10 heróis, dos modelos 3D, dos slots de save e do fluxo de navegação.

---

## 1. Visão Geral da Arquitetura Comercial

O jogo **IS BLADE** opera com uma estrutura de MMORPG comercial completa de criação, seleção e persistência de personagens:

```
[ Entrada / Inicialização: index.html ]
                    │
                    ▼
          ┌─────────────────┐
          │  selecao.html   │ ◄───┐ Retorno via "👥 Trocar Personagem"
          │ (Lobby 7 Slots) │     │
          └────────┬────────┘     │
                   │              │
          ┌────────┴────────┐     │
          ▼                 ▼     │
     [Criar Novo]    [Entrar]     │
          │                 │     │
          ▼                 ▼     │
     ┌──────────────┐ ┌───────────────────────────┐
     │ criacao.html │ │ cidade.html / arena.html  │
     │(10 Heróis L2)│ │ (Mundo Aberto / Masmorra) ├─┘
     └──────────────┘ └───────────────────────────┘
```

---

## 2. Roster Canônico Completo de 12 Heróis do Lineage 2

Todos os 12 heróis foram exportados a partir dos pacotes canônicos do Lineage 2 Interlude (`Fighter.ukx`, `Magic.ukx`, `Elf.ukx`, `Orc.ukx`, `Dwarf.ukx`, `DarkElf.ukx`):

| ID Técnico | Nome / Gênero | Arquivo 3D | Animações PSA | Status |
|---|---|---|---|---|
| `human_fighter` | Humano Guerreiro (M) | `human_fighter.glb` | `MFighter_anim.psa` | ✅ Calibrado |
| `imperial` | Humano Imperial Crusader (M) | `human_fighter_imperial.glb` | `MFighter_anim.psa` | ✅ Calibrado |
| `human_fighter_female` | Humana Guerreira (F) | `human_fighter_female.glb` | `FFighter_anim.psa` | ✅ Calibrado |
| `magic_m` | Humano Místico (M) | `magic_m.glb` | `MMagic_anim.psa` | ✅ Calibrado |
| `magic_f` | Humana Mística (F) | `magic_f.glb` | `FMagic_anim.psa` | ✅ Calibrado |
| `elf_m` | Elfo Branco (M) | `elf_m.glb` | `MElf_anim.psa` | ✅ Calibrado |
| `elf_f` | Elfa Branca (F) | `elf_f.glb` | `FElf_anim.psa` | ✅ Calibrado |
| `orc_m` | Orc Guerreiro (M) | `orc_m.glb` | `MOrc_anim.psa` | ✅ Calibrado |
| `orc_f` | Orc Guerreira (F) | `orc_f.glb` | `FOrc_anim.psa` | ✅ Calibrado |
| `dwarf_m` | Anão Artesão (M) | `dwarf_m.glb` | `MDwarf_anim.psa` | ✅ Calibrado |
| `dwarf_f` | Anã Artesã (F) | `dwarf_f.glb` | `FDwarf_anim.psa` | ✅ Calibrado |
| `darkelf_m` | Elfo Negro (M) | `darkelf_m.glb` | `MDarkElf_anim.psa` | ✅ Calibrado |
| `darkelf_f` | Elfa Negra (F) | `darkelf_f.glb` | `FDarkElf_anim.psa` | ✅ Calibrado |

Cada modelo possui 13 ações canônicas padronizadas:
`idle`, `run`, `walk`, `guard`, `death`, `slash1`, `slash2`, `slash4`, `roll`, `idle_hand`, `run_hand`, `walk_hand`, `punch`.

---

## 3. Resolução da Aceleração das Animações ("Speed de GM")

### Causa Raiz Descoberta
Nos arquivos `.psa` do Lineage 2, a taxa de amostragem (`Rate` / FPS) é **individual para cada animação**:
- `Wait_*` (Respiração / Idle): Taxa de **3.0 FPS** (8 frames no total = 2.67 segundos de ciclo sereno).
- `AtkWait_*` (Guarda): Taxa de **6.0 FPS** (10 frames = 1.67 segundos).
- `Walk_*` (Passada normal): Taxa de **15.0 FPS** (11 frames = 0.73 segundos).
- `Death_*` (Queda de morte): Taxa de **15.0 FPS** (38 frames = 2.53 segundos).
- `Run_*` (Corrida): Taxa de **20.0 FPS** (18 frames = 0.90 segundos).
- `Atk01_*` a `Atk03_*` (Golpes de combate): Taxa de **30.0 FPS** (46 frames = 1.53 segundos).

Ao importar para uma cena Blender a 30 FPS, o importador padrão colocava 1 frame de PSA por frame da cena. Como consequência, uma animação de Idle de 8 frames durava **0.233 segundos**, repetindo 4.3 vezes por segundo (parecendo um GM acelerado com speedhack).

### Solução Matemática Definitiva
O script construtor lê os metadados brutos do chunk `ANIMINFO` do PSA e escala as fcurves no tempo:
$$\text{scale\_factor} = \frac{30.0}{\text{native\_fps}}$$

- Para `Wait_*` (3 FPS): Multiplicador de $10.0\times$ $\rightarrow$ Duração de **2.33s a 3.0s**.
- Para `AtkWait_*` (6 FPS): Multiplicador de $5.0\times$ $\rightarrow$ Duração de **1.5s a 1.67s**.
- Para `Walk_*` (15 FPS): Multiplicador de $2.0\times$ $\rightarrow$ Duração de **0.67s a 0.80s**.
- Para `Run_*` (20 FPS): Multiplicador de $1.5\times$ $\rightarrow$ Duração de **0.83s a 0.95s**.
- Para `Atk_*` (30 FPS): Multiplicador de $1.0\times$ $\rightarrow$ Duração inalterada de **1.5s**.

Desta forma, os arquivos `.glb` já contêm a cadência original gravada nos samplers de animação, operando em perfeita sincronia com Three.js.

---

## 4. Esquema de Armazenamento (`localStorage`)

### 4.1 Banco de Slots: `isblade_characters`
Chave: `isblade_characters`  
Tipo: `JSON Array` de objetos de personagem (máximo 7 slots).

```json
[
  {
    "id": "char_1730000000000",
    "name": "Lyra",
    "race": "elf_f",
    "charType": "elf_f",
    "set": "starter",
    "weapon": "dragon_slayer",
    "hairStyle": "back",
    "hairColor": "#e8c46d",
    "level": 1,
    "location": "Talking Island",
    "createdAt": "26/10/2026"
  }
]
```

### 4.2 Personagem Ativo Selecionado: `isblade_active_character_id`
Chave: `isblade_active_character_id`  
Tipo: `string` (ex: `"char_1730000000000"`).

### 4.3 Chaves de Compatibilidade Legada
- `isblade.player_name`: Nome do herói ativo.
- `isblade.char_type`: Tipo do modelo carregado (`human_fighter`, `imperial`, `elf_f`, etc.).
- `isblade.char_race`: Raça canônica.
- `isblade.weapon`: Arma (`sword`, `swordshield`, `none`).
- `isblade.hair_style`: Estilo (`both`, `front`, `back`).
- `isblade.hair_color`: Cor hex (`#ffffff`, `#e8c46d`, `#ba3b2a`, etc.).

---

## 5. Padrão de Customização de Cabelo (`applyHair`)

As malhas do cabelo (`Hair_Front` / `m00_ah` e `Hair_Back` / `m00_bh`) são manipuladas universalmente por:
```javascript
function applyHair(root, style, colorHex){
  if(!root) return;
  root.traverse(function(child){
    if(child.isMesh){
      var n = (child.name || '').toLowerCase();
      var isFront = n.indexOf('hair_front') !== -1 || n.indexOf('_ah') !== -1;
      var isBack = n.indexOf('hair_back') !== -1 || n.indexOf('_bh') !== -1;
      if(isFront || isBack){
        if(isFront && !isBack) child.visible = (style === 'both' || style === 'front');
        else if(isBack && !isFront) child.visible = (style === 'both' || style === 'back');
        if(child.material){
          var mList = Array.isArray(child.material) ? child.material : [child.material];
          mList.forEach(function(m){
            if(colorHex && colorHex !== '#ffffff'){
              m.color.setStyle(colorHex);
              if(m.emissive){
                var tc = new THREE.Color(colorHex);
                m.emissive.copy(tc).multiplyScalar(0.32); // Realce emissivo para cores vibrantes
              }
            } else {
              m.color.setHex(0xffffff);
              if(m.emissive) m.emissive.setHex(0x000000);
            }
            m.needsUpdate = true;
          });
        }
      }
    }
  });
}
```

---

## 6. Integridade do Cenário de Talking Island (`cidade.html`)

- O arquivo `prototipo/assets/talking_island/village_data_threejs.json` contém 121 entidades de vilarejo (casas, telhados, igreja, estátuas, mourões).
- Para evitar que erros de cache do navegador exibam terreno vazio sem casas, o carregamento em `cidade.html` é blindado com timestamp dinâmico:
  `fetch('assets/talking_island/village_data_threejs.json?v=' + Date.now())`
- O obelisco central (`ti_centertop.glb` / `SI_Centertop`) foi removido conforme solicitação do usuário.
