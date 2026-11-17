/* =============================================================================
   TECX SOFTHOUSE / IS BLADE - SISTEMA UNIVERSAL DE JANELAS E AUTO-CURSOR (UIJanelas)
   
   Regras Fundamentais:
   1. Qualquer janela ou diálogo que abrir (Inventário, Character/Status, Opções,
      Painel de Bots, Painel Admin, Loja/Armazém, Diálogos de NPCs/Moradores,
      Chat, Menu de Ações, Dificuldade/DG, etc.) AUTOMATICAMENTE libera o mouse
      (exitPointerLock). O jogador NUNCA precisa apertar N ou M para ter o mouse!
   2. Ao fechar uma janela, se NÃO restar nenhuma outra janela aberta e o modo for
      Dragon Nest / Mira (NAV.mode === 'dn'), o cursor volta AUTOMATICAMENTE para a
      mira de combate (requestPointerLock).
   3. Se houver mais de uma janela aberta (ex: Inventário e Status lado a lado),
      o mouse permanece livre enquanto houver qualquer janela na tela.
   4. A tecla ESC fecha as janelas sequencialmente (uma a uma, da mais recente
      para a mais antiga).
   5. Pressionar ESC com a tela limpa desmarca o alvo atual (alvo L2 / Net.alvo).
   6. A tecla 'M' continua funcionando como alternador manual de modo ('dn' <-> 'click').
   ============================================================================= */

