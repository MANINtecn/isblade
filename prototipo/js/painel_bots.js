/* ==========================================================================
   PAINEL DE CONTROLE MESTRE DE BOTS PVP - IS BLADE (16/11/2026 - 17/11/2026)
   Interface única consolidada (Single-Screen / No Scroll) com controle total:
   - Duelo Solo 1v1 (1 Bot no campo de visão frente a frente)
   - Guerra de Times TvT (3v3, 5v5, 10v10 com formação militar nos cantos)
   - IA Tática Humana (Focus Fire, Peeling de Tank, Recuo de HP < 28%, Footsies)
   - Ordens Táticas em Tempo Real (Avançar, Proteger Healer, Reagrupar, Pausar)
   - Seleção de Grau (No-Grade, D, C, B, A, S com sets e glows nativos do L2)
   ========================================================================== */

(function(){
  'use strict';

  var estado = {
    aberto: false,
    qtd: 1,         // Padrão 1 para facilitar Duelo 1v1 imediato
    lv: 40,
    local: 'aqui',  // 'aqui', 'arena', 'campo'
    modo: 'pvp',    // 'pvp', 'inimigo', 'treino'
    ia: 'humano',   // 'humano', 'agressivo', 'defensivo', 'treino'
    classe: '',     // '', 'guerreiro', 'guardiao', 'mago', 'clerigo'
    tipoJogo: '1v1',// '1v1', 'tvt', 'azul', 'vermelho', 'livre'
    team: '',       // '', 'A', 'B'
    meuTime: '',    // '', 'A', 'B'
    comHealer: true,
    totalBots: 0,
    ordemAtual: 'normal'
  };

  var elBtn = null;
  var elModal = null;
  var elBadge = null;

  function grauDeNivel(lv){
    if(lv >= 76) return { g: 'S', set: 'Imperial Crusader / Tallum', en: '+16 Glow Lendário', sk: '7 de 7 Skills', cor: '#ef4444' };
    if(lv >= 61) return { g: 'A', set: 'Set Tallum / Imperial', en: '+13 Glow Fúria', sk: '5 de 7 Skills', cor: '#f97316' };
    if(lv >= 52) return { g: 'B', set: 'Set Doom Plate Armor', en: '+10 Glow Púrpura', sk: '4 de 7 Skills', cor: '#a855f7' };
    if(lv >= 40) return { g: 'C', set: 'Set Full Plate Armor', en: '+7 Glow Azul Vívido', sk: '3 de 7 Skills', cor: '#38bdf8' };
    if(lv >= 20) return { g: 'D', set: 'Set Brigandine', en: '+4 Glow Azul Suave', sk: '2 de 7 Skills', cor: '#4ade80' };
    return { g: 'No-Grade', set: 'Roupas No-Grade', en: '+0 Sem Glow', sk: '1 de 7 Skills', cor: '#94a3b8' };
  }

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
        padding: 7px 12px;
        border-radius: 6px;
        border: 1px solid #c5a059;
        background: linear-gradient(180deg, rgba(30, 24, 14, 0.95) 0%, rgba(14, 11, 6, 0.98) 100%);
        box-shadow: inset 0 0 0 1px rgba(245, 196, 81, 0.25), 0 4px 12px rgba(0, 0, 0, 0.7);
        color: #f5c451;
        font: 700 11px system-ui, -apple-system, sans-serif;
        letter-spacing: 0.08em;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
        transition: transform 0.15s ease, border-color 0.15s ease;
      }
      #painelBotsBtn:hover {
        transform: translateY(-1px);
        border-color: #ffd166;
        color: #fff;
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

      /* MODAL MASTER DASHBOARD: TELA ÚNICA SEM SCROLL */
      #painelBotsModal {
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        z-index: 99999;
        width: min(96vw, 520px);
        box-sizing: border-box;
        background: linear-gradient(180deg, rgba(18, 24, 35, 0.98) 0%, rgba(9, 13, 20, 0.99) 100%);
        border: 2px solid #5a4828;
        box-shadow: inset 0 0 0 1px #a4823e, inset 0 0 28px rgba(0, 0, 0, 0.95), 0 16px 48px rgba(0, 0, 0, 0.85);
        border-radius: 6px;
        color: #dbe6ff;
        font-family: system-ui, -apple-system, sans-serif;
        user-select: none;
        display: none;
      }

      .pb-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 14px;
        border-bottom: 1px solid #4a3a1f;
        background: linear-gradient(180deg, rgba(46, 36, 20, 0.7) 0%, rgba(20, 15, 8, 0.5) 100%);
      }
      .pb-header-left {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .pb-titulo {
        font-family: "Cinzel", Georgia, serif;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #f5c451;
        text-shadow: 0 1px 2px #000;
      }
      .pb-status-pill {
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 10px;
        background: rgba(34, 197, 94, 0.2);
        border: 1px solid #22c55e;
        color: #4ade80;
        letter-spacing: 0.04em;
      }
      .pb-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pb-h-btn {
        padding: 3px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 800;
        cursor: pointer;
        border: 1px solid transparent;
        transition: all 0.15s ease;
      }
      .pb-h-matar {
        background: rgba(55, 65, 81, 0.7);
        border-color: #6b7280;
        color: #e5e7eb;
      }
      .pb-h-matar:hover { background: #4b5563; color: #fff; }
      .pb-h-limpar {
        background: rgba(153, 27, 27, 0.6);
        border-color: #ef4444;
        color: #fca5a5;
      }
      .pb-h-limpar:hover { background: #dc2626; color: #fff; }
      .pb-h-fechar {
        background: rgba(0, 0, 0, 0.5);
        border-color: #5a4828;
        color: #c5a059;
        font-size: 14px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
      .pb-h-fechar:hover { background: #8a1f1f; border-color: #ff5555; color: #fff; }

      .pb-corpo {
        padding: 10px 14px 12px;
      }

      /* BARRA DE PRESETS 1-CLIQUE */
      .pb-presets-bar {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        margin-bottom: 10px;
      }
      .pb-preset-btn {
        padding: 7px 4px;
        border-radius: 4px;
        border: 1px solid #4a3c20;
        background: linear-gradient(180deg, #241c0e 0%, #120e06 100%);
        color: #fcd34d;
        font: 800 11px system-ui, sans-serif;
        cursor: pointer;
        text-align: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
        transition: all 0.15s ease;
      }
      .pb-preset-btn:hover {
        border-color: #f5c451;
        background: linear-gradient(180deg, #3d2f16 0%, #1e1709 100%);
        transform: translateY(-1px);
        color: #fff;
      }
      .pb-preset-btn.ativo {
        border-color: #ffd166;
        background: linear-gradient(180deg, #6b4d1b 0%, #3d2a09 100%);
        color: #fff;
        box-shadow: 0 0 10px rgba(245, 196, 81, 0.35);
      }

      /* GRID PRINCIPAL EM 2 COLUNAS COMPACTAS */
      .pb-grid-duplo {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 10px;
      }
      .pb-col {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .pb-label {
        font-size: 10px;
        font-weight: 800;
        color: #94a3b8;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .pb-label em {
        font-style: normal;
        color: #f5c451;
      }

      /* SELETORES EM GRID */
      .pb-opts-row {
        display: flex;
        gap: 4px;
      }
      .pb-opt-btn {
        flex: 1;
        padding: 5px 2px;
        border-radius: 4px;
        border: 1px solid #2e394e;
        background: #141a29;
        color: #8f9db5;
        font: 700 10px system-ui, sans-serif;
        cursor: pointer;
        text-align: center;
        transition: all 0.12s ease;
      }
      .pb-opt-btn:hover {
        background: #1c2538;
        border-color: #5d6f8f;
        color: #fff;
      }
      .pb-opt-btn.ativo {
        background: linear-gradient(180deg, #3d2f16 0%, #1e1709 100%);
        border-color: #f5c451;
        color: #ffd166;
        box-shadow: inset 0 0 6px rgba(245, 196, 81, 0.25);
      }

      /* BOTÕES DE TIME COLORIDOS */
      .pb-opt-time-a.ativo {
        background: linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%) !important;
        border-color: #38bdf8 !important;
        color: #fff !important;
      }
      .pb-opt-time-b.ativo {
        background: linear-gradient(180deg, #b91c1c 0%, #7f1d1d 100%) !important;
        border-color: #f87171 !important;
        color: #fff !important;
      }

      /* STEPPER COMPACTO */
      .pb-stepper {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .pb-step-b {
        width: 28px;
        height: 26px;
        border-radius: 4px;
        border: 1px solid #5a4828;
        background: #201a10;
        color: #f5c451;
        font-size: 15px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .pb-step-b:hover { background: #3d2f16; border-color: #ffd166; color: #fff; }
      .pb-step-val {
        flex: 1;
        height: 26px;
        border-radius: 4px;
        border: 1px solid #3d2f16;
        background: #0d121c;
        color: #f5c451;
        font-size: 12px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* PREVIEW DO GRAU & SET */
      .pb-gear-bar {
        padding: 5px 8px;
        border-radius: 4px;
        background: rgba(15, 20, 30, 0.85);
        border: 1px solid #4a3a1f;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10px;
      }
      .pb-gear-set {
        font-weight: 700;
        color: #cbd5e1;
      }
      .pb-gear-badge {
        font-weight: 900;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(0,0,0,0.4);
      }

      /* BARRA DE ORDENS TÁTICAS AO VIVO */
      .pb-ordens-container {
        padding: 6px 8px;
        border-radius: 5px;
        background: rgba(12, 16, 24, 0.9);
        border: 1px solid #334155;
        margin-bottom: 8px;
      }
      .pb-ordens-title {
        font-size: 9px;
        font-weight: 800;
        color: #94a3b8;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 4px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .pb-ordens-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px;
      }
      .pb-btn-ordem {
        padding: 4px 2px;
        border-radius: 3px;
        border: 1px solid #3b4252;
        background: #1e2536;
        color: #d8dee9;
        font: 700 10px system-ui, sans-serif;
        cursor: pointer;
        text-align: center;
        transition: all 0.12s ease;
      }
      .pb-btn-ordem:hover {
        background: #2e3440;
        border-color: #88c0d0;
        color: #fff;
      }
      .pb-btn-ordem.ativo {
        background: #434c5e;
        border-color: #ebcb8b;
        color: #ebcb8b;
        font-weight: 900;
      }

      /* BOTAO MESTRE DINÂMICO */
      .pb-btn-master {
        width: 100%;
        padding: 11px 10px;
        border-radius: 5px;
        border: 2px solid #c5a059;
        background: linear-gradient(180deg, #6b4d1b 0%, #3d2a09 100%);
        box-shadow: inset 0 1px 0 rgba(255, 235, 175, 0.4), 0 4px 12px rgba(0, 0, 0, 0.7);
        color: #fff;
        font-family: "Cinzel", Georgia, serif;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.08em;
        cursor: pointer;
        text-align: center;
        text-shadow: 0 1px 3px #000;
        transition: all 0.15s ease;
      }
      .pb-btn-master:hover {
        background: linear-gradient(180deg, #8a6424 0%, #523a0f 100%);
        border-color: #ffd166;
        box-shadow: 0 0 16px rgba(245, 196, 81, 0.4);
        transform: translateY(-1px);
      }
      .pb-btn-master:active { transform: translateY(1px); }

      .pb-btn-master.modo-tvt {
        background: linear-gradient(90deg, #1e3a8a 0%, #312e81 40%, #701a75 60%, #991b1b 100%);
        border-color: #f5c451;
      }
      .pb-btn-master.modo-tvt:hover {
        filter: brightness(1.15);
      }
    `;
    document.head.appendChild(st);
  }

  function criarInterface(){
    injetarEstilos();

    // 1. Botão Flutuante no HUD
    elBtn = document.createElement('button');
    elBtn.type = 'button';
    elBtn.id = 'painelBotsBtn';
    elBtn.title = 'Abrir Painel Mestre de Bots PvP (Tecla B ou F8)';
    elBtn.innerHTML = `<span>⚔️ BOTS PVP</span><span class="bot-badge" id="pbBtnBadge">0</span>`;
    elBtn.onclick = function(e){
      e.stopPropagation();
      toggle();
    };
    /* botao escondido para os jogadores (ainda nao ha trava de super admin): so F8/B/F10 abrem. Para ver o botao no seu navegador: localStorage.isblade_gm_botoes='1' */
    try { if(localStorage.getItem('isblade_gm_botoes') !== '1') elBtn.style.display = 'none'; } catch(e){ elBtn.style.display = 'none'; }
    document.body.appendChild(elBtn);
    elBadge = document.getElementById('pbBtnBadge');

    // 2. Modal do Painel Mestre
    elModal = document.createElement('div');
    elModal.id = 'painelBotsModal';
    elModal.innerHTML = `
      <div class="pb-header">
        <div class="pb-header-left">
          <span class="pb-titulo">⚔️ BOTS PVP · CONTROLE MESTRE</span>
          <span class="pb-status-pill" id="pbStatusBots">0 BOTS</span>
        </div>
        <div class="pb-header-actions">
          <button type="button" class="pb-h-btn pb-h-matar" id="pbHBtnMatar" title="Abater todos os bots ativos">💀 Matar</button>
          <button type="button" class="pb-h-btn pb-h-limpar" id="pbHBtnLimpar" title="Remover e deletar bots">🛑 Limpar</button>
          <button type="button" class="pb-h-btn pb-h-fechar" id="pbBtnFechar" title="Fechar (ESC)">✕</button>
        </div>
      </div>

      <div class="pb-corpo">
        <!-- 1. PRESETS 1-CLIQUE -->
        <div class="pb-presets-bar">
          <button type="button" class="pb-preset-btn ativo" data-preset="1v1">⚔️ 1v1 Duelo</button>
          <button type="button" class="pb-preset-btn" data-preset="3v3">🛡️ 3 vs 3</button>
          <button type="button" class="pb-preset-btn" data-preset="5v5">🚩 5 vs 5 TvT</button>
          <button type="button" class="pb-preset-btn" data-preset="10v10">💥 10 vs 10</button>
        </div>

        <!-- 2. GRID DUPLO COMPACTO -->
        <div class="pb-grid-duplo">
          <!-- COLUNA ESQUERDA: SETUP DE INVOCACAO -->
          <div class="pb-col">
            <!-- QUANTIDADE -->
            <div class="pb-label">
              <span>Quantidade</span>
              <em id="pbTxtQtd">1 Bot (1v1)</em>
            </div>
            <div class="pb-stepper">
              <button type="button" class="pb-step-b" id="pbQtdMenos">-</button>
              <div class="pb-step-val" id="pbValQtd">1</div>
              <button type="button" class="pb-step-b" id="pbQtdMais">+</button>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn ativo" data-setqtd="1">1 (Solo)</button>
              <button type="button" class="pb-opt-btn" data-setqtd="3">3</button>
              <button type="button" class="pb-opt-btn" data-setqtd="5">5</button>
              <button type="button" class="pb-opt-btn" data-setqtd="10">10</button>
            </div>

            <!-- NIVEL & GRAU -->
            <div class="pb-label" style="margin-top:2px;">
              <span>Nível</span>
              <em id="pbTxtGrau">Nv 40 · Grau C</em>
            </div>
            <div class="pb-stepper">
              <button type="button" class="pb-step-b" id="pbLvMenos">-</button>
              <div class="pb-step-val" id="pbValLv">40</div>
              <button type="button" class="pb-step-b" id="pbLvMais">+</button>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn" data-setlv="20">D (20)</button>
              <button type="button" class="pb-opt-btn ativo" data-setlv="40">C (40)</button>
              <button type="button" class="pb-opt-btn" data-setlv="52">B (52)</button>
              <button type="button" class="pb-opt-btn" data-setlv="61">A (61)</button>
              <button type="button" class="pb-opt-btn" data-setlv="76">S (76)</button>
            </div>

            <!-- PREVIEW DO EQUIPAMENTO -->
            <div class="pb-gear-bar">
              <span class="pb-gear-set" id="pbGearSet">Set Full Plate (+7)</span>
              <span class="pb-gear-badge" id="pbGearBadge" style="color:#38bdf8">GRAU C</span>
            </div>

            <!-- LOCAL -->
            <div class="pb-label" style="margin-top:2px;">
              <span>Local de Batalha</span>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn ativo" data-local="aqui">📍 Aqui</button>
              <button type="button" class="pb-opt-btn" data-local="arena">🏟️ Arena PvP</button>
              <button type="button" class="pb-opt-btn" data-local="campo">🌲 Campo</button>
            </div>
          </div>

          <!-- COLUNA DIREITA: ESTRATEGIA, TIMES & CLASSES -->
          <div class="pb-col">
            <!-- MODO / EQUIPE -->
            <div class="pb-label">
              <span>Equipes / Formação</span>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn ativo" data-tipojogo="1v1">⚔️ 1v1 / Livre</button>
              <button type="button" class="pb-opt-btn" data-tipojogo="tvt">⚖️ TvT (Azul x Verm)</button>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn pb-opt-time-a" data-tipojogo="azul">🔵 Time Azul</button>
              <button type="button" class="pb-opt-btn pb-opt-time-b" data-tipojogo="vermelho">🔴 Time Vermelho</button>
            </div>

            <!-- CLASSE -->
            <div class="pb-label" style="margin-top:2px;">
              <span>Classe dos Bots</span>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn ativo" data-classe="">🎲 Todas</button>
              <button type="button" class="pb-opt-btn" data-classe="guerreiro">⚔️ Dano</button>
              <button type="button" class="pb-opt-btn" data-classe="guardiao">🛡️ Tank</button>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn" data-classe="mago">🧙 Mago</button>
              <button type="button" class="pb-opt-btn" data-classe="clerigo">✝️ Healer</button>
            </div>

            <!-- IA TATICA -->
            <div class="pb-label" style="margin-top:2px;">
              <span>Inteligência de Combate</span>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn ativo" data-ia="humano" title="Focus fire, proteção de healer, recuo de HP e footsies">🧠 Humano</button>
              <button type="button" class="pb-opt-btn" data-ia="agressivo" title="Avanço incansável corpo a corpo">⚔️ Agressivo</button>
              <button type="button" class="pb-opt-btn" data-ia="treino" title="Passivo para teste de combos">🛑 Treino</button>
            </div>

            <!-- MEU TIME (JOGADOR) -->
            <div class="pb-label" style="margin-top:2px;">
              <span>Meu Time (Jogador)</span>
            </div>
            <div class="pb-opts-row">
              <button type="button" class="pb-opt-btn pb-opt-time-a" id="pbBtnEntrarAzul">🔵 Azul</button>
              <button type="button" class="pb-opt-btn pb-opt-time-b" id="pbBtnEntrarVerm">🔴 Verm</button>
              <button type="button" class="pb-opt-btn ativo" id="pbBtnEntrarNeutro">⚪ Neutro</button>
            </div>
          </div>
        </div>

        <!-- 3. ORDENS TATICAS AO VIVO (COMANDO DE GRUPO) -->
        <div class="pb-ordens-container">
          <div class="pb-ordens-title">
            <span>Ordens Táticas em Tempo Real (Comando de Grupo)</span>
            <span style="color:#ffd166;" id="pbTxtOrdemAtiva">NORMAL</span>
          </div>
          <div class="pb-ordens-grid">
            <button type="button" class="pb-btn-ordem" data-ordem="avancar">⚔️ Avançar</button>
            <button type="button" class="pb-btn-ordem" data-ordem="proteger">🛡️ Proteger</button>
            <button type="button" class="pb-btn-ordem" data-ordem="recuar">🏃 Reagrupar</button>
            <button type="button" class="pb-btn-ordem" data-ordem="pausar">🛑 Pausar</button>
            <button type="button" class="pb-btn-ordem ativo" data-ordem="normal">▶️ Luta Livre</button>
          </div>
        </div>

        <!-- 4. BOTAO PRINCIPAL DINAMICO -->
        <button type="button" class="pb-btn-master" id="pbBtnExecutar">⚔️ INICIAR DUELO 1v1 (1 BOT NV 40 · GRAU C)</button>
      </div>
    `;
    document.body.appendChild(elModal);

    // Wire up events
    document.getElementById('pbBtnFechar').onclick = function(){ toggle(false); };
    document.getElementById('pbHBtnMatar').onclick = function(){ if(window.Net) Net.botCmd({ acao: 'matar' }); };
    document.getElementById('pbHBtnLimpar').onclick = function(){ if(window.Net) Net.botCmd({ acao: 'limpar', tudo: true }); };

    // Presets 1-clique
    elModal.querySelectorAll('[data-preset]').forEach(function(b){
      b.onclick = function(){
        elModal.querySelectorAll('[data-preset]').forEach(function(x){ x.classList.remove('ativo'); });
        b.classList.add('ativo');
        var p = b.getAttribute('data-preset');
        if(p === '1v1'){
          estado.tipoJogo = '1v1';
          estado.qtd = 1;
        } else if(p === '3v3'){
          estado.tipoJogo = 'tvt';
          estado.qtd = 3;
        } else if(p === '5v5'){
          estado.tipoJogo = 'tvt';
          estado.qtd = 5;
        } else if(p === '10v10'){
          estado.tipoJogo = 'tvt';
          estado.qtd = 10;
        }
        sincronizarUI();
      };
    });

    // Quantidade
    document.getElementById('pbQtdMenos').onclick = function(){ setQtd(estado.qtd - 1); };
    document.getElementById('pbQtdMais').onclick = function(){ setQtd(estado.qtd + 1); };
    elModal.querySelectorAll('[data-setqtd]').forEach(function(b){
      b.onclick = function(){
        setQtd(parseInt(b.getAttribute('data-setqtd'), 10) || 1);
      };
    });

    // Nível
    document.getElementById('pbLvMenos').onclick = function(){ setLv(estado.lv - 1); };
    document.getElementById('pbLvMais').onclick = function(){ setLv(estado.lv + 1); };
    elModal.querySelectorAll('[data-setlv]').forEach(function(b){
      b.onclick = function(){
        setLv(parseInt(b.getAttribute('data-setlv'), 10) || 40);
      };
    });

    // Local
    elModal.querySelectorAll('[data-local]').forEach(function(b){
      b.onclick = function(){
        elModal.querySelectorAll('[data-local]').forEach(function(x){ x.classList.remove('ativo'); });
        b.classList.add('ativo');
        estado.local = b.getAttribute('data-local');
      };
    });

    // Tipo de Jogo / Equipes
    elModal.querySelectorAll('[data-tipojogo]').forEach(function(b){
      b.onclick = function(){
        elModal.querySelectorAll('[data-tipojogo]').forEach(function(x){ x.classList.remove('ativo'); });
        b.classList.add('ativo');
        estado.tipoJogo = b.getAttribute('data-tipojogo');
        if(estado.tipoJogo === '1v1' && estado.qtd > 1) estado.qtd = 1;
        if(estado.tipoJogo === 'tvt' && estado.qtd === 1) estado.qtd = 5;
        sincronizarUI();
      };
    });

    // Classe
    elModal.querySelectorAll('[data-classe]').forEach(function(b){
      b.onclick = function(){
        elModal.querySelectorAll('[data-classe]').forEach(function(x){ x.classList.remove('ativo'); });
        b.classList.add('ativo');
        estado.classe = b.getAttribute('data-classe');
        sincronizarUI();
      };
    });

    // IA
    elModal.querySelectorAll('[data-ia]').forEach(function(b){
      b.onclick = function(){
        elModal.querySelectorAll('[data-ia]').forEach(function(x){ x.classList.remove('ativo'); });
        b.classList.add('ativo');
        estado.ia = b.getAttribute('data-ia');
        if(window.Net && Net.on){
          Net.botCmd({ acao: 'modo', modo: estado.ia === 'treino' ? 'treino' : 'pvp' });
        }
      };
    });

    // Meu Time (Jogador)
    document.getElementById('pbBtnEntrarAzul').onclick = function(){ setMeuTime('A'); };
    document.getElementById('pbBtnEntrarVerm').onclick = function(){ setMeuTime('B'); };
    document.getElementById('pbBtnEntrarNeutro').onclick = function(){ setMeuTime(''); };

    // Ordens Táticas
    elModal.querySelectorAll('[data-ordem]').forEach(function(b){
      b.onclick = function(){
        elModal.querySelectorAll('[data-ordem]').forEach(function(x){ x.classList.remove('ativo'); });
        b.classList.add('ativo');
        var ord = b.getAttribute('data-ordem');
        estado.ordemAtual = ord;
        var txtO = document.getElementById('pbTxtOrdemAtiva');
        if(txtO) txtO.textContent = ord.toUpperCase();
        if(window.Net && Net.on){
          Net.botCmd({ acao: 'ordem', ordem: ord });
        }
      };
    });

    // Botão Mestre Executar
    document.getElementById('pbBtnExecutar').onclick = function(){
      executarAcaoPrincipal();
    };

    // Teclas de atalho: ESC, B ou F8
    window.addEventListener('keydown', function(e){
      var t = e.target && e.target.tagName;
      if(t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
      if(e.key === 'Escape' && estado.aberto){
        toggle(false);
      } else if(e.key === 'F8' || (e.key === 'b' && !e.ctrlKey && !e.altKey && !e.metaKey)){
        e.preventDefault();
        toggle();
      }
    });

    setLv(40);
    setQtd(1);
    sincronizarUI();
  }

  function setMeuTime(tm){
    estado.meuTime = tm;
    var btnA = document.getElementById('pbBtnEntrarAzul');
    var btnB = document.getElementById('pbBtnEntrarVerm');
    var btnN = document.getElementById('pbBtnEntrarNeutro');
    if(btnA) btnA.classList.toggle('ativo', tm === 'A');
    if(btnB) btnB.classList.toggle('ativo', tm === 'B');
    if(btnN) btnN.classList.toggle('ativo', !tm);
    if(window.Net && Net.setTeam) Net.setTeam(tm);
  }

  function setQtd(q){
    q = Math.max(1, Math.min(25, q));
    estado.qtd = q;
    var valEl = document.getElementById('pbValQtd');
    if(valEl) valEl.textContent = q;

    var txtEl = document.getElementById('pbTxtQtd');
    if(txtEl){
      txtEl.textContent = q === 1 ? '1 Bot (1v1 Solo)' : (q + ' Bots');
    }

    if(elModal){
      elModal.querySelectorAll('[data-setqtd]').forEach(function(b){
        b.classList.toggle('ativo', parseInt(b.getAttribute('data-setqtd'), 10) === q);
      });
    }

    if(q === 1 && estado.tipoJogo !== '1v1'){
      estado.tipoJogo = '1v1';
    } else if(q > 1 && estado.tipoJogo === '1v1'){
      // Se aumentou quantidade no modo 1v1, vira FFA / TvT
      estado.tipoJogo = 'tvt';
    }
    sincronizarUI();
  }

  function setLv(lv){
    lv = Math.max(1, Math.min(85, lv));
    estado.lv = lv;
    var valEl = document.getElementById('pbValLv');
    if(valEl) valEl.textContent = lv;

    var info = grauDeNivel(lv);
    var txtEl = document.getElementById('pbTxtGrau');
    if(txtEl) txtEl.textContent = 'Nv ' + lv + ' · Grau ' + info.g;

    var setEl = document.getElementById('pbGearSet');
    if(setEl) setEl.textContent = info.set + ' (' + info.en.split(' ')[0] + ')';

    var bEl = document.getElementById('pbGearBadge');
    if(bEl){
      bEl.textContent = 'GRAU ' + info.g;
      bEl.style.color = info.cor;
    }

    if(elModal){
      elModal.querySelectorAll('[data-setlv]').forEach(function(b){
        b.classList.toggle('ativo', parseInt(b.getAttribute('data-setlv'), 10) === lv);
      });
    }
    sincronizarUI();
  }

  function sincronizarUI(){
    var info = grauDeNivel(estado.lv);
    var btnM = document.getElementById('pbBtnExecutar');
    if(!btnM) return;

    // Atualiza botões ativos de tipoJogo
    if(elModal){
      elModal.querySelectorAll('[data-tipojogo]').forEach(function(b){
        b.classList.toggle('ativo', b.getAttribute('data-tipojogo') === estado.tipoJogo);
      });
    }

    var clsNome = estado.classe ? ' ' + estado.classe.toUpperCase() : '';

    if(estado.tipoJogo === '1v1' || estado.qtd === 1){
      btnM.className = 'pb-btn-master';
      btnM.textContent = '⚔️ INICIAR DUELO 1v1 (1 BOT' + clsNome + ' NV ' + estado.lv + ' · GRAU ' + info.g + ')';
    } else if(estado.tipoJogo === 'tvt'){
      btnM.className = 'pb-btn-master modo-tvt';
      btnM.textContent = '🚩 INICIAR GUERRA TVT (' + estado.qtd + ' vs ' + estado.qtd + ' · COM HEALERS · GRAU ' + info.g + ')';
    } else if(estado.tipoJogo === 'azul'){
      btnM.className = 'pb-btn-master';
      btnM.textContent = '🔵 SPAWNAR ' + estado.qtd + ' BOTS' + clsNome + ' TIME AZUL (NV ' + estado.lv + ')';
    } else if(estado.tipoJogo === 'vermelho'){
      btnM.className = 'pb-btn-master';
      btnM.textContent = '🔴 SPAWNAR ' + estado.qtd + ' BOTS' + clsNome + ' TIME VERMELHO (NV ' + estado.lv + ')';
    } else {
      btnM.className = 'pb-btn-master';
      btnM.textContent = '⚔️ CONVOCAR ' + estado.qtd + ' BOTS' + clsNome + ' PVP LIVRE (NV ' + estado.lv + ')';
    }
  }

  function executarAcaoPrincipal(){
    if(!window.Net || !Net.on){
      avisar('Conectando ao servidor...');
      return;
    }

    if(estado.tipoJogo === 'tvt'){
      // Guerra TvT Azul vs Vermelho
      Net.botCmd({
        acao: 'spawn_times',
        qtdPorTime: estado.qtd,
        lv: estado.lv,
        local: estado.local,
        comHealer: true,
        classeA: estado.classe,
        classeB: estado.classe,
        ia: estado.ia
      });
    } else {
      // Invocação avulsa ou 1v1
      var team = '';
      if(estado.tipoJogo === 'azul') team = 'A';
      else if(estado.tipoJogo === 'vermelho') team = 'B';

      Net.botCmd({
        acao: 'spawn',
        qtd: estado.qtd,
        lv: estado.lv,
        local: estado.local,
        modo: estado.ia === 'treino' ? 'treino' : 'pvp',
        team: team,
        classe: estado.classe,
        comHealer: estado.qtd > 2,
        ia: estado.ia
      });
    }
  }

  function avisar(txt){
    try {
      if(window.Chat && Chat.sistema) Chat.sistema(txt);
      else if(window.Net && window.Net.ctx && window.Net.ctx.sysMsg) window.Net.ctx.sysMsg(txt);
      else console.log('[PainelBots]', txt);
    } catch(e){}
  }

  /* o painel de bots agora mora DENTRO do F10 (aba Bots PvP); o PainelAdmin chama embutir(host) / desembutir() */
  var embutido = false;
  function embutir(host){
    if(!elModal) criarInterface();
    if(elModal.parentNode !== host) host.appendChild(elModal);
    embutido = true; estado.aberto = true; elModal.style.display = 'block';
    try { document.exitPointerLock(); } catch(e){}
    if(window.Net && Net.on) Net.botCmd({ acao: 'status' });
    if(window.UIJanelas) UIJanelas.notificar('painel_bots', true);
  }
  function desembutir(){
    if(!embutido) return; embutido = false; estado.aberto = false;
    if(elModal) elModal.style.display = 'none';
    if(window.UIJanelas) UIJanelas.notificar('painel_bots', false);
  }
  function toggle(forcar){
    var abrir = typeof forcar === 'boolean' ? forcar : !estado.aberto;
    if(window.PainelAdmin && PainelAdmin.abrirAba){                    /* unificado: abre/fecha o F10 na aba de bots */
      if(abrir) PainelAdmin.abrirAba('bots'); else if(PainelAdmin.fechar) PainelAdmin.fechar();
      return;
    }
    estado.aberto = abrir;
    if(!elModal) criarInterface();

    elModal.style.display = estado.aberto ? 'block' : 'none';

    if(estado.aberto){
      try { document.exitPointerLock(); } catch(e){}
      if(window.Net && Net.on){
        Net.botCmd({ acao: 'status' });
      }
    }
    if(window.UIJanelas) UIJanelas.notificar('painel_bots', estado.aberto);
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
        stBots.textContent = info.total + (info.total === 1 ? ' BOT' : ' BOTS');
      }
    }
  }

  // Inicialização automática ao carregar o script
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
    isOpen: function(){ return !!estado.aberto; },
    setQtd: setQtd,
    setLv: setLv,
    duelo1v1: function(lv, cls){
      setQtd(1);
      if(lv) setLv(lv);
      if(cls) estado.classe = cls;
      estado.tipoJogo = '1v1';
      sincronizarUI();
      executarAcaoPrincipal();
    },
    atualizaInfo: atualizaInfo,
    embutir: embutir,
    desembutir: desembutir,
    get estado(){ return estado; }
  };

})();
