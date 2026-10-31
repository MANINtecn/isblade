/* Conta do jogador (cadastro rapido) + salvamento dos personagens no servidor. Script comum (nao modulo): vale na selecao, cidade e arena.
   - Entrar/criar: usuario + senha, sem e-mail. "Jogar sem conta" continua valendo (dados so neste aparelho).
   - Sincroniza copias das chaves do localStorage (personagens, inventario, skills, maestria, barra...) com o servidor (rotas /api/* do servidor de jogo).
   - Na selecao: puxa os dados da conta ANTES da pagina ler os personagens (pedido sincrono curto) e pede login se nao houver conta nem modo convidado.
   Uso:  <script src="js/conta.js"></script>   e, na selecao,   <script>Conta.exigir();</script>  */
(function(){
  var TOK = 'isblade.conta_token', USR = 'isblade.conta_user', REV = 'isblade.conta_rev', SUJO = 'isblade.conta_sujo', CONV = 'isblade.conta_convidado', BKP = 'isblade.conta_bkp_local';
  var ls = window.localStorage, setI = ls.setItem.bind(ls), remI = ls.removeItem.bind(ls), getI = ls.getItem.bind(ls);
  var timer = null, enviando = false;
  var RE = /^(isblade_characters|isblade\.(inv|skillSel|mastery|dgbest|custom_slots_v5|hotbar_keys|hotbar_init)\.[A-Za-z0-9_-]+)$/;     /* so o que e progresso do personagem; volume, graficos etc. ficam no aparelho */

  function g(k){ try { return getI(k); } catch(e){ return null; } }
  function s(k, v){ try { setI(k, v); } catch(e){} }
  function base(){
    try { var v = g('isblade.srv'); if(v){ var m = /^wss?:\/\/([^\/]+)/.exec(v); if(m) return (v.indexOf('wss') === 0 ? 'https://' : 'http://') + m[1]; } } catch(e){}
    if(/^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)) return location.origin;
    return 'https://play.isblade.tecx.pro';
  }
  function chavesLocais(){ var o = {}; try { for(var i = 0; i < ls.length; i++){ var k = ls.key(i); if(RE.test(k)) o[k] = ls.getItem(k); } } catch(e){} return o; }
  function aplica(ch, rev){
    var atuais = chavesLocais(), k;
    try { s(BKP, JSON.stringify(atuais)); } catch(e){}
    for(k in atuais) if(!(k in ch)) remI(k);
    for(k in ch) if(RE.test(k)) setI(k, ch[k]);
    s(REV, String(rev)); remI(SUJO);
  }
  function logado(){ return !!g(TOK); }

  /* ---- pedidos ---- */
  function pedeSync(metodo, caminho, corpo, tokenFixo){
    var x = new XMLHttpRequest(); x.open(metodo, base() + caminho, false);      /* sincrono: sem timeout (so usado ao sair da conta) */
    try {
      x.setRequestHeader('content-type', 'application/json'); var t = tokenFixo || g(TOK); if(t) x.setRequestHeader('authorization', 'Bearer ' + t);
      x.send(corpo ? JSON.stringify(corpo) : null);
      var j = null; try { j = JSON.parse(x.responseText); } catch(e){}
      return { cod: x.status, j: j };
    } catch(e){ return { cod: 0, j: null }; }
  }
  function pedeAsync(metodo, caminho, corpo, cb, keep){
    var t = g(TOK), opt = { method: metodo, headers: { 'content-type': 'application/json' }, keepalive: !!keep };
    if(t) opt.headers.authorization = 'Bearer ' + t; if(corpo) opt.body = JSON.stringify(corpo);
    fetch(base() + caminho, opt).then(function(r){ return r.json().then(function(j){ cb(r.status, j); }, function(){ cb(r.status, null); }); }, function(){ cb(0, null); });
  }

  /* ---- sincronizacao ---- */
  function puxar(){                                               /* traz os dados da conta (painel/carregamento); devolve uma Promise que sempre resolve */
    return new Promise(function(ok){
      if(!logado()) return ok();
      var ctl = ('AbortController' in window) ? new AbortController() : null, t = setTimeout(function(){ if(ctl) ctl.abort(); ok(); }, 5000), t0 = g(TOK);
      fetch(base() + '/api/dados', { headers: { authorization: 'Bearer ' + t0 }, cache: 'no-store', signal: ctl ? ctl.signal : undefined }).then(function(r){
        return r.json().then(function(j){ return { cod: r.status, j: j }; });
      }).then(function(r){
        clearTimeout(t);
        if(r.cod === 401){ remI(TOK); remI(USR); return ok(); }
        if(r.cod !== 200 || !r.j) return ok();
        var remoto = r.j.chaves || {}, temRemoto = Object.keys(remoto).length > 0, rev = +g(REV) || 0;
        if(!temRemoto){ if(Object.keys(chavesLocais()).length) s(SUJO, '1'); return ok(); }                 /* conta nova: o que existe aqui sobe para a conta */
        if(g(SUJO) === '1' && r.j.rev <= rev) return ok();                                                    /* mudancas deste aparelho ainda nao enviadas */
        if(r.j.rev !== rev || !Object.keys(chavesLocais()).length) aplica(remoto, r.j.rev);
        ok();
      }).catch(function(){ clearTimeout(t); ok(); });                                                          /* servidor fora do ar: segue com o que ha no aparelho */
    });
  }
  function enviar(keep){
    if(!logado() || enviando || g(SUJO) !== '1') return; enviando = true;
    pedeAsync('PUT', '/api/dados', { chaves: chavesLocais() }, function(cod, j){
      enviando = false;
      if(cod === 200 && j){ s(REV, String(j.rev)); remI(SUJO); }
      else if(cod === 401){ remI(TOK); remI(USR); }
    }, keep);
  }
  function agenda(){ if(!logado()) return; s(SUJO, '1'); clearTimeout(timer); timer = setTimeout(function(){ enviar(false); }, 2500); }
  try {                                                           /* qualquer gravacao de progresso agenda o envio (no prototipo do Storage: atribuir em localStorage criaria uma chave) */
    var sp = Storage.prototype, oSet = sp.setItem, oRem = sp.removeItem;
    sp.setItem = function(k, v){ oSet.call(this, k, v); if(this === ls && RE.test(k)) agenda(); };
    sp.removeItem = function(k){ oRem.call(this, k); if(this === ls && RE.test(k)) agenda(); };
  } catch(e){}
  document.addEventListener('visibilitychange', function(){ if(document.visibilityState === 'hidden' && g(SUJO) === '1'){ var n = JSON.stringify(chavesLocais()).length; enviar(n < 60000); } });
  window.addEventListener('pagehide', function(){ if(g(SUJO) === '1') enviar(JSON.stringify(chavesLocais()).length < 60000); });

  /* ---- tela de entrada ---- */
  var CSS = '#cnt{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(3,6,17,.94);font-family:system-ui,Segoe UI,sans-serif}' +
    '#cnt .cx{width:min(380px,100%);background:#0b1220;border:1px solid #6b5a2b;border-radius:12px;padding:22px 20px;color:#e8f0ff;box-shadow:0 0 40px rgba(245,196,81,.15)}' +
    '#cnt h2{margin:0 0 4px;font-size:22px;color:#f5c451;letter-spacing:.12em;text-align:center}#cnt p{margin:0 0 16px;font-size:13px;color:#9fb0d0;text-align:center}' +
    '#cnt label{display:block;font-size:12px;color:#9fb0d0;margin:10px 0 4px}' +
    '#cnt input{width:100%;box-sizing:border-box;padding:12px;font-size:16px;color:#fff;background:#050a18;border:1px solid #2b3a63;border-radius:8px;outline:none}#cnt input:focus{border-color:#f5c451}' +
    '#cnt .ln{display:flex;gap:8px;align-items:center}#cnt .ln input{flex:1}#cnt .ver{padding:10px;background:#12203c;border:1px solid #2b3a63;border-radius:8px;color:#9fb0d0;cursor:pointer;font-size:13px}' +
    '#cnt .bt{display:flex;gap:10px;margin-top:16px}#cnt button.b{flex:1;padding:13px 8px;font-size:15px;font-weight:700;border-radius:8px;cursor:pointer;border:1px solid #6b5a2b}' +
    '#cnt .p{background:linear-gradient(#f5c451,#c8932a);color:#1a1205}#cnt .s{background:#12203c;color:#f5c451}' +
    '#cnt .er{min-height:18px;margin-top:10px;font-size:13px;color:#ff8a8a;text-align:center}#cnt .cv{display:block;margin:14px auto 0;background:none;border:0;color:#8aa0cc;font-size:13px;text-decoration:underline;cursor:pointer}' +
    '#cnt.cnt-inline{position:static;z-index:auto;background:none;padding:0;display:block}#cnt.cnt-inline .cx{margin:0 auto}' +
    '#cntchip{position:fixed;left:10px;bottom:10px;z-index:9000;padding:6px 10px;font:600 12px system-ui,sans-serif;color:#cfe0ff;background:rgba(5,10,24,.85);border:1px solid #2b3a63;border-radius:999px;cursor:pointer}';
  function el(h){ var d = document.createElement('div'); d.innerHTML = h; return d.firstChild; }
  function estilo(){ if(document.getElementById('cntcss')) return; var st = document.createElement('style'); st.id = 'cntcss'; st.textContent = CSS; document.head.appendChild(st); }

  function telaLogin(opt){
    opt = opt || {}; estilo();
    var o = el('<div id="cnt"><div class="cx"><h2>IS BLADE</h2><p>Crie sua conta em 10 segundos: só usuário e senha.</p>' +
      '<label>Usuário</label><input id="cu" autocomplete="username" autocapitalize="off" spellcheck="false" maxlength="16" placeholder="ex.: guerreiro_01">' +
      '<label>Senha</label><div class="ln"><input id="cs" type="password" autocomplete="current-password" maxlength="64" placeholder="mínimo 6 caracteres"><button type="button" class="ver" id="cv">ver</button></div>' +
      '<div class="er" id="ce"></div><div class="bt"><button class="b s" id="cen" type="button">Entrar</button><button class="b p" id="ccr" type="button">Criar conta</button></div>' +
      '<button class="cv" id="ccv" type="button">Jogar sem conta (salva só neste aparelho)</button></div></div>');
    if(opt.host){ o.className = 'cnt-inline'; opt.host.appendChild(o); } else document.body.appendChild(o);
    var u = o.querySelector('#cu'), p = o.querySelector('#cs'), e = o.querySelector('#ce'), ocupado = false;
    o.querySelector('#cv').onclick = function(){ p.type = p.type === 'password' ? 'text' : 'password'; this.textContent = p.type === 'password' ? 'ver' : 'ocultar'; };
    function vai(acao){
      if(ocupado) return; var user = u.value.trim().toLowerCase(), senha = p.value;
      if(!/^[a-z0-9_]{3,16}$/.test(user)){ e.textContent = 'Usuário: 3 a 16 letras minúsculas, números ou _'; return; }
      if(senha.length < 6){ e.textContent = 'A senha precisa de pelo menos 6 caracteres.'; return; }
      ocupado = true; e.style.color = '#9fb0d0'; e.textContent = acao === 'criar' ? 'Criando...' : 'Entrando...';
      var t = new XMLHttpRequest(); t.open('POST', base() + '/api/conta/' + acao); t.timeout = 12000; t.setRequestHeader('content-type', 'application/json');
      t.onload = function(){
        ocupado = false; var j = null; try { j = JSON.parse(t.responseText); } catch(x){}
        if(t.status === 200 && j && j.token){
          s(TOK, j.token); s(USR, j.user); remI(CONV);
          var ch = j.chaves || {};
          if(Object.keys(ch).length) aplica(ch, j.rev); else { s(REV, String(j.rev || 0)); if(Object.keys(chavesLocais()).length) s(SUJO, '1'); }
          if(g(SUJO) === '1') enviar(false);
          if(opt.depois) location.href = opt.depois; else location.reload();
        } else { e.style.color = '#ff8a8a'; e.textContent = (j && j.erro) || 'Não consegui falar com o servidor. Tente de novo.'; }
      };
      t.onerror = t.ontimeout = function(){ ocupado = false; e.style.color = '#ff8a8a'; e.textContent = 'Servidor fora do ar no momento. Você pode jogar sem conta e entrar depois.'; };
      t.send(JSON.stringify({ user: user, senha: senha }));
    }
    o.querySelector('#cen').onclick = function(){ vai('entrar'); }; o.querySelector('#ccr').onclick = function(){ vai('criar'); };
    p.addEventListener('keydown', function(ev){ if(ev.key === 'Enter') vai('entrar'); });
    o.querySelector('#ccv').onclick = function(){ s(CONV, '1'); if(opt.convidado) location.href = opt.convidado; else { o.remove(); chip(); } };
    setTimeout(function(){ try { u.focus(); } catch(x){} }, 50);
  }
  function chip(){
    estilo(); if(document.getElementById('cntchip')) return;
    var c = el('<div id="cntchip"></div>'); c.textContent = logado() ? ('👤 ' + (g(USR) || 'conta') + ' · sair') : '👤 entrar / criar conta';
    c.onclick = function(){ if(logado()) sair(); else { remI(CONV); c.remove(); telaLogin(); } };
    document.body.appendChild(c);
  }
  function sair(){
    if(!confirm('Sair da conta? Seus personagens ficam salvos nela e somem deste aparelho.')) return;
    if(g(SUJO) === '1') pedeSync('PUT', '/api/dados', { chaves: chavesLocais() });
    pedeSync('POST', '/api/conta/sair', {});
    var ch = chavesLocais(); for(var k in ch) remI(k);
    remI(TOK); remI(USR); remI(REV); remI(SUJO); remI('isblade_active_character_id'); location.reload();
  }
  function quando(f){ if(document.body) f(); else document.addEventListener('DOMContentLoaded', f); }

  window.Conta = {
    logado: logado, usuario: function(){ return g(USR); }, sair: sair, enviar: enviar,
    exigir: function(){ if(!logado() && g(CONV) !== '1'){ location.replace('login.html'); return; } quando(chip); },
    telaLogin: telaLogin, convidado: function(){ return g(CONV) === '1'; }, puxar: puxar,
    chip: function(){ quando(chip); }
  };
})();
