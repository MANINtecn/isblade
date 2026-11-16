'use strict';
/* ==========================================================================
   PAINEL DE ADMINISTRAÇÃO / GM POWER - IS BLADE (16/11/2026)
   Interface visual exclusiva para controle de Administrador / Game Master (GM):
   - Definir Nível (1 a 85 / Graus D, C, B, A, S e Herói)
   - Ressurreição Instantânea (Ress com 100% HP/MP)
   - Cura Completa (Full Heal)
   - God Mode (Modo Invulnerável / Imortalidade)
   - Abater Alvo Selecionado (Kill)
   - Velocidade GM (1x a 3x)
   - Economia & Adena (+100k, +1M, +10M)
   - Encantamento de Arma (+4, +7, +10, +16) com Glow Visual
   - Teleporte Rápido para qualquer local do mundo
   - Atalho direto para Bots PvP
   - Tecla de atalho: F10 ou comando //admin no chat
   ========================================================================== */

(function(){
  if(window.PainelAdmin) return;

  var container = null;
  var btnTrigger = null;
  var aberto = false;
  var godModeAtivo = false;
  var speedAtual = 1;
  var nivelAtual = 1;

  var DESTINOS = {
    cidade: { nome: 'Talking Island (Cidade)', x: 0, z: 6 },
    arena: { nome: 'Arena PvP (Coliseu)', x: -28.4, z: -53.85 },
    curuma: { nome: 'Torre de Cruma', x: -53.7, z: -42.7 },
    fortress: { nome: 'Fortaleza', x: -51.0, z: 51.5 },
    pantano: { nome: 'Pântano Flamejante', x: 51.1, z: 43.4 },
    baium: { nome: 'Salão de Baium', x: -28.4, z: -53.85 }
  };

  function som(tipo){
    try {
      if(window.SFX && SFX.play) SFX.play(tipo === 'click' ? 'ui' : (tipo === 'open' ? 'quest' : (tipo === 'power' ? 'enchant' : 'ui')));
    } catch(_){}
  }

  function criarEstilos(){
    if(document.getElementById('painel-admin-css')) return;
    var st = document.createElement('style');
    st.id = 'painel-admin-css';
    st.textContent = `
      #gm-trigger-btn {
        position: fixed;
        top: 56px;
        right: 14px;
        z-index: 9998;
        background: linear-gradient(135deg, #1c1505 0%, #3a2a0a 100%);
        color: #f5c451;
        border: 1.5px solid #d4af37;
        box-shadow: 0 0 14px rgba(212, 175, 55, 0.4), inset 0 0 8px rgba(255, 215, 0, 0.2);
        padding: 6px 14px;
        border-radius: 6px;
        font: 800 12px 'Cinzel', system-ui, sans-serif;
        letter-spacing: .1em;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all .2s ease;
        user-select: none;
      }
      #gm-trigger-btn:hover {
        transform: translateY(-2px);
        background: linear-gradient(135deg, #2b2008 0%, #523b0e 100%);
        border-color: #ffd700;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
        color: #fff;
      }

      #painel-admin-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 580px;
        max-width: 95vw;
        max-height: 88vh;
        background: linear-gradient(180deg, rgba(14, 18, 30, 0.98) 0%, rgba(8, 10, 18, 0.99) 100%);
        border: 2px solid #d4af37;
        border-radius: 12px;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.9), 0 0 24px rgba(212, 175, 55, 0.35);
        color: #e6e8ee;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 99999;
        display: none;
        flex-direction: column;
        overflow: hidden;
        user-select: none;
        backdrop-filter: blur(8px);
      }

      .pa-header {
        background: linear-gradient(90deg, #1c1404 0%, #2e2107 50%, #1c1404 100%);
        border-bottom: 1.5px solid #d4af37;
        padding: 12px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
      }
      .pa-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: .08em;
        color: #ffd700;
        text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
      }
      .pa-close {
        background: none;
        border: none;
        color: #aaa;
        font-size: 20px;
        cursor: pointer;
        line-height: 1;
        transition: color .2s;
      }
      .pa-close:hover { color: #ff6b6b; }

      .pa-body {
        padding: 16px 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }

      .pa-section {
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(212, 175, 55, 0.2);
        border-radius: 8px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pa-sec-title {
        font-size: 12px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .1em;
        color: #ffd700;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .pa-grid-btns {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
        gap: 8px;
      }

      .pa-btn {
        background: rgba(30, 41, 64, 0.7);
        border: 1px solid #486581;
        color: #d9e2ec;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all .15s ease;
      }
      .pa-btn:hover {
        background: rgba(48, 65, 100, 0.9);
        border-color: #5aa9ff;
        color: #fff;
        transform: translateY(-1px);
      }
      .pa-btn.active {
        background: linear-gradient(135deg, #443206 0%, #7a5a0c 100%);
        border-color: #ffd700;
        color: #fff;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
      }
      .pa-btn-ress {
        background: linear-gradient(135deg, #0d381e 0%, #176335 100%);
        border-color: #48bb78;
        color: #9ae6b4;
      }
      .pa-btn-ress:hover {
        background: linear-gradient(135deg, #124d29 0%, #1f8246 100%);
        border-color: #68d391;
        color: #fff;
      }
      .pa-btn-heal {
        background: linear-gradient(135deg, #441324 0%, #782140 100%);
        border-color: #f687b3;
        color: #fed7e2;
      }
      .pa-btn-heal:hover {
        background: linear-gradient(135deg, #59192f 0%, #9c2b53 100%);
        border-color: #fbb6ce;
        color: #fff;
      }
      .pa-btn-kill {
        background: linear-gradient(135deg, #3d0c0c 0%, #631717 100%);
        border-color: #e53e3e;
        color: #feb2b2;
      }
      .pa-btn-kill:hover {
        background: linear-gradient(135deg, #571212 0%, #822020 100%);
        border-color: #fc8181;
        color: #fff;
      }
      .pa-btn-gold {
        background: linear-gradient(135deg, #382905 0%, #614709 100%);
        border-color: #ecc94b;
        color: #fefcbf;
      }
      .pa-btn-gold:hover {
        background: linear-gradient(135deg, #4d3907 0%, #805e0c 100%);
        border-color: #faf089;
        color: #fff;
      }

      .pa-slider-row {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .pa-slider-row input[type="range"] {
        flex: 1;
        accent-color: #ffd700;
        cursor: pointer;
      }
      .pa-val-box {
        font-size: 13px;
        font-weight: 800;
        color: #ffd700;
        min-width: 44px;
        text-align: right;
      }

      .pa-footer {
        padding: 10px 18px;
        background: rgba(0, 0, 0, 0.4);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: #8892b0;
      }
    `;
    document.head.appendChild(st);
  }

  function renderModal(){
    if(container) return;
    criarEstilos();

    // 1. Botão Flutuante GM
    btnTrigger = document.createElement('button');
    btnTrigger.type = 'button';
    btnTrigger.id = 'gm-trigger-btn';
    btnTrigger.innerHTML = '👑 GM [F10]';
    btnTrigger.title = 'Abrir Painel de Administração / GM Power (Tecla F10)';
    btnTrigger.onclick = function(){ toggle(); };
    document.body.appendChild(btnTrigger);

    // 2. Modal do Painel
    container = document.createElement('div');
    container.id = 'painel-admin-modal';
    container.innerHTML = `
      <div class="pa-header" id="pa-drag-header">
        <div class="pa-title">
          <span>👑</span>
          <span>PAINEL DE ADMINISTRAÇÃO · GM POWER</span>
        </div>
        <button class="pa-close" id="pa-btn-fechar" title="Fechar">&times;</button>
      </div>

      <div class="pa-body">
        <!-- 1. DEFINIÇÃO DE NÍVEL -->
        <div class="pa-section">
          <div class="pa-sec-title">⚡ Nível do Personagem (Atributos & Grau)</div>
          <div class="pa-grid-btns">
            <button class="pa-btn" data-lv="20">Nv 20 (D)</button>
            <button class="pa-btn" data-lv="40">Nv 40 (C)</button>
            <button class="pa-btn" data-lv="52">Nv 52 (B)</button>
            <button class="pa-btn" data-lv="61">Nv 61 (A)</button>
            <button class="pa-btn" data-lv="76">Nv 76 (S)</button>
            <button class="pa-btn" data-lv="85">Nv 85 (Hero)</button>
          </div>
          <div class="pa-slider-row">
            <input type="range" id="pa-slider-lv" min="1" max="85" value="40">
            <div class="pa-val-box" id="pa-txt-lv">Nv 40</div>
            <button class="pa-btn pa-btn-gold" id="pa-btn-aplicar-lv" style="padding: 6px 14px;">⚡ Aplicar Nível</button>
          </div>
        </div>

        <!-- 2. SOBREVIVÊNCIA & COMBATE -->
        <div class="pa-section">
          <div class="pa-sec-title">💚 Sobrevivência & Combate</div>
          <div class="pa-grid-btns">
            <button class="pa-btn pa-btn-ress" id="pa-btn-ress">⚡ Ressuscitar (Ress)</button>
            <button class="pa-btn pa-btn-heal" id="pa-btn-heal">💖 Curar Tudo (Heal)</button>
            <button class="pa-btn" id="pa-btn-god">🛡️ God Mode: OFF</button>
            <button class="pa-btn pa-btn-kill" id="pa-btn-kill">💀 Matar Alvo</button>
          </div>
        </div>

        <!-- 3. VELOCIDADE GM -->
        <div class="pa-section">
          <div class="pa-sec-title">🏃 Velocidade de Movimento GM</div>
          <div class="pa-grid-btns">
            <button class="pa-btn active" data-sp="1">1x Normal</button>
            <button class="pa-btn" data-sp="1.5">1.5x Rápido</button>
            <button class="pa-btn" data-sp="2">2x Super</button>
            <button class="pa-btn" data-sp="3">3x Flash</button>
          </div>
        </div>

        <!-- 4. ECONOMIA & ENCANTAMENTO -->
        <div class="pa-section">
          <div class="pa-sec-title">💰 Economia & Glow de Arma</div>
          <div class="pa-grid-btns">
            <button class="pa-btn pa-btn-gold" data-adena="100000">+100k Adena</button>
            <button class="pa-btn pa-btn-gold" data-adena="1000000">+1M Adena</button>
            <button class="pa-btn" data-en="4">Arma +4 (Azul)</button>
            <button class="pa-btn" data-en="7">Arma +7 (Vívido)</button>
            <button class="pa-btn" data-en="10">Arma +10 (Púrpura)</button>
            <button class="pa-btn" data-en="16">Arma +16 (Hero)</button>
          </div>
        </div>

        <!-- 5. TELEPORTE RÁPIDO -->
        <div class="pa-section">
          <div class="pa-sec-title">🌀 Teleporte Rápido</div>
          <div class="pa-grid-btns">
            <button class="pa-btn" data-tp="cidade">Talking Island</button>
            <button class="pa-btn" data-tp="arena">Arena PvP</button>
            <button class="pa-btn" data-tp="curuma">Torre Cruma</button>
            <button class="pa-btn" data-tp="fortress">Fortaleza</button>
            <button class="pa-btn" data-tp="pantano">Pântano</button>
            <button class="pa-btn" data-tp="baium">Salão Baium</button>
          </div>
        </div>

        <!-- 6. ATALHO BOTS PVP & GUERRA DE TIMES -->
        <div class="pa-section">
          <div class="pa-sec-title">🤖 Guerra de Times & Bots PvP</div>
          <div class="pa-grid-btns">
            <button class="pa-btn pa-btn-gold" id="pa-btn-bots-times">🚩 Guerra 5v5 (com Healers)</button>
            <button class="pa-btn pa-btn-gold" id="pa-btn-bots-spawn">⚔️ Spawn 10 Bots (Nv Atual)</button>
            <button class="pa-btn pa-btn-kill" id="pa-btn-bots-limpar">🛑 Limpar Bots</button>
            <button class="pa-btn" id="pa-btn-bots-painel">⚙️ Painel de Bots (F8)</button>
          </div>
          <div style="font-size:10px;font-weight:700;color:#94a3b8;margin:6px 0 4px;text-transform:uppercase;">Time do GM / Jogador:</div>
          <div class="pa-grid-btns">
            <button class="pa-btn" id="pa-btn-gm-time-a" style="border-color:#3b82f6;color:#93c5fd;">🔵 Time Azul</button>
            <button class="pa-btn" id="pa-btn-gm-time-b" style="border-color:#ef4444;color:#fca5a5;">🔴 Time Vermelho</button>
            <button class="pa-btn" id="pa-btn-gm-time-0">⚪ Neutro</button>
          </div>
        </div>
      </div>

      <div class="pa-footer">
        <span>Comandos de Chat: <b>//setlevel [1-85]</b> &middot; <b>//ress</b> &middot; <b>//heal</b> &middot; <b>//god</b> &middot; <b>//kill</b></span>
        <span>Atalho: <b>[F10]</b></span>
      </div>
    `;
    document.body.appendChild(container);

    vincularEventos();
  }

  function vincularEventos(){
    document.getElementById('pa-btn-fechar').onclick = function(){ toggle(false); };

    // Slider de Nível
    var slider = document.getElementById('pa-slider-lv');
    var txtLv = document.getElementById('pa-txt-lv');
    slider.oninput = function(){
      txtLv.textContent = 'Nv ' + slider.value;
    };

    // Botões rápidos de nível
    container.querySelectorAll('[data-lv]').forEach(function(b){
      b.onclick = function(){
        var lv = parseInt(b.dataset.lv, 10);
        slider.value = lv;
        txtLv.textContent = 'Nv ' + lv;
        aplicarNivel(lv);
      };
    });

    document.getElementById('pa-btn-aplicar-lv').onclick = function(){
      aplicarNivel(parseInt(slider.value, 10));
    };

    // Ressuscitar
    document.getElementById('pa-btn-ress').onclick = function(){
      som('power');
      cmd('ress');
    };

    // Curar Tudo
    document.getElementById('pa-btn-heal').onclick = function(){
      som('power');
      cmd('heal');
    };

    // God Mode
    document.getElementById('pa-btn-god').onclick = function(){
      som('power');
      cmd('god');
    };

    // Matar Alvo
    document.getElementById('pa-btn-kill').onclick = function(){
      som('power');
      cmd('kill');
    };

    // Velocidade GM
    container.querySelectorAll('[data-sp]').forEach(function(b){
      b.onclick = function(){
        som('click');
        var sp = parseFloat(b.dataset.sp);
        container.querySelectorAll('[data-sp]').forEach(function(x){ x.classList.remove('active'); });
        b.classList.add('active');
        cmd('speed', { speed: sp });
        aplicarSpeed(sp);
      };
    });

    // Adena
    container.querySelectorAll('[data-adena]').forEach(function(b){
      b.onclick = function(){
        som('power');
        var q = parseInt(b.dataset.adena, 10);
        cmd('adena', { qtd: q });
      };
    });

    // Encantar Arma
    container.querySelectorAll('[data-en]').forEach(function(b){
      b.onclick = function(){
        som('power');
        var e = parseInt(b.dataset.en, 10);
        cmd('enchant', { en: e });
      };
    });

    // Teleportes
    container.querySelectorAll('[data-tp]').forEach(function(b){
      b.onclick = function(){
        som('click');
        var dest = b.dataset.tp;
        cmd('teleport', { destino: dest });
        onTeleport({ destino: dest });
      };
    });

    // Bots PvP & Guerra de Times
    document.getElementById('pa-btn-bots-times').onclick = function(){
      som('click');
      var lv = parseInt(slider.value, 10) || 40;
      if(window.Net && Net.botCmd){
        Net.botCmd({ acao: 'spawn_times', qtdPorTime: 5, lv: lv, comHealer: true });
      }
    };
    document.getElementById('pa-btn-bots-spawn').onclick = function(){
      som('click');
      var lv = parseInt(slider.value, 10) || 40;
      if(window.Net && Net.botCmd){
        Net.botCmd({ acao: 'spawn', qtd: 10, lv: lv, modo: 'pvp', comHealer: true });
      }
    };
    document.getElementById('pa-btn-bots-limpar').onclick = function(){
      som('click');
      if(window.Net && Net.botCmd){
        Net.botCmd({ acao: 'limpar', tudo: true });
      }
    };
    document.getElementById('pa-btn-bots-painel').onclick = function(){
      som('click');
      if(window.PainelBots && PainelBots.toggle) PainelBots.toggle(true);
    };
    document.getElementById('pa-btn-gm-time-a').onclick = function(){
      som('click');
      if(window.Net && Net.setTeam) Net.setTeam('A');
    };
    document.getElementById('pa-btn-gm-time-b').onclick = function(){
      som('click');
      if(window.Net && Net.setTeam) Net.setTeam('B');
    };
    document.getElementById('pa-btn-gm-time-0').onclick = function(){
      som('click');
      if(window.Net && Net.setTeam) Net.setTeam('');
    };

    // Draggable
    tornarArrastavel(container, document.getElementById('pa-drag-header'));
  }

  function cmd(acao, dados){
    if(window.Net && Net.adminCmd){
      var payload = Object.assign({ acao: acao }, dados || {});
      var alvoId = (Net.alvoAtual && Net.alvoAtual()) || 0;
      if(alvoId) payload.alvo = alvoId;
      Net.adminCmd(payload);
    }
  }

  function aplicarNivel(lv){
    som('power');
    cmd('setlevel', { lv: lv });
  }

  function toggle(forca){
    renderModal();
    aberto = typeof forca === 'boolean' ? forca : !aberto;
    container.style.display = aberto ? 'flex' : 'none';
    som(aberto ? 'open' : 'click');
    if(aberto) cmd('info');
  }

  function atualizar(info){
    renderModal();
    if(typeof info.godMode === 'boolean'){
      godModeAtivo = info.godMode;
      var bGod = document.getElementById('pa-btn-god');
      if(bGod){
        bGod.textContent = godModeAtivo ? '🛡️ God Mode: ON' : '🛡️ God Mode: OFF';
        bGod.classList.toggle('active', godModeAtivo);
      }
    }
    if(typeof info.speed === 'number'){
      speedAtual = info.speed;
      aplicarSpeed(speedAtual);
      container.querySelectorAll('[data-sp]').forEach(function(b){
        b.classList.toggle('active', parseFloat(b.dataset.sp) === speedAtual);
      });
    }
    if(typeof info.lv === 'number'){
      nivelAtual = info.lv;
      var slider = document.getElementById('pa-slider-lv');
      var txtLv = document.getElementById('pa-txt-lv');
      if(slider && txtLv){
        slider.value = nivelAtual;
        txtLv.textContent = 'Nv ' + nivelAtual;
      }
    }
  }

  function aplicarSpeed(mult){
    window._adminSpeedMult = Math.max(0.5, Math.min(5, mult || 1));
    if(window.ModoCamera) window.ModoCamera.escala = 1;
    try {
      if(typeof window.RUN !== 'undefined' && typeof window.P !== 'undefined' && window.P.run){
        var atBonus = (typeof window.AT !== 'undefined' && window.AT && window.AT.run) ? window.AT.run : 0;
        window.RUN = window.P.run * (1 + atBonus) * window._adminSpeedMult;
      }
    } catch(e){}
  }

  function onTeleport(m){
    var dKey = String(m.destino || '').toLowerCase();
    var dest = DESTINOS[dKey];
    if(!dest) return;

    // Se estiver em cidade.html e for teleportar para a cidade ou outro local
    if(window.L2Teleport && L2Teleport.warpLocal && typeof S !== 'undefined'){
      L2Teleport.warpLocal(dest.nome, function(){
        S.px = dest.x; S.pz = dest.z;
        if(typeof S.py !== 'undefined' && typeof getGroundHeight === 'function'){
          S.py = getGroundHeight(S.px, S.pz);
        }
      });
    } else if(typeof S !== 'undefined'){
      S.px = dest.x; S.pz = dest.z;
    }
  }

  function tornarArrastavel(el, handle){
    var posX = 0, posY = 0, mouseX = 0, mouseY = 0;
    handle.onmousedown = function(e){
      e.preventDefault();
      mouseX = e.clientX;
      mouseY = e.clientY;
      document.onmouseup = function(){
        document.onmouseup = null;
        document.onmousemove = null;
      };
      document.onmousemove = function(e2){
        e2.preventDefault();
        posX = mouseX - e2.clientX;
        posY = mouseY - e2.clientY;
        mouseX = e2.clientX;
        mouseY = e2.clientY;
        el.style.top = (el.offsetTop - posY) + 'px';
        el.style.left = (el.offsetLeft - posX) + 'px';
        el.style.transform = 'none';
      };
    };
  }

  // Atalho de teclado F10
  window.addEventListener('keydown', function(e){
    if(e.key === 'F10'){
      e.preventDefault();
      toggle();
    }
  });

  // Inicialização segura
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', renderModal);
  } else {
    renderModal();
  }

  window.PainelAdmin = {
    abrir: function(){ toggle(true); },
    fechar: function(){ toggle(false); },
    toggle: toggle,
    atualizar: atualizar,
    aplicarSpeed: aplicarSpeed,
    onTeleport: onTeleport
  };
})();
