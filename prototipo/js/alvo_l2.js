/* Janela do ALVO estilo Lineage 2 para mobs e chefe (jogadores ja tem a janela do net.js, #netAlvo, no mesmo lugar).
   Nome colorido pela diferenca de nivel (como no L2): cinza = muito abaixo, verde = abaixo, branco = parelho, amarelo = acima, vermelho = muito acima.
   Uso: AlvoL2.atualiza({ nome, nv, hp, max, meuNv }) ou AlvoL2.atualiza(null) para esconder. A pagina chama com ritmo (ex.: 10x por segundo). */
(function(){
  var A = window.AlvoL2 = {}, el = null, ult = '';
  function monta(){
    if(el) return;
    var st = document.createElement('style');
    st.textContent = '#alvoMob{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:63;display:none;min-width:220px;max-width:80vw;padding:7px 10px;border-radius:10px;background:rgba(8,12,24,.86);' +
      'box-shadow:inset 0 0 0 1px rgba(255,140,110,.4),0 6px 20px rgba(0,0,0,.6);color:#e8f3ff;font:600 12px system-ui,sans-serif;pointer-events:none;text-shadow:0 1px 2px #000}' +
      '#alvoMob .t{display:flex;justify-content:space-between;gap:12px;align-items:baseline}#alvoMob small{color:#9fb0cc;font-weight:600}' +
      '#alvoMob .hp{height:7px;margin-top:5px;border-radius:4px;background:#2a0d10;overflow:hidden}#alvoMob .hp b{display:block;height:100%;background:linear-gradient(#ff5a4e,#b3201a);transition:width .15s}';
    document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'alvoMob'; document.body.appendChild(el);
  }
  function cor(nv, meu){
    if(!nv || !meu) return '#ffffff';
    var d = nv - meu;
    return d <= -9 ? '#9a9a9a' : d <= -3 ? '#7dff8a' : d < 3 ? '#ffffff' : d < 9 ? '#ffd84a' : '#ff5a4e';
  }
  A.atualiza = function(a){
    if(!document.body) return; monta();
    if(!a){ if(ult){ ult = ''; el.style.display = 'none'; } return; }
    var k = Math.max(0, Math.min(1, a.hp / (a.max || 1)));
    var h = '<div class="t"><b style="color:' + cor(a.nv, a.meuNv) + '">' + String(a.nome || '?').replace(/[<>&]/g, '') + '</b><small>' + (a.nv ? 'Nv ' + a.nv + ' · ' : '') + Math.ceil(k * 100) + '%</small></div><div class="hp"><b style="width:' + (k * 100).toFixed(1) + '%"></b></div>';
    if(h !== ult){ ult = h; el.innerHTML = h; } el.style.display = 'block';
  };
})();
