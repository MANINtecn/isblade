/* =============================================================================
   TECX LABS / IS BLADE - SISTEMA DE TELEPORTE E TRANSIÇÃO SUAVE (L2 STYLE)
   - Preloader dimensional sem tela branca
   - Anéis rúnicos giratórios com partículas
   - Dicas dinâmicas de combate e lore autêntico
   - Som de warp dimensional via Web Audio / SFX
   ============================================================================= */
(function(){
  'use strict';

  var TIPS = [
    "Dica: Bloquear com o Escudo [Espaço] reduz até 80% do dano de ataques frontais.",
    "Dica: Acertar golpes recupera Estamina (+4 no ataque básico, +6 nas skills).",
    "Dica: Chefes com a barra de guarda quebrada ficam atordoados e vulneráveis a combos aéreos (+40% dano).",
    "Dica: No celular, o Soft-Lock busca automaticamente o inimigo mais próximo em cone frontal ao atacar.",
    "Dica: Armas encantadas acima de +3 adquirem brilho mágico e dano extra, mas podem se quebrar em cristais!",
    "Lore: A Gatekeeper Clarissa manipula as correntes arcanas de Talking Island com as bênçãos de Einhasad.",
    "Lore: O Ferreiro Altran domina as antigas técnicas anãs de forja e têmpera de aço de Aden.",
    "Lore: O misterioso Mammon só aceita negociar com aqueles que possuem as lendárias Ancient Adena."
  ];

  var CSS = `
    #l2-tp-screen {
      position: fixed;
      inset: 0;
      z-index: 999999;
      background: radial-gradient(circle at center, #071126 0%, #02050e 70%, #000206 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
      color: #fff;
      font-family: 'Cinzel', 'Trajan Pro', system-ui, -apple-system, sans-serif;
      user-select: none;
      -webkit-user-select: none;
    }
    #l2-tp-screen.active {
      opacity: 1;
      pointer-events: auto;
    }
    .l2-tp-rune-box {
      position: relative;
      width: 140px;
      height: 140px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .l2-tp-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px dashed rgba(0, 213, 255, 0.45);
      animation: l2tpSpin 12s linear infinite;
    }
    .l2-tp-ring.inner {
      inset: 22px;
      border: 1.5px solid rgba(245, 196, 81, 0.6);
      border-top-color: transparent;
      border-bottom-color: transparent;
      animation: l2tpSpinRev 7s linear infinite;
    }
    .l2-tp-ring.core {
      inset: 46px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0, 213, 255, 0.65) 0%, rgba(9, 44, 88, 0.1) 70%);
      box-shadow: 0 0 35px rgba(0, 213, 255, 0.7);
      animation: l2tpPulse 1.8s ease-in-out infinite;
    }
    @keyframes l2tpSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes l2tpSpinRev { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
    @keyframes l2tpPulse { 0%, 100% { transform: scale(0.9); opacity: 0.7; } 50% { transform: scale(1.1); opacity: 1; } }
    
    .l2-tp-title {
      font-size: 11px;
      letter-spacing: 0.35em;
      color: #79a6d2;
      text-transform: uppercase;
      margin-bottom: 6px;
      text-shadow: 0 0 8px rgba(121, 166, 210, 0.5);
    }
    .l2-tp-dest {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #f5c451;
      text-transform: uppercase;
      margin-bottom: 20px;
      text-shadow: 0 0 15px rgba(245, 196, 81, 0.65);
    }
    .l2-tp-bar-wrap {
      width: min(340px, 80vw);
      height: 4px;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 24px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.6);
    }
    .l2-tp-bar-fill {
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #00d5ff, #f5c451);
      box-shadow: 0 0 12px #00d5ff;
      transition: width 0.7s cubic-bezier(0.1, 0.7, 0.1, 1);
    }
    .l2-tp-tip {
      font-size: 12px;
      color: #9cb1cb;
      max-width: 480px;
      text-align: center;
      line-height: 1.5;
      padding: 0 20px;
      letter-spacing: 0.03em;
      font-style: italic;
    }
  `;

  var dom = null, barEl = null, destEl = null, tipEl = null;

  function initDOM(){
    if(dom) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    dom = document.createElement('div');
    dom.id = 'l2-tp-screen';
    dom.innerHTML = `
      <div class="l2-tp-rune-box">
        <div class="l2-tp-ring"></div>
        <div class="l2-tp-ring inner"></div>
        <div class="l2-tp-ring core"></div>
      </div>
      <div class="l2-tp-title">DOBRANDO O ESPAÇO DIMENSIONAL</div>
      <div class="l2-tp-dest" id="l2-tp-dest-text">DESTINO</div>
      <div class="l2-tp-bar-wrap">
        <div class="l2-tp-bar-fill" id="l2-tp-bar"></div>
      </div>
      <div class="l2-tp-tip" id="l2-tp-tip-text">...</div>
    `;
    document.body.appendChild(dom);

    barEl = document.getElementById('l2-tp-bar');
    destEl = document.getElementById('l2-tp-dest-text');
    tipEl = document.getElementById('l2-tp-tip-text');
  }

  function playWarpSound(){
    try {
      var ctx = window.AudioContext || window.webkitAudioContext;
      if(!ctx) return;
      var actx = new ctx();
      var osc = actx.createOscillator();
      var gain = actx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, actx.currentTime + 0.6);
      gain.gain.setValueAtTime(0.2, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.7);
      osc.connect(gain);
      gain.connect(actx.destination);
      osc.start();
      osc.stop(actx.currentTime + 0.7);
    } catch(e){}
  }

  window.L2Teleport = {
    // Transiciona para outra página ou URL com efeito suave
    teleportTo: function(destName, url){
      initDOM();
      destEl.textContent = destName || 'NOVO MAPA';
      tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      barEl.style.width = '0%';
      dom.classList.add('active');
      playWarpSound();

      setTimeout(function(){
        barEl.style.width = '100%';
      }, 50);

      setTimeout(function(){
        if(url){
          window.location.href = url;
        } else {
          dom.classList.remove('active');
        }
      }, 750);
    },

    // Transição suave para teleporte local no mesmo mapa (ex: Vila de Talking Island)
    warpLocal: function(destName, callback){
      initDOM();
      destEl.textContent = destName || 'TELEPORTE LOCAL';
      tipEl.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      barEl.style.width = '0%';
      dom.classList.add('active');
      playWarpSound();

      setTimeout(function(){
        barEl.style.width = '100%';
      }, 40);

      setTimeout(function(){
        if(callback) callback();
        setTimeout(function(){
          dom.classList.remove('active');
        }, 200);
      }, 650);
    }
  };

  if(document.body) initDOM();
  else document.addEventListener('DOMContentLoaded', initDOM);
})();

