/* ==========================================================================
   PAINEL DE CONTROLE DE BOTS PVP - IS BLADE (16/11/2026)
   Interface visual completa e comandos nativos para gerenciar jogadores fakes
   no Lineage 2 Web (Cidade, Campo Aberto e Arena PvP).
   - Suporta spawn de 1 a 30 bots (preset padrao de 10).
   - Modos: PvP Livre (todos x todos), Focar Player (inimigo) e Treino (passivo).
   - Locais: Ao redor (aqui), Arena PvP e Campo Aberto (fora da muralha).
   - Atalhos de chat: /bot [qtd], /bot arena [qtd], /bot limpar, /bot matar, /painel
   ========================================================================== */

(function(){
  'use strict';

  var estado = {
    aberto: false,
    qtd: 10,
    local: 'aqui', // 'aqui', 'arena', 'campo'
    modo: 'pvp',   // 'pvp', 'inimigo', 'treino'
    totalBots: 0,
    mapaAtual: 'cidade'
  };

  var elBtn = null;
  var elModal = null;
  var elBadge = null;

  function injetarEstilos(){
    if(document.getElementById('painelBotsCss')) return;
    var st = document.createElement('style');
    st.id = 'painelBotsCss';
    st.textContent = `
      #painelBotsBtn {
        position: fixed;
        left: 12px;
        top: 92px;
        z-index: 62;
        padding: 8px 13px;
        border-radius: 6px;
        border: 1px solid #c5a059;
        background: linear-gradient(180deg, rgba(30, 24, 14, 0.94) 0%, rgba(14, 11, 6, 0.97) 100%);
        box-shadow: inset 0 0 0 1px rgba(245, 196, 81, 0.25), 0 4px 12px rgba(0, 0, 0, 0.7);
        color: #f5c451;
        font: 700 11px system-ui, -apple-system, sans-serif;
        letter-spacing: 0.08em;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
      }
      #painelBotsBtn:hover {
        transform: translateY(-1px);
        border-color: #ffd166;
        box-shadow: inset 0 0 0 1px rgba(255, 209, 102, 0.5), 0 6px 16px rgba(245, 196, 81, 0.35);
        color: #fff;
      }
      #painelBotsBtn:active {
        transform: translateY(1px);
      }
      #painelBotsBtn .bot-badge {
        background: #991b1b;
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        padding: 1px 6px;
        border-radius: 10px;
        border: 1px solid #ef4444;
        min-width: 14px;
        text-align: center;
      }
      #painelBotsBtn .bot-badge.ativo {
        background: #15803d;
        border-color: #22c55e;
      }

      /* MODAL PRINCIPAL ESTILO LINEAGE 2 */
      #painelBotsModal {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 99999;
        width: min(94vw, 440px);
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        display: none;
        background: linear-gradient(180deg, rgba(20, 26, 38, 0.98) 0%, rgba(10, 14, 22, 0.99) 100%);
        border: 2px solid #5a4828;
        box-shadow: inset 0 0 0 1px #a4823e, inset 0 0 24px rgba(0, 0, 0, 0.92), 0 16px 48px rgba(0, 0, 0, 0.85);
        border-radius: 6px;
        color: #dbe6ff;
        font-family: system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
        user-select: none;
      }

      #painelBotsModal::-webkit-scrollbar {
        width: 6px;
      }
      #painelBotsModal::-webkit-scrollbar-thumb {
        background: #5a4828;
        border-radius: 3px;
      }

      .pb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #4a3a1f;
        background: linear-gradient(180deg, rgba(46, 36, 20, 0.6) 0%, rgba(20, 15, 8, 0.4) 100%);
      }
      .pb-titulo {
        font-family: "Cinzel", Georgia, serif;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.1em;
        color: #f5c451;
        text-shadow: 0 1px 3px #000;
      }
      .pb-sub {
        font-size: 10px;
        font-weight: 600;
        color: #8fa4c2;
        letter-spacing: 0.05em;
        margin-top: 2px;
      }
      .pb-fechar {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid #5a4828;
        color: #c5a059;
        font-size: 16px;
        width: 28px;
        height: 28px;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .pb-fechar:hover {
        background: #8a1f1f;
        border-color: #ff5555;
        color: #fff;
      }

      .pb-corpo {
        padding: 14px 16px 18px;
      }

      /* CARD DE STATUS */
      .pb-status-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-radius: 5px;
        background: rgba(14, 18, 28, 0.8);
        border: 1px solid #2d374d;
        margin-bottom: 14px;
      }
      .pb-status-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .pb-status-label {
        font-size: 10px;
        font-weight: 700;
        color: #7b8ba5;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .pb-status-val {
        font-size: 13px;
        font-weight: 800;
        color: #fff;
      }
      .pb-status-badge {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.05em;
      }
      .pb-badge-verde {
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid #22c55e;
        color: #4ade80;
      }
      .pb-badge-vermelho {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        color: #f87171;
      }

      .pb-secao-titulo {
        font-size: 11px;
        font-weight: 800;
        color: #f5c451;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin: 12px 0 6px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pb-secao-titulo::after {
        content: "";
        flex: 1;
        height: 1px;
        background: #3a2e18;
      }

      /* GRUPOS DE BOTOES SELETORES */
      .pb-grid-opcoes {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
        margin-bottom: 10px;
      }
      .pb-grid-opcoes-4 {
        grid-template-columns: repeat(4, 1fr);
      }
      .pb-btn-opcao {
        padding: 8px 4px;
        border-radius: 4px;
        border: 1px solid #2e394e;
        background: #141a29;
        color: #8f9db5;
        font: 700 11px system-ui, sans-serif;
        cursor: pointer;
        text-align: center;
        transition: all 0.15s ease;
      }
      .pb-btn-opcao:hover {
        background: #1c2538;
        border-color: #5d6f8f;
        color: #fff;
      }
      .pb-btn-opcao.ativo {
        background: linear-gradient(180deg, #3d2f16 0%, #1e1709 100%);
        border-color: #f5c451;
        color: #ffd166;
        box-shadow: inset 0 0 8px rgba(245, 196, 81, 0.25);
      }

      /* QUANTIDADE COM BOTOES +/- */
      .pb-qtd-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }
      .pb-btn-step {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        border: 1px solid #5a4828;
        background: #201a10;
        color: #f5c451;
        font-size: 16px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pb-btn-step:hover {
        background: #3d2f16;
        border-color: #ffd166;
        color: #fff;
      }
      .pb-input-qtd {
        flex: 1;
        height: 32px;
        border-radius: 4px;
        border: 1px solid #3d2f16;
        background: #0d121c;
        color: #f5c451;
        font-size: 14px;
        font-weight: 800;
        text-align: center;
        outline: none;
      }

      /* BOTAO PRINCIPAL DE SPAWN */
      .pb-btn-principal {
        width: 100%;
        padding: 12px 14px;
        border-radius: 5px;
        border: 2px solid #c5a059;
        background: linear-gradient(180deg, #6b4d1b 0%, #3d2a09 100%);
        box-shadow: inset 0 1px 0 rgba(255, 235, 175, 0.4), 0 4px 14px rgba(0, 0, 0, 0.7);
        color: #fff;
        font-family: "Cinzel", Georgia, serif;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.1em;
        cursor: pointer;
        margin: 12px 0 8px;
        text-align: center;
        text-shadow: 0 1px 3px #000;
        transition: all 0.15s ease;
      }
      .pb-btn-principal:hover {
        background: linear-gradient(180deg, #8a6424 0%, #523a0f 100%);
        border-color: #ffd166;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 6px 18px rgba(245, 196, 81, 0.4);
        transform: translateY(-1px);
      }
      .pb-btn-principal:active {
        transform: translateY(1px);
      }

      /* ACOES SECUNDARIAS */
      .pb-acoes-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 6px;
      }
      .pb-btn-sec {
        padding: 9px 8px;
        border-radius: 4px;
        font: 700 11px system-ui, sans-serif;
        letter-spacing: 0.04em;
        cursor: pointer;
        text-align: center;
        transition: all 0.15s ease;
      }
      .pb-btn-limpar {
        background: rgba(153, 27, 27, 0.35);
        border: 1px solid #b91c1c;
        color: #fca5a5;
      }
      .pb-btn-limpar:hover {
        background: #991b1b;
        color: #fff;
        border-color: #ef4444;
      }
      .pb-btn-matar {
        background: rgba(55, 65, 81, 0.6);
        border: 1px solid #4b5563;
        color: #e5e7eb;
      }
      .pb-btn-matar:hover {
        background: #4b5563;
        color: #fff;
      }
      .pb-btn-reiniciar {
        grid-column: span 2;
        background: rgba(180, 83, 9, 0.35);
        border: 1px solid #d97706;
        color: #fcd34d;
        padding: 8px;
      }
      .pb-btn-reiniciar:hover {
        background: #b45309;
        color: #fff;
        border-color: #f59e0b;
      }

      /* GUIA DE COMANDOS */
      .pb-guia {
        margin-top: 14px;
        padding: 10px;
        border-radius: 4px;
        background: rgba(8, 12, 18, 0.7);
        border: 1px dashed #3a3220;
        font-size: 11px;
        color: #8fa3c0;
        line-height: 1.5;
      }
      .pb-guia b {
        color: #ffd166;
      }
      .pb-guia code {
        background: #141b29;
        color: #7dd3fc;
        padding: 1px 5px;
        border-radius: 3px;
        font-family: monospace;
      }
    `;
    document.head.appendChild(st);
  }

  function criarInterface(){
    injetarEstilos();

    // 1. Botao Flutuante no HUD
    elBtn = document.createElement('button');
    elBtn.type = 'button';
    elBtn.id = 'painelBotsBtn';
    elBtn.title = 'Abrir Painel de Controle de Bots PvP';
    elBtn.innerHTML = `<span>⚔️ BOTS PVP</span><span class="bot-badge" id="pbBtnBadge">0</span>`;
    elBtn.onclick = function(e){
      e.stopPropagation();
      toggle();
    };
    document.body.appendChild(elBtn);
    elBadge = document.getElementById('pbBtnBadge');

    // 2. Modal do Painel
    elModal = document.createElement('div');
    elModal.id = 'painelBotsModal';
    elModal.innerHTML = `
      <div class="pb-header">
        <div>
          <div class="pb-titulo">⚔️ BOTS PVP - CONTROLE</div>
          <div class="pb-sub">Simulação de Combate & Treino Lineage 2</div>
        </div>
        <button type="button" class="pb-fechar" id="pbBtnFechar" title="Fechar">✕</button>
      </div>

      <div class="pb-corpo">
        <div class="pb-status-card">
          <div class="pb-status-info">
            <span class="pb-status-label">Bots no Servidor</span>
            <span class="pb-status-val" id="pbStatusBots">0 Ativos</span>
          </div>
          <span class="pb-status-badge pb-badge-verde" id="pbStatusCon">ONLINE</span>
        </div>

        <div class="pb-secao-titulo">Quantidade de Bots</div>
        <div class="pb-grid-opcoes pb-grid-opcoes-4">
          <button type="button" class="pb-btn-opcao" data-qtd="1">1</button>
          <button type="button" class="pb-btn-opcao" data-qtd="5">5</button>
          <button type="button" class="pb-btn-opcao ativo" data-qtd="10">10</button>
          <button type="button" class="pb-btn-opcao" data-qtd="20">20</button>
        </div>

        <div class="pb-qtd-row">
          <button type="button" class="pb-btn-step" id="pbQtdMenos">-</button>
          <input type="number" class="pb-input-qtd" id="pbInputQtd" value="10" min="1" max="30">
          <button type="button" class="pb-btn-step" id="pbQtdMais">+</button>
        </div>

        <div class="pb-secao-titulo">Local de Invocação</div>
        <div class="pb-grid-opcoes">
          <button type="button" class="pb-btn-opcao ativo" data-local="aqui">📍 Aqui (Perto)</button>
          <button type="button" class="pb-btn-opcao" data-local="arena">🏟️ Arena PvP</button>
          <button type="button" class="pb-btn-opcao" data-local="campo">🌲 Campo Aberto</button>
        </div>

        <div class="pb-secao-titulo">Modo de Combate</div>
        <div class="pb-grid-opcoes">
          <button type="button" class="pb-btn-opcao ativo" data-modo="pvp">⚔️ PvP Livre</button>
          <button type="button" class="pb-btn-opcao" data-modo="inimigo">🎯 Focar Player</button>
          <button type="button" class="pb-btn-opcao" data-modo="treino">🛡️ Treino</button>
        </div>

        <button type="button" class="pb-btn-principal" id="pbBtnSpawn">⚔️ CONVOCAR 10 BOTS</button>

        <div class="pb-acoes-grid">
          <button type="button" class="pb-btn-sec pb-btn-limpar" id="pbBtnLimpar">🛑 REMOVER TODOS</button>
          <button type="button" class="pb-btn-sec pb-btn-matar" id="pbBtnMatar">💀 MATAR BOTS</button>
          <button type="button" class="pb-btn-sec pb-btn-reiniciar" id="pbBtnReiniciar">⚡ RESET COMPLETO (10 BOTS)</button>
        </div>

        <div class="pb-guia">
          <b>Comandos de Chat:</b><br>
          <code>/bot 10</code> · Cria 10 bots aqui<br>
          <code>/bot arena 10</code> · Cria 10 bots na Arena<br>
          <code>/bot campo 10</code> · Cria 10 bots fora da muralha<br>
          <code>/bot limpar</code> · Deleta todos os bots<br>
          <code>/bot matar</code> · Abate os bots ativos<br>
          <code>/painel</code> ou <code>/bot painel</code> · Abre este painel
        </div>
      </div>
    `;
    document.body.appendChild(elModal);

    // Eventos da Janela
    document.getElementById('pbBtnFechar').onclick = function(){ toggle(false); };

    // Botoes de Presets de Quantidade
    elModal.querySelectorAll('[data-qtd]').forEach(function(btn){
      btn.onclick = function(){
        var q = parseInt(btn.getAttribute('data-qtd'), 10) || 10;
        setQtd(q);
      };
    });

    // Inputs +/- de Quantidade
    document.getElementById('pbQtdMenos').onclick = function(){
      setQtd(estado.qtd - 1);
    };
    document.getElementById('pbQtdMais').onclick = function(){
      setQtd(estado.qtd + 1);
    };
    var inp = document.getElementById('pbInputQtd');
    inp.onchange = function(){
      setQtd(parseInt(inp.value, 10) || 10);
    };

    // Botoes de Local
    elModal.querySelectorAll('[data-local]').forEach(function(btn){
      btn.onclick = function(){
        elModal.querySelectorAll('[data-local]').forEach(function(b){ b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        estado.local = btn.getAttribute('data-local');
      };
    });

    // Botoes de Modo
    elModal.querySelectorAll('[data-modo]').forEach(function(btn){
      btn.onclick = function(){
        elModal.querySelectorAll('[data-modo]').forEach(function(b){ b.classList.remove('ativo'); });
        btn.classList.add('ativo');
        estado.modo = btn.getAttribute('data-modo');
        if(window.Net && Net.on){
          Net.botCmd({ acao: 'modo', modo: estado.modo });
        }
      };
    });

    // Botao Principal: Spawn
    document.getElementById('pbBtnSpawn').onclick = function(){
      executarSpawn(estado.qtd, estado.local, estado.modo);
    };

    // Botao Limpar
    document.getElementById('pbBtnLimpar').onclick = function(){
      if(window.Net && Net.on){
        Net.botCmd({ acao: 'limpar', tudo: true });
      } else {
        avisar('Servidor offline.');
      }
    };

    // Botao Matar
    document.getElementById('pbBtnMatar').onclick = function(){
      if(window.Net && Net.on){
        Net.botCmd({ acao: 'matar' });
      } else {
        avisar('Servidor offline.');
      }
    };

    // Botao Reiniciar
    document.getElementById('pbBtnReiniciar').onclick = function(){
      if(window.Net && Net.on){
        Net.botCmd({ acao: 'limpar', tudo: true });
        setTimeout(function(){
          Net.botCmd({ acao: 'spawn', qtd: 10, local: estado.local, modo: estado.modo });
        }, 150);
      } else {
        avisar('Servidor offline.');
      }
    };

    // Fechar com Escape / Atalhos de Teclado (F8 ou B)
    window.addEventListener('keydown', function(e){
      var t = e.target && e.target.tagName;
      if(t === 'INPUT' || t === 'TEXTAREA') return;
      if(e.key === 'Escape' && estado.aberto){
        toggle(false);
      } else if(e.key === 'F8' || (e.key === 'b' && !e.ctrlKey && !e.altKey && !e.metaKey)){
        e.preventDefault();
        toggle();
      }
    });

    // Pede status inicial
    if(window.Net && Net.on){
      Net.botCmd({ acao: 'status' });
    }
  }

  function setQtd(q){
    q = Math.max(1, Math.min(30, q));
    estado.qtd = q;
    var inp = document.getElementById('pbInputQtd');
    if(inp) inp.value = q;

    var btnP = document.getElementById('pbBtnSpawn');
    if(btnP) btnP.textContent = '⚔️ CONVOCAR ' + q + (q === 1 ? ' BOT' : ' BOTS');

    if(elModal){
      elModal.querySelectorAll('[data-qtd]').forEach(function(b){
        b.classList.toggle('ativo', parseInt(b.getAttribute('data-qtd'), 10) === q);
      });
    }
  }

  function executarSpawn(qtd, local, modo){
    if(!window.Net || !Net.on){
      avisar('Conectando ao servidor...');
      return;
    }
    Net.botCmd({
      acao: 'spawn',
      qtd: qtd,
      local: local,
      modo: modo
    });
  }

  function avisar(txt){
    try {
      if(window.Chat && Chat.sistema) Chat.sistema(txt);
      else if(window.Net && window.Net.ctx && window.Net.ctx.sysMsg) window.Net.ctx.sysMsg(txt);
      else console.log('[PainelBots]', txt);
    } catch(e){}
  }

  function toggle(forcar){
    estado.aberto = typeof forcar === 'boolean' ? forcar : !estado.aberto;
    if(!elModal) criarInterface();

    elModal.style.display = estado.aberto ? 'block' : 'none';

    if(estado.aberto){
      try { document.exitPointerLock(); } catch(e){}
      if(window.Net && Net.on){
        Net.botCmd({ acao: 'status' });
      }
      atualizarEstadoConexao();
    }
  }

  function atualizarEstadoConexao(){
    var conEl = document.getElementById('pbStatusCon');
    if(!conEl) return;
    var online = !!(window.Net && Net.on);
    conEl.textContent = online ? 'ONLINE' : 'OFFLINE';
    conEl.className = 'pb-status-badge ' + (online ? 'pb-badge-verde' : 'pb-badge-vermelho');
  }

  function atualizaInfo(info){
    if(!info) return;
    if(typeof info.total === 'number'){
      estado.totalBots = info.total;
      if(elBadge){
        elBadge.textContent = info.total;
        elBadge.classList.toggle('ativo', info.total > 0);
      }
      var stBots = document.getElementById('pbStatusBots');
      if(stBots){
        stBots.textContent = info.total + (info.total === 1 ? ' Ativo' : ' Ativos');
      }
    }
    atualizarEstadoConexao();
  }

  // Inicializacao automatica ao carregar o script
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', criarInterface);
  } else {
    criarInterface();
  }

  // API Global Exposta
  window.PainelBots = {
    toggle: toggle,
    abrir: function(){ toggle(true); },
    fechar: function(){ toggle(false); },
    setQtd: setQtd,
    spawn: executarSpawn,
    atualizaInfo: atualizaInfo,
    get estado(){ return estado; }
  };

})();
