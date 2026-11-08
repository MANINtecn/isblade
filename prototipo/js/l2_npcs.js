/* =============================================================================
   TECX LABS / IS BLADE - SISTEMA DE NPCS E DIÁLOGOS DE TALKING ISLAND (L2 STYLE)
   - Gatekeeper Clarissa (na frente do Portal Dimensional)
   - Ferreiro Altran (com bigorna de ferro, martelo e forja incandescente)
   - Mercador dos Selos Mammon (com baús de tesouro e runas dos Sete Selos)
   - Sistema de Diálogos interativos, Teleporte, Crafting e Encantamento (+1 a +16)
   ============================================================================= */
(function(){
  'use strict';

  var npcs = [];
  var activeDialog = null;
  var currentNPCNear = null;

  var CSS = `
    /* Janela de Diálogo Clássica de MMORPG (Lineage 2 Style) */
    #l2-npc-dialog {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(560px, 92vw);
      background: radial-gradient(circle at top, rgba(16, 26, 48, 0.98) 0%, rgba(6, 10, 20, 0.98) 100%);
      border: 2px solid #5a7ea6;
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0, 0, 0, 0.85), inset 0 0 15px rgba(90, 169, 255, 0.15);
      z-index: 10000;
      color: #e4edf8;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 0;
      display: none;
      user-select: none;
      -webkit-user-select: none;
      animation: l2Pop 0.25s cubic-bezier(0.1, 0.8, 0.2, 1);
    }
    #l2-npc-dialog.active {
      display: block;
    }
    @keyframes l2Pop {
      from { transform: translate(-50%, -46%) scale(0.95); opacity: 0; }
      to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    .l2-npc-header {
      padding: 14px 18px;
      background: linear-gradient(90deg, rgba(20, 36, 68, 0.9) 0%, rgba(10, 18, 35, 0.9) 100%);
      border-bottom: 1.5px solid #3c5475;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
    }
    .l2-npc-title-box {
      display: flex;
      flex-direction: column;
    }
    .l2-npc-sub {
      font-size: 11px;
      color: #00d5ff;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      font-weight: 700;
    }
    .l2-npc-name {
      font-size: 17px;
      font-weight: 800;
      color: #f5c451;
      letter-spacing: 0.05em;
      text-shadow: 0 0 10px rgba(245, 196, 81, 0.4);
    }
    .l2-npc-close {
      background: none;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #9cb1cb;
      font-size: 18px;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }
    .l2-npc-close:hover {
      background: rgba(255, 70, 70, 0.3);
      border-color: #ff6b6b;
      color: #fff;
    }
    .l2-npc-body {
      padding: 18px;
      display: flex;
      gap: 16px;
    }
    .l2-npc-avatar {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      border: 2px solid #5a7ea6;
      background: #081122;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      flex-shrink: 0;
      box-shadow: 0 0 15px rgba(0, 213, 255, 0.2);
    }
    .l2-npc-text {
      font-size: 13px;
      line-height: 1.6;
      color: #c9d8eb;
      flex: 1;
    }
    .l2-npc-options {
      padding: 12px 18px 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 280px;
      overflow-y: auto;
    }
    .l2-npc-btn {
      background: linear-gradient(90deg, rgba(20, 36, 68, 0.8) 0%, rgba(12, 22, 42, 0.8) 100%);
      border: 1px solid #3c5475;
      border-radius: 5px;
      padding: 10px 14px;
      color: #e4edf8;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }
    .l2-npc-btn:hover {
      background: linear-gradient(90deg, rgba(35, 65, 120, 0.9) 0%, rgba(20, 42, 80, 0.9) 100%);
      border-color: #00d5ff;
      color: #fff;
      transform: translateX(3px);
      box-shadow: 0 0 12px rgba(0, 213, 255, 0.35);
    }
    .l2-npc-btn i {
      font-size: 16px;
      font-style: normal;
    }
    .l2-npc-btn small {
      margin-left: auto;
      font-size: 11px;
      color: #8da6c5;
      font-weight: 400;
    }

    /* Sub-painéis de Forja e Encantamento */
    .l2-sub-box {
      background: rgba(4, 9, 20, 0.95);
      border: 1px solid #3c5475;
      border-radius: 6px;
      padding: 14px;
      margin-top: 10px;
      display: none;
    }
    .l2-enchant-weapon-slot {
      width: 70px;
      height: 70px;
      border: 2px dashed #f5c451;
      border-radius: 8px;
      margin: 10px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      background: rgba(245, 196, 81, 0.05);
      box-shadow: 0 0 15px rgba(245, 196, 81, 0.2);
      transition: all 0.3s ease;
    }
    .l2-enchant-weapon-slot.enchanted {
      border-style: solid;
      box-shadow: 0 0 25px #00d5ff;
      border-color: #00d5ff;
    }
    .l2-enchant-weapon-slot.high-enchant {
      border-color: #ff3344;
      box-shadow: 0 0 30px #ff3344;
    }
  `;

  function initUI(){
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var dialog = document.createElement('div');
    dialog.id = 'l2-npc-dialog';
    dialog.innerHTML = `
      <div class="l2-npc-header">
        <div class="l2-npc-title-box">
          <span class="l2-npc-sub" id="l2-dialog-sub">TÍTULO</span>
          <span class="l2-npc-name" id="l2-dialog-name">NOME DO NPC</span>
        </div>
        <button class="l2-npc-close" id="l2-dialog-close">×</button>
      </div>
      <div class="l2-npc-body">
        <div class="l2-npc-avatar" id="l2-dialog-avatar">🧙</div>
        <div class="l2-npc-text" id="l2-dialog-text">Diálogo...</div>
      </div>
      <div class="l2-npc-options" id="l2-dialog-options"></div>
      <div class="l2-sub-box" id="l2-dialog-subbox"></div>
    `;
    document.body.appendChild(dialog);

    document.getElementById('l2-dialog-close').addEventListener('click', closeDialog);
    window.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && activeDialog){
        closeDialog();
      }
    });
  }

  function playUiClickSound(freq){
    try {
      var ctx = window.AudioContext || window.webkitAudioContext;
      if(!ctx) return;
      var actx = new ctx();
      var osc = actx.createOscillator();
      var g = actx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq || 520, actx.currentTime);
      g.gain.setValueAtTime(0.12, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.15);
      osc.connect(g);
      g.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.15);
    } catch(e){}
  }

  function playEnchantSuccessSound(){
    try {
      var ctx = window.AudioContext || window.webkitAudioContext;
      if(!ctx) return;
      var actx = new ctx();
      var notes = [523, 659, 784, 1046]; // Acorde C maior brilhante
      notes.forEach(function(freq, i){
        var osc = actx.createOscillator();
        var g = actx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, actx.currentTime + i * 0.08);
        g.gain.setValueAtTime(0.18, actx.currentTime + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + i * 0.08 + 0.45);
        osc.connect(g);
        g.connect(actx.destination);
        osc.start(actx.currentTime + i * 0.08);
        osc.stop(actx.currentTime + i * 0.08 + 0.45);
      });
    } catch(e){}
  }

  function playEnchantFailSound(){
    try {
      var ctx = window.AudioContext || window.webkitAudioContext;
      if(!ctx) return;
      var actx = new ctx();
      var osc = actx.createOscillator();
      var g = actx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, actx.currentTime + 0.35);
      g.gain.setValueAtTime(0.2, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.35);
      osc.connect(g);
      g.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.35);
    } catch(e){}
  }

  function openDialog(npcData){
    activeDialog = npcData;
    try { document.exitPointerLock(); } catch(e){}
    var d = document.getElementById('l2-npc-dialog');
    document.getElementById('l2-dialog-sub').textContent = npcData.subTitle;
    document.getElementById('l2-dialog-name').textContent = npcData.name;
    document.getElementById('l2-dialog-avatar').textContent = npcData.avatar;
    document.getElementById('l2-dialog-text').innerHTML = npcData.greeting;

    var optBox = document.getElementById('l2-dialog-options');
    optBox.innerHTML = '';
    var subBox = document.getElementById('l2-dialog-subbox');
    subBox.style.display = 'none';
    subBox.innerHTML = '';

    npcData.options.forEach(function(opt){
      var btn = document.createElement('button');
      btn.className = 'l2-npc-btn';
      btn.innerHTML = `<i>${opt.icon}</i> <span>${opt.label}</span> <small>${opt.tag || ''}</small>`;
      btn.addEventListener('click', function(){
        playUiClickSound(620);
        opt.action(subBox);
      });
      optBox.appendChild(btn);
    });

    d.classList.add('active');
  }

  function closeDialog(){
    activeDialog = null;
    var d = document.getElementById('l2-npc-dialog');
    if(d) d.classList.remove('active');
  }

  // =========================================================================
  // DEFINIÇÕES E LÓGICAS DOS 3 NPCS PRINCIPAIS
  // =========================================================================

  // 1. GATEKEEPER CLARISSA (Portal da Cidade)
  var GK_DATA = {
    id: 'clarissa',
    name: 'Clarissa',
    subTitle: 'Gatekeeper de Talking Island',
    avatar: '🔮',
    greeting: 'Que as bênçãos de Einhasad iluminem seu caminho. Posso dobrar as linhas ley do espaço para transportá-lo instantaneamente aos recantos de Talking Island ou aos perigos da Torre da Insolência. Para onde deseja viajar?',
    options: [
      {
        icon: '🏰',
        label: 'Torre da Insolência - Masmorras (Normal / Médio / Hard)',
        tag: 'Dungeon',
        action: function(){
          closeDialog();
          if(window.L2Teleport){
            window.L2Teleport.teleportTo('Torre da Insolência (Masmorra)', 'arena.html?mode=dungeon&go=normal');
          } else {
            window.location.href = 'arena.html?mode=dungeon&go=normal';
          }
        }
      },
      {
        icon: '⚡',
        label: 'Salão do Baium - Duelo Solo (3º Andar)',
        tag: 'Chefe',
        action: function(){
          closeDialog();
          if(window.L2Teleport){
            window.L2Teleport.teleportTo('Salão do Imperador Baium', 'arena.html?mode=duel');
          } else {
            window.location.href = 'arena.html?mode=duel';
          }
        }
      },
      {
        icon: '🩸',
        label: 'Arena de Guerra PvP (Livre)',
        tag: 'Online',
        action: function(){
          closeDialog();
          if(window.L2Teleport){
            window.L2Teleport.teleportTo('Arena PvP de Guerra', 'arena.html?mode=dungeon&go=pvp');
          } else {
            window.location.href = 'arena.html?mode=dungeon&go=pvp';
          }
        }
      },
      {
        icon: '⛵',
        label: 'Porto de Talking Island',
        tag: 'Local',
        action: function(){
          closeDialog();
          if(window.L2Teleport && window.teleportTo){
            window.L2Teleport.warpLocal('Porto de Talking Island', function(){
              window.teleportTo('port');
            });
          }
        }
      },
      {
        icon: '🏛️',
        label: 'Guilda dos Guerreiros',
        tag: 'Local',
        action: function(){
          closeDialog();
          if(window.L2Teleport && window.teleportTo){
            window.L2Teleport.warpLocal('Guilda dos Guerreiros', function(){
              window.teleportTo('fighter');
            });
          }
        }
      },
      {
        icon: '⛪',
        label: 'Igreja de Einhasad',
        tag: 'Local',
        action: function(){
          closeDialog();
          if(window.L2Teleport && window.teleportTo){
            window.L2Teleport.warpLocal('Igreja de Einhasad', function(){
              window.teleportTo('church');
            });
          }
        }
      },
      {
        icon: '🗼',
        label: 'Farol do Penhasco',
        tag: 'Local',
        action: function(){
          closeDialog();
          if(window.L2Teleport && window.teleportTo){
            window.L2Teleport.warpLocal('Farol do Penhasco', function(){
              window.teleportTo('lighthouse');
            });
          }
        }
      }
    ]
  };

  // 2. FERREIRO ALTRAN (Blacksmith com Bigorna)
  var enchantLevel = parseInt(localStorage.getItem('isblade_weapon_enchant') || '0', 10);

  var BLACKSMITH_DATA = {
    id: 'altran',
    name: 'Altran',
    subTitle: 'Mestre Ferreiro Anão',
    avatar: '🔨',
    greeting: 'O aço canta sob o martelo! Sou Altran, descendente dos clãs de ferreiros de Schuttgart. Aqui forjamos as lâminas mais afiadas e temperamos as armaduras mais resistentes de Aden. O que precisa da forja hoje?',
    options: [
      {
        icon: '✨',
        label: 'Encantamento Sagrado (+1 a +16)',
        tag: 'Forja',
        action: function(subBox){
          subBox.style.display = 'block';
          function renderEnchantUI(){
            var glowClass = enchantLevel >= 15 ? 'high-enchant' : (enchantLevel >= 4 ? 'enchanted' : '');
            var safeText = enchantLevel < 3 ? '<span style="color:#00ff88">Seguro (100%)</span>' : '<span style="color:#ffaa00">Risco de Quebra (66%)</span>';
            subBox.innerHTML = `
              <div style="font-size:12px;font-weight:700;color:#f5c451;margin-bottom:6px;text-align:center;">ENCANTAMENTO DE ARMA (+1 a +16)</div>
              <div class="l2-enchant-weapon-slot ${glowClass}" id="l2-enc-slot">⚔️</div>
              <div style="text-align:center;font-size:14px;font-weight:800;color:#fff;margin-bottom:4px;">
                Espada Atual: <span style="color:${enchantLevel>=4?'#00d5ff':'#f5c451'}">+${enchantLevel}</span>
              </div>
              <div style="text-align:center;font-size:11px;color:#9cb1cb;margin-bottom:12px;">
                Chance: ${safeText}
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="l2-npc-btn" id="l2-btn-enc" style="flex:1;justify-content:center;background:linear-gradient(90deg,#005588,#0088cc);">
                  ✨ Encantar Arma
                </button>
                <button type="button" class="l2-npc-btn" id="l2-btn-reset-enc" style="background:#331111;">
                  Reset
                </button>
              </div>
              <div id="l2-enc-log" style="font-size:11px;color:#00ff88;text-align:center;margin-top:8px;min-height:16px;"></div>
            `;

            document.getElementById('l2-btn-enc').onclick = function(){
              var logEl = document.getElementById('l2-enc-log');
              if(enchantLevel >= 16){
                logEl.style.color = '#f5c451';
                logEl.textContent = 'Arma já atingiu o poder máximo (+16)!';
                return;
              }
              if(enchantLevel < 3 || Math.random() < 0.66){
                enchantLevel++;
                localStorage.setItem('isblade_weapon_enchant', enchantLevel);
                playEnchantSuccessSound();
                logEl.style.color = '#00d5ff';
                logEl.textContent = '✨ SUCESSO! A arma resplandece com poder +' + enchantLevel + '!';
                renderEnchantUI();
              } else {
                playEnchantFailSound();
                logEl.style.color = '#ff4444';
                logEl.textContent = '💥 A arma quebrou e se transformou em Cristais!';
                enchantLevel = 0;
                localStorage.setItem('isblade_weapon_enchant', enchantLevel);
                renderEnchantUI();
              }
            };

            document.getElementById('l2-btn-reset-enc').onclick = function(){
              enchantLevel = 0;
              localStorage.setItem('isblade_weapon_enchant', 0);
              renderEnchantUI();
            };
          }
          renderEnchantUI();
        }
      },
      {
        icon: '🔨',
        label: 'Receitas de Forja e Criação de Equipamentos (Crafting)',
        tag: 'Em Breve',
        action: function(subBox){
          subBox.style.display = 'block';
          subBox.innerHTML = `
            <div style="font-size:12px;font-weight:700;color:#f5c451;margin-bottom:8px;">RECEITAS DO LIVRO DO ANÃO</div>
            <div style="font-size:11px;color:#cfe0ff;line-height:1.7;">
              🗡️ <b>Dragon Slayer (Grau A)</b>: 14x Pedaços de Aço Antigo + 20x Cristais de Mithril<br>
              🛡️ <b>Escudo Imperial Crusader (Grau S)</b>: 8x Placas de Titânio + 50x Verniz Enriquecido<br>
              ⚔️ <b>Espada Bastarda (Grau D)</b>: 120x Minérios de Ferro + 40x Carvão
            </div>
            <div style="font-size:10px;color:#f5c451;margin-top:10px;text-align:center;">
              (O sistema de coleta de materiais e drops de monstros será ligado no servidor na Fase 3!)
            </div>
          `;
        }
      },
      {
        icon: '📜',
        label: 'Fale-me sobre o Aço de Talking Island',
        tag: 'História',
        action: function(subBox){
          subBox.style.display = 'block';
          subBox.innerHTML = `
            <div style="font-size:12px;color:#c9d8eb;line-height:1.6;">
              "Talking Island é cercada pelo mar infinito de Aden. Dizem que os depósitos de ferro sob as colinas do norte foram abençoados pelos Titãs da Terra antes da era do Imperador Shunaiman. Qualquer arma temperada nestas águas corta com a leveza de uma pluma e o peso de um rochedo!"
            </div>
          `;
        }
      }
    ]
  };

  // 3. MERCADOR DOS SELOS MAMMON
  var MAMMON_DATA = {
    id: 'mammon',
    name: 'Mammon',
    subTitle: 'Ferreiro dos Sete Selos',
    avatar: '👁️',
    greeting: 'Hehehe... Shilen e Einhasad disputam os céus, mas aqui na terra é a Ancient Adena que dita o poder verdadeiro. O que um guerreiro mortal busca nas mãos do Mammon?',
    options: [
      {
        icon: '💎',
        label: 'Troca de Pedras Seladas (Ancient Adena)',
        tag: 'Comércio',
        action: function(subBox){
          subBox.style.display = 'block';
          subBox.innerHTML = `
            <div style="font-size:12px;font-weight:700;color:#c084fc;margin-bottom:8px;">CÂMBIO DOS SETE SELOS</div>
            <div style="font-size:11px;color:#cfe0ff;line-height:1.7;">
              🔵 <b>Pedra Selada Azul</b> = 3x Ancient Adena<br>
              🟢 <b>Pedra Selada Verde</b> = 5x Ancient Adena<br>
              🔴 <b>Pedra Selada Vermelha</b> = 10x Ancient Adena
            </div>
            <div style="font-size:11px;color:#f5c451;margin-top:8px;">
              Ancient Adena é a única moeda aceita para aprimoramentos supremos e remoção de selos de armaduras de Grau S!
            </div>
          `;
        }
      },
      {
        icon: '🗡️',
        label: 'Remover Selo de Armaduras S-Grade (Imperial Crusader)',
        tag: 'Relíquias',
        action: function(subBox){
          subBox.style.display = 'block';
          subBox.innerHTML = `
            <div style="font-size:12px;color:#c9d8eb;line-height:1.6;">
              "Traga-me uma couraça selada de Imperial Crusader e 1.200 Ancient Adenas. Eu quebrarei o feitiço ancestral e liberarei a aura dourada protetora da armadura definitiva!"
            </div>
          `;
        }
      },
      {
        icon: '📜',
        label: 'A Profecia dos Sete Selos',
        tag: 'História',
        action: function(subBox){
          subBox.style.display = 'block';
          subBox.innerHTML = `
            <div style="font-size:12px;color:#c9d8eb;line-height:1.6;">
              "Quando os Sete Selos forem rompidos, Shilen despertará em seu trono sombrio. Quem domina as Necrópoles e Catacumbas controla o destino de Aden. Eu apenas forneço os meios para os mais fortes sobreviverem ao apocalipse..."
            </div>
          `;
        }
      }
    ]
  };

  // =========================================================================
  // MONTAGEM 3D DOS NPCS NO CENÁRIO DA CIDADE
  // =========================================================================

  function createNameplateSprite(subText, nameText, subColor, nameColor){
    var canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    var ctx = canvas.getContext('2d');

    // Fundo translúcido nobre
    ctx.fillStyle = 'rgba(5, 10, 22, 0.75)';
    ctx.roundRect ? ctx.roundRect(12, 10, 360, 76, 12) : ctx.rect(12, 10, 360, 76);
    ctx.fill();
    ctx.strokeStyle = subColor || '#00d5ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Subtítulo
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = subColor || '#00d5ff';
    ctx.textAlign = 'center';
    ctx.fillText(subText, 192, 40);

    // Nome
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillStyle = nameColor || '#f5c451';
    ctx.fillText(nameText, 192, 74);

    var tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    var sprite = new THREE.Sprite(mat);
    sprite.scale.set(2.0, 0.5, 1);
    return sprite;
  }

  function createAnvilProp(){
    var group = new THREE.Group();

    // Cepo de madeira rústico em escala real (altura 45cm)
    var stumpMat = new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.9 });
    var stump = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.30, 0.45, 14), stumpMat);
    stump.position.y = 0.225;
    group.add(stump);

    // Bigorna de Ferro Escuro (altura total de trabalho ~72cm, perfeito para o anão)
    var ironMat = new THREE.MeshStandardMaterial({ color: 0x242830, metalness: 0.85, roughness: 0.35 });
    
    // Base da bigorna
    var base = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.20), ironMat);
    base.position.y = 0.49;
    group.add(base);

    // Cintura e corpo
    var waist = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.14), ironMat);
    waist.position.y = 0.60;
    group.add(waist);

    // Mesa de bater (Face plana superior)
    var face = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.18), ironMat);
    face.position.y = 0.71;
    group.add(face);

    // Chifre cônico da bigorna
    var horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 12), ironMat);
    horn.rotation.z = -Math.PI / 2;
    horn.position.set(-0.32, 0.71, 0);
    group.add(horn);

    // Martelo do ferreiro repousando na bigorna
    var woodHandleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.30, 8), woodHandleMat);
    handle.rotation.z = Math.PI / 3;
    handle.position.set(0.06, 0.78, 0.03);

    var hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.10), ironMat);
    hammerHead.position.set(0.15, 0.83, 0.03);
    group.add(handle, hammerHead);

    // Braseiro da forja incandescente ao lado da bigorna
    var forgeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 });
    var forgeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.20, 0.42, 12), forgeMat);
    forgeBase.position.set(0.65, 0.21, -0.15);
    group.add(forgeBase);

    // Brasas brilhantes
    var coalMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    var coals = new THREE.Mesh(new THREE.SphereGeometry(0.20, 8, 6), coalMat);
    coals.scale.set(1, 0.3, 1);
    coals.position.set(0.65, 0.43, -0.15);
    group.add(coals);

    // Luz incandescente da forja
    var forgeLight = new THREE.PointLight(0xff6600, 2.0, 4.0);
    forgeLight.position.set(0.65, 0.58, -0.15);
    group.add(forgeLight);

    return group;
  }

  function createMammonDecor(){
    var group = new THREE.Group();

    // Tapete místico cerimonial dos Sete Selos no piso
    var carpetMat = new THREE.MeshStandardMaterial({ color: 0x2e0854, roughness: 0.85 });
    var carpet = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.02, 24), carpetMat);
    carpet.position.y = 0.01;
    group.add(carpet);

    // Anel de runas arcanas no tapete
    var runeMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.65 });
    var runeRing = new THREE.Mesh(new THREE.RingGeometry(0.80, 0.98, 24), runeMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.025;
    group.add(runeRing);

    // Baú de Tesouro do Mammon
    var woodChestMat = new THREE.MeshStandardMaterial({ color: 0x3d1d12, roughness: 0.6 });
    var goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf5c451, metalness: 0.9, roughness: 0.25 });

    var chestBase = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.30, 0.32), woodChestMat);
    chestBase.position.set(0.60, 0.15, 0.30);
    group.add(chestBase);

    var chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.52, 12, 1, false, 0, Math.PI), woodChestMat);
    chestLid.rotation.z = Math.PI / 2;
    chestLid.position.set(0.60, 0.30, 0.30);
    group.add(chestLid);

    // Guarnições douradas
    var trim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.04, 0.34), goldTrimMat);
    trim.position.set(0.60, 0.28, 0.30);
    group.add(trim);

    // Luz mística do baú
    var mammonLight = new THREE.PointLight(0xa855f7, 1.8, 3.5);
    mammonLight.position.set(0.60, 0.45, 0.30);
    group.add(mammonLight);

    return group;
  }

  function createGatekeeperDecor(){
    var group = new THREE.Group();

    // Pedestal de Teleporte em Pedra Escura
    var pedMat = new THREE.MeshStandardMaterial({ color: 0x1f273b, roughness: 0.8 });
    var ped = new THREE.Mesh(new THREE.CylinderGeometry(0.80, 0.90, 0.08, 24), pedMat);
    ped.position.y = 0.04;
    group.add(ped);

    // Círculo Mágico de Teleporte Rúnico (Cyan Glow)
    var runeMat = new THREE.MeshBasicMaterial({ color: 0x00d5ff, transparent: true, opacity: 0.8 });
    var runeCircle = new THREE.Mesh(new THREE.RingGeometry(0.58, 0.74, 32), runeMat);
    runeCircle.rotation.x = -Math.PI / 2;
    runeCircle.position.y = 0.085;
    group.add(runeCircle);

    // Luz de aura da GK
    var gkLight = new THREE.PointLight(0x00d5ff, 1.8, 3.5);
    gkLight.position.set(0, 0.6, 0);
    group.add(gkLight);

    return group;
  }

  // =========================================================================
  // CARREGAMENTO DOS MODELOS E ANIMAÇÕES
  // =========================================================================

  function loadNpc(scene, gltfLoader, config){
    var group = new THREE.Group();
    group.position.set(config.x, config.y || 0, config.z);
    group.rotation.y = config.rotY || 0;
    scene.add(group);

    // Adicionar props decorativos
    if(config.decor) {
      group.add(config.decor);
    }

    // Nameplate flutuante ajustado à altura do NPC
    var npSprite = createNameplateSprite(config.data.subTitle, config.data.name, config.subColor, config.nameColor);
    npSprite.position.set(0, config.nameY || 2.4, 0);
    if(config.nameScaleX && config.nameScaleY) {
      npSprite.scale.set(config.nameScaleX, config.nameScaleY, 1);
    }
    group.add(npSprite);

    var npcObj = {
      data: config.data,
      group: group,
      pos: new THREE.Vector3(config.x, config.y || 0, config.z),
      mixer: null
    };
    npcs.push(npcObj);

    // Carregar modelo GLB com escala métrica proporcional (em metros!)
    gltfLoader.load(config.modelPath, function(gltf){
      var model = gltf.scene;
      var s = config.scale || 0.05;
      model.scale.set(s, s, s);
      model.traverse(function(c){
        if(c.isMesh){
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
      group.add(model);

      // Animation Mixer
      if(gltf.animations && gltf.animations.length > 0){
        var mixer = new THREE.AnimationMixer(model);
        var idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle') ||
                       THREE.AnimationClip.findByName(gltf.animations, 'idle_hand') ||
                       gltf.animations[0];
        if(idleClip){
          var action = mixer.clipAction(idleClip);
          action.play();
          npcObj.mixer = mixer;
        }
      }
    }, undefined, function(err){
      console.warn('NPC GLB fallback load:', config.data.name, err);
      // Fallback boneco simples se não carregar
      var targetH = config.targetH || 1.8;
      var fallbackGeo = new THREE.CylinderGeometry(0.22, 0.28, targetH, 12);
      var fallbackMat = new THREE.MeshStandardMaterial({ color: config.fallbackColor || 0x4a75a0 });
      var fbMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      fbMesh.position.y = targetH * 0.5;
      group.add(fbMesh);
    });
  }

  // =========================================================================
  // API GLOBAL DE INICIALIZAÇÃO E ATUALIZAÇÃO
  // =========================================================================

  window.L2Npcs = {
    init: function(scene, gltfLoader){
      initUI();

      // 1. Gatekeeper Clarissa (Na frente do Portal Dimensional: x = -11.5, z = -11.5)
      // Raw elf_f.glb = 43.56 de altura -> escala 2.15 / 43.56 ≈ 0.0494 (altura real de 2.15 metros)
      loadNpc(scene, gltfLoader, {
        data: GK_DATA,
        modelPath: 'assets/personagens/elf_f.glb',
        x: -11.5,
        y: 0.0,
        z: -11.5,
        rotY: 0.65,
        scale: 2.15 / 43.56,
        targetH: 2.15,
        nameY: 2.45,
        nameScaleX: 2.2,
        nameScaleY: 0.55,
        subColor: '#00d5ff',
        nameColor: '#f5c451',
        decor: createGatekeeperDecor(),
        fallbackColor: 0x00a2ff
      });

      // 2. Ferreiro Altran (Na praça leste, perto das forjas: x = 11.5, z = -8.5)
      // Raw dwarf_m.glb = 34.48 de altura -> escala 1.60 / 34.48 ≈ 0.0464 (altura real de 1.60 metros para anão)
      loadNpc(scene, gltfLoader, {
        data: BLACKSMITH_DATA,
        modelPath: 'assets/personagens/dwarf_m.glb',
        x: 11.5,
        y: 0.0,
        z: -8.5,
        rotY: -1.2,
        scale: 1.60 / 34.48,
        targetH: 1.60,
        nameY: 1.95,
        nameScaleX: 2.0,
        nameScaleY: 0.50,
        subColor: '#ff9d42',
        nameColor: '#f5c451',
        decor: createAnvilProp(),
        fallbackColor: 0x995522
      });

      // 3. Mercador dos Selos Mammon (No recanto místico: x = -16.0, z = 12.0)
      // Raw magic_m.glb = 42.14 de altura -> escala 2.15 / 42.14 ≈ 0.0510 (altura real de 2.15 metros)
      loadNpc(scene, gltfLoader, {
        data: MAMMON_DATA,
        modelPath: 'assets/personagens/magic_m.glb',
        x: -16.0,
        y: 0.0,
        z: 12.0,
        rotY: 1.1,
        scale: 2.15 / 42.14,
        targetH: 2.15,
        nameY: 2.45,
        nameScaleX: 2.4,
        nameScaleY: 0.60,
        subColor: '#c084fc',
        nameColor: '#f5c451',
        decor: createMammonDecor(),
        fallbackColor: 0x6611aa
      });
    },

    update: function(dt, playerX, playerZ){
      // Atualizar mixers de animação
      for(var i = 0; i < npcs.length; i++){
        if(npcs[i].mixer) npcs[i].mixer.update(dt);
      }

      // Checar proximidade com o jogador
      var nearest = null;
      var minDist = 4.2;

      for(var j = 0; j < npcs.length; j++){
        var npc = npcs[j];
        var d = Math.hypot(npc.pos.x - playerX, npc.pos.z - playerZ);
        if(d < minDist){
          nearest = npc;
          minDist = d;
        }
      }

      currentNPCNear = nearest;
      var promptEl = document.getElementById('portal-prompt');

      if(nearest && !activeDialog){
        if(promptEl){
          promptEl.innerHTML = `Pressione <b>[E]</b> para falar com <b>${nearest.data.name}</b>`;
          promptEl.style.display = 'block';
        }
      }
    },

    handleInteractKey: function(){
      if(activeDialog){
        closeDialog();
        return true;
      }
      if(currentNPCNear){
        openDialog(currentNPCNear.data);
        return true;
      }
      return false;
    },

    isOpen: function(){
      return !!activeDialog;
    }
  };

})();

