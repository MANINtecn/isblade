/* >>> CLAUDE [net] 2026-10-28 — cliente de rede (multiplayer): conecta ao servidor (servidor/server.js), mostra os outros jogadores, envia posicao e ataques e aplica o dano
   que o SERVIDOR decide (duelo na cidade, times no mapa de PvP). Uso: Net.init(ctx); Net.entrar('cidade' | 'pvp'); Net.tick(dt) a cada frame; Net.sair().
   Sem servidor (ex.: python -m http.server) o jogo continua funcionando sozinho; so nao ha outros jogadores. ?online=0 desliga.
   Teclas (so online): J desafia o jogador mais proximo para um duelo, U aceita, N recusa, H desiste do duelo. */
export const Net = (function(){
  var N = { hist: [], on: false, tentando: false, mapa: 'cidade', canal: 0, id: 0, eu: null, duelo: null }, ctx = null, THREE = null, ws = null, remotos = new Map();
  var tEnv = 0, tVis = 0, tHud = 0, reconectar = 0, desligado = false, pedido = null, hudEl = null, MAXV = 30, jaAvisou = false;
  var HERO = { human_fighter: 'human_fighter.glb?v=7', fighter: 'human_fighter.glb?v=7', starter: 'human_fighter.glb?v=7', imperial: 'human_fighter_imperial.glb?v=7', human_fighter_female: 'human_fighter_female.glb?v=7',
    magic_m: 'magic_m.glb?v=7', magic_f: 'magic_f.glb?v=7', elf_m: 'elf_m.glb?v=7', elf_f: 'elf_f.glb?v=7', orc_m: 'orc_m.glb?v=7', orc_f: 'orc_f.glb?v=7',
    dwarf_m: 'dwarf_m.glb?v=7', dwarf_f: 'dwarf_f.glb?v=7', darkelf_m: 'darkelf_m.glb?v=5', darkelf_f: 'darkelf_f.glb?v=5' };
  var ONCE = /^(g_atk|g_skill|slash|punch|roll|g_roll|hit_|block_hit|parry|death|skill_|staff_|boss_)/;
  var BASICOS = { sweep: 1, thrust: 1, spin: 1, up: 1, down: 1, wedge: 1 };
  var COR_TIME = { A: '#6fb4ff', B: '#ff7b6b' };
  function r2(v){ return Math.round(v * 100) / 100; }
  function sessao(){ var k = 'isblade.sid', v = null; try { v = localStorage.getItem(k); if(!v){ v = 'p' + Math.random().toString(36).slice(2, 12); localStorage.setItem(k, v); } } catch(e){} N.sid = v || ('p' + Math.random().toString(36).slice(2, 12)); return N.sid; }
  function heroUrl(t){ return 'assets/personagens/' + (HERO[t] || HERO.fighter); }
  var SRV_PADRAO = 'wss://play.isblade.tecx.pro/ws';                                              /* endereco do servidor de jogo quando o cliente roda em outro lugar (ex.: Vercel): 'wss://play.seudominio.com/ws'. Vazio = mesmo endereco da pagina */
  function urlServidor(){
    try {
      var q = location.search.match(/[?&]srv=([^&]*)/);                       /* ?srv=wss://host/ws  guarda o servidor para as proximas paginas (cidade -> arena recarrega a pagina); ?srv=off volta ao padrao */
      if(q){ var v = decodeURIComponent(q[1]); if(v === 'off' || v === '') localStorage.removeItem('isblade.srv'); else { localStorage.setItem('isblade.srv', v); return v; } }
      var s = localStorage.getItem('isblade.srv'); if(s) return s;
    } catch(e){}
    if(SRV_PADRAO && !/^(localhost|127\.0\.0\.1|192\.168\.)/.test(location.hostname)) return SRV_PADRAO;
    return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
  }
  function send(o){ if(ws && ws.readyState === 1) ws.send(JSON.stringify(o)); }
  function angLerp(a, b, k){ var d = b - a; while(d > Math.PI) d -= 6.2832; while(d < -Math.PI) d += 6.2832; return a + d * k; }

  /* ---------- HUD de rede (canto da tela) ---------- */
  function hud(){
    hudEl = document.createElement('div'); hudEl.id = 'netHud';
    hudEl.style.cssText = 'position:fixed;right:12px;top:10px;z-index:60;pointer-events:none;font:600 12px system-ui,sans-serif;color:#cfe6ff;text-align:right;text-shadow:0 1px 3px #000;line-height:1.5';
    document.body.appendChild(hudEl);
  }
  function atualizaHud(){
    if(!hudEl) return;
    if(!N.on){ hudEl.textContent = N.tentando ? 'Conectando...' : ''; return; }
    var nome = N.mapa === 'pvp' ? 'Arena PvP' : (N.mapa === 'masmorra' ? 'Masmorra (instância sua)' : 'Cidade'), t = N.eu && N.eu.team ? ' · Time ' + (N.eu.team === 'A' ? 'Azul' : 'Vermelho') : '';
    var duelo = N.duelo ? '<br><span style="color:#ffd166">Duelo com ' + N.duelo.nome + (N.duelo.seg > 0 ? ' em ' + Math.ceil(N.duelo.seg) + '...' : '  (H desiste)') + '</span>' : '';
    if(N.mapa === 'masmorra'){ hudEl.innerHTML = ''; return; } var ajuda = N.mapa === 'cidade' && !N.duelo ? '<br><span style="opacity:.65">J desafia para duelo</span>' : '';
    hudEl.innerHTML = nome + ' · canal ' + N.canal + ' · ' + (remotos.size + 1) + ' online' + t + duelo + ajuda;
  }

  /* ---------- plaquinha: nome + barra de vida ---------- */
  function desenhaTag(e){
    if(!e.tag) return; var c = e.tag.cv, g = c.getContext('2d'); g.clearRect(0, 0, 256, 72);
    g.font = '700 26px system-ui,Arial,sans-serif'; g.textAlign = 'center'; g.lineWidth = 5; g.strokeStyle = 'rgba(0,0,0,.85)';
    var cor = e.morto ? '#9aa3b5' : (noGrupo(e.id) ? '#7fe08a' : (N.mapa === 'pvp' ? '#ffb3a8' : (e.team ? COR_TIME[e.team] : '#f4fbff'))); g.strokeText(e.nome, 128, 28); g.fillStyle = cor; g.fillText(e.nome, 128, 28);
    var w = 150, x = 53, y = 42, k = Math.max(0, Math.min(1, e.hp / (e.pmax || 100)));
    g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - 2, y - 2, w + 4, 14); g.fillStyle = e.morto ? '#555' : (k > .5 ? '#5cd65c' : (k > .25 ? '#e6b422' : '#e54b4b')); g.fillRect(x, y, w * k, 10);
    e.tag.tex.needsUpdate = true; e.hpDes = e.hp;
  }
  function noGrupo(id){ return !!(N.grupo && N.grupo.m && N.grupo.m.some(function(m){ return m.id === id; })); }
  function criaTag(e){
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 72;
    var tex = new THREE.CanvasTexture(cv), sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    sp.scale.set(2.5, .7, 1); sp.position.y = 3.05; sp.renderOrder = 999; e.grp.add(sp); e.tag = { cv: cv, tex: tex, sp: sp }; desenhaTag(e);
  }

  /* ---------- jogadores remotos ---------- */
  function aplicaArma(e){
    var r = e.rig; if(!r) return; var a = e.arma;
    if(r.swd2h) r.swd2h.visible = a === 'sword'; if(r.swd1h) r.swd1h.visible = false; if(r.shd) r.shd.visible = a === 'shield'; if(r.stf) r.stf.visible = false;
  }
  function addRemoto(p){
    if(remotos.has(p.id)) return;
    var e = { id: p.id, lv: p.lv || 1, nome: p.nome, raca: p.raca, cls: p.cls, arma: p.arma, team: p.team || '', hp: p.hp, pmax: p.pmax, x: p.x, z: p.z, f: p.f, tx: p.x, tz: p.z, tf: p.f, a: 'idle', ts: 1, g: 0, morto: false, grp: new THREE.Group(), rig: null, tag: null, curA: '', vis: true, dentro: true, hpDes: -1 };
    e.grp.position.set(p.x, 0, p.z); e.grp.rotation.y = p.f; ctx.scene.add(e.grp); remotos.set(p.id, e);
    ctx.loadL2(heroUrl(p.raca), function(r){
      if(!remotos.has(e.id)){ return; }
      e.rig = r; e.grp.add(r.root); r.drv = { mixer: new THREE.AnimationMixer(r.root), actions: {}, cur: null, curName: '', hold: 0 }; r.tipo = e.raca; ctx.anexar(r, THREE);
      aplicaArma(e); criaTag(e); tocar(e, e.morto ? 'death' : 'idle');
    });
  }
  function removeRemoto(id){
    var e = remotos.get(id); if(!e) return; ctx.scene.remove(e.grp);
    e.grp.traverse(function(o){ if(o.material && o.material.map && o === (e.tag && e.tag.sp)) { o.material.map.dispose(); o.material.dispose(); } });
    remotos.delete(id);
  }
  function tocar(e, nome){
    var r = e.rig; if(!r || !r.drv || !r.clips) return; var c = nome; if(!r.clips[c]) c = /^g_/.test(c) ? (/atk|skill/.test(c) ? 'slash1' : 'idle') : 'idle'; if(!r.clips[c]) return;
    if(e.curA === c) return; e.curA = c; ctx.playClip(r, c, { once: ONCE.test(c), speed: e.ts || 1, fade: .12, hold: ONCE.test(c) ? 0 : 0 });
  }
  function atualizaRemotos(dt){
    tVis -= dt; var recalc = tVis <= 0; if(recalc) tVis = .4; var S = ctx.getS(), lista = null;
    if(recalc){ lista = []; remotos.forEach(function(e){ lista.push({ e: e, d: Math.hypot(e.x - S.px, e.z - S.pz) }); }); lista.sort(function(a, b){ return a.d - b.d; }); lista.forEach(function(o, i){ o.e.vis = i < MAXV && o.e.dentro; o.e.grp.visible = o.e.vis; }); }
    remotos.forEach(function(e){
      var k = Math.min(1, dt * 11); e.x += (e.tx - e.x) * k; e.z += (e.tz - e.z) * k; e.f = angLerp(e.f, e.tf, Math.min(1, dt * 12)); e.grp.position.x = e.x; e.grp.position.z = e.z; e.grp.rotation.y = e.f;
      if(!e.vis || !e.rig) return;
      if(e.hp !== e.hpDes) desenhaTag(e);
      tocar(e, e.morto ? 'death' : e.a); if(e.rig.drv.cur && e.rig.drv.cur.timeScale !== (e.ts || 1)) e.rig.drv.cur.timeScale = e.ts || 1;
      e.rig.drv.mixer.update(dt); ctx.ajusteRemoto(e.rig, e.arma, e.morto ? 'idle' : e.a, e.raca, dt);
    });
  }
  function maisProximo(maxD){
    var S = ctx.getS(), best = null, bd = maxD;
    remotos.forEach(function(e){ var d = Math.hypot(e.x - S.px, e.z - S.pz); if(d < bd && !e.morto){ bd = d; best = e; } });
    return best;
  }

  /* ---------- mensagens do servidor ---------- */
  function msg(m){
    var e; if(m.t !== 's'){ N.hist.push(m.t + ' ' + JSON.stringify(m).slice(0, 90)); if(N.hist.length > 60) N.hist.shift(); }
    if(m.t === 'w'){
      N.on = true; N.tentando = false; N.id = m.id; if(m.sid) N.sid = m.sid; if(m.prog && ctx.prog) ctx.prog(m.prog, true); N.grupo = null; N.eu = m.eu; N.canal = m.canal; N.mapa = m.mapa; N.duelo = null; jaAvisou = false;
      m.jog.forEach(addRemoto); ctx.onEntrou(m); atualizaHud(); ctx.sysMsg((m.mapa === 'pvp' ? 'Arena PvP' : 'Cidade') + ' - canal ' + m.canal + (m.eu.team ? ' - Time ' + (m.eu.team === 'A' ? 'Azul' : 'Vermelho') : ''));
    } else if(m.t === 's'){
      var vistos = {}; m.p.forEach(function(p){
        e = remotos.get(p[0]); if(!e) return; vistos[p[0]] = 1; e.dentro = true; e.tx = p[1]; e.tz = p[2]; e.tf = p[3]; e.a = p[4]; e.hp = p[5]; e.g = p[6]; var morreu = !!p[7]; e.ts = p[8] || 1;
        if(morreu !== e.morto){ e.morto = morreu; e.curA = ''; if(e.tag) desenhaTag(e); }
      });
      remotos.forEach(function(r, id){ if(!vistos[id]){ r.dentro = false; r.grp.visible = false; } });
    } else if(m.t === 'erro'){ desligado = true; ctx.banner('SEM ACESSO', m.m || 'Conexao recusada', '#ff6b6b'); ctx.sysMsg(m.m || 'Conexao recusada');
    } else if(m.t === 'prog'){ if(ctx.prog) ctx.prog(m);
    } else if(m.t === 'atk'){ e = remotos.get(m.id); if(e && m.k === 's' && e.vis && ctx.fxSkill) ctx.fxSkill(e, m.v, m.f);
    } else if(m.t === 'j'){ addRemoto(m.p); atualizaHud();
    } else if(m.t === 'l'){ removeRemoto(m.id); atualizaHud();
    } else if(m.t === 'hit'){
      var ratio = 0;
      if(m.v === N.id){ ctx.meHit(m.d, m.hp / (N.eu.pmax || 100), !!m.b); }
      else { e = remotos.get(m.v); if(e){ e.hp = m.hp; ctx.floatText((m.b ? 'BLOQ ' : '') + '-' + m.d, m.b ? '#8bc1ff' : '#ffd166', m.b ? 16 : 22, { x: e.x, z: e.z, y: 2.6 }); } if(m.a === N.id) ctx.iHit(m.d); }
    } else if(m.t === 'die'){
      if(m.v === N.id) ctx.sysMsg(m.na + ' derrotou voce'); else { e = remotos.get(m.v); if(e){ e.morto = true; e.curA = ''; if(e.tag) desenhaTag(e); } ctx.sysMsg(m.na + ' derrotou ' + m.nv); }
    } else if(m.t === 'resp'){
      if(m.id === N.id){ ctx.meResp(m.x, m.z, m.hp / (N.eu.pmax || 100), !!m.keep); }
      else { e = remotos.get(m.id); if(e){ e.morto = false; e.hp = m.hp; e.curA = ''; if(!m.keep){ e.x = e.tx = m.x; e.z = e.tz = m.z; } if(e.tag) desenhaTag(e); } }
    } else if(m.t === 'duelreq'){
      pedDuelo = { de: m.de, nome: m.nome, ate: Date.now() + 15000 }; pedido = pedDuelo; ctx.banner('DESAFIO DE DUELO', m.nome + ' desafia voce', '#ffd166'); desenhaPed();
    } else if(m.t === 'duelsent'){ ctx.sysMsg('Desafio enviado para ' + m.nome + '...');
    } else if(m.t === 'duelrecusou'){ ctx.sysMsg(m.nome + ' recusou o duelo');
    } else if(m.t === 'duelstart'){
      if(m.a === N.id || m.b === N.id){ N.duelo = { nome: m.a === N.id ? m.nb : m.na, seg: m.seg, ini: Date.now() + m.seg * 1000 }; ctx.banner('DUELO', 'contra ' + N.duelo.nome, '#ffd166'); ctx.sysMsg('Duelo contra ' + N.duelo.nome + ' - comeca em ' + m.seg + ' s'); }
      else ctx.sysMsg('Duelo: ' + m.na + ' x ' + m.nb);
    } else if(m.t === 'duelend'){
      if(N.duelo && (m.v === N.id || m.l === N.id)){ ctx.banner(m.v === N.id ? 'VITORIA!' : 'DERROTA', m.v === N.id ? 'Voce venceu ' + m.nl : m.nv + ' venceu o duelo', m.v === N.id ? '#f5c451' : '#ff4d6d'); N.duelo = null; }
      else ctx.sysMsg((m.nv || '?') + ' venceu o duelo contra ' + m.nl);
    } else if(m.t === 'preq'){ pedGrupo = { de: m.de, nome: m.nome, ate: Date.now() + 20000 }; ctx.banner('CONVITE DE GRUPO', m.nome + ' convida você', '#7fd2ff'); desenhaPed();
    } else if(m.t === 'psent'){ ctx.sysMsg('Convite de grupo enviado para ' + m.nome);
    } else if(m.t === 'prec'){ ctx.sysMsg(m.nome + ' recusou o convite de grupo');
    } else if(m.t === 'party'){ var tinha = N.grupo; N.grupo = m; if(!tinha) ctx.sysMsg('Você entrou no grupo (' + m.m.length + ' membros)'); renderParty(); renderMenu();
    } else if(m.t === 'partyfim'){ N.grupo = null; ctx.sysMsg(m.m === 'expulso' ? 'Você foi expulso do grupo' : (m.m === 'dissolvido' ? 'O grupo foi desfeito' : 'Você saiu do grupo')); renderParty(); renderMenu();
    } else if(m.t === 'chat'){ ctx.sysMsg(m.n + ': ' + m.m); }
  }

  /* ---------- MENU (tecla P ou botao): so CSS, sem nenhuma imagem. O que funciona fica em destaque; o resto aparece apagado ("em breve") ---------- */
  var pedEl = null, alvoEl = null, anelAlvo = null, menuEl = null, btnEl = null, partyEl = null, aba = 'resumo', menuAberto = false, tMenu = 0, pedDuelo = null, pedGrupo = null;
  var ITENS = [{ k: 'duelo', nome: 'Duelo', ativo: true, dica: 'Desafie um jogador por perto' }, { k: 'grupo', nome: 'Grupo', ativo: true, dica: 'Party de até 6 jogadores' },
    { k: 'troca', nome: 'Troca', ativo: false }, { k: 'loja', nome: 'Loja', ativo: false }, { k: 'amigos', nome: 'Amigos', ativo: false }, { k: 'guilda', nome: 'Guilda', ativo: false },
    { k: 'msg', nome: 'Mensagem', ativo: false }, { k: 'rank', nome: 'Ranking', ativo: false }];
  function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function bonito(r){ return String(r || '').replace(/_/g, ' '); }
  function injetaCss(){
    var st = document.createElement('style'); st.textContent =
      '#netBtn{position:fixed;left:12px;top:52px;z-index:62;padding:9px 14px;border-radius:8px;border:1px solid #f5c24a;background:rgba(8,10,20,.9);color:#f5c24a;font:700 12px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}' +
      '#netMenu{position:fixed;left:12px;top:90px;z-index:63;width:min(92vw,430px);max-height:calc(100vh - 210px);overflow:auto;display:none;background:rgba(8,10,20,.96);border:1px solid #6b5522;border-radius:10px;color:#dbe6ff;font:13px system-ui,sans-serif;box-shadow:0 0 24px rgba(0,0,0,.7)}' +
      '#netMenu .h{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #3a3320;color:#f5c24a;font-weight:700;letter-spacing:.12em}' +
      '#netMenu .h small{color:#8d96ad;font-weight:400;letter-spacing:0}#netMenu .h button{background:none;border:0;color:#8d96ad;font-size:18px;cursor:pointer}' +
      '#netMenu .g{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:10px 12px}' +
      '#netMenu .it{position:relative;padding:9px 4px 14px;text-align:center;border-radius:7px;border:1px solid #2a3042;background:#10142a;color:#6f788f;font:600 12px system-ui,sans-serif;cursor:default}' +
      '#netMenu .it.on{border-color:#f5c24a;color:#ffe08a;background:#241d0b;cursor:pointer;box-shadow:inset 0 0 10px rgba(245,194,74,.18)}#netMenu .it.sel{background:#3a2d0c}' +
      '#netMenu .it i{position:absolute;left:0;right:0;bottom:2px;font:normal 600 9px system-ui,sans-serif;letter-spacing:.05em;color:#6f788f}#netMenu .it.on i{color:#7fe08a}' +
      '#netMenu .b{padding:4px 14px 12px}#netMenu .b h4{margin:8px 0 6px;color:#f5c24a;font-size:12px;letter-spacing:.1em}#netMenu .b p{margin:4px 0;color:#9aa5c0;line-height:1.5}' +
      '#netMenu .r{display:flex;align-items:center;gap:8px;padding:6px 8px;margin:3px 0;border-radius:6px;background:#10142a}#netMenu .r .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#netMenu .r small{color:#7c86a0}' +
      '#netMenu .r button,#netMenu .bt{padding:5px 10px;border-radius:6px;border:1px solid #f5c24a;background:#2a2210;color:#ffe08a;font:600 11px system-ui,sans-serif;cursor:pointer}#netMenu .r button:disabled{opacity:.35;cursor:default}' +
      '#netMenu .bar{width:70px;height:7px;border-radius:4px;background:#222a40;overflow:hidden}#netMenu .bar b{display:block;height:100%;background:#5cd65c}' +
      '#netMenu .ped{border:1px solid #ffd166;background:#2a220c}#netMenu kbd{padding:1px 5px;border:1px solid #3a4260;border-radius:4px;background:#161b33;color:#cfe6ff;font:11px system-ui}' +
      '#netParty{position:fixed;left:12px;top:8px;z-index:61;pointer-events:none;font:600 12px system-ui,sans-serif;color:#dbe6ff;text-shadow:0 1px 3px #000}' +
      '#netParty .m{display:flex;align-items:center;gap:6px;margin:3px 0;padding:3px 8px;border-radius:6px;background:rgba(8,10,20,.72)}#netParty .bar{width:64px;height:6px;border-radius:3px;background:#222a40;overflow:hidden}#netParty .bar b{display:block;height:100%;background:#5cd65c}#netParty .off{opacity:.45}#netParty .m{padding:2px 7px;margin:2px 0;font-size:11px}#netParty .bar{width:56px;height:5px}' +
      '#btnReturnCity,#netBtn,#mbfs,#btnFightBaiumDirect{margin-top:var(--party-h,0px)!important}' +
      '#netPed{position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:66;display:none;min-width:250px;max-width:94vw;padding:10px 12px;border-radius:10px;background:rgba(8,12,24,.94);box-shadow:inset 0 0 0 2px #ffd166,0 8px 24px rgba(0,0,0,.7);color:#fff;font:600 13px system-ui,sans-serif;text-align:center}' +
      '#netPed b{color:#ffd166}#netPed .a{display:flex;gap:8px;margin-top:8px}#netPed button{flex:1;padding:10px 6px;border-radius:8px;border:0;font:800 12px system-ui,sans-serif;letter-spacing:.06em;cursor:pointer}#netPed .ok{background:#2fae5a;color:#fff}#netPed .no{background:#3a4260;color:#dbe6ff}#netPed small{display:block;color:#8fa6c4;font-weight:500;margin-top:2px}' +
      '#netAlvo{position:fixed;left:50%;top:84px;transform:translateX(-50%);z-index:64;display:none;min-width:230px;max-width:92vw;padding:8px 10px;border-radius:10px;background:rgba(8,12,24,.88);box-shadow:inset 0 0 0 1px rgba(120,196,255,.45),0 6px 20px rgba(0,0,0,.6);color:#e8f3ff;font:600 12px system-ui,sans-serif}' +
      '#netAlvo .t{display:flex;align-items:center;gap:8px;margin-bottom:6px}#netAlvo .t b{flex:1;font-size:13px;letter-spacing:.06em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#netAlvo .t small{color:#8fa6c4;font-weight:500}#netAlvo .x{background:none;border:0;color:#8fa6c4;font-size:18px;line-height:1;cursor:pointer;padding:0 2px}' +
      '#netAlvo .hp{height:6px;border-radius:3px;background:#222a40;overflow:hidden;margin-bottom:7px}#netAlvo .hp b{display:block;height:100%;background:#f03a2e;transition:width .15s}' +
      '#netAlvo .a{display:flex;gap:6px;flex-wrap:wrap}#netAlvo .a button{flex:1;min-width:64px;padding:8px 6px;border-radius:7px;border:1px solid rgba(120,196,255,.5);background:rgba(20,34,62,.9);color:#e8f3ff;font:700 11px system-ui,sans-serif;cursor:pointer;letter-spacing:.04em}' +
      '#netAlvo .a button:disabled{opacity:.35;cursor:default}#netAlvo .a button:active{background:rgba(60,100,170,.9)}';
    document.head.appendChild(st);
  }
  function criaMenu(){
    injetaCss();
    btnEl = document.createElement('button'); btnEl.id = 'netBtn'; btnEl.type = 'button'; btnEl.textContent = '☰ MENU (P)'; btnEl.onclick = function(){ alterna(); }; document.body.appendChild(btnEl);
    menuEl = document.createElement('div'); menuEl.id = 'netMenu'; document.body.appendChild(menuEl);
    partyEl = document.createElement('div'); partyEl.id = 'netParty'; document.body.appendChild(partyEl);
    alvoEl = document.createElement('div'); alvoEl.id = 'netAlvo'; document.body.appendChild(alvoEl);
    pedEl = document.createElement('div'); pedEl.id = 'netPed'; document.body.appendChild(pedEl);
    pedEl.addEventListener('click', function(e){ var el = e.target.closest ? e.target.closest('[data-a]') : null; if(!el) return; var v = el.getAttribute('data-v'); if(el.getAttribute('data-a') === 'sim') aceitar(v); else recusar(v); desenhaPed(); });
    alvoEl.addEventListener('click', function(e){
      var el = e.target.closest ? e.target.closest('[data-a]') : null; if(!el || el.disabled) return; var a = el.getAttribute('data-a'), al = alvo();
      if(a === 'x'){ selecionar(0); return; } if(!al){ selecionar(0); return; }
      if(a === 'grupo') send({ t: 'pinvite', to: al.id }); else if(a === 'duelo') send({ t: 'duel', to: al.id });
      else if(a === 'perfil') ctx.sysMsg(al.nome + ' · ' + bonito(al.raca) + ' · Nv ' + (al.lv || 1) + ' · ' + (al.arma === 'shield' ? 'Guardião' : 'Espadachim'));
      else if(a === 'mais') ctx.sysMsg('Troca, amigo e cochicho: em breve');
      desenhaAlvo();
    });
    anelAlvo = new THREE.Mesh(new THREE.RingGeometry(.85, 1.0, 40), new THREE.MeshBasicMaterial({ color: 0xf5c451, transparent: true, opacity: .85, side: THREE.DoubleSide, depthTest: false })); anelAlvo.rotation.x = -Math.PI / 2; anelAlvo.renderOrder = 998; anelAlvo.visible = false; ctx.scene.add(anelAlvo);
    menuEl.addEventListener('click', function(e){
      var el = e.target.closest ? e.target.closest('[data-a]') : null; if(!el || el.disabled) return; var a = el.getAttribute('data-a'), v = el.getAttribute('data-v');
      if(a === 'aba'){ var it = ITENS.filter(function(i){ return i.k === v; })[0]; if(it && it.ativo) aba = v; else ctx.sysMsg((it ? it.nome : 'Isso') + ': em breve'); }
      else if(a === 'fechar') alterna(false);
      else if(a === 'duelar') send({ t: 'duel', to: +v | 0 });
      else if(a === 'convidar') send({ t: 'pinvite', to: +v | 0 });
      else if(a === 'expulsar') send({ t: 'pkick', to: +v | 0 });
      else if(a === 'sairgrupo') send({ t: 'pleave' });
      else if(a === 'aceitar') aceitar(v);
      else if(a === 'recusar') recusar(v);
      renderMenu();
    });
  }
  function alterna(forca){
    menuAberto = forca === undefined ? !menuAberto : !!forca; if(!menuEl) return; menuEl.style.display = menuAberto ? 'block' : 'none'; menuEl._h = '';
    if(menuAberto){ try { document.exitPointerLock(); } catch(e){} renderMenu(); }
  }
  function aceitar(tipo){
    if(tipo === 'duelo' && pedDuelo){ send({ t: 'duelok' }); pedDuelo = null; } else if(tipo === 'grupo' && pedGrupo){ send({ t: 'pok' }); pedGrupo = null; }
  }
  function recusar(tipo){
    if(tipo === 'duelo' && pedDuelo){ send({ t: 'duelno' }); pedDuelo = null; } else if(tipo === 'grupo' && pedGrupo){ send({ t: 'pno' }); pedGrupo = null; }
  }
  function perto(maxD){
    var S = ctx.getS(), l = []; remotos.forEach(function(e){ var d = Math.hypot(e.x - S.px, e.z - S.pz); if(d <= maxD && !e.morto) l.push({ e: e, d: d }); }); l.sort(function(a, b){ return a.d - b.d; }); return l.slice(0, 12);
  }
  function linhaPed(tipo, p){
    return '<div class="r ped"><span class="n">' + esc(p.nome) + (tipo === 'duelo' ? ' desafiou você para um duelo' : ' convidou você para o grupo') + '</span><button data-a="aceitar" data-v="' + tipo + '">Aceitar</button><button data-a="recusar" data-v="' + tipo + '">Recusar</button></div>';
  }
  function renderMenu(){
    if(!menuEl || !menuAberto) return; var h = '<div class="h"><span>MENU</span><small>P ou Esc fecha</small><button data-a="fechar">×</button></div><div class="g">';
    ITENS.forEach(function(i){ h += '<div class="it' + (i.ativo ? ' on' : '') + (aba === i.k ? ' sel' : '') + '" data-a="aba" data-v="' + i.k + '" title="' + esc(i.dica || 'Em breve') + '">' + i.nome + '<i>' + (i.ativo ? 'ATIVO' : 'em breve') + '</i></div>'; });
    h += '</div><div class="b">';
    if(!N.on){ h += '<p>Sem conexão com o servidor. O jogo segue sozinho; duelo e grupo precisam do servidor online.</p>'; }
    else if(aba === 'duelo'){
      h += '<h4>DUELO</h4>'; if(pedDuelo && Date.now() < pedDuelo.ate) h += linhaPed('duelo', pedDuelo);
      if(N.mapa !== 'cidade') h += '<p>Duelo só na cidade. Aqui a arena é livre: todos contra todos.</p>';
      else if(N.duelo) h += '<p>Em duelo com <b>' + esc(N.duelo.nome) + '</b>. <kbd>H</kbd> desiste.</p>';
      else { var L = perto(40); if(!L.length) h += '<p>Ninguém por perto (até 40 m).</p>'; L.forEach(function(o){ h += '<div class="r"><span class="n">' + esc(o.e.nome) + ' <small>' + esc(bonito(o.e.raca)) + ' · ' + Math.round(o.d) + ' m</small></span><button data-a="duelar" data-v="' + o.e.id + '"' + (o.d > 20 ? ' disabled title="Chegue a 20 m"' : '') + '>Desafiar</button></div>'; }); h += '<p>O duelo não mata: quem chega a 1 de vida perde. Vida cheia ao fim.</p>'; }
    } else if(aba === 'grupo'){
      h += '<h4>GRUPO</h4>'; if(pedGrupo && Date.now() < pedGrupo.ate) h += linhaPed('grupo', pedGrupo);
      var g = N.grupo, souLider = g && g.lider === N.sid;
      if(g && g.m.length > 1){ g.m.forEach(function(m){ var r = m.id === N.id ? ctx.getS().php / Math.max(1, ctx.getS().pmax) : (m.pmax ? m.hp / m.pmax : 0); h += '<div class="r"><span class="n">' + (m.sid === g.lider ? '★ ' : '') + esc(m.nome) + ' <small>' + (m.on ? (m.mapa === N.mapa && m.canal === N.canal ? 'aqui' : esc(m.mapa) + ' c' + m.canal) : 'offline') + '</small></span><span class="bar"><b style="width:' + Math.round(Math.max(0, Math.min(1, r)) * 100) + '%"></b></span>' + (souLider && m.sid !== N.sid && m.id ? '<button data-a="expulsar" data-v="' + m.id + '">Expulsar</button>' : '') + '</div>'; }); h += '<button class="bt" data-a="sairgrupo">Sair do grupo</button>'; }
      else h += '<p>Você não está em um grupo.</p>';
      if(!g || souLider){ var L2 = perto(60); h += '<h4>CONVIDAR</h4>'; if(!L2.length) h += '<p>Ninguém por perto (até 60 m).</p>'; L2.forEach(function(o){ var jaNoGrupo = g && g.m.some(function(m){ return m.id === o.e.id; }); h += '<div class="r"><span class="n">' + esc(o.e.nome) + ' <small>' + esc(bonito(o.e.raca)) + ' · ' + Math.round(o.d) + ' m</small></span><button data-a="convidar" data-v="' + o.e.id + '"' + (jaNoGrupo ? ' disabled' : '') + '>Convidar</button></div>'; }); }
      else h += '<p>Só o líder convida.</p>';
      h += '<p>No PvP livre, quem está no mesmo grupo não se machuca.</p>';
    } else {
      h += '<h4>RESUMO</h4><p>' + (N.mapa === 'pvp' ? 'Arena PvP' : 'Cidade') + ' · canal ' + N.canal + ' · ' + (remotos.size + 1) + ' online</p>' +
        '<p><kbd>P</kbd> menu &nbsp; <kbd>J</kbd> duelo no mais próximo &nbsp; <kbd>U</kbd> aceita &nbsp; <kbd>N</kbd> recusa &nbsp; <kbd>H</kbd> desiste</p><p><b>Clique ou toque em um jogador</b> para selecioná-lo e abrir as ações (grupo, duelo, perfil). <kbd>T</kbd> seleciona o mais próximo.</p>';
    }
    h += '</div>'; if(menuEl._h === h) return; menuEl._h = h; menuEl.innerHTML = h;           /* so redesenha se mudou: senao o clique perde o elemento entre apertar e soltar */
  }
  /* ---------- selecionar outro jogador (clique/toque) e menu de acoes ---------- */
  function alvo(){ return N.alvo ? remotos.get(N.alvo) || null : null; }
  function selecionar(id){ N.alvo = id || 0; if(!id && anelAlvo) anelAlvo.visible = false; desenhaAlvo(); }
  function desenhaAlvo(){
    if(!alvoEl) return; var e = alvo(); if(!e){ alvoEl.style.display = 'none'; alvoEl._h = ''; return; }
    var g = N.grupo, souLider = !g || g.lider === N.sid, jaNoGrupo = noGrupo(e.id), k = Math.max(0, Math.min(1, e.hp / (e.pmax || 100)));
    var h = '<div class="t"><b>' + esc(e.nome) + '</b><small>Nv ' + (e.lv || 1) + ' · ' + esc(bonito(e.raca)) + '</small><button class="x" data-a="x">×</button></div><div class="hp"><b style="width:' + Math.round(k * 100) + '%"></b></div><div class="a">' +
      '<button data-a="grupo"' + ((jaNoGrupo || !souLider || e.party) ? ' disabled' : '') + '>' + (jaNoGrupo ? 'NO GRUPO' : 'GRUPO') + '</button>' +
      '<button data-a="duelo"' + ((N.mapa !== 'cidade' || N.duelo) ? ' disabled' : '') + '>DUELO</button><button data-a="perfil">PERFIL</button><button data-a="mais">MAIS</button></div>';
    if(alvoEl._h !== h){ alvoEl._h = h; alvoEl.innerHTML = h; } alvoEl.style.display = 'block';
  }
  function projeta(x, y, z){ var v = new THREE.Vector3(x, y, z).project(ctx.camera()); return { x: (v.x * .5 + .5) * innerWidth, y: (-v.y * .5 + .5) * innerHeight, ok: v.z < 1 }; }
  function achaNaTela(px, py){
    var melhor = null, bd = 1e9; if(!ctx.camera) return null;
    remotos.forEach(function(e){
      if(!e.vis || !e.rig) return; var a = projeta(e.x, .1, e.z), b = projeta(e.x, 2.1, e.z); if(!a.ok || !b.ok) return;
      var vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy || 1, t = Math.max(0, Math.min(1, ((px - a.x) * vx + (py - a.y) * vy) / l2)), dx = px - (a.x + vx * t), dy = py - (a.y + vy * t), d = Math.hypot(dx, dy), raio = Math.max(24, Math.sqrt(l2) * .3);
      if(d <= raio && d < bd){ bd = d; melhor = e; }
    });
    return melhor;
  }
  function aoToque(ev){
    if(!N.on || document.pointerLockElement || (ev.button && ev.button !== 0)) return;
    var t = ev.target; if(t && t.closest && t.closest('#netMenu,#netPed,#netAlvo,#netParty,#mb,#mbsys,#mbbar,#mbedit,#mbfs,#netBtn,#diff,.mu-hotbar-slot,.mu-sys-btn,#mu-slot-picker,button,input,select')) return;
    var e = achaNaTela(ev.clientX, ev.clientY); if(!e) return;
    ev.stopImmediatePropagation(); ev.preventDefault(); selecionar(e.id);
  }
  function selecionaMaisPerto(){ var S = ctx.getS(), melhor = null, bd = 40; remotos.forEach(function(e){ if(!e.vis || e.morto) return; var d = Math.hypot(e.x - S.px, e.z - S.pz); if(d < bd){ bd = d; melhor = e; } }); if(melhor) selecionar(melhor.id); else ctx.sysMsg('Ninguém por perto (até 40 m)'); }
  /* convite de grupo/duelo: cartao com Aceitar/Recusar enquanto valer (no celular nao ha tecla U/N) */
  function desenhaPed(){
    if(!pedEl) return; var t = Date.now(), tipo = '', p = null;
    if(pedGrupo && t < pedGrupo.ate){ tipo = 'grupo'; p = pedGrupo; } else if(pedDuelo && t < pedDuelo.ate){ tipo = 'duelo'; p = pedDuelo; }
    if(!p){ pedEl.style.display = 'none'; pedEl._h = ''; return; }
    var seg = Math.max(0, Math.ceil((p.ate - t) / 1000)), h = '<b>' + esc(p.nome) + '</b> ' + (tipo === 'grupo' ? 'convidou você para o <b>grupo</b>' : 'desafiou você para um <b>duelo</b>') + '<small>expira em <span id="netPedS"></span> s</small><div class="a"><button class="ok" data-a="sim" data-v="' + tipo + '">ACEITAR</button><button class="no" data-a="nao" data-v="' + tipo + '">RECUSAR</button></div>';
    if(pedEl._h !== h){ pedEl._h = h; pedEl.innerHTML = h; } pedEl.style.display = 'block'; var sp = document.getElementById('netPedS'); if(sp) sp.textContent = seg;
  }
  function atualizaAlvo(){
    desenhaPed();
    var e = alvo(); if(N.alvo && !e){ selecionar(0); return; } if(!e){ return; }
    var S = ctx.getS(); if(Math.hypot(e.x - S.px, e.z - S.pz) > 90 || !e.dentro){ selecionar(0); return; }
    if(anelAlvo){ anelAlvo.visible = !!e.vis; anelAlvo.position.set(e.x, .15, e.z); var k = 1 + Math.sin(performance.now() / 220) * .06; anelAlvo.scale.set(k, k, k); }
    if(--tAlvo <= 0){ tAlvo = 6; desenhaAlvo(); }
  }
  var tAlvo = 0;
  function renderParty(){
    if(!partyEl) return; var g = N.grupo; if(!N.on || !g || g.m.length < 2){ partyEl.innerHTML = ''; document.body.style.setProperty('--party-h', '0px'); return; } var S = ctx.getS(), h = '';
    g.m.forEach(function(m){ var r = m.id === N.id ? S.php / Math.max(1, S.pmax) : (m.pmax ? m.hp / m.pmax : 0); h += '<div class="m' + (m.on ? '' : ' off') + '"><span>' + (m.sid === g.lider ? '★ ' : '') + esc(m.nome) + '</span><span class="bar"><b style="width:' + Math.round(Math.max(0, Math.min(1, r)) * 100) + '%"></b></span></div>'; });
    partyEl.innerHTML = h; document.body.style.setProperty('--party-h', (partyEl.offsetHeight + 4) + 'px'); remotos.forEach(function(e){ e.hpDes = -1; });
  }

  /* ---------- conexao ---------- */
  function conectar(){
    if(desligado) return; N.tentando = true; atualizaHud(); var s;
    try { s = new WebSocket(urlServidor()); } catch(e){ N.tentando = false; return; }
    ws = s;
    s.onopen = function(){
      var S = ctx.getS(); send({ t: 'join', tk: (function(){ try { return localStorage.getItem('isblade.conta_token') || ''; } catch(e){ return ''; } })(), cid: (function(){ try { return localStorage.getItem('isblade_active_character_id') || ''; } catch(e){ return ''; } })(), sid: sessao(), nome: ctx.nome(), raca: ctx.tipo(), cls: /magic/.test(ctx.tipo()) ? 'magic' : 'fighter', arma: ctx.getWPN(), pmax: S.pmax, mapa: N.mapaAlvo, canal: N.canalAlvo | 0, x: r2(S.px), z: r2(S.pz) });
    };
    s.onmessage = function(ev){ try { msg(JSON.parse(ev.data)); } catch(e){ console.warn('net:', e); } };
    s.onclose = function(){
      var estava = N.on; N.on = false; N.tentando = false; remotos.forEach(function(e, id){ removeRemoto(id); }); remotos.clear(); N.duelo = null; N.alvo = 0; desenhaAlvo(); atualizaHud();
      if(ws !== s) return; if(estava) ctx.sysMsg('Desconectado do servidor.'); else if(!jaAvisou){ jaAvisou = true; console.log('Net: sem servidor online (jogo segue sozinho).'); }
    };
    s.onerror = function(){};
  }
  N.init = function(c){
    ctx = c; THREE = c.THREE; window.Net = N; try { desligado = /[?&]online=0/.test(location.search); } catch(e){}
    hud(); criaMenu();
    window.addEventListener('pointerdown', aoToque, true); setInterval(desenhaPed, 500);
    window.addEventListener('keydown', function(ev){
      if(ev.repeat) return; var t = ev.target && ev.target.tagName; if(t === 'INPUT' || t === 'TEXTAREA') return; var k = ev.key.toLowerCase();
      if(k === 't' && N.on){ selecionaMaisPerto(); return; }
      if(k === 'p'){ alterna(); return; } if(k === 'escape' && menuAberto){ alterna(false); return; } if(k === 'escape' && N.alvo){ selecionar(0); return; }
      if(!N.on) return;
      if(k === 'j' && N.mapa === 'cidade' && !N.duelo){ var al = maisProximo(20); if(al) send({ t: 'duel', to: al.id }); else ctx.sysMsg('Ninguem por perto para desafiar (ate 20 m)'); }
      else if(k === 'u'){ var tp = (pedGrupo && Date.now() < pedGrupo.ate && (!pedDuelo || pedGrupo.ate >= pedDuelo.ate)) ? 'grupo' : ((pedDuelo && Date.now() < pedDuelo.ate) ? 'duelo' : ''); if(tp) aceitar(tp); }
      else if(k === 'n'){ var tn = (pedGrupo && Date.now() < pedGrupo.ate && (!pedDuelo || pedGrupo.ate >= pedDuelo.ate)) ? 'grupo' : ((pedDuelo && Date.now() < pedDuelo.ate) ? 'duelo' : ''); if(tn) recusar(tn); }
      else if(k === 'h' && N.duelo) send({ t: 'dueldesiste' });
    });
  };
  N.entrar = function(mapa, canal){ if(!ctx || desligado) return; N.sair(); N.mapaAlvo = mapa; N.canalAlvo = canal | 0; conectar(); };
  N.sair = function(){ if(ws){ var s = ws; ws = null; try { s.close(); } catch(e){} } N.on = false; N.grupo = null; remotos.forEach(function(e, id){ removeRemoto(id); }); remotos.clear(); N.duelo = null; atualizaHud(); renderParty(); };
  N.tick = function(dt){
    if(!ctx || !N.on) return; tEnv += dt; tHud += dt;
    if(tEnv >= 1 / 12){
      tEnv = 0; var S = ctx.getS(), v = ctx.getVrm(), d = v && v.drv;
      send({ t: 'st', x: r2(S.px), z: r2(S.pz), f: r2(S.face), a: d ? d.curName : 'idle', ts: d && d.cur ? r2(d.cur.timeScale || 1) : 1, g: S.guard ? 1 : 0, w: ctx.getWPN() });
    }
    if(N.duelo && N.duelo.seg > 0){ N.duelo.seg = Math.max(0, (N.duelo.ini - Date.now()) / 1000); }
    if(pedido && Date.now() > pedido.ate) pedido = null;
    if(tHud > .5){ tHud = 0; atualizaHud(); renderParty(); if(menuAberto) renderMenu(); }
    atualizaRemotos(dt); atualizaAlvo();
  };
  /* chamados pelo jogo */
  N.atacou = function(an){
    if(!N.on || !an) return; var S = ctx.getS();
    if(an.skill){ var sk = ctx.skills(), i = -1; for(var j = 0; j < sk.length; j++) if(sk[j].name === an.skill.name){ i = j; break; } if(i < 0) return; send({ t: 'atk', k: 's', i: i, f: r2(S.face), p: an.part || 1 }); }
    else if(an.id && BASICOS[an.id]) send({ t: 'atk', k: 'b', id: an.id, f: r2(S.face) });
  };
  N.xp = function(tipo){ if(!N.on) return false; send({ t: 'xp', tipo: tipo }); return true; };               /* servidor decide o ganho */
  N.rolou = function(){ if(N.on) send({ t: 'roll' }); };
  N.controlaMorte = function(){ return N.on && N.mapa === 'pvp'; };           /* no mapa de PvP o reaparecimento e do servidor */
  N.status = function(){ return { on: N.on, mapa: N.mapa, canal: N.canal, id: N.id, remotos: remotos.size, duelo: N.duelo }; };
  return N;
})();
/* <<< CLAUDE [net] */
