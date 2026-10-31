/* ==========================================================================
   MU ONLINE / LINEAGE 2 GOTHIC HUD MODULE (V5 CLEAN - FULL WIDTH)
   - Interface de canto a canto (100vw) com Dragões de Bronze nos cantos
   - Esquerda: Cristal de HP dinâmico (sem MP)
   - Direita: Cristal de STAMINA dinâmico + 5 botões de sistema (I, C, S, Q, O)
   - Centro Clean: Faixa de Nome, Classe e Level acima de 8 Slots Vazios
   - Sistema de Slots Híbridos: começam vazios e aceitam arrastar/selecionar
     Skills da Árvore (#skp) e Itens do Inventário (#inv) no PC e Mobile
   ========================================================================== */

/* [atalhos] cada SLOT da barra tem uma tecla (configuravel em Opcoes); a skill/item que estiver no slot responde a essa tecla.
   Padrao: Q E R T F G nas skills; slots 7 e 8 sem tecla (1-6 sao dos golpes basicos). Tudo por personagem. */
const SLOT_DEFAULT_KEYS = ['Q', 'E', 'R', 'T', 'F', 'G', '', ''];
const STORAGE_KEY = 'isblade.custom_slots_v5';
const KEYS_KEY = 'isblade.hotbar_keys';
const RESERVED_KEYS = 'wasdmvbikxc123456'.split('');
function perChar(k) { try { var id = localStorage.getItem('isblade_active_character_id'); return id ? k + '.' + id : k; } catch (_) { return k; } }
function readPerChar(k) { try { var v = localStorage.getItem(perChar(k)); return v !== null ? v : localStorage.getItem(k); } catch (_) { return null; } }

/* [hud-clean] a interface limpa desenha as barras por CSS (largura = variavel --p do pai); as imagens do HUD classico continuam existindo */
function vp(el, pct) { if (el && el.parentNode) el.parentNode.style.setProperty('--p', pct.toFixed(1) + '%'); }