(function(){
  'use strict';

  var pilhaHistorico = [];
  var travandoMira = false;

  // Definição do catálogo universal de janelas do IS BLADE
  var JANELAS = [
    {
      id: 'chat',
      nome: 'Chat',
      prioridade: 100,
      el: function(){ return document.getElementById('chatBox'); },
      aberta: function(){
        var b = document.getElementById('chatBox');
        var c = document.getElementById('chatCampo');
        return !!((window.Chat && window.Chat.aberto) || (b && b.classList.contains('on')) || (document.activeElement && document.activeElement === c));
      },
      fechar: function(){
        if(window.Chat && typeof window.Chat.fecha === 'function'){
          window.Chat.fecha();
        } else {
          var b = document.getElementById('chatBox');
          if(b) b.classList.remove('on');
          var c = document.getElementById('chatCampo');
          if(c) c.blur();
        }
      }
    },
    {
      id: 'painel_morte',
      nome: 'Painel de Morte (Ressurreição / Voltar para Cidade)',
      prioridade: 98,
      el: function(){ return document.getElementById('painelMorte'); },
      aberta: function(){
        var el = document.getElementById('painelMorte');
        return !!(el && el.style.display !== 'none');
      },
      fechar: function(){
        var el = document.getElementById('painelMorte');
        if(el){
          var btn = el.querySelector('button');
          if(btn) btn.click();
        }
      }
    },
    {
      id: 'painel_admin',
      nome: 'Painel Admin (GM Power)',
      prioridade: 90,
      el: function(){ return document.getElementById('painelAdminModal'); },
      aberta: function(){
        var el = document.getElementById('painelAdminModal');
        return !!(el && el.style.display !== 'none' && el.style.display !== '');
      },
      fechar: function(){
        if(window.PainelAdmin && typeof window.PainelAdmin.fechar === 'function'){
          window.PainelAdmin.fechar();
        } else {
          var el = document.getElementById('painelAdminModal');
          if(el) el.style.display = 'none';
        }
      }
    },
    {
      id: 'painel_bots',
      nome: 'Painel Mestre de Bots PvP',
      prioridade: 85,
      el: function(){ return document.getElementById('painelBotsModal'); },
      aberta: function(){
        var el = document.getElementById('painelBotsModal');
        return !!(el && el.style.display !== 'none' && el.style.display !== '');
      },
      fechar: function(){
        if(window.PainelBots && typeof window.PainelBots.fechar === 'function'){
          window.PainelBots.fechar();
        } else {
          var el = document.getElementById('painelBotsModal');
          if(el) el.style.display = 'none';
        }
      }
    },
    {
      id: 'loja',
      nome: 'Loja / Armazém / Forja',
      prioridade: 80,
      el: function(){ return document.getElementById('lojaWin'); },
      aberta: function(){
        var el = document.getElementById('lojaWin');
        return !!((window.Loja && window.Loja.aberta && window.Loja.aberta()) || (el && el.style.display !== 'none' && el.style.display !== ''));
      },
      fechar: function(){
        if(window.Loja && typeof window.Loja.fechar === 'function'){
          window.Loja.fechar();
        } else {
          var el = document.getElementById('lojaWin');
          if(el) el.style.display = 'none';
        }
      }
    },
    {
      id: 'l2_dialog',
      nome: 'Diálogo de NPC',
      prioridade: 75,
      el: function(){ return document.getElementById('l2-npc-dialog'); },
      aberta: function(){
        var el = document.getElementById('l2-npc-dialog');
        return !!((window.L2Npcs && window.L2Npcs.isOpen && window.L2Npcs.isOpen()) || (el && el.classList.contains('active')));
      },
      fechar: function(){
        if(window.L2Npcs && typeof window.L2Npcs.closeDialog === 'function'){
          window.L2Npcs.closeDialog();
        } else {
          var el = document.getElementById('l2-npc-dialog');
          if(el) el.classList.remove('active');
        }
      }
    },
    {
      id: 'moradores',
      nome: 'Diálogo com Habitante',
      prioridade: 70,
      el: function(){ return document.getElementById('morConv'); },
      aberta: function(){
        var el = document.getElementById('morConv');
        return !!((window.Moradores && window.Moradores.aberta && window.Moradores.aberta()) || (el && el.style.display !== 'none' && el.style.display !== ''));
      },
      fechar: function(){
        if(window.Moradores && typeof window.Moradores.fecha === 'function'){
          window.Moradores.fecha();
        } else {
          var el = document.getElementById('morConv');
          if(el) el.style.display = 'none';
        }
      }
    },
    {
      id: 'net_ped',
      nome: 'Solicitação Duelo/Grupo',
      prioridade: 68,
      el: function(){ return document.getElementById('netPed'); },
      aberta: function(){
        var el = document.getElementById('netPed');
        return !!(el && el.style.display !== 'none' && el.style.display !== '');
      },
      fechar: function(){
        var noBtn = document.querySelector('#netPed .no');
        if(noBtn) noBtn.click();
        else {
          var el = document.getElementById('netPed');
          if(el) el.style.display = 'none';
        }
      }
    },
    {
      id: 'net_menu',
      nome: 'Menu de Ações (Rede/Party)',
      prioridade: 65,
      el: function(){ return document.getElementById('netMenu'); },
      aberta: function(){
        var el = document.getElementById('netMenu');
        return !!(el && el.style.display !== 'none' && el.style.display !== '');
      },
      fechar: function(){
        if(window.Net && typeof window.Net.alterna === 'function'){
          window.Net.alterna(false);
        } else {
          var el = document.getElementById('netMenu');
          if(el) el.style.display = 'none';
        }
      }
    },
    {
      id: 'dg_menu',
      nome: 'Menu de Dificuldade / Masmorras',
      prioridade: 60,
      el: function(){ return document.getElementById('diff'); },
      aberta: function(){
        var el = document.getElementById('diff');
        return !!((window.DG && window.DG.menu) || window.PORTAL_MENU || (el && el.classList.contains('open')));
      },
      fechar: function(){
        if(typeof window.closeDiff === 'function') window.closeDiff();
        if(typeof window.closePortalMenu === 'function') window.closePortalMenu();
        var el = document.getElementById('diff');
        if(el) el.classList.remove('open');
      }
    },
    {
      id: 'cfg',
      nome: 'Opções / Configurações',
      prioridade: 50,
      el: function(){ return document.getElementById('cfg'); },
      aberta: function(){
        var el = document.getElementById('cfg');
        return !!(el && (el.classList.contains('open') || (el.style.display !== 'none' && el.style.display !== '')));
      },
      fechar: function(){
        if(typeof window.toggleCfg === 'function') window.toggleCfg(false);
        else {
          var el = document.getElementById('cfg');
          if(el){ el.classList.remove('open'); el.style.display = 'none'; }
        }
      }
    },
    {
      id: 'skp',
      nome: 'Habilidades (Skills)',
      prioridade: 45,
      el: function(){ return document.getElementById('skp'); },
      aberta: function(){
        var el = document.getElementById('skp');
        return !!(window.skOpen || (el && el.classList.contains('open')));
      },
      fechar: function(){
        if(typeof window.toggleSk === 'function') window.toggleSk(false);
        else {
          var el = document.getElementById('skp');
          if(el) el.classList.remove('open');
        }
      }
    },
    {
      id: 'stp',
      nome: 'Status do Personagem (Character)',
      prioridade: 40,
      el: function(){ return document.getElementById('stp'); },
      aberta: function(){
        var el = document.getElementById('stp');
        return !!(el && el.classList.contains('on'));
      },
      fechar: function(){
        if(window.Status && typeof window.Status.toggle === 'function') window.Status.toggle(false);
        else {
          var el = document.getElementById('stp');
          if(el) el.classList.remove('on');
        }
      }
    },
    {
      id: 'inv',
      nome: 'Inventário',
      prioridade: 35,
      el: function(){ return document.getElementById('inv'); },
      aberta: function(){
        var el = document.getElementById('inv');
        return !!(window.invOpen || (el && el.classList.contains('open')));
      },
      fechar: function(){
        if(typeof window.toggleInv === 'function') window.toggleInv(false);
        else {
          var el = document.getElementById('inv');
          if(el) el.classList.remove('open');
        }
      }
    },
    {
      id: 'f2box',
      nome: 'Ajuste de Combate (F2)',
      prioridade: 30,
      el: function(){ return document.getElementById('f2box') || document.querySelector('.f2-box'); },
      aberta: function(){
        var el = document.getElementById('f2box') || document.querySelector('.f2-box');
        return !!(el && el.style.display !== 'none' && el.style.display !== '');
      },
      fechar: function(){
        var el = document.getElementById('f2box') || document.querySelector('.f2-box');
        if(el) el.style.display = 'none';
      }
    }
  ];

  // Adiciona ou reposiciona a janela no topo da pilha de histórico
  function tocar(id){
    var idx = pilhaHistorico.indexOf(id);
    if(idx >= 0) pilhaHistorico.splice(idx, 1);
    pilhaHistorico.push(id);
  }

  // Remove janela da pilha
  function removerPilha(id){
    var idx = pilhaHistorico.indexOf(id);
    if(idx >= 0) pilhaHistorico.splice(idx, 1);
  }

  // Obtém lista de janelas atualmente abertas no DOM
  function obterJanelasAbertas(){
    var abertas = [];
    for(var i = 0; i < JANELAS.length; i++){
      var j = JANELAS[i];
      try {
        if(j.aberta()){
          abertas.push(j);
        }
      } catch(e){}
    }
    return abertas;
  }

  // Verifica se há qualquer janela aberta
  function temJanelaAberta(){
    return obterJanelasAbertas().length > 0;
  }

  // Determina qual é a janela no topo (para fechar no ESC)
  function determinarJanelaTopo(){
    var abertas = obterJanelasAbertas();
    if(abertas.length === 0) return null;
    if(abertas.length === 1) return abertas[0];

    // 1. Se o foco está no chat, o chat tem prioridade absoluta
    var c = document.getElementById('chatCampo');
    if(document.activeElement && document.activeElement === c){
      for(var i = 0; i < abertas.length; i++){
        if(abertas[i].id === 'chat') return abertas[i];
      }
    }

    // 2. Busca na pilha de histórico da mais recente para a mais antiga
    for(var p = pilhaHistorico.length - 1; p >= 0; p--){
      var idH = pilhaHistorico[p];
      for(var a = 0; a < abertas.length; a++){
        if(abertas[a].id === idH) return abertas[a];
      }
    }

    // 3. Fallback: Ordena por z-index do elemento DOM, depois por prioridade estática
    abertas.sort(function(a, b){
      var elA = a.el ? a.el() : null;
      var elB = b.el ? b.el() : null;
      var zA = 0, zB = 0;
      if(elA){
        var stA = window.getComputedStyle ? window.getComputedStyle(elA) : null;
        zA = parseInt((stA && stA.zIndex) || elA.style.zIndex || 0, 10) || 0;
      }
      if(elB){
        var stB = window.getComputedStyle ? window.getComputedStyle(elB) : null;
        zB = parseInt((stB && stB.zIndex) || elB.style.zIndex || 0, 10) || 0;
      }
      if(zA !== zB) return zB - zA;
      return (b.prioridade || 0) - (a.prioridade || 0);
    });

    return abertas[0];
  }

  // Fecha a janela do topo
  function fecharTopo(){
    var topo = determinarJanelaTopo();
    if(!topo) return false;
    removerPilha(topo.id);
    try {
      topo.fechar();
    } catch(e){
      console.warn('[UIJanelas] Erro ao fechar janela:', topo.id, e);
    }
    return true;
  }

  // Fecha todas as janelas abertas
  function fecharTudo(){
    var abertas = obterJanelasAbertas();
    pilhaHistorico = [];
    for(var i = 0; i < abertas.length; i++){
      try {
        abertas[i].fechar();
      } catch(e){}
    }
    restaurarMira();
  }

  // Libera o cursor do mouse imediatamente
  function liberarMouse(){
    if(document.pointerLockElement){
      try {
        document.exitPointerLock();
      } catch(e){}
    }
  }

  // Restaura a mira de combate se estiver no modo 'dn' e não houver janelas abertas
  function restaurarMira(){
    if(travandoMira) return;
    if(!window.NAV || window.NAV.mode !== 'dn') return;
    if(window.MOUSE && window.MOUSE.touch) return;
    if(temJanelaAberta()) return;

    var gc = document.getElementById('gest');
    if(!gc) return;

    if(document.pointerLockElement !== gc){
      try {
        travandoMira = true;
        var req = gc.requestPointerLock();
        if(req && typeof req.catch === 'function'){
          req.catch(function(){});
        }
      } catch(e){}
      finally {
        setTimeout(function(){ travandoMira = false; }, 60);
      }
    }
  }

  // Notificação universal de mudança de estado das janelas
  function notificar(origemId, aberta){
    if(origemId){
      if(aberta) tocar(origemId);
      else removerPilha(origemId);
    }

    var abertas = obterJanelasAbertas();
    if(abertas.length > 0){
      liberarMouse();
    } else {
      restaurarMira();
    }
  }

  // Verifica se há alvo selecionado no jogo
  function temAlvoSelecionado(){
    if(window.Net && window.Net.alvo && window.Net.alvo !== 0) return true;
    var mobAlvo = document.getElementById('alvoMob');
    if(mobAlvo && mobAlvo.style.display !== 'none' && mobAlvo.style.display !== '') return true;
    var netAlvo = document.getElementById('netAlvo');
    if(netAlvo && netAlvo.style.display !== 'none' && netAlvo.style.display !== '') return true;
    return false;
  }

  // Limpa o alvo selecionado
  function limparAlvo(){
    if(window.AlvoL2 && typeof window.AlvoL2.fechar === 'function'){
      window.AlvoL2.fechar();
    }
    if(window.Net && typeof window.Net.selecionar === 'function'){
      window.Net.selecionar(0);
    }
    if(typeof window.tmark !== 'undefined' && window.tmark){
      window.tmark.visible = false;
    }
    var mobAlvo = document.getElementById('alvoMob');
    if(mobAlvo) mobAlvo.style.display = 'none';
    var netAlvo = document.getElementById('netAlvo');
    if(netAlvo) netAlvo.style.display = 'none';
  }

  // Monitoramento de cliques para detectar foco de janela ou clique no canvas
  document.addEventListener('pointerdown', function(e){
    var target = e.target;
    if(!target) return;

    // Se clicou em algum elemento de janela, coloca ela no topo do histórico
    for(var i = 0; i < JANELAS.length; i++){
      var j = JANELAS[i];
      var el = j.el ? j.el() : document.getElementById(j.id);
      if(el && el.contains(target)){
        tocar(j.id);
        return;
      }
    }

    // Se clicou no canvas do jogo (#gest) e não há janelas abertas, garante a mira
    var gc = document.getElementById('gest');
    if((target === gc || target === document.body) && !temJanelaAberta()){
      if(window.NAV && window.NAV.mode === 'dn'){
        restaurarMira();
      }
    }
  }, true);

  // Manipulador Global de ESC (Fase de Captura = Prioridade Máxima)
  window.addEventListener('keydown', function(e){
    if(e.key === 'Escape' || e.code === 'Escape'){
      // 1. Se há alguma janela aberta: fecha a janela do topo
      if(temJanelaAberta()){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        fecharTopo();

        // Se após fechar essa janela não restou nenhuma outra, volta para a mira
        if(!temJanelaAberta()){
          restaurarMira();
        }
        return;
      }

      // 2. Se não há janelas abertas, mas há um alvo selecionado: desmarca o alvo!
      if(temAlvoSelecionado()){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        limparAlvo();
        restaurarMira();
        return;
      }

      // 3. Se não há janelas nem alvo, mas está no modo mira e o ponteiro estava solto: reengaja a mira
      if(window.NAV && window.NAV.mode === 'dn' && !window.NAV.locked){
        restaurarMira();
      }
    }
  }, true);

  // MutationObserver contínuo para detectar abertura de qualquer modal/janela dinamicamente
  var observerTimeout = null;
  function processarMutacoes(){
    var abertas = obterJanelasAbertas();
    if(abertas.length > 0){
      // Se há janela aberta e o mouse está travado, libera imediatamente
      if(document.pointerLockElement){
        liberarMouse();
      }
    }
  }

  var observer = new MutationObserver(function(){
    if(observerTimeout) clearTimeout(observerTimeout);
    observerTimeout = setTimeout(processarMutacoes, 20);
  });

  function iniciarObservador(){
    if(!document.body) return;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'display']
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', iniciarObservador);
  } else {
    iniciarObservador();
  }

  // API Global Exposta
  window.UIJanelas = {
    registrar: function(cfg){ JANELAS.push(cfg); },
    obterJanelasAbertas: obterJanelasAbertas,
    temJanelaAberta: temJanelaAberta,
    determinarJanelaTopo: determinarJanelaTopo,
    fecharTopo: fecharTopo,
    fecharTudo: fecharTudo,
    liberarMouse: liberarMouse,
    restaurarMira: restaurarMira,
    notificar: notificar,
    tocar: tocar,
    temAlvoSelecionado: temAlvoSelecionado,
    limparAlvo: limparAlvo
  };

})();
