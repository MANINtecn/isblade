/* Log de desempenho (por tras do jogo). Mede a cada 2 s: quadros/s, tempo de quadro (medio, p95, pico), chamadas de desenho, triangulos, memoria da GPU/JS,
   qualidade e resolucao atuais, e o contexto (mapa, mobs, jogadores). Guarda os dados de ~30 min NO APARELHO (localStorage) e NUNCA envia nada para a internet.
   Para ver: Config (menu) > "LOG DE DESEMPENHO": mostra o resumo e deixa copiar / baixar (.json) / limpar. Mande o texto ou o arquivo para melhorar o grafico.
   Uso (arena/cidade):  PerfLog.init(renderer, scene, function(){ return { mapa: ..., mobs: ... }; });   PerfLog.marca('nome', {dados});   PerfLog.resumo();  PerfLog.json(); */
(function(){
  var P = window.PerfLog = { ativo: false };
  var CH = 'isblade.perf', JANELA = 2000, MAX = 900;
  var R, ctxFn, fC = 0, fT = 0, cS = 0, tS = 0, nI = 0, amostras = [], eventos = [], meta = {}, dts = [], t0 = performance.now(), ult = 0, ini = 0, ultSalva = performance.now() - 14000, ratioAnt = null, primeiro = 0, erros = 0, sujo = false;

  function ler(){ try { var j = JSON.parse(localStorage.getItem(CH) || 'null'); if(j && j.v === 1){ amostras = j.amostras || []; eventos = j.eventos || []; meta.sessoes = (j.meta && j.meta.sessoes) || 0; } } catch(e){} }
  function salva(){
    if(!sujo) return; sujo = false;
    try { localStorage.setItem(CH, JSON.stringify({ v: 1, meta: meta, amostras: amostras.slice(-MAX), eventos: eventos.slice(-200) })); }
    catch(e){ amostras = amostras.slice(-Math.floor(MAX / 3)); try { localStorage.setItem(CH, JSON.stringify({ v: 1, meta: meta, amostras: amostras, eventos: eventos.slice(-60) })); } catch(_){} }
  }
  function r1(x){ return Math.round(x * 10) / 10; }

  function dados(){
    var m = { quando: new Date().toISOString(), ua: navigator.userAgent, plataforma: navigator.platform, nucleos: navigator.hardwareConcurrency || 0, ram_gb: navigator.deviceMemory || 0,
      tela: screen.width + 'x' + screen.height, janela: innerWidth + 'x' + innerHeight, dpr: window.devicePixelRatio || 1, toque: !!(window.QUAL && QUAL.touch),
      pwa: !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) || !!navigator.standalone, pagina: location.pathname.split('/').pop() + location.search, sessoes: (meta.sessoes || 0) };
    try { var gl = R.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info'); m.gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); m.gpu_vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : '';
      m.webgl = (typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext) ? 2 : 1; m.tex_max = gl.getParameter(gl.MAX_TEXTURE_SIZE); m.aniso_max = (gl.getExtension('EXT_texture_filter_anisotropic') ? gl.getParameter(gl.getExtension('EXT_texture_filter_anisotropic').MAX_TEXTURE_MAX_ANISOTROPY_EXT) : 0); } catch(e){}
    try { var c = navigator.connection; if(c) m.rede = { tipo: c.effectiveType, down_mbps: c.downlink, rtt_ms: c.rtt, economia: !!c.saveData }; } catch(e){}
    try { var n = performance.getEntriesByType('navigation')[0]; if(n) m.carga = { dom_ms: Math.round(n.domContentLoadedEventEnd), load_ms: Math.round(n.loadEventEnd), transferido_kb: Math.round((n.transferSize || 0) / 1024) }; } catch(e){}
    try { if(navigator.getBattery) navigator.getBattery().then(function(b){ meta.bateria = { nivel: Math.round(b.level * 100), carregando: b.charging }; sujo = true; }); } catch(e){}
    return m;
  }

  P.init = function(renderer, scene, fn){
    if(P.ativo) return; P.ativo = true; R = renderer; ctxFn = fn; ler(); var s = meta.sessoes || 0; meta = dados(); meta.sessoes = s + 1; sujo = true;
    window.addEventListener('error', function(e){ if(erros++ < 20) P.marca('erro_js', { msg: String(e.message || '').slice(0, 140), em: String(e.filename || '').split('/').pop() + ':' + e.lineno }); });
    document.addEventListener('visibilitychange', function(){ ult = 0; P.marca(document.hidden ? 'oculto' : 'visivel'); salva(); });
    window.addEventListener('pagehide', salva); window.addEventListener('resize', function(){ P.marca('resize', { janela: innerWidth + 'x' + innerHeight }); });
    try { R.domElement.addEventListener('webglcontextlost', function(){ P.marca('contexto_webgl_perdido'); }); } catch(e){}
    try { var orig = R.render.bind(R); R.render = function(a, b){ orig(a, b); var r = R.info.render; fC += r.calls; fT += r.triangles; }; } catch(e){}      /* soma as passadas de um quadro (o bloom usa varias); nao mexe no autoReset do jogo */
    P.marca('inicio', { qualidade: window.QUAL && QUAL.nivel, ratio: window.QUAL && QUAL.ratio });
    requestAnimationFrame(passo);
  };
  P.marca = function(nome, d){ eventos.push({ t: Math.round((performance.now() - t0) / 1000), n: nome, d: d || undefined }); if(eventos.length > 300) eventos.shift(); sujo = true; };

  function passo(t){
    requestAnimationFrame(passo);
    if(document.hidden){ ult = 0; return; }
    if(fC > 0){ cS += fC; tS += fT; nI++; fC = fT = 0; }
    if(!primeiro){ primeiro = 1; P.marca('primeiro_quadro_ms', { ms: Math.round(t) }); }
    if(ult){ var d = t - ult; if(d < 2000){ dts.push(d); if(d > 250) P.marca('travada', { ms: Math.round(d) }); } }
    ult = t; if(!ini) ini = t;
    if(t - ini >= JANELA && dts.length > 5){ fecha(t); ini = t; }
    if(t - ultSalva > 20000){ ultSalva = t; salva(); }
  }
  function fecha(t){
    var n = dts.length, soma = 0, mx = 0, l33 = 0, l50 = 0, i; for(i = 0; i < n; i++){ soma += dts[i]; if(dts[i] > mx) mx = dts[i]; if(dts[i] > 33.4) l33++; if(dts[i] > 50) l50++; }
    var ord = dts.slice().sort(function(a, b){ return a - b; }), p95 = ord[Math.min(n - 1, Math.floor(n * 0.95))];
    var inf = R.info || {}, rd = inf.render || {}, mm = inf.memory || {}, a = { t: Math.round((t - t0) / 1000), fps: r1(1000 / (soma / n)), ms: r1(soma / n), p95: r1(p95), pico: r1(mx), l33: l33, l50: l50, n: n,
      calls: nI ? Math.round(cS / nI) : rd.calls, tris: nI ? Math.round(tS / nI) : rd.triangles, geo: mm.geometries, tex: mm.textures };
    cS = tS = nI = 0;
    try { if(performance.memory) a.heap_mb = Math.round(performance.memory.usedJSHeapSize / 1048576); } catch(e){}
    if(window.QUAL){ a.q = QUAL.nivel; a.ratio = QUAL.ratio; if(ratioAnt !== null && ratioAnt !== QUAL.ratio) P.marca('resolucao_ajustada', { de: ratioAnt, para: QUAL.ratio, fps: a.fps }); ratioAnt = QUAL.ratio; }
    try { a.c = ctxFn ? ctxFn() : undefined; } catch(e){}
    amostras.push(a); if(amostras.length > MAX) amostras.shift(); dts = []; sujo = true;
  }

  /* ---------------- relatorio ---------------- */
  function media(l, k){ var s = 0, c = 0; l.forEach(function(x){ if(typeof x[k] === 'number'){ s += x[k]; c++; } }); return c ? s / c : 0; }
  P.resumo = function(){
    var A = amostras.filter(function(a){ return a.n > 5; }), L = [];
    L.push('=== LOG DE DESEMPENHO — IS BLADE ===');
    L.push('Aparelho: ' + (meta.plataforma || '?') + ' | nucleos ' + meta.nucleos + ' | RAM ' + (meta.ram_gb || '?') + ' GB | tela ' + meta.tela + ' (janela ' + meta.janela + ', dpr ' + meta.dpr + ') | ' + (meta.toque ? 'toque' : 'mouse') + (meta.pwa ? ' | PWA' : ''));
    L.push('GPU: ' + (meta.gpu || '?') + ' | WebGL ' + (meta.webgl || '?') + ' | textura max ' + (meta.tex_max || '?'));
    L.push('Navegador: ' + meta.ua);
    if(meta.rede) L.push('Rede: ' + meta.rede.tipo + ' ' + meta.rede.down_mbps + ' Mbps, rtt ' + meta.rede.rtt_ms + ' ms' + (meta.rede.economia ? ' (economia de dados)' : ''));
    if(meta.bateria) L.push('Bateria: ' + meta.bateria.nivel + '%' + (meta.bateria.carregando ? ' (carregando)' : ''));
    if(meta.carga) L.push('Carga da pagina: dom ' + meta.carga.dom_ms + ' ms, completa ' + meta.carga.load_ms + ' ms, ' + meta.carga.transferido_kb + ' KB');
    L.push('Pagina: ' + meta.pagina + ' | sessoes salvas: ' + meta.sessoes);
    if(!A.length){ L.push('(sem amostras ainda: jogue alguns segundos com a aba aberta)'); return L.join('\n'); }
    var tot = A.reduce(function(s, a){ return s + a.n; }, 0), fpsM = media(A, 'fps'), baixo30 = A.filter(function(a){ return a.fps < 30; }).length, baixo20 = A.filter(function(a){ return a.fps < 20; }).length;
    var pior = A.slice().sort(function(a, b){ return a.fps - b.fps; })[0], calls = A.map(function(a){ return a.calls || 0; }), tris = A.map(function(a){ return a.tris || 0; });
    L.push('--- ' + A.length + ' janelas de 2 s (' + Math.round(A.length * 2 / 60 * 10) / 10 + ' min), ' + tot + ' quadros ---');
    L.push('FPS medio ' + r1(fpsM) + ' | mais baixo ' + pior.fps + ' | janelas abaixo de 30 fps: ' + Math.round(100 * baixo30 / A.length) + '% | abaixo de 20 fps: ' + Math.round(100 * baixo20 / A.length) + '%');
    L.push('Tempo de quadro: medio ' + r1(media(A, 'ms')) + ' ms | p95 medio ' + r1(media(A, 'p95')) + ' ms | pior pico ' + r1(Math.max.apply(null, A.map(function(a){ return a.pico; }))) + ' ms | quadros >50 ms: ' + A.reduce(function(s, a){ return s + a.l50; }, 0));
    L.push('Desenho: chamadas medias ' + Math.round(media(A, 'calls')) + ' (max ' + Math.max.apply(null, calls) + ') | triangulos medios ' + Math.round(media(A, 'tris')) + ' (max ' + Math.max.apply(null, tris) + ') | geometrias ' + Math.round(media(A, 'geo')) + ' | texturas ' + Math.round(media(A, 'tex')));
    var hp = A.filter(function(a){ return typeof a.heap_mb === 'number'; }); if(hp.length) L.push('Memoria JS: media ' + Math.round(media(hp, 'heap_mb')) + ' MB | maxima ' + Math.max.apply(null, hp.map(function(a){ return a.heap_mb; })) + ' MB');
    var por = {}; A.forEach(function(a){ var c = a.c || {}, k = (c.pg || '?') + '/' + (c.mapa || (c.dg ? 'dg' : (c.boss ? 'chefe' : '-'))) + ' q:' + (a.q || '?'); (por[k] = por[k] || []).push(a); });
    L.push('--- por situacao ---'); Object.keys(por).forEach(function(k){ var l = por[k]; L.push(k + ': ' + l.length + ' janelas | fps ' + r1(media(l, 'fps')) + ' | p95 ' + r1(media(l, 'p95')) + ' ms | calls ' + Math.round(media(l, 'calls')) + ' | tris ' + Math.round(media(l, 'tris')) + (media(l, 'ratio') ? ' | resolucao x' + r1(media(l, 'ratio')) : '')); });
    var comMobs = A.filter(function(a){ return a.c && a.c.mobs > 0; }), semMobs = A.filter(function(a){ return a.c && a.c.mobs === 0; });
    if(comMobs.length && semMobs.length) L.push('Com mobs: fps ' + r1(media(comMobs, 'fps')) + ' (' + r1(media(comMobs.map(function(a){ return a.c; }), 'mobs')) + ' mobs em media) | sem mobs: fps ' + r1(media(semMobs, 'fps')));
    var ev = eventos.filter(function(e){ return e.n === 'resolucao_ajustada' || e.n === 'travada' || e.n === 'erro_js' || e.n === 'contexto_webgl_perdido' || e.n === 'oculto'; }), cont = {};
    ev.forEach(function(e){ cont[e.n] = (cont[e.n] || 0) + 1; }); L.push('--- eventos --- ' + (Object.keys(cont).map(function(k){ return k + ' x' + cont[k]; }).join(', ') || 'nenhum'));
    ev.filter(function(e){ return e.n === 'resolucao_ajustada' || e.n === 'erro_js'; }).slice(-8).forEach(function(e){ L.push('  [' + e.t + 's] ' + e.n + ' ' + JSON.stringify(e.d || {})); });
    return L.join('\n');
  };
  P.json = function(){ return JSON.stringify({ meta: meta, amostras: amostras, eventos: eventos }); };
  P.limpar = function(){ amostras = []; eventos = []; dts = []; try { localStorage.removeItem(CH); } catch(e){} sujo = false; };
  P.copiar = function(){ var tx = P.resumo() + '\n\n--- JSON (ultimas 120 janelas) ---\n' + JSON.stringify({ meta: meta, amostras: amostras.slice(-120), eventos: eventos.slice(-60) });
    try { if(navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(tx).then(function(){ return true; }, function(){ return false; }); } catch(e){}
    return Promise.resolve(false); };
  P.baixar = function(){ salva(); try { var b = new Blob([P.resumo() + '\n\n' + P.json()], { type: 'text/plain' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'isblade_perf_' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.txt'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500); } catch(e){} };

  /* ---------------- interface: secao nas Config (abaixo de "ATUALIZAR JOGO") ---------------- */
  function ui(){
    var bt = document.getElementById('cfgAtualizar'); if(!bt || document.getElementById('perfSec')) return;
    var pai = bt.parentNode, sec = document.createElement('div'); sec.id = 'perfSec'; sec.style.marginTop = '12px';
    var est = 'pointer-events:auto;cursor:pointer;font:inherit;font-weight:700;color:#e8f0ff;background:#16223d;border:1px solid #2b3a63;border-radius:6px;padding:8px 10px;margin:4px 6px 0 0';
    sec.innerHTML = '<h3 style="margin:6px 0">LOG DE DESEMPENHO</h3><small style="display:block;opacity:.75;margin-bottom:6px">Mede fps, travadas e peso do grafico enquanto voce joga. Fica so no aparelho. Depois de jogar, toque em Ver, copie e mande para melhorar o grafico.</small>' +
      '<button type="button" id="perfVer" style="' + est + '">Ver resumo</button><button type="button" id="perfCop" style="' + est + '">Copiar</button><button type="button" id="perfBai" style="' + est + '">Baixar</button><button type="button" id="perfLim" style="' + est + '">Limpar</button>' +
      '<textarea id="perfTx" readonly style="display:none;pointer-events:auto;width:100%;height:190px;margin-top:6px;background:#050a18;color:#cfe0ff;border:1px solid #2b3a63;border-radius:6px;font:11px/1.35 monospace;padding:6px;box-sizing:border-box"></textarea><small id="perfMsg" style="display:block;margin-top:4px;opacity:.8"></small>';
    pai.parentNode.insertBefore(sec, pai.nextSibling);
    var tx = sec.querySelector('#perfTx'), ms = sec.querySelector('#perfMsg'), say = function(s){ ms.textContent = s; };
    sec.querySelector('#perfVer').onclick = function(){ salva(); tx.value = P.resumo(); tx.style.display = 'block'; tx.scrollTop = 0; };
    sec.querySelector('#perfCop').onclick = function(){ P.copiar().then(function(ok){ if(ok) say('Copiado. Cole na conversa.'); else { tx.value = P.resumo(); tx.style.display = 'block'; tx.focus(); tx.select(); say('Nao deu para copiar sozinho: selecione o texto acima e copie.'); } }); };
    sec.querySelector('#perfBai').onclick = function(){ P.baixar(); say('Arquivo salvo nos downloads.'); };
    sec.querySelector('#perfLim').onclick = function(){ P.limpar(); tx.value = ''; tx.style.display = 'none'; say('Log apagado. Ele volta a medir agora.'); };
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui();
  setTimeout(ui, 1500); setTimeout(ui, 5000);
})();