export const MuHud = {
  initialized: false,
  slots: [null, null, null, null, null, null, null, null],
  keys: SLOT_DEFAULT_KEYS.slice(),
  keyOf: function(i) { return this.keys[i] || '—'; },
  activePickerSlot: -1,

  init: function() {
    if (this.initialized) return;
    try { if (localStorage.getItem('isblade.hud') !== 'classica') document.body.classList.add('hud-clean'); } catch (_) { document.body.classList.add('hud-clean'); }
    this.loadSavedSlots();
    this.createDom();
    this.setupSystemButtons();
    this.setupHotbarInteractions();
    this.setupCleanTopRight();
    this.hookUpdates();
    this.initialized = true;
    this.sync();
    console.log('⚔️ HUD Gótico V5 (Full-Width Clean) Inicializado.');
  },

  loadSavedSlots: function() {
    try {
      var raw = readPerChar(STORAGE_KEY);
      var rk = JSON.parse(readPerChar(KEYS_KEY) || 'null');
      if (Array.isArray(rk) && rk.length === 8 && rk.every(function(k) { return typeof k === 'string' && k.length <= 1; })) this.keys = rk;
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 8) {
          this.slots = parsed;
        }
      }
    } catch (_) {}
  },

  saveSlots: function() {
    try {
      localStorage.setItem(perChar(STORAGE_KEY), JSON.stringify(this.slots));
      localStorage.setItem(perChar(KEYS_KEY), JSON.stringify(this.keys));
    } catch (_) {}
  },

  createDom: function() {
    if (document.getElementById('mu-hud-bottom')) return;

    var playerName = localStorage.getItem('isblade.player_name') || 'Ícaro';
    var wpn = localStorage.getItem('isblade.weapon') || 'shield';
    var classLabel = (wpn === 'shield' ? 'Guardião' : (wpn === 'staff' ? 'Místico' : 'Guerreiro'));
    var isArena = location.pathname.toLowerCase().indexOf('arena') !== -1;

    var slotsHtml = '';
    for (var i = 0; i < 8; i++) {
      slotsHtml += `
        <button type="button" class="mu-hotbar-slot" data-slot="${i}">
          <div class="slot-cd-fill"></div>
          <div class="slot-icon"></div>
          <span class="slot-cd-txt"></span>
          <b class="slot-key">${(SLOT_DEFAULT_KEYS[i] || '—')}</b>
          <span class="slot-tip">Slot Vazio · Clique ou arraste Skill [S] / Item [I]</span>
        </button>
      `;
    }

    var hudHtml = `
      <div id="mu-hud-bottom" class="ui">
        <!-- ARTE NATIVA DE CANTO A CANTO (DRAGÕES + HP ESQUERDA + 8 SLOTS VAZIOS + STAMINA DIREITA) -->
        <img class="mu-hud-art" src="assets/hud/mu_dragon_hud_clean.png?v=6" alt="HUD" draggable="false" />

        <!-- FAIXA CENTRAL ACIMA DOS SLOTS: NOME DO JOGADOR, CLASSE E LEVEL -->
        <div class="mu-hud-nameplate">
          <span class="mu-player-name" id="muPlayerName">${playerName}</span>
          <span class="mu-player-sep">&middot;</span>
          <span class="mu-player-class" id="muPlayerClass">${classLabel}</span>
          <span class="mu-player-sep">&middot;</span>
          <span class="mu-player-lvl" id="muPlayerLvl">Nv. 1</span>
        </div>

        <!-- FILETE DE EXPERIÊNCIA (EXP) -->
        <div class="mu-exp-strip">
          <div id="mu-xp-fill" style="width: 0%"></div>
        </div>

        <!-- CRISTAL ESQUERDO: VIDA (HP) -->
        <div class="mu-bar-slot hp" id="mu-hp-slot" title="Pontos de Vida (HP)">
          <img class="mu-bar-crystal" id="mu-hp-liquid" src="assets/hud/mu_hp_crystal_fill.png?v=6" alt="" draggable="false" />
          <div class="mu-bar-text" id="mu-hp-val">HP 100 / 100</div>
        </div>

        <!-- CRISTAL DIREITO: STAMINA -->
        <div class="mu-bar-slot mp" id="mu-mp-slot" title="Estamina de Combate">
          <img class="mu-bar-crystal" id="mu-mp-liquid" src="assets/hud/mu_stamina_crystal_fill.png?v=6" alt="" draggable="false" />
          <div class="mu-bar-text" id="mu-mp-val">STAMINA 100 / 100</div>
        </div>

        <!-- FILEIRA CENTRAL DE 8 SLOTS (COMEÇAM VAZIOS E ACEITAM SKILLS E ITENS) -->
        <div id="mu-hotbar-host">
          ${slotsHtml}
        </div>

        <!-- OS 5 BOTÕES NATIVOS DO SISTEMA NO CANTO INFERIOR DIREITO (I, C, S, Q, O) -->
        <div class="mu-sys-wrap">
        <button type="button" class="mu-sys-btn" data-sys="I" id="mu-btn-i" aria-label="Inventário">
          <span>Inventário (I)</span>
        </button>
        <button type="button" class="mu-sys-btn" data-sys="C" id="mu-btn-c" aria-label="Personagens">
          <span>Trocar Personagem (C)</span>
        </button>
        <button type="button" class="mu-sys-btn" data-sys="S" id="mu-btn-s" aria-label="Skills">
          <span>Árvore de Skills (K)</span>
        </button>
        <button type="button" class="mu-sys-btn" data-sys="Q" id="mu-btn-q" aria-label="Mapa e Teleportes">
          <span>${isArena ? 'Sair para a Vila' : 'Teleportes da Ilha'}</span>
        </button>
        <button type="button" class="mu-sys-btn" data-sys="O" id="mu-btn-o" aria-label="Opções">
          <span>Configurações (O)</span>
        </button>
        </div>
      </div>

      <!-- SELETOR RÁPIDO PARA EQUIPAR SKILL OU ITEM EM UM SLOT (PC & MOBILE) -->
      <div id="mu-slot-picker" class="ui"></div>
    `;

    document.body.insertAdjacentHTML('beforeend', hudHtml);
  },

  getItemSvgIcon: function(slotType, color) {
    var c = color || '#f5c451';
    if (slotType === 'weapon') {
      return '<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="4" fill="#0b1220" stroke="' + c + '" stroke-width="1.6"/><path d="M8 24L23 9M23 9H17M23 9V15" stroke="' + c + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 26L11 21" stroke="#cbd5e1" stroke-width="2.6" stroke-linecap="round"/></svg>';
    }
    if (slotType === 'armor' || slotType === 'helm') {
      return '<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="4" fill="#0b1220" stroke="' + c + '" stroke-width="1.6"/><path d="M16 6L25 10V16C25 21.5 21 25.5 16 27C11 25.5 7 21.5 7 16V10L16 6Z" fill="rgba(245,196,81,0.15)" stroke="' + c + '" stroke-width="2"/></svg>';
    }
    return '<svg viewBox="0 0 32 32"><rect x="2" y="2" width="28" height="28" rx="4" fill="#0b1220" stroke="' + c + '" stroke-width="1.6"/><path d="M13 7H19V11L23 16V24C23 25.1 22.1 26 21 26H11C9.9 26 9 25.1 9 24V16L13 11V7Z" fill="rgba(255,70,95,0.35)" stroke="' + c + '" stroke-width="1.8"/></svg>';
  },

  renderHotbar: function() {
    var self = this;
    var slotBtns = document.querySelectorAll('.mu-hotbar-slot');
    var origSkillBtns = document.querySelectorAll('#skills button');

    slotBtns.forEach(function(btn, idx) {
      var data = self.slots[idx];
      var iconEl = btn.querySelector('.slot-icon');
      var tipEl = btn.querySelector('.slot-tip');
      var keyEl = btn.querySelector('.slot-key');
      var cdFill = btn.querySelector('.slot-cd-fill');
      var cdTxt = btn.querySelector('.slot-cd-txt');

      if (!data) {
        iconEl.innerHTML = '';
        if (cdFill) cdFill.style.height = '0%';
        if (cdTxt) cdTxt.textContent = '';
        if (keyEl) keyEl.textContent = self.keyOf(idx);
        if (tipEl) tipEl.textContent = 'Slot ' + (idx + 1) + ' Vazio · Clique ou arraste Skill [S] / Item [I]';
        return;
      }

      if (data.type === 'skill') {
        var skBtn = origSkillBtns[data.skillSlot];
        if (skBtn) {
          var skIcon = skBtn.querySelector('.sk-icon');
          var skName = skBtn.querySelector('strong');
          var skKey = skBtn.querySelector('b');
          iconEl.innerHTML = skIcon ? skIcon.innerHTML : '';
          if (keyEl) keyEl.textContent = self.keyOf(idx);
          var nm = skName ? skName.textContent : (data.name || 'Skill');
          if (tipEl) tipEl.textContent = nm + ' [' + (keyEl ? keyEl.textContent : '') + '] · Botão direito remove';
        } else {
          iconEl.innerHTML = data.svg || '';
          if (tipEl) tipEl.textContent = (data.name || 'Skill') + ' · Botão direito remove';
        }
      } else if (data.type === 'item') {
        iconEl.innerHTML = self.getItemSvgIcon(data.slotType || 'weapon', data.color || '#f5c451');
        if (cdFill) cdFill.style.height = '0%';
        if (cdTxt) cdTxt.textContent = '';
        if (keyEl) keyEl.textContent = self.keyOf(idx);
        if (tipEl) tipEl.textContent = (data.name || 'Item') + ' · Clique para equipar/usar (Dir. remove)';
      }
    });
  },

  /* coloca skill/item no slot (a mesma skill nao fica em dois slots) */
  place: function(idx, payload) {
    var self = this;
    if (payload.type === 'skill') self.slots.forEach(function(d, i) { if (d && d.type === 'skill' && d.skillSlot === payload.skillSlot && i !== idx) self.slots[i] = null; });
    self.slots[idx] = payload;
    self.saveSlots(); self.sync();
  },

  /* troca a tecla de um slot; se outra ja usa, as duas trocam */
  setKey: function(idx, k) {
    k = (k || '').toLowerCase();
    if (k.length !== 1 || RESERVED_KEYS.indexOf(k) >= 0) return false;
    var up = k.toUpperCase(), j = this.keys.indexOf(up);
    if (j >= 0 && j !== idx) this.keys[j] = this.keys[idx];
    this.keys[idx] = up;
    this.saveSlots(); this.sync();
    return true;
  },
  resetKeys: function() { this.keys = SLOT_DEFAULT_KEYS.slice(); this.saveSlots(); this.sync(); },

  /* liga a barra ao jogo: tecla do slot -> skill (mapa entregue a pagina em window.__hotbarKeys) */
  sync: function() {
    var self = this;
    var vazia = !this.slots.some(function(d) { return d; });
    var nSk = document.querySelectorAll('#skills button').length;
    if (vazia && nSk && !localStorage.getItem(perChar('isblade.hotbar_init'))) {
      for (var i = 0; i < Math.min(6, nSk); i++) this.slots[i] = { type: 'skill', skillSlot: i, name: 'Skill', svg: '' };
      try { localStorage.setItem(perChar('isblade.hotbar_init'), '1'); } catch (_) {}
      this.saveSlots();
    }
    var map = {};
    this.slots.forEach(function(d, i) { if (d && d.type === 'skill' && self.keys[i]) map[self.keys[i].toLowerCase()] = d.skillSlot; });
    if (typeof window.__hotbarKeys === 'function') window.__hotbarKeys(map);
    this.renderHotbar();
    if (typeof window.__renderKeysCfg === 'function') window.__renderKeysCfg();
  },

  /* tecla de item da barra (as de skill a pagina trata sozinha) */
  keyTrigger: function(k) {
    var idx = this.keys.indexOf((k || '').toUpperCase());
    if (idx < 0 || !this.slots[idx] || this.slots[idx].type !== 'item') return false;
    this.triggerSlot(idx); return true;
  },

  triggerSlot: function(idx) {
    var data = this.slots[idx];
    if (!data) {
      this.openSlotPicker(idx);
      return;
    }

    if (data.type === 'skill') {
      var origSkillBtns = document.querySelectorAll('#skills button');
      var targetBtn = origSkillBtns[data.skillSlot];
      if (targetBtn) {
        targetBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      }
    } else if (data.type === 'item') {
      if (window.__dbg && typeof window.__dbg.equipItem === 'function') {
        window.__dbg.equipItem(data.uid);
      } else {
        // Fallback: procura no DOM do inventario ou dispara tecla X se for arma
        var itEl = document.querySelector('#inv .it[data-uid="' + data.uid + '"]');
        if (itEl) {
          itEl.click();
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'x', code: 'KeyX' }));
        }
      }
    }
  },

  openSlotPicker: function(slotIdx) {
    var self = this;
    var picker = document.getElementById('mu-slot-picker');
    if (!picker) return;

    if (document.pointerLockElement) {
      try { document.exitPointerLock(); } catch (_) {}
    }

    this.activePickerSlot = slotIdx;
    var origSkillBtns = document.querySelectorAll('#skills button');

    var html = `
      <div class="pk-hd">
        <span>EQUIPAR NO SLOT ${slotIdx + 1} (ATALHO ${self.keyOf(slotIdx)})</span>
        <div style="display:flex;gap:6px">
          <button type="button" id="mu-pk-clear">Limpar Slot</button>
          <button type="button" id="mu-pk-close" style="background:rgba(148,163,184,0.18);border-color:#94a3b8;color:#e2e8f0">Fechar</button>
        </div>
      </div>
      <div class="pk-sec">⚔️ Skills da Arma Atual (Árvore de Skills)</div>
      <div class="pk-grid" id="mu-pk-skills"></div>
      <div class="pk-sec" style="margin-top:10px">🎒 Itens da Mochila (Inventário)</div>
      <div class="pk-grid" id="mu-pk-items"></div>
    `;
    picker.innerHTML = html;
    picker.classList.add('open');

    var skGrid = document.getElementById('mu-pk-skills');
    origSkillBtns.forEach(function(b, sIdx) {
      var isLocked = b.classList.contains('lock');
      var ic = b.querySelector('.sk-icon');
      var nm = b.querySelector('strong');
      var kb = b.querySelector('b');
      var lk = b.querySelector('.lk');
      var card = document.createElement('div');
      card.className = 'pk-item';
      if (isLocked) card.style.opacity = '0.45';
      card.innerHTML = `
        <div class="pk-ic">${ic ? ic.innerHTML : ''}</div>
        <div>
          <div class="pk-nm">${nm ? nm.textContent : 'Skill ' + (sIdx + 1)}</div>
          <span class="pk-sub">${isLocked ? (lk ? lk.textContent : 'Bloqueada') : 'Tecla ' + (kb ? kb.textContent : '')}</span>
        </div>
      `;
      card.addEventListener('click', function() {
        if (isLocked) return;
        self.place(slotIdx, {
          type: 'skill',
          skillSlot: sIdx,
          name: nm ? nm.textContent : 'Skill',
          svg: ic ? ic.innerHTML : ''
        });
        picker.classList.remove('open');
      });
      skGrid.appendChild(card);
    });

    var itGrid = document.getElementById('mu-pk-items');
    var invData = null;
    try { var _id = localStorage.getItem('isblade_active_character_id'); invData = JSON.parse((_id && localStorage.getItem('isblade.inv.' + _id)) || localStorage.getItem('isblade.inv')); } catch (_) {}
    var rarColors = { normal: '#94a3b8', raro: '#38bdf8', epico: '#c084fc', lendario: '#f5c451' };
    var baseNames = {
      sword_iron: ['Espada Longa', 'weapon'],
      shield_guardian: ['Escudo Guardião', 'weapon'],
      staff_oak: ['Cajado Arcano', 'weapon'],
      helm_iron: ['Elmo de Ferro', 'helm'],
      armor_plate: ['Couraça Real', 'armor'],
      ring_power: ['Anel de Força', 'ring']
    };

    if (invData && Array.isArray(invData.items) && invData.items.length) {
      invData.items.forEach(function(it) {
        var bInfo = baseNames[it.base] || [it.base, 'weapon'];
        var col = rarColors[it.rar] || '#f5c451';
        var card = document.createElement('div');
        card.className = 'pk-item';
        card.style.borderColor = col;
        card.innerHTML = `
          <div class="pk-ic">${self.getItemSvgIcon(bInfo[1], col)}</div>
          <div>
            <div class="pk-nm" style="color:${col}">${bInfo[0]}</div>
            <span class="pk-sub">${(it.rar || 'normal').toUpperCase()}</span>
          </div>
        `;
        card.addEventListener('click', function() {
          self.slots[slotIdx] = {
            type: 'item',
            uid: it.uid,
            base: it.base,
            name: bInfo[0],
            slotType: bInfo[1],
            color: col
          };
          self.saveSlots();
          self.sync();
          picker.classList.remove('open');
        });
        itGrid.appendChild(card);
      });
    } else {
      itGrid.innerHTML = '<div style="color:#64748b;font-size:10px;grid-column:1/-1">Mochila vazia.</div>';
    }

    document.getElementById('mu-pk-clear').addEventListener('click', function() {
      self.slots[slotIdx] = null;
      self.saveSlots();
      self.sync();
      picker.classList.remove('open');
    });

    document.getElementById('mu-pk-close').addEventListener('click', function() {
      picker.classList.remove('open');
    });
  },

  setupHotbarInteractions: function() {
    var self = this;
    var slotBtns = document.querySelectorAll('.mu-hotbar-slot');

    slotBtns.forEach(function(btn, idx) {
      // Clique esquerdo: usa a skill/item ou abre o seletor se estiver vazio
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        self.triggerSlot(idx);
      });

      // Clique direito: abre seletor ou limpa o slot
      btn.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (self.slots[idx]) {
          self.slots[idx] = null;
          self.saveSlots();
          self.sync();
        } else {
          self.openSlotPicker(idx);
        }
      });

      // arrastar de um slot para outro troca os dois de lugar
      btn.setAttribute('draggable', 'true');
      btn.addEventListener('dragstart', function(e) {
        if (!self.slots[idx]) { e.preventDefault(); return; }
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'move', from: idx }));
      });
      // Receber Drag & Drop vindo da Árvore de Skills (#skp) ou do Inventário (#inv)
      btn.addEventListener('dragover', function(e) {
        e.preventDefault();
        btn.classList.add('drag-over');
      });
      btn.addEventListener('dragleave', function() {
        btn.classList.remove('drag-over');
      });
      btn.addEventListener('drop', function(e) {
        e.preventDefault();
        btn.classList.remove('drag-over');
        try {
          var raw = e.dataTransfer.getData('text/plain');
          if (!raw) return;
          var payload = JSON.parse(raw);
          if (payload && payload.type === 'move') {
            var tmp = self.slots[idx]; self.slots[idx] = self.slots[payload.from]; self.slots[payload.from] = tmp;
            self.saveSlots(); self.sync();
          } else if (payload && (payload.type === 'skill' || payload.type === 'item')) {
            self.place(idx, payload);
          }
        } catch (_) {}
      });
    });

    // Torna os cards da Árvore de Skills (#skp) e itens do Inventário (#inv) arrastáveis para os slots!
    var skpEl = document.getElementById('skp');
    if (skpEl) {
      var skpObs = new MutationObserver(function() {
        skpEl.querySelectorAll('.card:not(.lock)').forEach(function(card) {
          card.setAttribute('draggable', 'true');
          card.addEventListener('dragstart', function(e) {
            var sSlot = parseInt(card.getAttribute('data-slot'), 10) || 0;
            var nmEl = card.querySelector('b');
            var icEl = card.querySelector('.sk-icon-k');
            var payload = {
              type: 'skill',
              skillSlot: sSlot,
              name: nmEl ? nmEl.textContent.replace(' ✓', '') : 'Skill',
              svg: icEl ? icEl.innerHTML : ''
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(payload));
          });
        });
      });
      skpObs.observe(skpEl, { childList: true, subtree: true });
    }

    var invEl = document.getElementById('inv');
    if (invEl) {
      var invObs = new MutationObserver(function() {
        invEl.querySelectorAll('.it').forEach(function(itCard) {
          itCard.setAttribute('draggable', 'true');
          itCard.addEventListener('dragstart', function(e) {
            var uid = itCard.getAttribute('data-uid');
            var nmEl = itCard.querySelector('b');
            var col = nmEl ? nmEl.style.color : '#f5c451';
            var payload = {
              type: 'item',
              uid: uid,
              name: nmEl ? nmEl.textContent : 'Item',
              slotType: 'weapon',
              color: col
            };
            e.dataTransfer.setData('text/plain', JSON.stringify(payload));
          });
        });
      });
      invObs.observe(invEl, { childList: true, subtree: true });
    }
  },

  setupSystemButtons: function() {
    var stopProp = function(e) { e.stopPropagation(); };

    var hud = document.getElementById('mu-hud-bottom');
    if (hud) {
      ['pointerdown', 'mousedown', 'click', 'dblclick'].forEach(function(ev) {
        hud.addEventListener(ev, stopProp);
      });
    }

    var picker = document.getElementById('mu-slot-picker');
    if (picker) {
      ['pointerdown', 'mousedown', 'click'].forEach(function(ev) {
        picker.addEventListener(ev, stopProp);
      });
    }

    var btnI = document.getElementById('mu-btn-i');
    if (btnI) {
      btnI.addEventListener('click', function() {
        var invBtn = document.getElementById('invBtn');
        if (invBtn) invBtn.click();
      });
    }

    var btnC = document.getElementById('mu-btn-c');
    if (btnC) {
      btnC.addEventListener('click', function() {
        window.location.href = 'selecao.html';
      });
    }

    var btnS = document.getElementById('mu-btn-s');
    if (btnS) {
      btnS.addEventListener('click', function() {
        var skBtn = document.getElementById('skBtn');
        if (skBtn) skBtn.click();
      });
    }

    var btnQ = document.getElementById('mu-btn-q');
    if (btnQ) {
      btnQ.addEventListener('click', function() {
        var tpBar = document.getElementById('teleport-bar');
        var tpToggle = document.getElementById('mu-tp-toggle-btn');
        if (tpBar) {
          var open = tpBar.classList.toggle('mu-tp-open');
          btnQ.classList.toggle('active', open);
          if (tpToggle) tpToggle.classList.toggle('active', open);
        } else {
          window.location.href = 'cidade.html';
        }
      });
    }

    var btnO = document.getElementById('mu-btn-o');
    if (btnO) {
      btnO.addEventListener('click', function() {
        var cfgBtn = document.getElementById('cfgBtn');
        if (cfgBtn) cfgBtn.click();
        var cfg = document.getElementById('cfg');
        if (cfg) btnO.classList.toggle('active', cfg.classList.contains('open'));
      });
    }
  },

  setupCleanTopRight: function() {
    var atmoBox = document.querySelector('#map-panel .atmo-bar-box');
    var tpBar = document.getElementById('teleport-bar');
    if (atmoBox && tpBar && !document.getElementById('mu-tp-toggle-btn')) {
      var btn = document.createElement('button');
      btn.id = 'mu-tp-toggle-btn';
      btn.type = 'button';
      btn.innerHTML = '🧭 Locais';
      btn.title = 'Abrir / Fechar lista de Teleportes da Ilha';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var open = tpBar.classList.toggle('mu-tp-open');
        btn.classList.toggle('active', open);
        var btnQ = document.getElementById('mu-btn-q');
        if (btnQ) btnQ.classList.toggle('active', open);
      });
      atmoBox.appendChild(btn);

      tpBar.addEventListener('click', function() {
        tpBar.classList.remove('mu-tp-open');
        btn.classList.remove('active');
        var btnQ = document.getElementById('mu-btn-q');
        if (btnQ) btnQ.classList.remove('active');
      });
    }

    var msgEl = document.getElementById('msg');
    if (msgEl) {
      msgEl.style.opacity = '0';
      var msgTimer = null;
      var msgObs = new MutationObserver(function() {
        msgEl.style.opacity = '1';
        if (msgTimer) clearTimeout(msgTimer);
        msgTimer = setTimeout(function() {
          msgEl.style.opacity = '0';
        }, 3200);
      });
      msgObs.observe(msgEl, { childList: true, characterData: true, subtree: true });
    }

    var topEl = document.getElementById('top');
    if (topEl && !document.getElementById('l2-target-name')) {
      var tgtArt = document.createElement('img');
      tgtArt.className = 'mu-target-art';
      tgtArt.src = 'assets/hud/mu_target_frame_clean.png?v=9';
      tgtArt.alt = '';
      tgtArt.draggable = false;
      topEl.insertBefore(tgtArt, topEl.firstChild);

      var tgtName = document.createElement('div');
      tgtName.id = 'l2-target-name';
      tgtName.textContent = 'Espantalho de Treino';
      topEl.insertBefore(tgtName, topEl.firstChild);

      var firstBar = topEl.querySelector('.bar'); if (firstBar) firstBar.classList.add('mu-hp-bar');   /* o CSS usava :first-of-type, mas a div do nome entra antes e escondia a barra de vida */
      if (firstBar && !document.getElementById('mu-target-hp-liquid')) {
        var tgtLiq = document.createElement('img');
        tgtLiq.className = 'mu-target-crystal';
        tgtLiq.id = 'mu-target-hp-liquid';
        tgtLiq.src = 'assets/hud/mu_target_hp_fill.png?v=9';
        tgtLiq.alt = '';
        tgtLiq.draggable = false;
        firstBar.insertBefore(tgtLiq, firstBar.firstChild);
      }
    }

    var self = this;
    setInterval(function() {
      var S = window.S;
      var topBox = document.getElementById('top');
      if (!S || !topBox) return;

      var isArena = location.pathname.toLowerCase().indexOf('arena') !== -1;
      var distEnemy = Math.hypot((S.px || 0) - (S.ex || 0), (S.pz || 0) - (S.ez || 0));
      var hasTarget = !!(S.aimT || S.aimM || S.fightOn || S.combo > 0 || (isArena && !S.dead && distEnemy < 28) || (!isArena && distEnemy < 14));

      topBox.classList.toggle('l2-target-active', hasTarget);

      if (hasTarget) {
        var nameEl = document.getElementById('l2-target-name');
        var ehpTxt = document.getElementById('ehptxt');
        var tgtLiq = document.getElementById('mu-target-hp-liquid');
        var tgtPct = 100;

        if (nameEl) {
          if (S.aimM && S.aimM.T) {
            nameEl.textContent = S.aimM.T.name + '  ·  Nv. ' + (S.aimM.T.lvl || 1);
            var mHp = Math.max(0, Math.round(S.aimM.hp));
            var mMax = Math.max(1, Math.round(S.aimM.maxhp));
            tgtPct = Math.max(0, Math.min(100, (mHp / mMax) * 100));
            if (ehpTxt) ehpTxt.textContent = mHp + ' / ' + mMax;
          } else if (isArena) {
            nameEl.textContent = '👑 Baium  ·  Raid Boss (Nv. 75)';
            var bHp = Math.max(0, Math.round(S.hp));
            var bMax = Math.max(1, Math.round(S.maxhp));
            tgtPct = Math.max(0, Math.min(100, (bHp / bMax) * 100));
            if (ehpTxt) ehpTxt.textContent = bHp + ' / ' + bMax;
          } else {
            nameEl.textContent = 'Espantalho de Treino  ·  Nv. 1';
            tgtPct = 100;
            if (ehpTxt) ehpTxt.textContent = 'ALVO DE TREINO';
          }
        }
        if (tgtLiq) {
          tgtLiq.style.clipPath = 'inset(0 ' + (100 - tgtPct).toFixed(1) + '% 0 0)'; vp(tgtLiq, tgtPct);
        }
      }

      // Sincroniza cooldowns das skills equipadas nos slots customizáveis
      var origSkillBtns = document.querySelectorAll('#skills button');
      var slotBtns = document.querySelectorAll('.mu-hotbar-slot');
      slotBtns.forEach(function(btn, idx) {
        var data = self.slots[idx];
        if (data && data.type === 'skill') {
          var orig = origSkillBtns[data.skillSlot];
          if (orig) {
            var em = orig.querySelector('em');
            var u = orig.querySelector('u');
            var cdFill = btn.querySelector('.slot-cd-fill');
            var cdTxt = btn.querySelector('.slot-cd-txt');
            if (cdFill && em) cdFill.style.height = em.style.height || '0%';
            if (cdTxt && u) cdTxt.textContent = u.textContent || '';
          }
        }
      });
    }, 100);
  },

  update: function(S) {
    if (!S) return;
    if (window.QUAL && QUAL.touch) { var _n = performance.now(); if (_n - (this._u || 0) < 110) return; this._u = _n; }      /* celular: barras e recargas ~9x por segundo */

    // 1. Atualiza Cristal Esquerdo: VIDA (HP)
    var php = (S.php !== undefined) ? Math.max(0, Math.round(S.php)) : 100;
    var pmax = (S.pmax !== undefined && S.pmax > 0) ? Math.round(S.pmax) : 100;
    var hpPct = Math.max(0, Math.min(100, (php / pmax) * 100));

    var liqHp = document.getElementById('mu-hp-liquid');
    var valHp = document.getElementById('mu-hp-val');
    if (liqHp) { liqHp.style.clipPath = 'inset(0 ' + (100 - hpPct).toFixed(1) + '% 0 0)'; vp(liqHp, hpPct); }
    if (valHp) valHp.textContent = 'HP  ' + php + ' / ' + pmax;

    // 2. Atualiza Cristal Direito: STAMINA
    var st = (S.st !== undefined) ? Math.max(0, Math.round(S.st)) : 100;
    var stmax = (S.stmax !== undefined && S.stmax > 0) ? Math.round(S.stmax) : 100;
    var stPct = Math.max(0, Math.min(100, (st / stmax) * 100));

    var liqMp = document.getElementById('mu-mp-liquid');
    var valMp = document.getElementById('mu-mp-val');
    if (liqMp) { liqMp.style.clipPath = 'inset(0 ' + (100 - stPct).toFixed(1) + '% 0 0)'; vp(liqMp, stPct); }
    if (valMp) valMp.textContent = 'STAMINA  ' + st + ' / ' + stmax;

    // 3. Atualiza Nome, Classe e Level na faixa central
    var lvlEl = document.getElementById('muPlayerLvl');
    if (lvlEl && S.lvl) lvlEl.textContent = 'Nv. ' + S.lvl;

    var wpn = localStorage.getItem('isblade.weapon') || 'shield';
    var clsEl = document.getElementById('muPlayerClass');
    if (clsEl) {
      clsEl.textContent = (wpn === 'shield' ? 'Guardião' : (wpn === 'staff' ? 'Místico' : 'Guerreiro'));
    }

    // 4. Sincroniza barra de EXP
    var oldXp = document.getElementById('xpfill');
    var muXp = document.getElementById('mu-xp-fill');
    if (oldXp && muXp) {
      muXp.style.width = oldXp.style.width || '0%';
    }
  },

  hookUpdates: function() {
    var self = this;

    var oldPhpTxt = document.getElementById('phptxt');
    if (oldPhpTxt) {
      var observer = new MutationObserver(function() {
        var txt = oldPhpTxt.textContent || '';
        var match = txt.match(/(\d+)\s*\/\s*(\d+)/);
        if (match) {
          var cur = parseInt(match[1], 10);
          var max = parseInt(match[2], 10);
          var curSt = window.S && window.S.st !== undefined ? window.S.st : 100;
          self.update({ php: cur, pmax: max, st: curSt, stmax: 100, lvl: window.S && window.S.lvl });
        }
      });
      observer.observe(oldPhpTxt, { childList: true, characterData: true, subtree: true });
    }

    var oldStFill = document.getElementById('stfill');
    if (oldStFill) {
      var stObserver = new MutationObserver(function() {
        var w = parseFloat(oldStFill.style.width);
        if (isNaN(w)) w = 100;
        var pct = Math.max(0, Math.min(100, w));
        var liqMp = document.getElementById('mu-mp-liquid');
        var valMp = document.getElementById('mu-mp-val');
        if (liqMp) { liqMp.style.clipPath = 'inset(0 ' + (100 - pct).toFixed(1) + '% 0 0)'; vp(liqMp, pct); }
        if (valMp) valMp.textContent = 'STAMINA  ' + Math.round(pct) + ' / 100';
      });
      stObserver.observe(oldStFill, { attributes: true, attributeFilter: ['style'] });
    }

    // Re-renderiza ícones caso as skills originais mudem (ex: troca de arma)
    var origSkills = document.getElementById('skills');
    if (origSkills) {
      var skObs = new MutationObserver(function() {
        self.sync();
      });
      skObs.observe(origSkills, { childList: true });
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { MuHud.init(); });
} else {
  MuHud.init();
}

window.MuHudRef = MuHud;   /* usado por js/mobile.js (botoes de skill no celular) */
