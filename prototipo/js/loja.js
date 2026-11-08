/* Loja dos NPCs (Galladucci, Mammon) e consumiveis (data/loja.json). Tudo passa pelo servidor (servidor/inventario.js): aqui so se mostra e se pede.
   Uso na pagina:  Loja.init({ estado: function(){ return { srv, adena, consum: {id: qtd}, bolsa: [{uid, nome, rar, cor, raridade}] }; },
                               comprar: function(loja, id, qtd){}, vender: function(uid){}, usar: function(id){} });
   Loja.abrir('galladucci') abre a janela; Loja.atualiza() redesenha (chamar quando o inventario muda).
   Tecla H = Pocao de Vida (PC); no celular aparece o botao POCAO com a quantidade. */
(function(){
  var L = window.Loja = {}, D = null, op = {}, el = null, lojaAtual = '', aba = 'comprar', btn = null;
  fetch('data/loja.json?v=' + Date.now().toString().slice(0, -5)).then(function(r){ return r.json(); }).then(function(j){ D = j; L.atualiza(); }).catch(function(e){ console.warn('Loja: sem data/loja.json', e); });
  L.dados = function(){ return D; };
  L.nome = function(id){ return (D && D.consumiveis[id] && D.consumiveis[id].nome) || id; };
  function esc(t){ return String(t).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toque(){ return !!(window.QUAL && QUAL.touch); }
  function digitando(){ var a = document.activeElement; return !!(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable)) || !!(window.Chat && Chat.aberto); }
  function monta(){
    if(el) return;
    var st = document.createElement('style');
    st.textContent = '#lojaWin{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,94vw);max-height:84vh;overflow:auto;z-index:10001;display:none;padding:12px 14px;border-radius:10px;' +
      'background:linear-gradient(rgba(16,26,48,.98),rgba(6,10,20,.98));box-shadow:inset 0 0 0 2px #5a7ea6,0 0 30px rgba(0,0,0,.8);color:#e4edf8;font:13px system-ui,sans-serif}' +
      '#lojaWin .hd{display:flex;align-items:center;gap:10px;margin-bottom:8px}#lojaWin .hd b{letter-spacing:.15em}#lojaWin .ad{margin-left:auto;color:#f5c451;font-weight:700}' +
      '#lojaWin button{pointer-events:auto;cursor:pointer;font:inherit;font-weight:700;color:#e8f0ff;background:#16223d;border:1px solid #2b3a63;border-radius:6px;padding:6px 10px}#lojaWin button.on{background:#2b3a63}' +
      '#lojaWin .ln{display:flex;align-items:center;gap:8px;padding:7px 4px;border-bottom:1px solid rgba(90,126,166,.25)}#lojaWin .ln .n{flex:1}#lojaWin .ln small{display:block;color:#9fb0cc}#lojaWin .pr{color:#f5c451;min-width:70px;text-align:right}' +
      '#lojaWin .msg{min-height:16px;margin-top:6px;color:#9fb0cc}#lojaPocao{position:fixed;left:84px;top:138px;z-index:61;pointer-events:auto;font:700 11px system-ui,sans-serif;color:#d8ffe2;background:rgba(10,30,20,.78);border:1px solid #2f7a4a;border-radius:6px;padding:6px 10px}';
    document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'lojaWin'; document.body.appendChild(el);
    ['keydown', 'keyup', 'keypress'].forEach(function(t){ el.addEventListener(t, function(e){ e.stopPropagation(); if(t === 'keydown' && e.key === 'Escape') L.fechar(); }); });
  }
  function desenha(){
    if(!el || el.style.display === 'none') return;
    var s = op.estado ? op.estado() : {}, h = '<div class="hd"><b>' + (lojaAtual === 'mammon' ? 'MAMMON' : 'GALLADUCCI') + '</b><span class="ad">Adena: ' + ((s.adena | 0).toLocaleString('pt-BR')) + '</span><button type="button" data-x="1">Fechar</button></div>' +
      '<div style="display:flex;gap:6px;margin-bottom:6px"><button type="button" data-aba="comprar" class="' + (aba === 'comprar' ? 'on' : '') + '">Comprar</button><button type="button" data-aba="vender" class="' + (aba === 'vender' ? 'on' : '') + '">Vender</button></div>';
    if(!s.srv) h += '<div class="msg">A loja só funciona conectado ao servidor.</div>';
    else if(!D) h += '<div class="msg">Carregando...</div>';
    else if(aba === 'comprar'){
      (D.lojas[lojaAtual] || []).forEach(function(id){
        var c = D.consumiveis[id]; if(!c) return; var tem = (s.consum && s.consum[id]) | 0;
        h += '<div class="ln"><div class="n"><b>' + esc(c.nome) + '</b> <small>' + esc(c.desc || '') + ' · você tem ' + tem + '</small></div><span class="pr">' + c.preco + ' A</span>' +
          '<button type="button" data-c="' + id + '" data-q="1">x1</button><button type="button" data-c="' + id + '" data-q="10">x10</button></div>';
      });
    } else {
      var b = s.bolsa || [];
      if(!b.length) h += '<div class="msg">Nada para vender (o que está equipado não aparece).</div>';
      b.forEach(function(it){ var v = (D.venda && D.venda[it.rar]) || 1; h += '<div class="ln"><div class="n"><b style="color:' + esc(it.cor || '#fff') + '">' + esc(it.nome) + '</b> <small>' + esc(it.raridade || it.rar) + '</small></div><span class="pr">' + v + ' A</span><button type="button" data-v="' + esc(it.uid) + '">Vender</button></div>'; });
    }
    h += '<div class="msg" id="lojaMsg">' + esc(L._msg || '') + '</div>';
    el.innerHTML = h;
    el.querySelector('[data-x]').onclick = L.fechar;
    [].forEach.call(el.querySelectorAll('[data-aba]'), function(x){ x.onclick = function(){ aba = x.getAttribute('data-aba'); L._msg = ''; desenha(); }; });
    [].forEach.call(el.querySelectorAll('[data-c]'), function(x){ x.onclick = function(){ if(op.comprar) op.comprar(lojaAtual, x.getAttribute('data-c'), +x.getAttribute('data-q')); }; });
    [].forEach.call(el.querySelectorAll('[data-v]'), function(x){ x.onclick = function(){ if(op.vender) op.vender(x.getAttribute('data-v')); }; });
  }
  function botao(){
    if(!toque() || !document.body) return;
    var s = op.estado ? op.estado() : null, n = (s && s.consum && s.consum.pocao_vida) | 0;
    if(!btn){ btn = document.createElement('button'); btn.id = 'lojaPocao'; btn.type = 'button'; btn.addEventListener('click', function(e){ e.stopPropagation(); if(op.usar) op.usar('pocao_vida'); }); document.body.appendChild(btn); }
    btn.textContent = 'POÇÃO ' + n; btn.style.display = (s && s.srv) ? 'block' : 'none';
  }
  L.init = function(o){
    op = o || {};
    window.addEventListener('keydown', function(e){ if((e.key === 'h' || e.key === 'H') && !e.repeat && !digitando() && op.usar){ op.usar('pocao_vida'); } });
    if(document.body) botao(); else document.addEventListener('DOMContentLoaded', botao);
  };
  L.abrir = function(loja){ monta(); lojaAtual = loja || 'galladucci'; aba = 'comprar'; L._msg = ''; el.style.display = 'block'; try { if(document.pointerLockElement) document.exitPointerLock(); } catch(e){} desenha(); };
  L.fechar = function(){ if(el) el.style.display = 'none'; };
  L.aberta = function(){ return !!(el && el.style.display !== 'none'); };
  L.aviso = function(t){ L._msg = t || ''; var m = el && el.querySelector('#lojaMsg'); if(m) m.textContent = L._msg; };
  L.atualiza = function(){ desenha(); botao(); };
})();
