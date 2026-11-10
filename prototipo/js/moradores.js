/* Moradores de Talking Island (09/11/2026): o servidor (servidor/moradores.js) decide onde cada um esta e o que faz; aqui so se desenha,
   com o modelo L2 e animacao (idle/andar), etiqueta (nome + profissao), balao de fala, e a conversa (E / botao FALAR no celular).
   Uso (cidade.html): Moradores.init({ THREE, scene, camera(), loadL2(url, cb), getS(), chao(x, z), enviar(n, texto) });
   mensagens do servidor (net.js): Moradores.info(lista) · Moradores.snap(m) · Moradores.fala(n, texto) · Moradores.resposta(n, texto)
   por quadro: Moradores.tick(dt) · tecla E: Moradores.interage() (true = tratou) · Moradores.perto() (aviso de falar ativo) */
(function(){
  var M = window.Moradores = {}, ctx = null, T = null, L = {}, INFO = {}, perto = null, conv = null, el = null, carregando = {};
  var RAIO_FALA = 3.6;
  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  M.init = function(o){ ctx = o; T = o.THREE; };
  M.info = function(l){ (l || []).forEach(function(i){ INFO[i.n] = i; }); };
  function etiqueta(i){
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; var g = cv.getContext('2d');
    g.font = 'bold 26px system-ui,sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.85)'; g.fillStyle = '#ffe6a8'; g.strokeText(i.nome, 128, 28); g.fillText(i.nome, 128, 28);
    g.font = '18px system-ui,sans-serif'; g.fillStyle = '#9fd0ff'; g.strokeText(i.prof, 128, 54); g.fillText(i.prof, 128, 54);
    var sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), depthTest: false, transparent: true })); sp.scale.set(2.3, .58, 1); sp.position.y = 2.75; sp.renderOrder = 998; return sp;
  }
  function balao(e, txt){
    if(e.bal){ e.grp.remove(e.bal); e.bal.material.map.dispose(); e.bal.material.dispose(); e.bal = null; }
    var pal = String(txt).split(' '), linhas = [], l = ''; pal.forEach(function(p){ if((l + ' ' + p).trim().length > 30){ linhas.push(l.trim()); l = p; } else l += ' ' + p; }); if(l.trim()) linhas.push(l.trim()); linhas = linhas.slice(0, 4);
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 40 + linhas.length * 40; var g = cv.getContext('2d');
    g.fillStyle = 'rgba(8,12,24,.86)'; g.strokeStyle = '#ffd166'; g.lineWidth = 3;                                 /* balao retangular com cantos cortados (sem redondo) */
    var w = cv.width, h = cv.height - 12, c = 12; g.beginPath(); g.moveTo(c, 0); g.lineTo(w - c, 0); g.lineTo(w, c); g.lineTo(w, h - c); g.lineTo(w - c, h); g.lineTo(w / 2 + 14, h); g.lineTo(w / 2, h + 12); g.lineTo(w / 2 - 14, h); g.lineTo(c, h); g.lineTo(0, h - c); g.lineTo(0, c); g.closePath(); g.fill(); g.stroke();
    g.font = '24px system-ui,sans-serif'; g.fillStyle = '#ffffff'; g.textAlign = 'center'; linhas.forEach(function(s, i){ g.fillText(s, w / 2, 34 + i * 40); });
    var sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(cv), depthTest: false, transparent: true })); var k = 3.6 / w * cv.width; sp.scale.set(k, k * cv.height / cv.width, 1); sp.position.y = 3.35 + sp.scale.y / 2; sp.renderOrder = 999;
    e.grp.add(sp); e.bal = sp; e.balT = 6 + linhas.length * 1.2;
  }
  function cria(n){
    var i = INFO[n]; if(!i || L[n] || carregando[n]) return; carregando[n] = 1;
    var e = { n: n, i: i, grp: new T.Group(), x: 0, z: 0, tx: 0, tz: 0, f: 0, tf: 0, a: 'idle', rig: null, mix: null, act: {}, cur: '', bal: null, balT: 0, ok: false };
    e.grp.add(etiqueta(i)); ctx.scene.add(e.grp); L[n] = e;
    ctx.loadL2('assets/personagens/' + i.modelo, function(r){
      e.rig = r; e.grp.add(r.root); e.mix = new T.AnimationMixer(r.root); toca(e, 'idle');
      ['swd', 'swd2h', 'swd1h', 'shd', 'stf', 'sword'].forEach(function(k){ if(r[k] && r[k].visible !== undefined) r[k].visible = false; });      /* morador anda desarmado */
    });
  }
  function toca(e, nome){
    if(!e.mix || e.cur === nome) return; var cl = e.rig.clips && (e.rig.clips[nome === 'run' ? 'run_hand' : (nome === 'walk' ? 'walk_hand' : 'idle_hand')] || e.rig.clips[nome === 'run' ? 'walk_hand' : nome]); if(!cl) return;
    var a = e.act[nome] || (e.act[nome] = e.mix.clipAction(cl)); var antes = e.act[e.cur]; a.reset().setEffectiveWeight(1).fadeIn(.25).play(); if(antes) antes.fadeOut(.25); e.cur = nome;
  }
  M.snap = function(lista){
    lista.forEach(function(s){ var n = s[0]; if(!L[n]){ cria(n); if(!L[n]) return; var e0 = L[n]; e0.x = e0.tx = s[1]; e0.z = e0.tz = s[2]; e0.f = e0.tf = s[3]; }
      var e = L[n]; e.tx = s[1]; e.tz = s[2]; e.tf = s[3]; e.a = s[4]; e.ok = true; });
  };
  M.fala = function(n, txt){ var e = L[n]; if(!e) return; var S = ctx.getS(); if(Math.hypot(e.x - S.px, e.z - S.pz) < 40) balao(e, txt); };
  M.resposta = function(n, txt){ var e = L[n]; if(e) balao(e, txt); if(conv && conv.n === n){ conv.log.push({ q: e ? e.i.nome : '?', m: txt }); conv.espera = false; desenha(); } };
  function angLerp(a, b, k){ var d = b - a; while(d > Math.PI) d -= 6.2832; while(d < -Math.PI) d += 6.2832; return a + d * k; }
  M.tick = function(dt){
    if(!ctx) return; var S = ctx.getS(), melhor = null, bd = RAIO_FALA;
    for(var n in L){ var e = L[n]; if(!e.ok) continue; var k = Math.min(1, dt * 6);
      e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; e.f = angLerp(e.f, e.tf, Math.min(1, dt * 8));
      e.grp.position.set(e.x, ctx.chao ? ctx.chao(e.x, e.z) : 0, e.z); e.grp.rotation.y = e.f;
      if(e.mix){ toca(e, e.a === 'run' ? 'run' : (e.a === 'walk' ? 'walk' : 'idle')); e.mix.update(dt); }
      if(e.bal){ e.balT -= dt; if(e.balT <= 0){ e.grp.remove(e.bal); e.bal.material.map.dispose(); e.bal.material.dispose(); e.bal = null; } }
      var d = Math.hypot(e.x - S.px, e.z - S.pz); if(d < bd){ bd = d; melhor = e; } }
    perto = (melhor && !(window.L2Npcs && L2Npcs.perto && L2Npcs.perto()) && !conv) ? melhor : null;
    if(perto){ var pr = document.getElementById('portal-prompt'); if(pr){ pr.innerHTML = 'Pressione <b>[E]</b> para falar com <b>' + esc(perto.i.nome) + '</b> <small style="opacity:.7">(' + esc(perto.i.prof) + ')</small>'; pr.style.display = 'block'; } }
    if(conv){ var c = L[conv.n]; if(!c || Math.hypot(c.x - S.px, c.z - S.pz) > 9) M.fecha(); }
  };
  M.perto = function(){ return !!perto; };
  M.lista = function(){ var o = []; for(var n in L) o.push({ n: +n, nome: L[n].i.nome, x: L[n].x, z: L[n].z, a: L[n].a, rig: !!L[n].rig }); return o; };      /* testes e minimapa */
  M.interage = function(){ if(conv){ return false; } if(!perto) return false; abre(perto.n); return true; };
  /* ---- janela de conversa ---- */
  function monta(){
    if(el) return; var st = document.createElement('style');
    st.textContent = '#morConv{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);width:min(520px,94vw);z-index:320;display:none;padding:10px 12px;color:#e8f0ff;font:13px system-ui,sans-serif;' +
      'background:linear-gradient(rgba(16,24,44,.97),rgba(6,10,20,.97));box-shadow:inset 0 0 0 1px #c9a24a,0 10px 30px rgba(0,0,0,.7);clip-path:polygon(0 10px,10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px))}' +
      '#morConv .hd{display:flex;align-items:center;gap:8px;margin-bottom:6px}#morConv .hd b{color:#ffe6a8;letter-spacing:.06em}#morConv .hd small{color:#9fd0ff}#morConv .hd button{margin-left:auto}' +
      '#morConv .log{max-height:130px;overflow:auto;margin-bottom:8px}#morConv .log div{margin:3px 0}#morConv .log .eu{color:#9fb0cc}#morConv .log .ele b{color:#ffe6a8}' +
      '#morConv .rap{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}#morConv button{pointer-events:auto;cursor:pointer;font:700 11px system-ui,sans-serif;color:#e8f0ff;background:#16223d;border:1px solid #2b3a63;border-radius:4px;padding:7px 10px}' +
      '#morConv .lin{display:flex;gap:6px}#morConv input{flex:1;min-width:0;padding:8px;border-radius:4px;border:1px solid #2b3a63;background:#0b1428;color:#fff;font:inherit}';
    document.head.appendChild(st); el = document.createElement('div'); el.id = 'morConv'; document.body.appendChild(el);
    ['keydown', 'keyup', 'keypress'].forEach(function(t){ el.addEventListener(t, function(e){ e.stopPropagation(); if(t === 'keydown' && e.key === 'Escape') M.fecha(); if(t === 'keydown' && e.key === 'Enter') manda(); }); });
    el.addEventListener('click', function(ev){ var b = ev.target.closest('button'); if(!b) return; ev.stopPropagation(); var a = b.getAttribute('data-a');
      if(a === 'x') M.fecha(); else if(a === 'env') manda(); else if(a === 'r') manda(b.textContent); });
  }
  function desenha(){
    if(!el || !conv) return; var e = L[conv.n]; if(!e) return;
    var h = '<div class="hd"><b>' + esc(e.i.nome) + '</b><small>' + esc(e.i.prof) + '</small><button type="button" data-a="x">Fechar</button></div><div class="log">';
    conv.log.forEach(function(l){ h += l.q === 'eu' ? '<div class="eu">Você: ' + esc(l.m) + '</div>' : '<div class="ele"><b>' + esc(l.q) + ':</b> ' + esc(l.m) + '</div>'; });
    if(conv.espera) h += '<div class="ele"><b>' + esc(e.i.nome) + ':</b> ...</div>';
    h += '</div><div class="rap"><button type="button" data-a="r">Oi!</button><button type="button" data-a="r">O que você faz?</button><button type="button" data-a="r">Alguma dica?</button><button type="button" data-a="r">Me conta uma história</button><button type="button" data-a="r">Tchau</button></div>' +
      '<div class="lin"><input id="morTxt" maxlength="160" placeholder="Escreva para ' + esc(e.i.nome) + '..." autocomplete="off"><button type="button" data-a="env">Falar</button></div>';
    el.innerHTML = h; var lg = el.querySelector('.log'); lg.scrollTop = lg.scrollHeight;
  }
  function abre(n){ monta(); conv = { n: n, log: [], espera: false }; el.style.display = 'block'; try { if(document.pointerLockElement) document.exitPointerLock(); } catch(e){} desenha(); manda('Oi!'); }
  function manda(txt){
    if(!conv || conv.espera) return; var inp = document.getElementById('morTxt'); txt = (txt || (inp && inp.value) || '').trim(); if(!txt) return;
    conv.log.push({ q: 'eu', m: txt }); conv.espera = true; desenha(); if(ctx.enviar) ctx.enviar(conv.n, txt);
    if(/^tchau/i.test(txt)) setTimeout(function(){ M.fecha(); }, 2600);
    setTimeout(function(){ if(conv && conv.espera){ conv.espera = false; desenha(); } }, 12000);
  }
  M.fecha = function(){ conv = null; if(el) el.style.display = 'none'; };
  M.aberta = function(){ return !!conv; };
})();
