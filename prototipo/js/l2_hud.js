/* ==========================================================================
   l2_hud.js — Interface Oficial 1:1 do Lineage 2 Interlude (Fiel ao interface.xdat)
   - StatusWnd (Topo Esquerdo 176x84): CP, HP, MP, EXP, Nível e Nome do Jogador
   - ShortcutWnd (Rodapé Central 492x46): 12 Slots acionados pelas teclas de ação
     (Q, E, R, F, T, G / 1 a 6 / F1 a F12) sem atrapalhar a movimentação no WASD
   - Drag & Drop de Skills e Itens/Consumíveis (Poções, Soulshots) para qualquer slot
   - Auto-Soulshot oficial com borda giratória dourada
   - MenuWnd (Rodapé Direito 173x46): Botões Status (U), Inv (I), Mapa (M), Sistema (Alt+X)
   ========================================================================== */

const STORAGE_KEY = 'isblade.l2_shortcuts_v2';
const AUTO_SS_KEY = 'isblade.auto_soulshot';

// Teclas de ação familiares (Q, E, R, F, T, G e números), mantendo WASD 100% livre para movimento!
const DEFAULT_SLOT_KEYS = ['Q', 'E', 'R', 'F', 'T', 'G', '1', '2', '3', '4', '5', '6'];
const SLOT_KEYS_F = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'];
const SLOT_KEYS_NUM = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];

// Posições X exatas dos 12 slots do ShortcutWnd alinhadas à textura metálica do Lineage 2
const SHORTCUT_SLOT_X = [21, 58, 95, 132, 174, 211, 248, 285, 327, 364, 401, 438];

function perChar(k) {
  try {
    var id = localStorage.getItem('isblade_active_character_id');
    return id ? k + '.' + id : k;
  } catch (_) { return k; }
}

