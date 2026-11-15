/* =============================================================================
   TECX LABS / IS BLADE - SISTEMA DE NPCS E DIÁLOGOS DE TALKING ISLAND (L2 STYLE)
   - Gatekeeper Clarissa (na frente do Portal Dimensional)
   - Ferreiro Altran (com bigorna de ferro, martelo e forja incandescente)
   - Mercador dos Selos Mammon (com baús de tesouro e runas dos Sete Selos)
   - Guarda-Volumes Wilford (Armazém Central)
   - Comerciante Galladucci (Mercador de Equipamentos)
   - Sistema de Diálogos HTML NATIVO DO LINEAGE 2 INTERLUDE
   ============================================================================= */
(function(){
  'use strict';

  var npcs = [];
  var activeDialog = null;
  var currentNPCNear = null;
  var dialogEl = null;
  var isDragging = false, dragOffX = 0, dragOffY = 0;

  var CSS = `
    /* =========================================================================
       JANELA DE DIÁLOGO HTML NATIVA DO LINEAGE 2 INTERLUDE (OFICIAL)
       ========================================================================= */
    #l2-npc-dialog {
      position: fixed;
      left: calc(50% - 155px);
      top: 18%;
      width: 310px;
      max-width: 94vw;
      background: rgba(14, 14, 14, 0.96);
      border-style: solid;
      border-width: 10px 7px 7px 7px;
      border-image: url('assets/ui/exported/L2UI_CH3/Texture/l2_npc_window.png') 10 7 7 7 fill stretch;
      box-shadow: 0 10px 35px rgba(0, 0, 0, 0.9), 0 0 1px rgba(0, 0, 0, 0.8);
      z-index: 10000;
      color: #b8b0a2;
      font-family: Tahoma, Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.45;
      padding: 0;
      display: none;
      user-select: none;
      -webkit-user-select: none;
      animation: l2NpcFadeIn 0.18s ease-out;
      box-sizing: border-box;
    }
    #l2-npc-dialog.active {
      display: block;
    }
    @keyframes l2NpcFadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }

    /* Barra Superior / Header Arrastável (Title Bar Oficial L2) */
    .l2-npc-titlebar {
      height: 20px;
      padding: 3px 26px 3px 8px;
      display: flex;
      align-items: center;
      cursor: move;
      border-bottom: 1px solid rgba(80, 70, 60, 0.35);
      background: linear-gradient(180deg, rgba(45, 38, 30, 0.5) 0%, rgba(20, 18, 15, 0.5) 100%);
      box-sizing: border-box;
    }
    .l2-npc-title-text {
      font-size: 11px;
      font-weight: bold;
      color: #cca352;
      letter-spacing: 0.05em;
      text-shadow: 1px 1px 0 #000;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Botão Fechar Oficial L2 (FrameCloseBtn.png) */
    .l2-npc-close-btn {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 16px;
      height: 16px;
      background: url('assets/ui/exported/L2UI_CH3/Texture/FrameCloseBtn.png') no-repeat center;
      border: none;
      outline: none;
      cursor: pointer;
      padding: 0;
      transition: filter 0.1s ease;
    }
    .l2-npc-close-btn:hover {
      background-image: url('assets/ui/exported/L2UI_CH3/Texture/frameclosebtn_over.png');
    }
    .l2-npc-close-btn:active {
      background-image: url('assets/ui/exported/L2UI_CH3/Texture/FrameCloseOnBtn.png');
    }

    /* Corpo de Conteúdo HTML do NPC (HtmlViewer Nativo) */
    .l2-npc-html-body {
      padding: 10px 12px 14px 12px;
      max-height: min(490px, 72vh);
      overflow-y: auto;
      overflow-x: hidden;
      box-sizing: border-box;
    }

    /* Scrollbar Clássica do L2 */
    .l2-npc-html-body::-webkit-scrollbar {
      width: 6px;
    }
    .l2-npc-html-body::-webkit-scrollbar-track {
      background: rgba(10, 10, 10, 0.7);
    }
    .l2-npc-html-body::-webkit-scrollbar-thumb {
      background: #4a3e30;
      border: 1px solid #635442;
    }
    .l2-npc-html-body::-webkit-scrollbar-thumb:hover {
      background: #6e5c46;
    }

    /* Tipografia e Tags Oficiais de HTML do L2 */
    .l2-html-header {
      margin-bottom: 8px;
      line-height: 1.35;
    }
    .l2-html-name {
      font-size: 12px;
      font-weight: bold;
      color: #e5b338; /* <font color="LEVEL"> */
      text-shadow: 1px 1px 0 #000;
    }
    .l2-html-sub {
      font-size: 10px;
      color: #8c8578;
      margin-left: 4px;
    }
    .l2-html-text {
      color: #c0b8ac;
      font-size: 11px;
      line-height: 1.5;
      text-shadow: 1px 1px 0 #000;
      margin-bottom: 10px;
    }

    /* Divisor Ornamental Oficial L2 (SquareGray) */
    .l2-html-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(196, 156, 54, 0.3) 15%, rgba(196, 156, 54, 0.65) 50%, rgba(196, 156, 54, 0.3) 85%, transparent 100%);
      margin: 10px 0 12px 0;
    }

    /* Links / Opções de Diálogo Nativas do L2 */
    .l2-html-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .l2-html-link {
      display: block;
      color: #c49c36;
      font-size: 11px;
      text-decoration: none;
      cursor: pointer;
      text-shadow: 1px 1px 0 #000;
      transition: color 0.12s ease;
      line-height: 1.4;
      padding: 2px 0;
    }
    .l2-html-link:hover {
      color: #ffe98f;
      text-decoration: underline;
    }
    .l2-html-link:active {
      color: #ffffff;
    }
    .l2-html-bullet {
      color: #c49c36;
      font-size: 10px;
      margin-right: 5px;
      display: inline-block;
    }
    .l2-html-link:hover .l2-html-bullet {
      color: #ffe98f;
    }

    /* Tabela de Teleporte Clássica */
    .l2-html-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    .l2-html-table tr {
      border-bottom: 1px solid rgba(80, 70, 60, 0.25);
    }
    .l2-html-table tr:hover {
      background: rgba(196, 156, 54, 0.08);
    }
    .l2-html-table td {
      padding: 6px 2px;
      vertical-align: middle;
      font-size: 11px;
    }
    .l2-price {
      text-align: right;
      color: #cca352;
      font-size: 11px;
      white-space: nowrap;
      text-shadow: 1px 1px 0 #000;
    }
    .l2-price-tag {
      color: #e5b338;
      font-weight: bold;
    }

    /* Botão Chanfrado Oficial do L2 (Btn1_normal) */
    .l2-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 76px;
      height: 23px;
      padding: 0 10px;
      background: url('assets/ui/exported/L2UI_CH3/Texture/btn_normal.png') no-repeat center;
      background-size: 100% 100%;
      border: none;
      outline: none;
      color: #b8b0a2;
      font-family: Tahoma, Arial, sans-serif;
      font-size: 11px;
      font-weight: bold;
      text-shadow: 1px 1px 0 #000;
      cursor: pointer;
      user-select: none;
      box-sizing: border-box;
      transition: filter 0.1s ease;
    }
    .l2-btn:hover {
      background-image: url('assets/ui/exported/L2UI_CH3/Texture/btn_over.png');
      color: #ffffff;
    }
    .l2-btn:active {
      background-image: url('assets/ui/exported/L2UI_CH3/Texture/btn_down.png');
      color: #ffd978;
    }
    .l2-html-footer {
      margin-top: 12px;
      text-align: center;
    }

    /* Sub-painel de Forja e Encantamento Local */
    .l2-html-box {
      background: rgba(6, 6, 6, 0.65);
      border: 1px solid rgba(196, 156, 54, 0.3);
      padding: 10px;
      margin: 8px 0;
      border-radius: 2px;
    }
  `;

  function esc(t){
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function playSound(file){
    try {
      var audio = new Audio('assets/audio/' + file);
      audio.volume = 0.55;
      audio.play().catch(function(){});
    } catch(e){}
  }

  function playUiClickSound(freq){
    playSound('metalClick.ogg');
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

  function initUI(){
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    dialogEl = document.createElement('div');
    dialogEl.id = 'l2-npc-dialog';
    dialogEl.innerHTML = `
      <div class="l2-npc-titlebar" id="l2-dialog-titlebar">
        <span class="l2-npc-title-text" id="l2-dialog-title">DIÁLOGO</span>
        <button type="button" class="l2-npc-close-btn" id="l2-dialog-close" title="Fechar (ESC)"></button>
      </div>
      <div class="l2-npc-html-body" id="l2-dialog-body"></div>
    `;
    document.body.appendChild(dialogEl);

    document.getElementById('l2-dialog-close').addEventListener('click', closeDialog);

    // Sistema de arrasto da janela (Lineage 2 Draggable Window)
    var bar = document.getElementById('l2-dialog-titlebar');
    bar.addEventListener('mousedown', function(e){
      if(e.target.id === 'l2-dialog-close') return;
      isDragging = true;
      dialogEl.dataset.moved = '1';
      var rect = dialogEl.getBoundingClientRect();
      dragOffX = e.clientX - rect.left;
      dragOffY = e.clientY - rect.top;
    });

    window.addEventListener('mousemove', function(e){
      if(!isDragging) return;
      var nx = e.clientX - dragOffX;
      var ny = e.clientY - dragOffY;
      nx = Math.max(0, Math.min(window.innerWidth - 310, nx));
      ny = Math.max(0, Math.min(window.innerHeight - 80, ny));
      dialogEl.style.left = nx + 'px';
      dialogEl.style.top = ny + 'px';
    });

    window.addEventListener('mouseup', function(){
      isDragging = false;
    });

    window.addEventListener('keydown', function(e){
      if(e.key === 'Escape' && activeDialog){
        closeDialog();
      }
    });
  }

  function renderMainPage(){
    if(!activeDialog) return;
    var npc = activeDialog;
    var body = document.getElementById('l2-dialog-body');

    var html = `
      <div class="l2-html-header">
        <span class="l2-html-name">${esc(npc.name)}</span>
        <span class="l2-html-sub">&lt;${esc(npc.subTitle)}&gt;</span>
      </div>
      <div class="l2-html-text">
        ${npc.greeting}
      </div>
      <div class="l2-html-divider"></div>
      <div class="l2-html-options">
    `;

    npc.options.forEach(function(opt, idx){
      html += `
        <a class="l2-html-link" data-opt-idx="${idx}">
          <span class="l2-html-bullet">◆</span>${esc(opt.label)}
        </a>
      `;
    });

    html += `</div>`;
    body.innerHTML = html;

    // Conectar eventos de clique nos links nativos
    var links = body.querySelectorAll('[data-opt-idx]');
    links.forEach(function(link){
      link.addEventListener('click', function(){
        playSound('metalClick.ogg');
        var idx = parseInt(link.getAttribute('data-opt-idx'), 10);
        var opt = npc.options[idx];
        if(opt && opt.action){
          opt.action(renderSubPage);
        }
      });
    });
  }

  function renderSubPage(subHtml, backCallback){
    var body = document.getElementById('l2-dialog-body');
    body.innerHTML = `
      ${subHtml}
      <div class="l2-html-footer">
        <button type="button" class="l2-btn" id="l2-sub-back-btn">Voltar</button>
      </div>
    `;
    playSound('metalClick.ogg');

    var backBtn = document.getElementById('l2-sub-back-btn');
    if(backBtn){
      backBtn.addEventListener('click', function(){
        playSound('metalClick.ogg');
        if(typeof backCallback === 'function'){
          backCallback();
        } else {
          renderMainPage();
        }
      });
    }
  }

  function openDialog(npcData){
    activeDialog = npcData;
    try { document.exitPointerLock(); } catch(e){}
    playSound('bookOpen.ogg');

    // Centraliza janela se ainda não foi movida manualmente
    if(!dialogEl.dataset.moved){
      dialogEl.style.left = 'calc(50% - 155px)';
      dialogEl.style.top = '18%';
    }

    document.getElementById('l2-dialog-title').textContent = npcData.name;
    renderMainPage();
    dialogEl.classList.add('active');
  }

  function closeDialog(){
    if(activeDialog){
      playSound('bookClose.ogg');
    }
    activeDialog = null;
    if(dialogEl) dialogEl.classList.remove('active');
  }

  // =========================================================================
  // DEFINIÇÕES E LÓGICAS DOS NPCS PRINCIPAIS (LINEAGE 2 TALKING ISLAND)
  // =========================================================================

  // 1. GATEKEEPER CLARISSA (Portal da Cidade)
  var GK_DATA = {
    id: 'clarissa',
    name: 'Clarissa',
    subTitle: 'Gatekeeper de Talking Island',
    avatar: '🔮',
    greeting: 'Que as bênçãos de Einhasad iluminem seu caminho.<br><br>Posso dobrar as linhas ley do espaço para transportá-lo instantaneamente aos recantos de Aden ou aos perigos da Torre da Insolência.<br><br>Para onde deseja viajar?',
    options: [
      {
        label: 'Teleportar',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Clarissa</span>
              <span class="l2-html-sub">&lt;Teleporte Dimensional&gt;</span>
            </div>
            <div class="l2-html-text">
              Escolha seu destino. A taxa de Adena cobrada é destinada à manutenção do fluxo místico do portal.
            </div>
            <div class="l2-html-divider"></div>
            <table class="l2-html-table">
              <tr>
                <td><a class="l2-html-link" data-dest="dungeon"><span class="l2-html-bullet">◆</span>Torre da Insolência (Masmorra)</a></td>
                <td class="l2-price">10,000 <span class="l2-price-tag">Adena</span></td>
              </tr>
              <tr>
                <td><a class="l2-html-link" data-dest="duel"><span class="l2-html-bullet">◆</span>Salão do Imperador Baium (Duelo)</a></td>
                <td class="l2-price">15,000 <span class="l2-price-tag">Adena</span></td>
              </tr>
              <tr>
                <td><a class="l2-html-link" data-dest="pvp"><span class="l2-html-bullet">◆</span>Arena de Guerra PvP (Livre)</a></td>
                <td class="l2-price">5,000 <span class="l2-price-tag">Adena</span></td>
              </tr>
              <tr>
                <td><a class="l2-html-link" data-dest="cruma"><span class="l2-html-bullet">◆</span>Torre de Cruma (Nv 1-15)</a></td>
                <td class="l2-price">3,000 <span class="l2-price-tag">Adena</span></td>
              </tr>
              <tr>
                <td><a class="l2-html-link" data-dest="fortress"><span class="l2-html-bullet">◆</span>Fortaleza (Nv 15-30)</a></td>
                <td class="l2-price">4,000 <span class="l2-price-tag">Adena</span></td>
              </tr>
              <tr>
                <td><a class="l2-html-link" data-dest="pantano"><span class="l2-html-bullet">◆</span>Pântano Flamejante (Nv 30-45)</a></td>
                <td class="l2-price">6,000 <span class="l2-price-tag">Adena</span></td>
              </tr>
            </table>
          `;
          renderSub(subHtml);

          var body = document.getElementById('l2-dialog-body');
          var destLinks = body.querySelectorAll('[data-dest]');
          destLinks.forEach(function(l){
            l.addEventListener('click', function(){
              playSound('metalClick.ogg');
              var dest = l.getAttribute('data-dest');
              closeDialog();
              if(dest === 'dungeon'){
                if(window.openPortalMenu){ window.openPortalMenu(); }
                else if(window.L2Teleport){ window.L2Teleport.teleportTo('Torre da Insolência (Masmorra)', 'arena.html?mode=dungeon&go=normal'); }
                else { window.location.href = 'arena.html?mode=dungeon&go=normal'; }
              } else if(dest === 'duel'){
                if(window.L2Teleport){ window.L2Teleport.teleportTo('Salão do Imperador Baium', 'arena.html?mode=duel'); }
                else { window.location.href = 'arena.html?mode=duel'; }
              } else if(dest === 'pvp'){
                if(window.L2Teleport){ window.L2Teleport.teleportTo('Arena PvP de Guerra', 'arena.html?mode=dungeon&go=pvp'); }
                else { window.location.href = 'arena.html?mode=dungeon&go=pvp'; }
              } else if(dest === 'cruma'){
                if(window.irArea) window.irArea('curuma');
              } else if(dest === 'fortress'){
                if(window.irArea) window.irArea('fortress');
              } else if(dest === 'pantano'){
                if(window.irArea) window.irArea('pantano');
              }
            });
          });
        }
      },
      {
        label: 'Portal Dimensional (Masmorras e Desafios)',
        action: function(){
          closeDialog();
          if(window.openPortalMenu){ window.openPortalMenu(); }
          else if(window.L2Teleport){ window.L2Teleport.teleportTo('Torre da Insolência (Masmorra)', 'arena.html?mode=dungeon&go=normal'); }
          else { window.location.href = 'arena.html?mode=dungeon&go=normal'; }
        }
      },
      {
        label: 'Perguntar sobre o Portal de Talking Island',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Clarissa</span>
              <span class="l2-html-sub">&lt;Origens do Portal&gt;</span>
            </div>
            <div class="l2-html-text">
              "Este portal foi erguido durante a Era dos Titãs e posteriormente abençoado pelos sacerdotes de Einhasad. Suas runas sintonizam com as correntes astrais de todo o continente de Aden.<br><br>
              Apenas aqueles com coragem suficiente devem cruzar os umbrais que levam aos andares superiores da Torre da Insolência, onde o Imperador Baium desafiou a eternidade."
            </div>
          `;
          renderSub(subHtml);
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
    greeting: 'O aço canta sob o martelo!<br><br>Sou Altran, descendente dos nobres clãs de ferreiros de Schuttgart. Aqui forjamos as lâminas mais afiadas e temperamos as armaduras mais resistentes de Aden.<br><br>O que precisa da forja hoje?',
    options: [
      {
        label: 'Encantar Equipamento (Forja Sagrada)',
        action: function(renderSub){
          if(window.Loja && Loja.stats){
            closeDialog();
            Loja.abrir('altran');
            return;
          }
          function renderLocalEnchant(){
            var safeText = enchantLevel < 3 ? '<font color="#00ff88">Seguro (100%)</font>' : '<font color="#ffaa00">Risco de Quebra (66%)</font>';
            var subHtml = `
              <div class="l2-html-header">
                <span class="l2-html-name">Altran</span>
                <span class="l2-html-sub">&lt;Forja de Encantamento +1 a +16&gt;</span>
              </div>
              <div class="l2-html-text">
                O poder ancestral das Scroll of Enchant Weapon reside na forja. Até +3 é totalmente seguro. Acima disso, o poder aumenta grandemente, mas há risco do item se desfazer em Cristais.
              </div>
              <div class="l2-html-box" style="text-align:center;">
                <div style="font-size:12px;font-weight:bold;color:#e5b338;margin-bottom:6px;">ENCANTAMENTO DE ARMA</div>
                <div style="font-size:14px;font-weight:bold;color:#fff;margin:6px 0;">
                  Espada Atual: <span style="color:${enchantLevel>=4?'#00d5ff':'#e5b338'}">+${enchantLevel}</span>
                </div>
                <div style="font-size:11px;color:#a09888;margin-bottom:10px;">
                  Chance: ${safeText}
                </div>
                <div style="display:flex;gap:8px;justify-content:center;">
                  <button type="button" class="l2-btn" id="l2-btn-enc">Encantar</button>
                  <button type="button" class="l2-btn" id="l2-btn-reset-enc">Reset</button>
                </div>
                <div id="l2-enc-log" style="font-size:11px;color:#00ff88;margin-top:8px;min-height:16px;"></div>
              </div>
            `;
            renderSub(subHtml);

            var body = document.getElementById('l2-dialog-body');
            var encBtn = body.querySelector('#l2-btn-enc');
            var resetBtn = body.querySelector('#l2-btn-reset-enc');
            var logEl = body.querySelector('#l2-enc-log');

            if(encBtn){
              encBtn.onclick = function(){
                playSound('metalClick.ogg');
                if(enchantLevel >= 16){
                  logEl.style.color = '#e5b338';
                  logEl.textContent = 'Arma já atingiu o poder máximo (+16)!';
                  return;
                }
                if(enchantLevel < 3 || Math.random() < 0.66){
                  enchantLevel++;
                  localStorage.setItem('isblade_weapon_enchant', enchantLevel);
                  playEnchantSuccessSound();
                  logEl.style.color = '#00d5ff';
                  logEl.textContent = '✨ SUCESSO! A arma resplandece com poder +' + enchantLevel + '!';
                  renderLocalEnchant();
                } else {
                  playEnchantFailSound();
                  logEl.style.color = '#ff4444';
                  logEl.textContent = '💥 A arma quebrou e se transformou em Cristais!';
                  enchantLevel = 0;
                  localStorage.setItem('isblade_weapon_enchant', enchantLevel);
                  renderLocalEnchant();
                }
              };
            }
            if(resetBtn){
              resetBtn.onclick = function(){
                playSound('metalClick.ogg');
                enchantLevel = 0;
                localStorage.setItem('isblade_weapon_enchant', 0);
                renderLocalEnchant();
              };
            }
          }
          renderLocalEnchant();
        }
      },
      {
        label: 'Livro de Receitas do Anão (Crafting)',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Altran</span>
              <span class="l2-html-sub">&lt;Livro de Receitas da Guilda&gt;</span>
            </div>
            <div class="l2-html-text">
              Consulte as receitas de forjamento e combinação de metais raros registradas pelos clãs de anões:
            </div>
            <div class="l2-html-divider"></div>
            <div style="font-size:11px;color:#c0b8ac;line-height:1.7;">
              • <font color="#e5b338">Dragon Slayer (Grau A)</font><br>
              <span style="color:#8c8578;padding-left:10px;display:inline-block;">14x Pedaços de Aço Antigo + 20x Cristais de Mithril</span><br><br>
              • <font color="#e5b338">Escudo Imperial Crusader (Grau S)</font><br>
              <span style="color:#8c8578;padding-left:10px;display:inline-block;">8x Placas de Titânio + 50x Verniz Enriquecido</span><br><br>
              • <font color="#e5b338">Espada Bastarda (Grau D)</font><br>
              <span style="color:#8c8578;padding-left:10px;display:inline-block;">120x Minérios de Ferro + 40x Carvão</span>
            </div>
            <div class="l2-html-divider"></div>
            <div style="font-size:10px;color:#998877;text-align:center;">
              (O sistema de coleta de materiais e drops de monstros será ligado no servidor na Fase 3!)
            </div>
          `;
          renderSub(subHtml);
        }
      },
      {
        label: 'Sobre o Aço de Talking Island',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Altran</span>
              <span class="l2-html-sub">&lt;Tradições dos Ferreiros&gt;</span>
            </div>
            <div class="l2-html-text">
              "Talking Island é cercada pelo mar infinito de Aden. Dizem que os depósitos de ferro sob as colinas do norte foram abençoados pelos Titãs da Terra antes da era do Imperador Shunaiman.<br><br>
              Qualquer arma temperada nestas águas corta com a leveza de uma pluma e o peso de um rochedo! Trate sua lâmina com respeito e ela jamais falhará no calor da batalha."
            </div>
          `;
          renderSub(subHtml);
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
    greeting: 'Hehehe... Shilen e Einhasad disputam os céus, mas aqui na terra é a <font color="#e5b338">Ancient Adena</font> que dita o poder verdadeiro.<br><br>O que um guerreiro mortal busca nas mãos do Mammon?',
    options: [
      {
        label: 'Comprar e Vender',
        action: function(){
          closeDialog();
          if(window.Loja) Loja.abrir('mammon');
        }
      },
      {
        label: 'Câmbio de Pedras Seladas (Ancient Adena)',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Mammon</span>
              <span class="l2-html-sub">&lt;Câmbio dos Sete Selos&gt;</span>
            </div>
            <div class="l2-html-text">
              Traga-me as pedras seladas extraídas das profundezas das Necrópoles e Catacumbas:
            </div>
            <div class="l2-html-divider"></div>
            <div style="font-size:11px;color:#c0b8ac;line-height:1.8;">
              • <font color="#38bdf8">Pedra Selada Azul</font> = 3x Ancient Adena<br>
              • <font color="#4ade80">Pedra Selada Verde</font> = 5x Ancient Adena<br>
              • <font color="#f87171">Pedra Selada Vermelha</font> = 10x Ancient Adena
            </div>
            <div class="l2-html-divider"></div>
            <div style="font-size:10px;color:#cca352;">
              A Ancient Adena é a única moeda aceita para aprimoramentos supremos e remoção de selos de armaduras de Grau S!
            </div>
          `;
          renderSub(subHtml);
        }
      },
      {
        label: 'Remover Selo de Armaduras S-Grade (Imperial Crusader)',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Mammon</span>
              <span class="l2-html-sub">&lt;Quebra de Selos Ancestrais&gt;</span>
            </div>
            <div class="l2-html-text">
              "Traga-me uma couraça selada de Imperial Crusader e 1.200 Ancient Adenas. Eu quebrarei o feitiço ancestral e liberarei a aura dourada protetora da armadura definitiva!<br><br>
              Nenhum ferreiro comum de cidade possui o conhecimento secreto para manusear as ligas sagradas de Grau S."
            </div>
          `;
          renderSub(subHtml);
        }
      },
      {
        label: 'A Profecia dos Sete Selos',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Mammon</span>
              <span class="l2-html-sub">&lt;Profecia Sombria&gt;</span>
            </div>
            <div class="l2-html-text">
              "Quando os Sete Selos forem rompidos, Shilen despertará em seu trono sombrio. Quem domina as Necrópoles e Catacumbas controla o destino de todo o império de Aden.<br><br>
              Eu apenas forneço os meios para os mais fortes sobreviverem ao apocalipse vindouro... hehehe."
            </div>
          `;
          renderSub(subHtml);
        }
      }
    ]
  };

  // 4. GUARDA-VOLUMES DO ARMAZÉM WILFORD
  var WAREHOUSE_DATA = {
    id: 'warehouse',
    name: 'Wilford',
    subTitle: 'Guarda-Volumes do Armazém',
    avatar: '📦',
    greeting: 'Saudações, honorável viajante!<br><br>Bem-vindo ao Armazém Central de Talking Island. Sob a custódia da Guilda dos Anões de Ferro, nenhum ladrão ou monstro tocará nos seus tesouros mais preciosos.<br><br>Como posso servi-lo hoje?',
    options: [
      {
        label: 'Armazém Privado (Depositar / Retirar)',
        action: function(){
          if(window.Loja && Loja.armazem){
            closeDialog();
            Loja.abrir('wilford');
            return;
          }
          if(window.Loja){
            closeDialog();
            Loja.abrir('wilford');
            return;
          }
        }
      },
      {
        label: 'Regulamento do Armazém da Guilda',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Wilford</span>
              <span class="l2-html-sub">&lt;Regulamento do Armazém&gt;</span>
            </div>
            <div class="l2-html-text">
              "Todo aventureiro possui direito a um cofre blindado compartilhado entre todos os seus personagens da conta.<br><br>
              Guardar itens custa uma pequena taxa simbólica de Adena para custear a segurança e manutenção das travas de ferro de Schuttgart. Retirar seus pertences é sempre totalmente gratuito!"
            </div>
          `;
          renderSub(subHtml);
        }
      }
    ]
  };

  // 5. SEGUNDO COMERCIANTE (MERCADOR DE EQUIPAMENTOS GALLADUCCI)
  var TRADER_DATA = {
    id: 'trader_galladucci',
    name: 'Galladucci',
    subTitle: 'Comerciante de Equipamentos',
    avatar: '🪙',
    greeting: 'Bem-vindo ao empório de armas e armaduras de Talking Island!<br><br>Se você deseja desafiar os monstros de Cruma ou da Fortaleza, precisará de lâminas bem afiadas e proteção reforçada.<br><br>O que deseja hoje?',
    options: [
      {
        label: 'Comprar e Vender Equipamentos',
        action: function(){
          closeDialog();
          if(window.Loja) Loja.abrir('galladucci');
        }
      },
      {
        label: 'Consultar Armas e Escudos (No-Grade, D e C)',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Galladucci</span>
              <span class="l2-html-sub">&lt;Catálogo de Equipamentos&gt;</span>
            </div>
            <div class="l2-html-text">
              Dispomos dos melhores conjuntos de armas e armaduras produzidos pelas capitais de Aden e Giran:
            </div>
            <div class="l2-html-divider"></div>
            <div style="font-size:11px;color:#c0b8ac;line-height:1.8;">
              • <font color="#e5b338">Guardião / Cavaleiro</font>: Gladius, Bastard Sword, Samurai Longsword e Escudos.<br>
              • <font color="#e5b338">Místico / Mago</font>: Cedar Staff, Ghost Staff e Ghoul's Staff.<br>
              • <font color="#e5b338">Guerreiro / Gladiador</font>: Two-Handed Sword, Claymore e Berserker Blade.<br>
              • <font color="#e5b338">Armaduras</font>: Sets Leather, Wooden, Brigandine e Full Plate.
            </div>
            <div class="l2-html-divider"></div>
            <div style="font-size:10px;color:#998877;text-align:center;">
              (Utilize a opção 'Comprar e Vender' para negociar diretamente pelo seu saldo de Adena!)
            </div>
          `;
          renderSub(subHtml);
        }
      },
      {
        label: 'Sobre as Rotas Comerciais do Mar de Aden',
        action: function(renderSub){
          var subHtml = `
            <div class="l2-html-header">
              <span class="l2-html-name">Galladucci</span>
              <span class="l2-html-sub">&lt;Rotas Comerciais&gt;</span>
            </div>
            <div class="l2-html-text">
              "Recebemos caravanas e caravelas semanais vindas dos grandes portos de Giran, Gludio e Heine.<br><br>
              Nossos especialistas inspecionam minuciosamente cada guarda, gume de lâmina e costura de couro antes de disponibilizá-los aos valorosos guerreiros da ilha."
            </div>
          `;
          renderSub(subHtml);
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

    // Cepo de madeira rústico em escala real (altura 48cm)
    var stumpMat = new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.9 });
    var stump = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.48, 14), stumpMat);
    stump.position.y = 0.24;
    group.add(stump);

    // Bigorna de Ferro Escuro (altura total de trabalho ~76cm, perfeito para o anão de 1.68m)
    var ironMat = new THREE.MeshStandardMaterial({ color: 0x242830, metalness: 0.85, roughness: 0.35 });
    
    // Base da bigorna
    var base = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.09, 0.22), ironMat);
    base.position.y = 0.525;
    group.add(base);

    // Cintura e corpo
    var waist = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.15, 0.16), ironMat);
    waist.position.y = 0.64;
    group.add(waist);

    // Mesa de bater (Face plana superior)
    var face = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.20), ironMat);
    face.position.y = 0.755;
    group.add(face);

    // Chifre cônico da bigorna
    var horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.24, 12), ironMat);
    horn.rotation.z = -Math.PI / 2;
    horn.position.set(-0.35, 0.755, 0);
    group.add(horn);

    // Martelo do ferreiro repousando na bigorna
    var woodHandleMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.8 });
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.020, 0.32, 8), woodHandleMat);
    handle.rotation.z = Math.PI / 3;
    handle.position.set(0.07, 0.83, 0.03);

    var hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.11), ironMat);
    hammerHead.position.set(0.16, 0.88, 0.03);
    group.add(handle, hammerHead);

    // Braseiro da forja incandescente ao lado da bigorna
    var forgeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.9 });
    var forgeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.46, 12), forgeMat);
    forgeBase.position.set(0.72, 0.23, -0.15);
    group.add(forgeBase);

    // Brasas brilhantes
    var coalMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
    var coals = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), coalMat);
    coals.scale.set(1, 0.3, 1);
    coals.position.set(0.72, 0.47, -0.15);
    group.add(coals);

    // Luz incandescente da forja
    var forgeLight = new THREE.PointLight(0xff6600, 2.2, 4.5);
    forgeLight.position.set(0.72, 0.65, -0.15);
    group.add(forgeLight);

    return group;
  }

  function createMammonDecor(){
    var group = new THREE.Group();

    // Tapete místico cerimonial dos Sete Selos no piso
    var carpetMat = new THREE.MeshStandardMaterial({ color: 0x2e0854, roughness: 0.85 });
    var carpet = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.02, 24), carpetMat);
    carpet.position.y = 0.01;
    group.add(carpet);

    // Anel de runas arcanas no tapete
    var runeMat = new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.65 });
    var runeRing = new THREE.Mesh(new THREE.RingGeometry(0.90, 1.12, 24), runeMat);
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 0.025;
    group.add(runeRing);

    // Baú de Tesouro do Mammon
    var woodChestMat = new THREE.MeshStandardMaterial({ color: 0x3d1d12, roughness: 0.6 });
    var goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf5c451, metalness: 0.9, roughness: 0.25 });

    var chestBase = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.36), woodChestMat);
    chestBase.position.set(0.70, 0.17, 0.30);
    group.add(chestBase);

    var chestLid = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.58, 12, 1, false, 0, Math.PI), woodChestMat);
    chestLid.rotation.z = Math.PI / 2;
    chestLid.position.set(0.70, 0.34, 0.30);
    group.add(chestLid);

    // Guarnições douradas
    var trim = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.04, 0.38), goldTrimMat);
    trim.position.set(0.70, 0.32, 0.30);
    group.add(trim);

    // Luz mística do baú
    var mammonLight = new THREE.PointLight(0xa855f7, 2.0, 4.0);
    mammonLight.position.set(0.70, 0.50, 0.30);
    group.add(mammonLight);

    return group;
  }

  function createGatekeeperDecor(){
    var group = new THREE.Group();

    // Pedestal de Teleporte em Pedra Escura (ampliado para a saia elegante da Clarissa)
    var pedMat = new THREE.MeshStandardMaterial({ color: 0x1f273b, roughness: 0.8 });
    var ped = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.08, 32), pedMat);
    ped.position.y = 0.04;
    group.add(ped);

    // Círculo Mágico de Teleporte Rúnico (Cyan Glow ampliado)
    var runeMat = new THREE.MeshBasicMaterial({ color: 0x00d5ff, transparent: true, opacity: 0.85 });
    var runeCircle = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.98, 36), runeMat);
    runeCircle.rotation.x = -Math.PI / 2;
    runeCircle.position.y = 0.085;
    group.add(runeCircle);

    // Luz de aura da GK
    var gkLight = new THREE.PointLight(0x00d5ff, 2.0, 4.2);
    gkLight.position.set(0, 0.9, 0);
    group.add(gkLight);

    return group;
  }

  function createWarehouseDecor(){
    var group = new THREE.Group();

    // Balcão de Carvalho do Armazém
    var woodMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.75 });
    var counter = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.76, 0.42), woodMat);
    counter.position.set(0, 0.38, 0.52);
    group.add(counter);

    // Tampo superior de madeira nobre polida
    var topMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.45 });
    var topCounter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.50), topMat);
    topCounter.position.set(0, 0.78, 0.52);
    group.add(topCounter);

    // Livro de Registros / Pergaminho no balcão
    var bookMat = new THREE.MeshStandardMaterial({ color: 0xfaebd7, roughness: 0.9 });
    var book = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.24), bookMat);
    book.position.set(-0.35, 0.82, 0.52);
    book.rotation.y = 0.2;
    group.add(book);

    // Caixotes de Carga ao lado
    var crateMat = new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.85 });
    var crate1 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.50, 0.54), crateMat);
    crate1.position.set(1.10, 0.25, 0.25);
    group.add(crate1);

    var crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.40, 0.44), crateMat);
    crate2.position.set(1.10, 0.70, 0.25);
    crate2.rotation.y = 0.35;
    group.add(crate2);

    // Lanterna de latão âmbar suave sobre a caixa
    var lanternMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, metalness: 0.8, roughness: 0.3 });
    var lantern = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.14), lanternMat);
    lantern.position.set(1.10, 1.00, 0.25);
    group.add(lantern);

    var lampLight = new THREE.PointLight(0xffaa33, 1.8, 4.0);
    lampLight.position.set(1.10, 1.10, 0.25);
    group.add(lampLight);

    return group;
  }

  function createTraderDecor(){
    var group = new THREE.Group();

    // Mostruário de Madeira Comercial (altura proporcional para humano de 2.28m)
    var standMat = new THREE.MeshStandardMaterial({ color: 0x422006, roughness: 0.7 });
    var stand = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.86, 0.42), standMat);
    stand.position.set(0, 0.43, 0.52);
    group.add(stand);

    // Tecido nobre de veludo verde do expositor
    var clothMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.9 });
    var cloth = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.05, 0.48), clothMat);
    cloth.position.set(0, 0.88, 0.52);
    group.add(cloth);

    // Expositor lateral de armas (cavalete com espada)
    var rackMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.6, roughness: 0.4 });
    var rack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.02, 0.60), rackMat);
    rack.position.set(-1.05, 0.51, 0.22);
    group.add(rack);

    // Lanterna dourada do mercador
    var light = new THREE.PointLight(0xf5c451, 2.0, 4.2);
    light.position.set(0, 1.15, 0.52);
    group.add(light);

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

    // Carregar modelo GLB com escala métrica proporcional (em metros fiéis ao L2!)
    gltfLoader.load(config.modelPath, function(gltf){
      var model = gltf.scene;

      // Medição precisa do Bounding Box da malha
      var box = new THREE.Box3().setFromObject(model);
      var modelH = box.max.y - box.min.y;
      var s = config.scale || 1.0;
      if(config.targetH && modelH > 0.05){
        s = config.targetH / modelH;
      }
      model.scale.set(s, s, s);

      // Alinhar a base dos pés ao chão ou ao topo do pedestal
      if(isFinite(box.min.y)){
        model.position.y = (-box.min.y * s) + (config.pedestalY || 0);
      }

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
                       THREE.AnimationClip.findByName(gltf.animations, 'wait') ||
                       THREE.AnimationClip.findByName(gltf.animations, 'Wait_Hand') ||
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
      fbMesh.position.y = (targetH * 0.5) + (config.pedestalY || 0);
      group.add(fbMesh);
    });
  }

  // =========================================================================
  // API GLOBAL DE INICIALIZAÇÃO E ATUALIZAÇÃO
  // =========================================================================

  window.L2Npcs = {
    npcs: npcs,
    list: function(){ return npcs; },
    perto: function(){ return !!currentNPCNear && !activeDialog; },      /* [Claude] NPC perto com o aviso de falar (a cidade nao esconde o aviso; o botao do celular vira FALAR) */
    init: function(scene, gltfLoader){
      initUI();

      // 1. Gatekeeper Clarissa (Na frente do Portal Dimensional: x = -11.5, z = -11.5)
      // Escala oficial L2: Humana feminina clássica com chapéu pontudo (~2.22m + pedestal)
      loadNpc(scene, gltfLoader, {
        data: GK_DATA,
        modelPath: 'assets/personagens/npc_clarissa.glb',
        x: -11.5,
        y: 0.0,
        z: -11.5,
        rotY: 0.65,
        targetH: 2.22,
        pedestalY: 0.08,
        nameY: 2.58,
        nameScaleX: 2.4,
        nameScaleY: 0.60,
        subColor: '#00d5ff',
        nameColor: '#f5c451',
        decor: createGatekeeperDecor(),
        fallbackColor: 0x00a2ff
      });

      // 2. Ferreiro Altran (Na praça leste, perto das forjas: x = 11.5, z = -8.5)
      // Escala oficial L2: Mestre Ferreiro Anão musculoso e robusto (~1.68m)
      loadNpc(scene, gltfLoader, {
        data: BLACKSMITH_DATA,
        modelPath: 'assets/personagens/npc_altran.glb',
        x: 11.5,
        y: 0.0,
        z: -8.5,
        rotY: -1.2,
        targetH: 1.68,
        nameY: 2.05,
        nameScaleX: 2.1,
        nameScaleY: 0.52,
        subColor: '#ff9d42',
        nameColor: '#f5c451',
        decor: createAnvilProp(),
        fallbackColor: 0x995522
      });

      // 3. Mercador dos Selos Mammon (No recanto místico: x = -16.0, z = 12.0)
      // Escala oficial L2: Criatura/Sacerdote dos Sete Selos com painel místico (~1.85m)
      loadNpc(scene, gltfLoader, {
        data: MAMMON_DATA,
        modelPath: 'assets/personagens/npc_mammon.glb',
        x: -16.0,
        y: 0.0,
        z: 12.0,
        rotY: 1.1,
        targetH: 1.85,
        nameY: 2.25,
        nameScaleX: 2.5,
        nameScaleY: 0.60,
        subColor: '#c084fc',
        nameColor: '#f5c451',
        decor: createMammonDecor(),
        fallbackColor: 0x6611aa
      });

      // 4. Guarda-Volumes do Armazém Wilford (Na ala oeste: x = -13.5, z = 7.0)
      // Escala oficial L2: Anão Guardião de Armazém veterano (~1.68m)
      loadNpc(scene, gltfLoader, {
        data: WAREHOUSE_DATA,
        modelPath: 'assets/personagens/npc_wilford.glb',
        x: -13.5,
        y: 0.0,
        z: 7.0,
        rotY: 0.85,
        targetH: 1.68,
        nameY: 2.05,
        nameScaleX: 2.4,
        nameScaleY: 0.55,
        subColor: '#38bdf8',
        nameColor: '#f5c451',
        decor: createWarehouseDecor(),
        fallbackColor: 0x2563eb
      });

      // 5. Comerciante de Equipamentos Galladucci (Na praça comercial leste: x = 13.5, z = 5.5)
      // Escala oficial L2: Mercador Humano adulto com túnica nobre (~2.28m)
      loadNpc(scene, gltfLoader, {
        data: TRADER_DATA,
        modelPath: 'assets/personagens/npc_galladucci.glb',
        x: 13.5,
        y: 0.0,
        z: 5.5,
        rotY: -1.35,
        targetH: 2.28,
        nameY: 2.65,
        nameScaleX: 2.6,
        nameScaleY: 0.60,
        subColor: '#4ade80',
        nameColor: '#f5c451',
        decor: createTraderDecor(),
        fallbackColor: 0x16a34a
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

