'use strict';
/* ==========================================================================
   PAINEL DE ADMINISTRAÇÃO / GM POWER - IS BLADE (17/11/2026)
   Interface visual exclusiva para controle de Administrador / Game Master (GM):
   - Controle de Alvo (Target): Aplicar em Mim (Eu) ou no Target (Alvo selecionado no jogo ou na lista)
   - Definir Nível (1 a 85 / Graus D, C, B, A, S e Herói)
   - Trocar Nick (Personagens Reais ou Bots)
   - Trocar Sexo (Masculino ↔ Feminino com modelo 3D atualizado em tempo real)
   - Kits de Equipamento por Grau (No-Grade, D, C, B, A, S equipados com glow e encantamento oficial)
   - Ressurreição Instantânea (Ress com 100% HP/MP)
   - Cura Completa (Full Heal)
   - God Mode (Modo Invulnerável / Imortalidade)
   - Abater Alvo Selecionado (Kill)
   - Velocidade GM (1x a 3x)
   - Economia & Adena (+100k, +1M, +10M)
   - Encantamento de Arma (+4, +7, +10, +16) com Glow Visual
   - Teleporte Rápido para qualquer local do mundo
   - Atalho direto para Bots PvP e Guerra de Times
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

  // Estado de Alvo
  var modoAlvo = 'target'; // 'eu' ou 'target'
  var alvoAtualObj = null;

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
        width: 620px;
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

      /* abas: GM Poder | Bots PvP (o antigo F8 virou aba do F10) */
      .pa-tabs { display:flex; gap:4px; padding:8px 14px 0; border-bottom:1px solid rgba(212,175,55,.35); background:rgba(0,0,0,.25); }
      .pa-tab { background:transparent; border:1px solid transparent; border-bottom:none; color:#9aa4bd; font-weight:700; font-size:12px; letter-spacing:.04em; padding:7px 16px; border-radius:7px 7px 0 0; cursor:pointer; }
      .pa-tab:hover { color:#fff; }
      .pa-tab.on { background:rgba(212,175,55,.14); color:#ffd166; border-color:rgba(212,175,55,.5); }
      .pa-mobs-host { overflow-y:auto; display:none; flex:1; min-height:0; padding:14px 18px; color:#dfe6f5; font-size:12px; }
      .pa-mobs-host select, .pa-mobs-host input[type=number] { background:#0e1424; color:#fff; border:1px solid rgba(212,175,55,.5); border-radius:6px; padding:6px 8px; font-size:12px; }
      .pa-mobs-host label { display:flex; flex-direction:column; gap:3px; color:#9aa4bd; font-size:11px; }
      .pa-mobs-linha { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; align-items:flex-end; }
      .pa-bots-host { overflow-y:auto; display:none; flex:1; min-height:0; }
      .pa-bots-host #painelBotsModal { position:static !important; transform:none !important; width:100% !important; border:none !important; box-shadow:none !important; border-radius:0 !important; background:transparent !important; display:block; }
      .pa-bots-host #painelBotsModal .pb-header-actions #pbBtnFechar, .pa-bots-host #painelBotsModal .pb-titulo { display:none; }
      .pa-body {
        padding: 16px 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .pa-section {
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(212, 175, 55, 0.2);
        border-radius: 8px;
        padding: 13px 15px;
        display: flex;
        flex-direction: column;
        gap: 11px;
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
        grid-template-columns: repeat(auto-fit, minmax(115px, 1fr));
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

  function obterAlvoId(){
    if(modoAlvo === 'eu') return 'eu';
    var sel = document.getElementById('pa-select-target');
    if(sel && sel.value){
      return sel.value;
    }
    if(alvoAtualObj && alvoAtualObj.id) return alvoAtualObj.id;
    if(window.Net && Net.alvoAtual && Net.alvoAtual()) return Net.alvoAtual();
    return 'eu';
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
    /* botao escondido para os jogadores (ainda nao ha trava de super admin): so o atalho F10 abre. Para ver o botao no seu navegador: localStorage.isblade_gm_botoes='1' */
    try { if(localStorage.getItem('isblade_gm_botoes') !== '1') btnTrigger.style.display = 'none'; } catch(e){ btnTrigger.style.display = 'none'; }
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

      <div class="pa-tabs">
        <button type="button" class="pa-tab on" data-aba="gm">👑 GM Poder</button>
        <button type="button" class="pa-tab" data-aba="bots">⚔️ Bots PvP</button>
        <button type="button" class="pa-tab" data-aba="mobs">👹 Mobs / Bosses</button>
      </div>
      <div class="pa-bots-host" id="pa-bots-host"></div>
      <div class="pa-mobs-host" id="pa-mobs-host"></div>

      <div class="pa-body">
        <!-- 0. CONTROLE DE ALVO (TARGET / GM) -->
        <div class="pa-section" style="border-color: rgba(255, 215, 0, 0.45); background: rgba(255, 215, 0, 0.04);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="pa-sec-title">🎯 Controle de Alvo (Target)</div>
            <div style="display:flex; gap:6px;">
              <button class="pa-btn" id="pa-btn-alvo-eu" style="padding:4px 10px; font-size:11px;">👤 Em Mim</button>
              <button class="pa-btn active" id="pa-btn-alvo-target" style="padding:4px 10px; font-size:11px;">🎯 No Alvo</button>
            </div>
          </div>
          
          <div id="pa-alvo-status-box" style="padding:8px 12px; background:rgba(0,0,0,0.55); border:1px solid #334155; border-radius:6px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
            <div id="pa-alvo-status-txt">
              <span style="color:#94a3b8;">Alvo Ativo:</span> <b style="color:#ffd700;" id="pa-txt-alvo-nome">Nenhum (Selecione no jogo ou na lista)</b>
            </div>
            <div id="pa-alvo-status-hp" style="font-weight:800; color:#4ade80;"></div>
          </div>

          <div style="display:flex; gap:8px; align-items:center;">
            <select id="pa-select-target" style="flex:1; background:#0f172a; color:#f8fafc; border:1px solid #475569; border-radius:6px; padding:7px 10px; font-size:12px; font-weight:600; cursor:pointer;">
              <option value="eu">👤 Eu Mesmo (Você)</option>
            </select>
            <button class="pa-btn" id="pa-btn-focar-jogo" style="white-space:nowrap; padding:7px 12px;">🎯 Focar no Jogo</button>
            <button class="pa-btn" id="pa-btn-atualizar-alvos" title="Atualizar Lista de Alvos" style="padding:7px 10px;">🔄</button>
          </div>
        </div>

        <!-- 1. IDENTIDADE & APARÊNCIA (NICK E SEXO) -->
        <div class="pa-section">
          <div class="pa-sec-title">🎭 Identidade & Aparência (Nick e Sexo)</div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="text" id="pa-input-nick" placeholder="Novo Nick do Personagem / Bot..." maxlength="20" style="flex:1; background:#0f172a; color:#f8fafc; border:1px solid #475569; border-radius:6px; padding:7px 12px; font-size:12px; font-weight:700;">
            <button class="pa-btn pa-btn-gold" id="pa-btn-aplicar-nick" style="white-space:nowrap; padding:7px 14px;">✏️ Alterar Nick</button>
          </div>
          <div class="pa-grid-btns">
            <button class="pa-btn" id="pa-btn-sex-m">♂️ Masculino</button>
            <button class="pa-btn" id="pa-btn-sex-f">♀️ Feminino</button>
            <button class="pa-btn pa-btn-gold" id="pa-btn-sex-toggle">🔄 Alternar Sexo</button>
          </div>
        </div>

        <!-- 2. KITS DE EQUIPAMENTO POR GRAU (LINEAGE 2) -->
        <div class="pa-section">
          <div class="pa-sec-title">📦 Kits de Equipamento por Grau (Lineage 2)</div>
          <div style="font-size:11px; color:#94a3b8; margin-top:-4px;">Equipa set de armadura completo e arma da classe com encantamento oficial:</div>
          <div class="pa-grid-btns">
            <button class="pa-btn" data-kit="sem" style="border-color:#94a3b8;">⚪ No-Grade (Nv 1 · +0)</button>
            <button class="pa-btn" data-kit="D" style="border-color:#7fd6a0; color:#7fd6a0;">🟢 Grau D (Nv 20 · +4 Azul)</button>
            <button class="pa-btn" data-kit="C" style="border-color:#ffd36a; color:#ffd36a;">🟡 Grau C (Nv 40 · +7 Vívido)</button>
            <button class="pa-btn" data-kit="B" style="border-color:#5aa9ff; color:#93c5fd;">🔵 Grau B (Nv 52 · +10 Púrpura)</button>
            <button class="pa-btn pa-btn-gold" data-kit="A" style="border-color:#ffd700; color:#ffd700;">🟣 Grau A (Nv 61+ · Tallum / DS +16)</button>
          </div>
        </div>

        <!-- 3. DEFINIÇÃO DE NÍVEL -->
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

        <!-- 4. SOBREVIVÊNCIA & COMBATE -->
        <div class="pa-section">
          <div class="pa-sec-title">💚 Sobrevivência & Combate</div>
          <div class="pa-grid-btns">
            <button class="pa-btn pa-btn-ress" id="pa-btn-ress">⚡ Ressuscitar (Ress)</button>
            <button class="pa-btn pa-btn-heal" id="pa-btn-heal">💖 Curar Tudo (Heal)</button>
            <button class="pa-btn" id="pa-btn-god">🛡️ God Mode: OFF</button>
            <button class="pa-btn pa-btn-kill" id="pa-btn-kill">💀 Matar Alvo</button>
          </div>
        </div>

        <!-- 5. VELOCIDADE GM -->
        <div class="pa-section">
          <div class="pa-sec-title">🏃 Velocidade de Movimento GM</div>
          <div class="pa-grid-btns">
            <button class="pa-btn active" data-sp="1">1x Normal</button>
            <button class="pa-btn" data-sp="1.5">1.5x Rápido</button>
            <button class="pa-btn" data-sp="2">2x Super</button>
            <button class="pa-btn" data-sp="3">3x Flash</button>
          </div>
        </div>

        <!-- 6. ECONOMIA & ENCANTAMENTO -->
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

        <!-- 7. TELEPORTE RÁPIDO -->
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

        <!-- 8. ATALHO BOTS PVP & GUERRA DE TIMES -->
        <div class="pa-section">
          <div class="pa-sec-title">🤖 Guerra de Times & Bots PvP</div>
          <div class="pa-grid-btns">
            <button class="pa-btn pa-btn-gold" id="pa-btn-bots-1v1">⚔️ Duelo 1v1 (1 Bot)</button>
            <button class="pa-btn pa-btn-gold" id="pa-btn-bots-times">🚩 Guerra 5v5 (Healers)</button>
            <button class="pa-btn pa-btn-gold" id="pa-btn-bots-spawn">⚔️ Spawn 10 Bots</button>
            <button class="pa-btn pa-btn-kill" id="pa-btn-bots-limpar">🛑 Limpar Bots</button>
            <button class="pa-btn" id="pa-btn-bots-painel">⚙️ Painel Mestre</button>
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
        <span>Comandos: <b>//setlevel [1-85]</b> &middot; <b>//setkit [NG/D/C/B/A]</b> &middot; <b>//setnick</b> &middot; <b>//setsex</b></span>
        <span>Atalho: <b>[F10]</b></span>
      </div>
    `;
    document.body.appendChild(container);

    vincularEventos();
  }

  function atualizarVisualAlvo(){
    var bEu = document.getElementById('pa-btn-alvo-eu');
    var bTarget = document.getElementById('pa-btn-alvo-target');
    if(bEu) bEu.classList.toggle('active', modoAlvo === 'eu');
    if(bTarget) bTarget.classList.toggle('active', modoAlvo === 'target');

    var txtNome = document.getElementById('pa-txt-alvo-nome');
    var txtHp = document.getElementById('pa-alvo-status-hp');

    if(modoAlvo === 'eu'){
      var meuNome = (localStorage.getItem('isblade.player_name') || 'Você (GM)');
      if(txtNome) txtNome.textContent = '👤 ' + meuNome + ' (Você)';
      if(txtHp) txtHp.textContent = '100% HP';
    } else {
      if(alvoAtualObj){
        var n = alvoAtualObj.nome || 'Heroi';
        var lv = alvoAtualObj.lv || 1;
        var hpPct = Math.round(((alvoAtualObj.hp || 0) / (alvoAtualObj.pmax || 100)) * 100);
        var tipo = alvoAtualObj.isBot ? 'Bot' : 'Player';
        if(txtNome) txtNome.textContent = '🎯 [Lv ' + lv + '] ' + n + ' (' + tipo + ')';
        if(txtHp) txtHp.textContent = hpPct + '% HP';
      } else {
        if(txtNome) txtNome.textContent = 'Nenhum (Selecione no jogo ou na lista)';
        if(txtHp) txtHp.textContent = '';
      }
    }
  }

  function atualizarListaAlvos(){
    var sel = document.getElementById('pa-select-target');
    if(!sel) return;

    var curVal = sel.value;
    var opts = '<option value="eu">👤 Eu Mesmo (Você)</option>';

    if(window.Net && Net.obterListaEntidades){
      var lista = Net.obterListaEntidades();
      lista.forEach(function(e){
        var t = e.isBot ? 'Bot' : 'Player';
        var tm = e.team ? (e.team === 'A' ? '[Azul] ' : '[Vermelho] ') : '';
        opts += '<option value="' + e.id + '">🎯 [Lv ' + (e.lv || 1) + '] ' + tm + e.nome + ' (' + t + ')</option>';
      });
    }

    sel.innerHTML = opts;
    if(curVal && sel.querySelector('option[value="' + curVal + '"]')){
      sel.value = curVal;
    } else if(alvoAtualObj && alvoAtualObj.id && sel.querySelector('option[value="' + alvoAtualObj.id + '"]')){
      sel.value = String(alvoAtualObj.id);
    } else {
      sel.value = modoAlvo === 'eu' ? 'eu' : (sel.options.length > 1 ? sel.options[1].value : 'eu');
    }
  }

  function atualizarAlvo(ent){
    alvoAtualObj = ent;
    if(ent && ent.id){
      modoAlvo = 'target';
      var sel = document.getElementById('pa-select-target');
      if(sel){
        if(!sel.querySelector('option[value="' + ent.id + '"]')){
          atualizarListaAlvos();
        }
        sel.value = String(ent.id);
      }
    }
    atualizarVisualAlvo();
  }

  function vincularEventos(){
    document.getElementById('pa-btn-fechar').onclick = function(){ toggle(false); };

    // Modo de Alvo
    document.getElementById('pa-btn-alvo-eu').onclick = function(){
      som('click');
      modoAlvo = 'eu';
      var sel = document.getElementById('pa-select-target');
      if(sel) sel.value = 'eu';
      atualizarVisualAlvo();
    };

    document.getElementById('pa-btn-alvo-target').onclick = function(){
      som('click');
      modoAlvo = 'target';
      var sel = document.getElementById('pa-select-target');
      if(sel && sel.value === 'eu' && sel.options.length > 1){
        sel.value = sel.options[1].value;
      }
      atualizarVisualAlvo();
    };

    // Select de Alvo
    var selAlvo = document.getElementById('pa-select-target');
    selAlvo.onchange = function(){
      som('click');
      if(selAlvo.value === 'eu'){
        modoAlvo = 'eu';
      } else {
        modoAlvo = 'target';
        var id = parseInt(selAlvo.value, 10);
        if(window.Net && Net.obterListaEntidades){
          var lista = Net.obterListaEntidades();
          alvoAtualObj = lista.find(function(x){ return x.id === id; }) || null;
        }
      }
      atualizarVisualAlvo();
    };

    // Focar no jogo
    document.getElementById('pa-btn-focar-jogo').onclick = function(){
      som('click');
      var id = obterAlvoId();
      if(window.Net && Net.focarAlvo){
        Net.focarAlvo(id === 'eu' ? 0 : id);
      }
    };

    // Atualizar Lista
    document.getElementById('pa-btn-atualizar-alvos').onclick = function(){
      som('click');
      atualizarListaAlvos();
      atualizarVisualAlvo();
    };

    // Alterar Nick
    document.getElementById('pa-btn-aplicar-nick').onclick = function(){
      var input = document.getElementById('pa-input-nick');
      var nick = (input.value || '').trim();
      if(!nick){
        if(window.Chat) Chat.sistema('⚠️ Digite o novo nome no campo de texto.');
        return;
      }
      som('power');
      cmd('setnick', { nome: nick, alvo: obterAlvoId() });
      input.value = '';
    };

    // Trocar Sexo
    document.getElementById('pa-btn-sex-m').onclick = function(){
      som('power');
      cmd('setsexo', { sexo: 'M', alvo: obterAlvoId() });
    };
    document.getElementById('pa-btn-sex-f').onclick = function(){
      som('power');
      cmd('setsexo', { sexo: 'F', alvo: obterAlvoId() });
    };
    document.getElementById('pa-btn-sex-toggle').onclick = function(){
      som('power');
      cmd('setsexo', { sexo: 'toggle', alvo: obterAlvoId() });
    };

    // Kits por Grau
    container.querySelectorAll('[data-kit]').forEach(function(b){
      b.onclick = function(){
        som('power');
        var g = b.dataset.kit;
        cmd('setkit', { grau: g, alvo: obterAlvoId() });
      };
    });

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
      cmd('ress', { alvo: obterAlvoId() });
    };

    // Curar Tudo
    document.getElementById('pa-btn-heal').onclick = function(){
      som('power');
      cmd('heal', { alvo: obterAlvoId() });
    };

    // God Mode
    document.getElementById('pa-btn-god').onclick = function(){
      som('power');
      cmd('god');
    };

    // Matar Alvo
    document.getElementById('pa-btn-kill').onclick = function(){
      som('power');
      cmd('kill', { alvo: obterAlvoId() });
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
        cmd('adena', { qtd: q, alvo: obterAlvoId() });
      };
    });

    // Encantar Arma
    container.querySelectorAll('[data-en]').forEach(function(b){
      b.onclick = function(){
        som('power');
        var e = parseInt(b.dataset.en, 10);
        cmd('enchant', { en: e, alvo: obterAlvoId() });
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
    document.getElementById('pa-btn-bots-1v1').onclick = function(){
      som('click');
      var lv = parseInt(slider.value, 10) || 40;
      if(window.PainelBots && PainelBots.duelo1v1){
        PainelBots.duelo1v1(lv);
      } else if(window.Net && Net.botCmd){
        Net.botCmd({ acao: 'spawn', qtd: 1, lv: lv, modo: 'pvp', ia: 'humano' });
      }
    };
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
    document.getElementById('pa-btn-bots-painel').onclick = function(){ som('click'); aba('bots'); };
    container.querySelectorAll('.pa-tab').forEach(function(t){ t.onclick = function(){ som('click'); aba(t.dataset.aba); }; });
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
      if(!payload.alvo){
        payload.alvo = obterAlvoId();
      }
      Net.adminCmd(payload);
    }
  }

  function aplicarNivel(lv){
    som('power');
    cmd('setlevel', { lv: lv, alvo: obterAlvoId() });
  }

  /* aba 'gm' (poderes) ou 'bots' (painel mestre de bots, antes o F8): o painel de bots e' encaixado aqui dentro */
  /* [gm] aba Mobs / Bosses: escolhe o mob (lista do dungeon.json), quantidade e raio; "Spawn aqui" nasce na posicao do GM em Dion; "Fixar" grava o spot (volta a nascer) */
  var MOBS_DADOS = null;
  function montaMobs(host){
    if(host.dataset.ok) return; host.dataset.ok = '1';
    host.innerHTML = '<div style="opacity:.7">carregando a lista de mobs...</div>';
    fetch('data/dungeon.json?v=' + Date.now()).then(function(x){ return x.json(); }).then(function(D){
      MOBS_DADOS = D.mobs || {}; var grupos = { 'Chefes / Bosses': [], 'Cruma (nv 1-15)': [], 'Fortaleza (nv 15-30)': [], 'Pantano (nv 30-45)': [], 'Torre / Hallate': [], 'Dungeon antiga': [], 'Outros': [] };
      Object.keys(MOBS_DADOS).forEach(function(k){
        var m = MOBS_DADOS[k], nome = m.name + ' · ' + k + ' · ' + m.hp + ' HP' + (m.xp ? ' · ' + m.xp + ' xp' : ''), g;
        if(/^chefe|^mini_boss/.test(k)) g = 'Chefes / Bosses'; else if(/_curuma$/.test(k)) g = 'Cruma (nv 1-15)'; else if(/_fort$/.test(k)) g = 'Fortaleza (nv 15-30)';
        else if(/fogo|magmagoil|wyrm|golem_lava/.test(k)) g = 'Pantano (nv 30-45)'; else if(/^(fantasma|esqueleto|vidente|lamina|cao|guarda_real|cavaleiro|erinia|comandante|anjo|xama|overlord|arcanjo)$/.test(k)) g = 'Torre / Hallate';
        else if(/^(shade|brute|caster)$/.test(k)) g = 'Dungeon antiga'; else g = 'Outros';
        grupos[g].push('<option value="' + k + '">' + nome + '</option>');
      });
      var opts = ''; Object.keys(grupos).forEach(function(g){ if(grupos[g].length) opts += '<optgroup label="' + g + ' (' + grupos[g].length + ')">' + grupos[g].join('') + '</optgroup>'; });
      host.innerHTML = '<div style="margin-bottom:10px;color:#ffd166;font-weight:700">Povoar Dion: ande ate o lugar e use os botoes. So funciona dentro de Dion.</div>' +
        '<div class="pa-mobs-linha"><label style="flex:1;min-width:260px">Mob / Boss<select id="pm-tipo" style="width:100%">' + opts + '</select></label>' +
        '<label>Quantidade<input id="pm-qtd" type="number" min="1" max="12" value="3" style="width:70px"></label>' +
        '<label>Raio (m)<input id="pm-raio" type="number" min="1" max="30" value="5" style="width:70px"></label>' +
        '<label>Agressivos (%)<input id="pm-agr" type="number" min="0" max="100" value="0" style="width:80px"></label></div>' +
        '<div class="pa-mobs-linha"><label style="flex-direction:row;align-items:center;gap:6px;color:#dfe6f5"><input id="pm-fixo" type="checkbox" checked> Fixar spot (salva e volta a nascer)</label></div>' +
        '<div class="pa-grid-btns"><button class="pa-btn pa-btn-gold" id="pm-spawn">👹 Spawn aqui</button><button class="pa-btn" id="pm-lista">📋 Listar spots de Dion</button></div>' +
        '<div class="pa-mobs-linha" style="margin-top:14px"><label>Remover spots num raio (m) ao redor de voce<input id="pm-rem-raio" type="number" min="2" max="400" value="12" style="width:90px"></label><button class="pa-btn" id="pm-remover" style="border-color:#ff6b6b;color:#ff9a9a">🗑️ Remover aqui</button></div>' +
        '<div style="opacity:.65;margin-top:10px;line-height:1.5">Chefes nascem 1 por spot e voltam em ~5 min. Mobs comuns voltam em ~45 s. A mensagem de resultado aparece no chat.</div>';
      var v = function(id){ return document.getElementById(id); };
      v('pm-spawn').onclick = function(){ som('click'); cmd('mob_spawn', { tipo: v('pm-tipo').value, qtd: +v('pm-qtd').value || 1, raio: +v('pm-raio').value || 5, agr: (+v('pm-agr').value || 0) / 100, fixo: v('pm-fixo').checked }); };
      v('pm-lista').onclick = function(){ som('click'); cmd('mob_lista', {}); };
      v('pm-remover').onclick = function(){ som('click'); cmd('mob_remover', { raio: +v('pm-rem-raio').value || 12 }); };
    }).catch(function(e){ host.innerHTML = '<div style="color:#ff9a9a">nao consegui ler data/dungeon.json: ' + e + '</div>'; delete host.dataset.ok; });
  }
  function aba(nome){
    renderModal();
    var host = container.querySelector('#pa-bots-host'), mh = container.querySelector('#pa-mobs-host'), corpo = container.querySelector('.pa-body'), bots = nome === 'bots' && window.PainelBots && PainelBots.embutir, mobs = nome === 'mobs';
    container.querySelectorAll('.pa-tab').forEach(function(t){ t.classList.toggle('on', t.dataset.aba === (mobs ? 'mobs' : (bots ? 'bots' : 'gm'))); });
    mh.style.display = mobs ? 'block' : 'none'; if(mobs){ corpo.style.display = 'none'; host.style.display = 'none'; if(window.PainelBots && PainelBots.desembutir) PainelBots.desembutir(); montaMobs(mh); return; }
    if(bots){ corpo.style.display = 'none'; host.style.display = 'block'; PainelBots.embutir(host); }
    else { corpo.style.display = ''; host.style.display = 'none'; if(window.PainelBots && PainelBots.desembutir) PainelBots.desembutir(); }
  }
  function toggle(forca){
    renderModal();
    var querAbrir = typeof forca === 'boolean' ? forca : !aberto;
    /* [trava-admin] so super admin (o servidor confirma ao entrar). Os outros: nada abre; o servidor responde no chat com a conta deles */
    if(querAbrir && !(window.Net && Net.adm)){ try { if(window.Net && Net.adminCmd) Net.adminCmd({ acao: 'info' }); } catch(e){} return; }
    aberto = querAbrir;
    container.style.display = aberto ? 'flex' : 'none';
    som(aberto ? 'open' : 'click');
    if(!aberto) aba('gm');                                         /* ao fechar volta para a aba GM e solta o painel de bots */
    if(aberto){
      try { if(document.exitPointerLock) document.exitPointerLock(); } catch(e){}
      atualizarListaAlvos();
      atualizarVisualAlvo();
      cmd('info');
    }
    if(window.UIJanelas) UIJanelas.notificar('painel_admin', aberto);
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
    atualizarListaAlvos();
    atualizarVisualAlvo();
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

    /* Arena PvP e Salao do Baium sao OUTRA pagina (arena.html), nao um ponto da cidade: de fora, o botao leva para la; de dentro da arena, Cidade e as 3 areas voltam para a cidade.
       (antes so mudava x/z na pagina atual: na cidade o jogador caia num ponto qualquer e nunca ia para o Salao) */
    var emArena = /arena\.html/.test(location.pathname), modo = (location.search.match(/[?&]mode=(\w+)/) || [])[1] || '', ir = (location.search.match(/[?&]go=(\w+)/) || [])[1] || '', rota = null;
    if(dKey === 'baium'){ if(!(emArena && modo === 'duel')) rota = 'arena.html?mode=duel'; }
    else if(dKey === 'arena'){ if(!(emArena && modo === 'dungeon' && ir === 'pvp')) rota = 'arena.html?mode=dungeon&go=pvp'; }
    else if(emArena){ rota = dKey === 'cidade' ? 'cidade.html' : 'cidade.html?local=' + dKey; }
    if(rota){
      if(window.L2Teleport && L2Teleport.teleportTo){ L2Teleport.teleportTo(dest.nome, rota); } else { window.location.href = rota; }
      return;
    }

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
    abrirAba: function(n){ toggle(true); aba(n); },       /* abre o F10 ja na aba de bots */
    fechar: function(){ toggle(false); },
    isOpen: function(){ return !!aberto; },
    toggle: toggle,
    atualizar: atualizar,
    atualizarAlvo: atualizarAlvo,
    atualizarListaAlvos: atualizarListaAlvos,
    aplicarSpeed: aplicarSpeed,
    onTeleport: onTeleport
  };
})();