export const L2Hud = {
  initialized: false,
  slots: new Array(12).fill(null),
  keys: DEFAULT_SLOT_KEYS.slice(),
  autoSoulshot: false,

  init: function() {
    if (this.initialized) return;
    this.loadSlots();
    this.createDom();
    this.setupInteractions();
    this.setupKeyboard();
    this.hookUpdates();
    this.initialized = true;
    this.sync();
    console.log('⚔️ Interface Oficial Lineage 2 Interlude (StatusWnd + ShortcutWnd + MenuWnd) Ativa.');
  },

  loadSlots: function() {
    try {
      var raw = localStorage.getItem(perChar(STORAGE_KEY));
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 12) this.slots = parsed;
      }
      this.autoSoulshot = localStorage.getItem(perChar(AUTO_SS_KEY)) === '1';
    } catch (_) {}

    // Popula inicialmente os slots com as skills desbloqueadas se a barra estiver vazia
    var hasAny = this.slots.some(function(d) { return d; });
    if (!hasAny) {
      for (var i = 0; i < 6; i++) {
        this.slots[i] = { type: 'skill', skillSlot: i, name: 'Skill ' + (i + 1), ico: '' };
      }
      // Coloca Soulshot no slot 7 por padrão para conveniência
      this.slots[6] = { type: 'item', id: 'soulshot', name: 'Soulshot: No Grade', ico: 'assets/icones/soulshot.png' };
      this.slots[7] = { type: 'item', id: 'pocao_vida', name: 'Poção de Vida', ico: 'assets/icones/pocao_vida.png' };
      this.saveSlots();
    }
  },

  saveSlots: function() {
    try {
      localStorage.setItem(perChar(STORAGE_KEY), JSON.stringify(this.slots));
      localStorage.setItem(perChar(AUTO_SS_KEY), this.autoSoulshot ? '1' : '0');
    } catch (_) {}
  },

  createDom: function() {
    var oldMu = document.getElementById('mu-hud-bottom');
    if (oldMu) oldMu.style.display = 'none';

    // 1. StatusWnd (Topo Esquerdo - 176 x 84 px)
    if (!document.getElementById('l2-status-wnd')) {
      var stWnd = document.createElement('div');
      stWnd.id = 'l2-status-wnd';
      stWnd.className = 'ui';
      stWnd.innerHTML = `
        <div class="l2-st-level" id="l2StLevel">1</div>
        <div class="l2-st-name" id="l2StName">Ikarus</div>
        <div class="l2-bar-track cp"><div class="l2-bar-fill cp" id="l2CpFill" style="width:100%"></div><span id="l2CpVal">100 / 100</span></div>
        <div class="l2-bar-track hp"><div class="l2-bar-fill hp" id="l2HpFill" style="width:100%"></div><span id="l2HpVal">100 / 100</span></div>
        <div class="l2-bar-track mp"><div class="l2-bar-fill mp" id="l2MpFill" style="width:100%"></div><span id="l2MpVal">100 / 100</span></div>
        <div class="l2-bar-track exp"><div class="l2-bar-fill exp" id="l2ExpFill" style="width:0%"></div></div>
      `;
      document.body.appendChild(stWnd);
    }

    // 2. ShortcutWnd (Rodapé Central - 492 x 46 px)
    if (!document.getElementById('l2-shortcut-wnd')) {
      var scWnd = document.createElement('div');
      scWnd.id = 'l2-shortcut-wnd';
      scWnd.className = 'ui';
      var slotsHtml = '';
      for (var i = 0; i < 12; i++) {
        var sx = SHORTCUT_SLOT_X[i];
        var badgeKey = this.keys[i] || SLOT_KEYS_F[i];
        slotsHtml += `
          <div class="l2-sc-slot" data-slot="${i}" style="left:${sx}px;" title="Slot ${i + 1} (Tecla: ${badgeKey})">
            <div class="l2-sc-icon"></div>
            <div class="l2-sc-cd-fill"></div>
            <div class="l2-sc-cd-txt"></div>
            <span class="l2-sc-key">${badgeKey}</span>
            <div class="l2-sc-auto-border"></div>
          </div>
        `;
      }
      scWnd.innerHTML = slotsHtml;
      document.body.appendChild(scWnd);
    }

    // 3. MenuWnd (Rodapé Direito - 173 x 46 px)
    if (!document.getElementById('l2-menu-wnd')) {
      var mnWnd = document.createElement('div');
      mnWnd.id = 'l2-menu-wnd';
      mnWnd.className = 'ui';
      mnWnd.innerHTML = `
        <button type="button" class="l2-mn-btn status" id="l2BtnStatus" title="Status e Atributos (U)"></button>
        <button type="button" class="l2-mn-btn inv" id="l2BtnInv" title="Inventário (I)"></button>
        <button type="button" class="l2-mn-btn map" id="l2BtnMap" title="Mapa / Locais (M)"></button>
        <button type="button" class="l2-mn-btn sys" id="l2BtnSys" title="Menu de Sistema / Opções (Alt + X)"></button>
      `;
      document.body.appendChild(mnWnd);
    }
  },

  setupInteractions: function() {
    var self = this;

    // Botões do MenuWnd
    var bStatus = document.getElementById('l2BtnStatus');
    if (bStatus) bStatus.onclick = function() { if (window.Status && Status.toggle) Status.toggle(); };
    var bInv = document.getElementById('l2BtnInv');
    if (bInv) bInv.onclick = function() {
      var invBtn = document.getElementById('invBtn');
      if (invBtn) invBtn.click();
      else if (window.toggleInv) window.toggleInv();
    };
    var bMap = document.getElementById('l2BtnMap');
    if (bMap) bMap.onclick = function() {
      var locBtn = document.getElementById('locaisBtn') || document.getElementById('mu-tp-toggle-btn');
      if (locBtn) locBtn.click();
      else {
        var tpBar = document.getElementById('teleport-bar');
        if (tpBar) tpBar.classList.toggle('mu-tp-open');
      }
    };
    var bSys = document.getElementById('l2BtnSys');
    if (bSys) bSys.onclick = function() {
      var cfgBtn = document.getElementById('cfgBtn');
      if (cfgBtn) cfgBtn.click();
    };

    // Slots da Barra de Atalhos (ShortcutWnd)
    var slots = document.querySelectorAll('.l2-sc-slot');
    slots.forEach(function(slotEl, idx) {
      slotEl.addEventListener('click', function(e) {
        e.preventDefault();
        self.triggerSlot(idx);
      });

      // Clique direito: se for soulshot/spiritshot, liga/desliga Auto-Soulshot; senão, limpa o slot
      slotEl.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        var data = self.slots[idx];
        if (data && (data.id === 'soulshot' || data.id === 'spiritshot' || (data.name && data.name.toLowerCase().indexOf('soulshot') >= 0))) {
          self.autoSoulshot = !self.autoSoulshot;
          self.saveSlots();
          self.sync();
          try {
            if (window.banner) window.banner(self.autoSoulshot ? 'SOULSHOT ATIVADO' : 'SOULSHOT DESATIVADO', 'Disparo automático em combate', '#ffd166');
          } catch (_) {}
        } else {
          self.slots[idx] = null;
          self.saveSlots();
          self.sync();
        }
      });

      // Drag & Drop livre entre slots e recepção de itens do inventário ou skills da janela de skills
      slotEl.setAttribute('draggable', 'true');
      slotEl.addEventListener('dragstart', function(e) {
        if (!self.slots[idx]) { e.preventDefault(); return; }
        var payload = JSON.stringify({ type: 'slot-swap', from: idx });
        e.dataTransfer.setData('text/plain', payload);
        e.dataTransfer.setData('application/json', payload);
      });
      slotEl.addEventListener('dragover', function(e) {
        e.preventDefault();
        slotEl.classList.add('drag-over');
      });
      slotEl.addEventListener('dragleave', function() {
        slotEl.classList.remove('drag-over');
      });
      slotEl.addEventListener('drop', function(e) {
        e.preventDefault();
        slotEl.classList.remove('drag-over');
        try {
          var raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
          if (!raw) return;
          var payload = JSON.parse(raw);
          if (payload.type === 'slot-swap' && payload.from !== undefined) {
            var tmp = self.slots[idx];
            self.slots[idx] = self.slots[payload.from];
            self.slots[payload.from] = tmp;
            self.saveSlots();
            self.sync();
            return;
          }
          if (payload.type === 'skill' || payload.type === 'item') {
            self.slots[idx] = payload;
            self.saveSlots();
            self.sync();
          }
        } catch (_) {}
      });
    });
  },

  setupKeyboard: function() {
    var self = this;
    window.addEventListener('keydown', function(e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var k = e.key;
      var kLow = k.toLowerCase();

      // NUNCA interceptar WASD de movimentação!
      if (kLow === 'w' || kLow === 'a' || kLow === 's' || kLow === 'd') return;

      // 1. Teclas diretas atribuídas aos slots (Q, E, R, F, T, G / 1 a 6)
      var slotIdx = -1;
      for (var i = 0; i < 12; i++) {
        var sk = (self.keys[i] || '').toLowerCase();
        if (sk && sk === kLow) {
          slotIdx = i;
          break;
        }
      }

      // 2. Números 1 a 6 como acionadores alternativos diretos
      if (slotIdx === -1) {
        var numMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '0': 9, '-': 10, '=': 11 };
        if (numMap[k] !== undefined) {
          slotIdx = numMap[k];
        }
      }

      // 3. F1 a F12
      if (slotIdx === -1 && /^F([1-9]|1[0-2])$/.test(k)) {
        e.preventDefault();
        slotIdx = parseInt(k.substring(1), 10) - 1;
      }

      if (slotIdx >= 0 && slotIdx < 12 && self.slots[slotIdx]) {
        self.triggerSlot(slotIdx);
      }
    });
  },

  triggerSlot: function(idx) {
    var data = this.slots[idx];
    if (!data) return;

    if (data.type === 'skill') {
      if (typeof window.req === 'function') {
        window.req('skill', data.skillSlot);
      } else {
        var origSkillBtns = document.querySelectorAll('#skills button');
        var targetBtn = origSkillBtns[data.skillSlot];
        if (targetBtn) {
          targetBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
          setTimeout(function() {
            targetBtn.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
          }, 60);
        }
      }
    } else if (data.type === 'item') {
      if (data.id === 'soulshot' || data.id === 'spiritshot' || (data.name && data.name.toLowerCase().indexOf('soulshot') >= 0)) {
        if (typeof window.usarSoulshot === 'function') window.usarSoulshot();
      } else if (typeof window.usarConsumivel === 'function') {
        window.usarConsumivel(data.id || data.base);
      } else if (data.uid) {
        if (typeof window.equipItem === 'function') {
          window.equipItem(data.uid);
        }
      }
    }
  },

  sync: function() {
    var self = this;
    var slots = document.querySelectorAll('.l2-sc-slot');
    var origSkillBtns = document.querySelectorAll('#skills button');

    slots.forEach(function(slotEl, idx) {
      var data = self.slots[idx];
      var iconEl = slotEl.querySelector('.l2-sc-icon');
      var autoEl = slotEl.querySelector('.l2-sc-auto-border');
      var keyEl = slotEl.querySelector('.l2-sc-key');

      if (keyEl) keyEl.textContent = self.keys[idx] || SLOT_KEYS_F[idx];

      if (!data) {
        if (iconEl) iconEl.innerHTML = '';
        if (autoEl) autoEl.style.display = 'none';
        return;
      }

      if (data.type === 'skill') {
        var skBtn = origSkillBtns[data.skillSlot];
        var icoPath = data.ico || (skBtn && skBtn.querySelector('img') && skBtn.querySelector('img').src);
        if (icoPath) {
          iconEl.innerHTML = '<img src="' + icoPath + '" width="32" height="32" alt="" style="display:block;border-radius:2px;pointer-events:none;" onerror="this.onerror=null;this.src=\'assets/icones/sword_long.png\';">';
        } else if (data.svg) {
          iconEl.innerHTML = '<div style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;pointer-events:none;">' + data.svg + '</div>';
        } else {
          iconEl.innerHTML = '<img src="assets/icones/sword_long.png" width="32" height="32" alt="" style="display:block;border-radius:2px;pointer-events:none;">';
        }
        if (autoEl) autoEl.style.display = 'none';
      } else if (data.type === 'item') {
        var itemIco = data.ico || ('assets/icones/' + (data.id || data.base || 'sword_long') + '.png');
        if (iconEl) iconEl.innerHTML = '<img src="' + itemIco + '" width="32" height="32" alt="" style="display:block;border-radius:2px;pointer-events:none;" onerror="this.onerror=null;this.src=\'assets/icones/pocao_vida.png\';">';
        if (autoEl) {
          var isSS = (data.id === 'soulshot' || data.id === 'spiritshot' || (data.name && data.name.toLowerCase().indexOf('soulshot') >= 0));
          autoEl.style.display = (isSS && self.autoSoulshot) ? 'block' : 'none';
        }
      }
    });

    // Sincroniza mapa de teclas para o loop do jogo
    var map = {};
    this.slots.forEach(function(d, i) {
      if (d && d.type === 'skill') {
        var k = (self.keys[i] || '').toLowerCase();
        if (k) map[k] = d.skillSlot;
      }
    });
    if (typeof window.__hotbarKeys === 'function') window.__hotbarKeys(map);
  },

  hookUpdates: function() {
    var self = this;
    setInterval(function() {
      var S = window.S;
      if (!S) return;

      // 1. Atualiza StatusWnd (CP, HP, MP, EXP, Nível, Nome)
      var pName = localStorage.getItem('isblade.player_name') || 'Ikarus';
      var lvlEl = document.getElementById('l2StLevel');
      if (lvlEl) lvlEl.textContent = S.lvl || 1;
      var nameEl = document.getElementById('l2StName');
      if (nameEl) nameEl.textContent = pName;

      var php = Math.max(0, Math.round(S.php !== undefined ? S.php : 100));
      var pmax = Math.max(1, Math.round(S.pmax !== undefined ? S.pmax : 100));
      var hpPct = Math.min(100, Math.max(0, (php / pmax) * 100));
      var hpFill = document.getElementById('l2HpFill');
      if (hpFill) hpFill.style.width = hpPct.toFixed(1) + '%';
      var hpVal = document.getElementById('l2HpVal');
      if (hpVal) hpVal.textContent = php + ' / ' + pmax;

      // CP
      var cpFill = document.getElementById('l2CpFill');
      var cpVal = document.getElementById('l2CpVal');
      var cpPct = Math.min(100, Math.max(0, ((S.gauge !== undefined ? S.gauge : 100) / (S.gmax || 100)) * 100));
      if (cpFill) cpFill.style.width = cpPct.toFixed(1) + '%';
      if (cpVal) cpVal.textContent = Math.round(cpPct) + ' / 100';

      // MP (Stamina)
      var stMx = (typeof window.stMax === 'function') ? window.stMax() : 100; // [estamina] maximo por nivel
      var st = Math.max(0, Math.round(S.st !== undefined ? S.st : stMx));
      var mpFill = document.getElementById('l2MpFill');
      var mpVal = document.getElementById('l2MpVal');
      if (mpFill) mpFill.style.width = Math.min(100, st / stMx * 100).toFixed(1) + '%';
      if (mpVal) mpVal.textContent = st + ' / ' + stMx;

      // EXP
      var xpNeed = (typeof window.xpNeed === 'function' ? window.xpNeed(S.lvl) : 1000);
      var xpPct = Math.min(100, Math.max(0, ((S.xp || 0) / xpNeed) * 100));
      var expFill = document.getElementById('l2ExpFill');
      if (expFill) expFill.style.width = xpPct.toFixed(1) + '%';

      // 2. Sincroniza Cooldowns na ShortcutWnd
      var origSkillBtns = document.querySelectorAll('#skills button');
      var slots = document.querySelectorAll('.l2-sc-slot');
      slots.forEach(function(slotEl, idx) {
        var data = self.slots[idx];
        if (data && data.type === 'skill') {
          var orig = origSkillBtns[data.skillSlot];
          if (orig) {
            var em = orig.querySelector('em');
            var u = orig.querySelector('u');
            var cdFill = slotEl.querySelector('.l2-sc-cd-fill');
            var cdTxt = slotEl.querySelector('.l2-sc-cd-txt');
            if (cdFill && em) cdFill.style.height = em.style.height || '0%';
            if (cdTxt && u) cdTxt.textContent = u.textContent || '';
          }
        }
      });
    }, 100);
  },

  keyOf: function(i) {
    return this.keys[i] || SLOT_KEYS_F[i] || ('Slot ' + (i + 1));
  },

  setKey: function(i, k) {
    if (!k || k.length !== 1) return false;
    var kUp = k.toUpperCase();
    if (['W', 'A', 'S', 'D'].indexOf(kUp) >= 0) return false;
    this.keys[i] = kUp;
    this.saveSlots();
    this.sync();
    return true;
  },

  resetKeys: function() {
    this.keys = DEFAULT_SLOT_KEYS.slice();
    this.saveSlots();
    this.sync();
  },

  keyTrigger: function(k) {
    var kLow = (k || '').toLowerCase();
    for (var i = 0; i < 12; i++) {
      if ((this.keys[i] || '').toLowerCase() === kLow) {
        if (this.slots[i] && this.slots[i].type === 'item') {
          this.triggerSlot(i);
          return true;
        }
      }
    }
    return false;
  }
};

// Retrocompatibilidade total para chamadas legadas
export const MuHud = {
  get initialized() { return L2Hud.initialized; },
  get slots() { return L2Hud.slots; },
  set slots(v) { L2Hud.slots = v; },
  init: function() { L2Hud.init(); },
  update: function(S) {},
  sync: function() { L2Hud.sync(); },
  triggerSlot: function(i) { L2Hud.triggerSlot(i); },
  keyOf: function(i) { return L2Hud.keyOf(i); },
  setKey: function(i, k) { return L2Hud.setKey(i, k); },
  resetKeys: function() { L2Hud.resetKeys(); },
  keyTrigger: function(k) { return L2Hud.keyTrigger(k); }
};

window.L2Hud = L2Hud;
window.MuHud = MuHud;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { L2Hud.init(); });
} else {
  L2Hud.init();
}
