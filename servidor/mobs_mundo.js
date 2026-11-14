'use strict';
/* Mobs dos mapas abertos simulados no SERVIDOR (como no L2: todo mundo no canal ve e luta com os mesmos monstros). 08/11/2026, pedido do dono.
   Dados: prototipo/data/spots.json (spots por mapa), dungeon.json (mobs, agressao), progressao.json (XP), walkgrid do mapa (relevo/colisao).
   Um Mundo por canal de mapa aberto. O jogo (cliente) desenha os mobs pelo snapshot `ms` e manda o dano que causou (`mhit`);
   o golpe do mob vai para a vitima como `mdmg` (esquiva/guarda continuam no cliente).
   Regras (iguais as do cliente antigo, arena.html -> mobAgro/spotTick): maioria passiva; agressivo ataca quem chega a `visao` m; ao apanhar, vizinhos
   parados a `ajuda` m entram junto; puxado alem de `volta` m de casa: desiste, volta e recupera a vida. Spot so existe com jogador a `ativa` m;
   some (se nao estiver lutando) sem ninguem a `solta` m. Nasce longe (>= 9 m) dos jogadores. */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..', 'prototipo');
const J = f => JSON.parse(fs.readFileSync(path.join(RAIZ, f), 'utf8'));
const CFG = {                                                   /* mapa do servidor -> spots.json e walkgrid (mesmo do cliente: arena.html MAPAS_ABERTOS) */
  curuma:   { spots: 'curuma',        pasta: 'curuma',        grid: 'curuma_walkgrid',        chaoMin: -222.9 },
  fortress: { spots: 'fortress',      pasta: 'fortress',      grid: 'fortress_walkgrid',      chaoMin: -36.4 },
  pantano:  { spots: 'blazing_swamp', pasta: 'blazing_swamp', grid: 'blazing_swamp_walkgrid', chaoMin: -30.8 },
  torre:    { pasta: 'baium_house', grid: 'mini_toi_walkgrid', chaoMin: -1e9 }                       /* [dg-servidor] andares da Torre do Baium (DGs) */
};
const ALT = 2.0, PASSO = 1.04, FOCO_S = 6, BONUS_PT = [1, 1, 1.3, 1.39, 1.5, 1.54, 1.58];      /* XP total da party pelo numero de membros perto (estilo L2) */
let SP = null, DG = null; const GRADES = {};
function carrega(){ try { SP = J('data/spots.json'); DG = J('data/dungeon.json'); } catch(e){ console.error('mobs_mundo: dados', e.message); } }
carrega();

/* [campo] 09/11/2026: Campo de Talking Island (mundo aberto): relevo e spots vem do mapa-mundi (prototipo/assets/mundo/mundo_grade.*, tools/blender_mundo/exporta_mundo.py).
   Mob nao entra na cidade (100 m do centro) nem em celula nao andavel; spots por faixa de nivel. */
const CAMPO_TIPOS = { '1-5': ['sapo_curuma'], '5-10': ['aranha_curuma'], '10-15': ['stakato_curuma', 'stalker_curuma'], '15-20': ['formiga_fort'] };      /* [auditoria 13/11] o Olho subiu para a Cruma (Nv 21) */
const CAMPO_AGR = { '1-5': 0, '5-10': .15, '10-15': .25, '15-20': .3 };
let CAMPO = null;
function campo(){
  if(CAMPO !== null) return CAMPO;
  try {
    const dir = path.join(RAIZ, 'assets', 'mundo'), J = JSON.parse(fs.readFileSync(path.join(dir, 'mundo_grade.json'), 'utf8')), bin = fs.readFileSync(path.join(dir, 'mundo_grade.bin'));
    const n = J.nx * J.nz, B = J.bytes_celula || 9, H = new Float32Array(n), A = new Uint8Array(n), RG = new Uint8Array(n);
    for(let k = 0; k < n; k++){ H[k] = bin.readInt16LE(k * B) / 100; A[k] = bin.readUInt8(k * B + 8); RG[k] = bin.readUInt8(k * B + 7); }
    const chao = (x, z) => {
      if(Math.hypot(x, z) < 100) return null; const fx = (x - J.x0) / J.passo, fz = (z - J.z0) / J.passo, i = Math.floor(fx), j = Math.floor(fz);
      if(i < 0 || j < 0 || i >= J.nx - 1 || j >= J.nz - 1 || !A[Math.round(fz) * J.nx + Math.round(fx)]) return null;
      const ax = fx - i, az = fz - j, k = j * J.nx + i, a = H[k] + (H[k + 1] - H[k]) * ax, b = H[k + J.nx] + (H[k + J.nx + 1] - H[k + J.nx]) * ax; return a + (b - a) * az;
    };
    /* [lagos] ponto de monstro que caiu em agua funda (celula nao andavel) vai para a margem mais proxima */
    const noCampo = (x, z) => { if(chao(x, z) === null) return false; const i = Math.round((x - J.x0) / J.passo), j = Math.round((z - J.z0) / J.passo); return RG[j * J.nx + i] === 0; };      /* [auditoria 13/11] ponto do campo dentro da regiao de outro mapa tambem vai para fora (la vale o chao do mapa) */
    const margem = s => { if(noCampo(s.x, s.z)) return [s.x, s.z]; for(let r = 4; r <= 60; r += 4) for(let a = 0; a < 360; a += 15){ const x = s.x + Math.cos(a * Math.PI / 180) * r, z = s.z + Math.sin(a * Math.PI / 180) * r; if(noCampo(x, z) && chao(x + 5, z) !== null && chao(x - 5, z) !== null && chao(x, z + 5) !== null && chao(x, z - 5) !== null) return [x, z]; } return [s.x, s.z]; };
    const spots = (J.spots || []).map((s, i) => { const L = CAMPO_TIPOS[s.faixa] || CAMPO_TIPOS['1-5'], m = margem(s), h = chao(m[0], m[1]); return { tipo: L[i % L.length], n: 4, raio: 7, agr: CAMPO_AGR[s.faixa] || 0, x: m[0], z: m[1], h: h === null ? s.y : h }; });
    /* [auditoria 13/11] spots em volta dos mapas (data/spots.json -> mundo, coordenadas do MUNDO; gerados por tools/spots/rebalancear.js): tipo, dif (tabela de XP/drop), chefe */
    for(const s of ((SP && SP.mundo && SP.mundo.spots) || [])){ const h = chao(s.x, s.z); if(h !== null) spots.push(Object.assign({ n: 4, raio: 7, agr: 0 }, s, { h })); }
    CAMPO = { G: { chao: (x, z) => chao(x, z) }, M: { dif: 'campo', respawn: 30, ativa: 90, solta: 120, spots } };
  } catch(e){ console.error('mobs_mundo: sem o campo do mundo aberto', e.message); CAMPO = false; }
  return CAMPO;
}
function grade(mapa){
  if(GRADES[mapa] !== undefined) return GRADES[mapa];
  const C = CFG[mapa]; if(!C) return (GRADES[mapa] = null);
  try {
    const dir = path.join(RAIZ, 'assets', 'maps', C.pasta), j = JSON.parse(fs.readFileSync(path.join(dir, C.grid + '.json'), 'utf8'));
    const bin = fs.readFileSync(path.join(dir, C.grid + '.bin')), ab = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.length);
    const n = j.n, offs = new Uint32Array(ab, 0, n * n + 1), dv = new DataView(ab), base = 4 * (n * n + 1), st = j.bytes_por_camada || 3;
    const cam = (ix, iz) => { if(ix < 0 || iz < 0 || ix >= n || iz >= n) return null; const i = iz * n + ix, o = []; for(let k = offs[i]; k < offs[i + 1]; k++){ const p = base + st * k; o.push({ h: dv.getInt16(p, true) / j.altura_escala, l: dv.getUint8(p + 2) / j.livre_escala }); } return o; };
    /* altura do chao andavel perto da altura y (null = sem chao / parede) */
    const chao = (x, z, y) => { const L = cam(Math.floor((x - j.x0) / j.celula), Math.floor((-z - j.y0) / j.celula)); if(!L) return null; let b = null; for(const q of L){ if(q.h < C.chaoMin + .3 || q.l < ALT) continue; if(q.h <= y + PASSO && q.h >= y - 3 && (b === null || q.h > b)) b = q.h; } return b; };
    return (GRADES[mapa] = { chao });
  } catch(e){ console.error('mobs_mundo: sem walkgrid de', mapa, e.message); return (GRADES[mapa] = null); }
}

/* [pagina-unica] 09/11/2026: posicao de cada mapa no mapa-mundi (mundo_grade.json -> mapas: pos + rotY, a mesma rotacao Y do jogo).
   mundo = R(rotY) * local + pos. Com xf o Mundo trabalha em coordenadas do MUNDO (spots e chao convertidos): o canal da cidade tem o mundo inteiro. */
let POSMAPAS = null;
function posMapas(){
  if(POSMAPAS) return POSMAPAS;
  try { POSMAPAS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'assets', 'mundo', 'mundo_grade.json'), 'utf8')).mapas || {}; } catch(e){ POSMAPAS = {}; }
  return POSMAPAS;
}
function xfDe(mapa){ const P = posMapas()[mapa]; if(!P) return null; return { x: P.pos[0], y: P.pos[1], z: P.pos[2], c: Math.cos(P.rotY), s: Math.sin(P.rotY) }; }
const praMundo = (X, x, z) => [x * X.c + z * X.s + X.x, -x * X.s + z * X.c + X.z];
const praLocal = (X, x, z) => { const dx = x - X.x, dz = z - X.z; return [dx * X.c - dz * X.s, dx * X.s + dz * X.c]; };
class Mundo {
  constructor(mapa, xf){
    this.mapa = mapa; const C = mapa === 'campo' ? campo() : null;
    this.G = C ? C.G : grade(mapa); this.M = C ? C.M : (SP && SP[CFG[mapa].spots]); this.prox = 1; this.mobs = new Map(); this.t = 0; this.tSpot = 0;
    if(xf && this.G && this.M){                                       /* [pagina-unica] mapa encaixado no mundo */
      const G0 = this.G, X = xf; this.xf = X;
      this.G = { chao: (x, z, y) => { const l = praLocal(X, x, z), h = G0.chao(l[0], l[1], y - X.y); return h === null ? null : h + X.y; } };
      this.M = Object.assign({}, this.M, { spots: this.M.spots.map(s => { const p = praMundo(X, s.x, s.z); return Object.assign({}, s, { x: p[0], z: p[1], h: s.h + X.y }); }) });
    }
    this.difMapa = mapa === 'campo' ? 'campo' : ((SP && SP[CFG[mapa].spots] && SP[CFG[mapa].spots].dif) || mapa);
    const A = (DG && DG.agressao) || {}; this.A = { visao: A.visao || 7, ajuda: A.ajuda || 4.5, volta: A.volta || 26 };
    this.L = (this.M ? this.M.spots : []).map(s => ({ s, v: Array.from({ length: s.chefe ? 1 : Math.max(2, s.n | 0) }, () => ({ m: null, t: 0 })) }));
  }
  ok(){ return !!(this.M && this.G); }
  /* ponto livre no chao do spot */
  ponto(s){ for(let k = 0; k < 30; k++){ const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * s.raio, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d, h = this.G.chao(x, z, s.h); if(h !== null && Math.abs(h - s.h) < 1.5) return [x, z, h]; } return null; }
  nasce(sp, vg, jog){
    const s = sp.s, T = DG.mobs[s.tipo]; if(!T) return; const p = this.ponto(s); if(!p) return;
    for(const P of jog) if(Math.hypot(P.x - p[0], P.z - p[1]) < 9) return;           /* nao nasce colado em ninguem */
    const m = { id: this.novoId ? this.novoId() : this.prox++, dif: s.dif || this.difMapa, tipo: s.tipo, T, x: p[0], z: p[1], y: p[2], hx: p[0], hz: p[1], hy: p[2], f: Math.random() * 6.283, hp: T.hp, max: T.hp,
      agr: !!(s.chefe || T.agressivo || Math.random() < (s.agr || 0)), engaj: false, volta: false, vt: 0, st: 0, stT: 0, alvo: 0, dano: new Map(), foco: null, morto: false, mT: 0, chefe: !!s.chefe };
    this.mobs.set(m.id, m); vg.m = m;
    if(s.chefe && this.aviso && (s.resp || 300) >= 200) this.aviso(T.name + ' apareceu em ' + (s.local || ({ curuma: 'Cruma', fortress: 'Fortaleza', pantano: 'Pantano Flamejante' })[this.mapa] || 'Talking Island') + '!');
  }
  /* jogadores vivos do canal (lista de J do server.js) */
  tick(t, dt, jog){
    if(!this.ok()) return;
    const vivos = jog.filter(P => !P.morto && !(P.hp <= 0));      /* caido no mundo aberto (vida 0) nao e alvo */
    this.tSpot -= dt;
    if(this.tSpot <= 0){ this.tSpot = .5;
      for(const sp of this.L){
        const s = sp.s; let d = 1e9; for(const P of vivos) d = Math.min(d, Math.hypot(P.x - s.x, P.z - s.z));
        for(const vg of sp.v){
          if(vg.m && vg.m.morto && t - vg.m.mT > 2){ const mo = vg.m; this.mobs.delete(mo.id); vg.m = null; vg.t = t + (s.chefe ? (s.resp || 300) : (this.M.respawn || 30)) * (.85 + Math.random() * .3); if(s.chefe && this.aviso && (s.resp || 300) >= 200) this.aviso(mo.T.name + ' foi derrotado! Volta em cerca de ' + Math.round((vg.t - t) / 60) + ' min.'); }
          if(!vg.m){ if(d < (this.M.ativa || 80) && t >= vg.t) this.nasce(sp, vg, vivos); }
          else if(!vg.m.morto && d > (this.M.solta || 110) && !vg.m.engaj){ this.mobs.delete(vg.m.id); vg.m = null; }
        }
      }
    }
    for(const m of this.mobs.values()) if(!m.morto) this.ia(m, t, dt, vivos);
  }
  porId(jog, id){ return jog.find(P => P.id === id) || null; }
  engaja(m, ajuda){
    if(m.morto || (m.engaj && !m.volta)) return; m.engaj = true; m.volta = false; m.st = 0;
    if(ajuda === false) return;
    for(const o of this.mobs.values()) if(o !== m && !o.morto && !o.engaj && !o.volta && Math.hypot(o.x - m.x, o.z - m.z) <= this.A.ajuda) this.engaja(o, false);
  }
  anda(m, dx, dz, k){
    const d = Math.hypot(dx, dz) || 1, nx = m.x + dx / d * k, nz = m.z + dz / d * k, h = this.G.chao(nx, nz, m.y);
    if(h !== null && Math.abs(h - m.y) <= PASSO){ m.x = nx; m.z = nz; m.y = h; return true; }
    const hx = this.G.chao(nx, m.z, m.y); if(hx !== null && Math.abs(hx - m.y) <= PASSO){ m.x = nx; m.y = hx; return true; }      /* desliza na parede */
    const hz = this.G.chao(m.x, nz, m.y); if(hz !== null && Math.abs(hz - m.y) <= PASSO){ m.z = nz; m.y = hz; return true; }
    return false;
  }
  alvoDe(m, t, vivos){
    if(m.foco && t < m.foco.ate){ const P = this.porId(vivos, m.foco.id); if(P) return P; }
    if(m.alvo){ const P = this.porId(vivos, m.alvo); if(P) return P; }
    let b = null, bd = 1e9; for(const P of vivos){ const d = Math.hypot(P.x - m.x, P.z - m.z); if(d < bd){ bd = d; b = P; } } return b;
  }
  ia(m, t, dt, vivos){
    const T = m.T;
    if(m.volta){
      const vx = m.hx - m.x, vz = m.hz - m.z, vd = Math.hypot(vx, vz); m.vt += dt; m.hp = Math.min(m.max, m.hp + m.max * dt * .25);
      if(vd < .8 || m.vt > 12){ m.x = m.hx; m.z = m.hz; m.y = m.hy; m.volta = false; m.vt = 0; m.hp = m.max; m.dano.clear(); m.alvo = 0; return; }
      m.f = Math.atan2(vx, vz); if(!this.anda(m, vx, vz, Math.min(vd, T.speed * 1.4 * dt))){ m.x = m.hx; m.z = m.hz; m.y = m.hy; }
      return;
    }
    let P = null;
    if(!m.engaj){
      if(m.agr){ for(const Q of vivos) if(Math.hypot(Q.x - m.x, Q.z - m.z) <= this.A.visao && Math.abs((Q.y || m.y) - m.y) < 4){ m.alvo = Q.id; this.engaja(m); break; } }
      if(!m.engaj) return;
    }
    P = this.alvoDe(m, t, vivos);
    if(!P || Math.hypot(m.x - m.hx, m.z - m.hz) > this.A.volta || Math.hypot(P.x - m.x, P.z - m.z) > 35){      /* longe de casa ou alvo fugiu: desiste */ m.engaj = false; m.volta = true; m.vt = 0; m.st = 0; return; }
    m.alvo = P.id;
    const dx = P.x - m.x, dz = P.z - m.z, d = Math.hypot(dx, dz), alc = (T.range || 2) + .4;
    if(T.golpes){ this.iaChefe(m, P, vivos, t, dt, dx, dz, d); return; }                              /* [chefes-marcados] chefe com golpes marcados no chao */
    if(m.st === 1){ if(t >= m.stT){ this.golpe(m, P, vivos, t); m.st = 2; m.stT = t + (T.rec || 1.2); } return; }
    if(m.st === 2){ if(t >= m.stT) m.st = 0; return; }
    m.f = Math.atan2(dx, dz);
    if(T.ranged && T.keep && d < T.keep - 1){ this.anda(m, -dx, -dz, T.speed * .7 * dt); return; }        /* mago/olho: mantem distancia */
    if(d > alc){ this.anda(m, dx, dz, Math.min(d - alc * .8, T.speed * dt)); return; }
    m.st = 1; m.stT = t + (T.wind || .8);                                                            /* prepara o golpe (o jogo mostra e da para esquivar) */
  }
  /* [chefes-marcados] 14/11/2026 (dono): chefe de campo com luta corrida e TODO golpe marcado no chao (como o Baium). Dados: dungeon.json -> mobs.<tipo>.golpes
     (k = cone | rect | hex; ver tools/spots/rebalancear.js -> VAR). O servidor escolhe o golpe, manda as marcas (`mtele`: o jogo desenha e enche ate o dano) e, quando o tempo
     de cada marca acaba, fere quem esta dentro (`mdmg` com a marca em `z`: o jogo confere a propria posicao, entao esquivar/sair da marca funciona sem atraso de rede).
     Abaixo de 35% de vida: furia (marcas 25% mais rapidas). Marca = { k, x, z, ang, a, b, t0, t }: cone a = raio, b = meio-angulo; rect a = comprimento, b = largura; hex a = raio. */
  iaChefe(m, P, vivos, t, dt, dx, dz, d){
    const T = m.T;
    if(m.st === 1){
      for(const q of m.marcas){
        if(q.segue && !q.env && t >= q.t0){ q.env = true; const Q = this.porId(vivos, q.segue); if(Q){ q.x = Q.x; q.z = Q.z; } if(this.tele) this.tele(this.msgTele(m, [q], t)); }      /* marca que persegue: sai onde o alvo esta agora */
        if(!q.ok && t >= q.t){ q.ok = true; this.fereMarca(m, q, vivos); if(q.avanca) this.avanca(m, q.avanca); }
      }
      if(t >= m.stT){ m.st = 2; m.stT = t + (m.gp.rec || .8) * m.furia; }
      return;
    }
    if(m.st === 2){ if(t >= m.stT) m.st = 0; return; }
    m.f = Math.atan2(dx, dz);
    const alc = (T.range || 2) + .4, perto = d <= alc, cabe = T.golpes.filter(g => d <= g.dist && d >= (g.min || 0));
    if(!perto && !(cabe.length && t >= (m.longeT || 0))){ this.anda(m, dx, dz, Math.min(d - alc * .8, T.speed * dt)); return; }      /* longe: so usa golpe de alcance de vez em quando; no resto corre atras */
    let L = cabe.length ? cabe : [T.golpes.reduce((a, b) => (b.min || 0) < (a.min || 0) ? b : a)];
    if(L.length > 1) L = L.filter(g => g !== m.gp);                                                    /* nao repete o mesmo golpe em seguida */
    let tot = 0; for(const g of L) tot += g.peso || 1; let r = Math.random() * tot, g = L[0]; for(const x of L){ r -= x.peso || 1; if(r <= 0){ g = x; break; } }
    m.furia = m.hp < m.max * .35 ? .75 : 1; m.longeT = t + 2 + Math.random() * 2;
    const wind = (g.wind || .8) * m.furia, n = Math.max(1, g.n | 0), M = [];
    for(let i = 0; i < n; i++){
      const t0 = t + i * (g.intervalo || 0) * m.furia, q = { k: g.k, x: m.x, z: m.z, y: m.y, ang: m.f, t0, t: t0 + wind, ok: false, g };
      if(g.k === 'hex'){ q.a = g.rad; q.b = 0;
        if(g.mira){ const e = i ? (g.espalha || 0) : 0, a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * e; q.x = P.x + Math.cos(a) * rr; q.z = P.z + Math.sin(a) * rr; q.y = P.y === undefined ? m.y : P.y; q.segue = !e && i > 0 ? P.id : 0; } }      /* espalha 0: cada marca cai onde o alvo ESTIVER quando ela comeca (persegue) */
      else { q.ang = m.f + (n > 1 ? (i - (n - 1) / 2) * (g.abre || 0) : 0); if(g.k === 'cone'){ q.a = g.rad; q.b = g.half; } else { q.a = g.len; q.b = g.w; if(g.avanca && i === n - 1) q.avanca = g.avanca; } }
      M.push(q);
    }
    m.gp = g; m.marcas = M; m.st = 1; m.stT = M[M.length - 1].t;
    if(this.tele) this.tele(this.msgTele(m, M.filter(q => !q.segue), t));
  }
  msgTele(m, M, t){ const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;
    return { t: 'mtele', id: m.id, n: m.gp.nome || '', c: m.T.css || '', L: M.map(q => [q.k, r1(q.x), r1(q.z), r1(q.y), r2(q.ang), q.a, q.b, r2(Math.max(0, q.t0 - t)), r2(q.t - Math.max(t, q.t0))]) }; }
  dentroMarca(q, px, pz, mg){
    const dx = px - q.x, dz = pz - q.z, d = Math.hypot(dx, dz);
    if(q.k === 'hex') return d <= q.a * .92 + mg;
    if(q.k === 'cone'){ if(d > q.a + mg) return false; if(d < 1) return true; let df = Math.atan2(dx, dz) - q.ang; while(df > Math.PI) df -= 6.2832; while(df < -Math.PI) df += 6.2832; return Math.abs(df) <= q.b + mg / d; }
    const s = Math.sin(q.ang), c = Math.cos(q.ang), fr = dx * s + dz * c, la = dx * c - dz * s; return fr >= -.6 - mg && fr <= q.a + mg && Math.abs(la) <= q.b / 2 + mg;
  }
  fereMarca(m, q, vivos){
    if(m.morto || !this.fere) return; const g = q.g, dmg = Math.max(1, Math.round(m.T.dmg * (g.mul || 1)));
    for(const Q of vivos){
      if(Math.abs((Q.y === undefined ? m.y : Q.y) - q.y) > 5 || !this.dentroMarca(q, Q.x, Q.z, 1.5)) continue;       /* folga de 1,5 m: quem decide de verdade e o jogo de quem apanha (posicao exata) */
      this.fere(Q, { t: 'mdmg', de: m.id, dmg, cost: 42, parry: !!g.parry, aoe: !g.parry, interrupt: !!g.interrompe, stun: g.stun || 0, z: [q.k, Math.round(q.x * 10) / 10, Math.round(q.z * 10) / 10, Math.round(q.ang * 100) / 100, q.a, q.b] });
    }
  }
  avanca(m, dist){                                                     /* o chefe corre pela marca (sem passar do limite de volta para casa) */
    const sx = Math.sin(m.f), sz = Math.cos(m.f);
    for(let p = 0; p < dist; p += .5){ const x0 = m.x, z0 = m.z, y0 = m.y; if(!this.anda(m, sx, sz, .5)) break; if(Math.hypot(m.x - m.hx, m.z - m.hz) > this.A.volta - 3){ m.x = x0; m.z = z0; m.y = y0; break; } }
  }
  golpe(m, P, vivos, t){
    const T = m.T, alvos = T.aoe ? vivos.filter(Q => Math.hypot(Q.x - m.x, Q.z - m.z) <= (T.range || 2) + 1.2) : [P];
    for(const Q of alvos){
      const d = Math.hypot(Q.x - m.x, Q.z - m.z); if(!T.aoe && d > (T.range || 2) + 2.2) continue;     /* saiu do alcance durante a preparacao */
      const ev = { t: 'mdmg', de: m.id, dmg: T.dmg, cost: T.armor ? 42 : 24, parry: !T.aoe, aoe: !!T.aoe, interrupt: !!T.interrupt, stun: T.stun || 0 };
      if(T.ranged){ const atraso = Math.min(1.5, d / (T.projSpeed || 10)); if(this.tiro) this.tiro(m, Q, atraso); if(this.fere) setTimeout(() => this.fere(Q, ev), atraso * 1000); }
      else if(this.fere) this.fere(Q, ev);
    }
  }
  /* dano do jogador J no mob id: devolve o mob se morreu */
  hit(Jg, id, d, t){
    const m = this.mobs.get(id); if(!m || m.morto) return null;
    if(Math.hypot(Jg.x - m.x, Jg.z - m.z) > 26) return null;                                          /* longe demais para ter acertado */
    d = Math.max(0, Math.min(2500, d | 0)); if(!d) return null;
    if(m.T.armor) d = Math.max(1, Math.round(d * .85));
    m.hp = Math.max(0, m.hp - d); m.dano.set(Jg.id, (m.dano.get(Jg.id) || 0) + d);
    if(!m.engaj || m.volta){ m.volta = false; m.alvo = Jg.id; this.engaja(m); }
    if(m.hp <= 0){ m.morto = true; m.mT = t; m.st = 0; return m; }
    return null;
  }
  taunt(Jg, r, t){ let n = 0; for(const m of this.mobs.values()){ if(m.morto || Math.hypot(m.x - Jg.x, m.z - Jg.z) > r) continue; m.foco = { id: Jg.id, ate: t + FOCO_S }; m.alvo = Jg.id; if(!m.engaj) this.engaja(m, false); n++; } return n; }
  /* quem mais bateu leva o abate */
  dono(m){ let b = 0, bd = -1; for(const [id, v] of m.dano) if(v > bd){ bd = v; b = id; } return b; }
  snap(P, aoi){
    const o = [];
    for(const m of this.mobs.values()){
      if(Math.abs(m.x - P.x) > aoi || Math.abs(m.z - P.z) > aoi) continue;
      o.push([m.id, m.tipo, Math.round(m.x * 10) / 10, Math.round(m.z * 10) / 10, Math.round(m.y * 10) / 10, Math.round(m.f * 10) / 10, Math.round(m.hp), m.max, m.st, m.morto ? 1 : 0, m.agr ? 1 : 0, m.alvo || 0]);
    }
    return o;
  }
}
/* [dg-servidor] 10/11/2026 (roadmap Fase 6: "Mobs e DGs simulados no servidor"): as ondas da DG da Torre (normal / medio / hard) rodam AQUI, nao mais no lider do grupo.
   Mesma IA dos mapas abertos (Mundo: agressao, ajuda, volta, golpe, projetil, taunt), com a regra de ondas que ficava em arena.html (torreDgLoad / torreTick / torreCheck):
   mobs iniciais em anel de 16-46 m em volta do ponto de entrada do andar; reaparece um a cada `respawn` s ate `meta` abates; matar a meta E todos os mini-chefes limpa o andar;
   `tempo` acabou = fim. Dificuldade: vida e velocidade escalam aqui; o dano escala no cliente (hurtPlayer), como sempre. O chefe Baium continua no cliente do lider. */
const TORRE_Y = [-62.0, -33.8, -3.8];
class MundoDg extends Mundo {
  constructor(chave){
    super('torre'); const cfg = DG && DG.torre && DG.torre[chave], D = DG && DG.difficulties && DG.difficulties[chave]; this.chave = chave; this.cfg = cfg; this.D = D; this.dg = true;
    this.M = { dif: chave, respawn: 0, spots: [] }; this.evento = null; this.fim = false; this.limpo = false;
    this.TT = {}; for(const [k, T] of Object.entries(DG.mobs || {})) this.TT[k] = Object.assign({}, T, { hp: Math.round(T.hp * D.hp), speed: T.speed * D.speed });
    this.y = TORRE_Y[(cfg.andar || 1) - 1]; this.sp = this.achaSpawn(); this.iniciar();
  }
  ok(){ return !!(this.G && this.cfg && this.D); }
  livre(x, z, y){ for(const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]){ const h = this.G.chao(x + dx, z + dz, y); if(h === null || Math.abs(h - y) > .7) return false; } return true; }
  achaSpawn(){                                                       /* o ponto livre mais perto do centro da torre, com 2 m de folga em volta (igual a torre.js achaSpawn) */
    const cx = -27.05, cz = -50.71;
    for(let r = 0; r < 70; r++){ const n = r ? Math.ceil(r * 6.3) : 1; for(let a = 0; a < n; a++){ const ang = r ? a / n * 6.283 : 0, x = cx + Math.cos(ang) * r, z = cz + Math.sin(ang) * r; let ok = true;
      for(let k = 0; k < 9 && ok; k++){ const h = this.G.chao(x + (k % 3 - 1) * 2, z + (Math.floor(k / 3) - 1) * 2, this.y + .6); if(h === null || Math.abs(h - this.y) > .7) ok = false; } if(ok) return [x, z]; } }
    return [cx, cz];
  }
  pontoAnel(rmin, rmax, longeDe){
    for(let t = 0; t < 200; t++){ const a = Math.random() * 6.283, r = rmin + Math.random() * (rmax - rmin), x = this.sp[0] + Math.cos(a) * r, z = this.sp[1] + Math.sin(a) * r;
      if(!this.livre(x, z, this.y)) continue; if(longeDe && longeDe.some(P => Math.hypot(P.x - x, P.z - z) < 12) && t < 190) continue; return [x, z, this.G.chao(x, z, this.y)]; }
    return null;
  }
  agrDe(T){ return !!(T.isMiniBoss || T.agressivo || Math.random() < (this.D.agressivos || 0)); }
  cria(tipo, p){
    const T = this.TT[tipo]; if(!T || !p) return null;
    const m = { id: this.prox++, dif: this.chave, tipo, T, x: p[0], z: p[1], y: p[2], hx: p[0], hz: p[1], hy: p[2], f: Math.random() * 6.283, hp: T.hp, max: T.hp, agr: this.agrDe(T), engaj: false, volta: false, vt: 0, st: 0, stT: 0, alvo: 0, dano: new Map(), foco: null, morto: false, mT: 0, chefe: !!T.isMiniBoss };
    this.mobs.set(m.id, m); return m;
  }
  iniciar(){                                                          /* (re)comeca o andar */
    this.mobs.clear(); this.kr = 0; this.total = 0; this.nReg = 0; this.tLeft = this.cfg.tempo || 0; this.rsp = 0; this.fim = false; this.limpo = false; this.tEst = 0;
    for(const [tipo, n] of this.cfg.mobs){ const cnt = Math.max(1, Math.round(n * (this.D.count || 1))); this.total += cnt; if(!(DG.mobs[tipo] && DG.mobs[tipo].isMiniBoss)) this.nReg += cnt;
      for(let i = 0; i < cnt; i++) this.cria(tipo, this.pontoAnel(16, 46)); }
  }
  reiniciar(){ this.iniciar(); if(this.evento) this.evento(this.estado('reiniciou')); }
  estado(k){ return { t: 'dgs', k: k || 'estado', limpo: this.limpo ? 1 : 0, kr: this.kr, tot: this.total, nr: this.nReg, tl: Math.round(this.tLeft), meta: this.cfg.meta || 0 }; }
  tick(t, dt, jog){
    if(!this.ok() || this.fim || this.limpo) return;
    const vivos = jog.filter(P => !P.morto && !(P.hp <= 0));
    if(this.cfg.tempo && vivos.length){ this.tLeft -= dt; if(this.tLeft <= 0){ this.fim = true; if(this.evento) this.evento({ t: 'dgs', k: 'fim' }); return; } }
    let vv = 0; for(const m of this.mobs.values()) if(!m.morto && !m.chefe) vv++;
    this.rsp -= dt;
    if(this.rsp <= 0 && this.cfg.meta && this.kr + vv < this.cfg.meta && vv < this.nReg){
      this.rsp = this.cfg.respawn || 3;
      const tipos = this.cfg.mobs.filter(mb => !(DG.mobs[mb[0]] && DG.mobs[mb[0]].isMiniBoss)); let tot = 0; for(const mb of tipos) tot += mb[1];
      let r = Math.random() * tot, tp = tipos[0][0]; for(const mb of tipos){ r -= mb[1]; if(r <= 0){ tp = mb[0]; break; } }
      const p = this.pontoAnel(16, 46, vivos); if(p && this.cria(tp, p)) this.total++;
    }
    for(const m of [...this.mobs.values()]){ if(m.morto){ if(t - m.mT > 2.6) this.mobs.delete(m.id); } else this.ia(m, t, dt, vivos); }
    this.tEst -= dt; if(this.tEst <= 0){ this.tEst = .5; if(this.evento) this.evento(this.estado()); }
  }
  /* chamado pelo servidor depois de um abate: conta e confere se o andar limpou */
  aoMatar(m){
    if(this.limpo || this.fim) return; if(!m.chefe) this.kr++;
    let chefe = false; for(const o of this.mobs.values()) if(!o.morto && o.chefe) chefe = true;
    if(this.kr >= (this.cfg.meta || 0) && !chefe){ this.limpo = true; for(const o of [...this.mobs.values()]) if(!o.morto) this.mobs.delete(o.id); if(this.evento) this.evento(Object.assign(this.estado('clear'), { kr: this.kr })); }
    else if(this.evento) this.evento(this.estado());
  }
}
const dgTorreOk = chave => !!(DG && DG.torre && DG.torre[chave] && DG.difficulties && DG.difficulties[chave]);
const criaDg = chave => { const W = new MundoDg(chave); return W.ok() ? W : null; };
/* [pagina-unica] o mundo aberto inteiro num canal (o da cidade): Campo + Cruma + Fortaleza + Pantano, cada um com seus spots e seu chao,
   tudo em coordenadas do mundo. Mesma interface do Mundo (server.js nao muda). Ids unicos entre os mapas. */
class Mundos {
  constructor(lista){
    this.mapa = 'campo'; this.prox = 1; const novoId = () => this.prox++;
    this.subs = lista.map(([mapa, xf]) => new Mundo(mapa, xf)).filter(W => W.ok());
    this.subs.forEach(W => { W.novoId = novoId; });
  }
  ok(){ return this.subs.length > 0; }
  set fere(f){ this.subs.forEach(W => { W.fere = f; }); }
  set tiro(f){ this.subs.forEach(W => { W.tiro = f; }); }
  set aviso(f){ this.subs.forEach(W => { W.aviso = f; }); }
  set tele(f){ this.subs.forEach(W => { W.tele = f; }); }                      /* [chefes-marcados] */
  tick(t, dt, jog){ for(const W of this.subs) W.tick(t, dt, jog); }
  hit(Jg, id, d, t){ for(const W of this.subs) if(W.mobs.has(id)) return W.hit(Jg, id, d, t); return null; }
  taunt(Jg, r, t){ let n = 0; for(const W of this.subs) n += W.taunt(Jg, r, t); return n; }
  dono(m){ return this.subs[0].dono(m); }
  snap(P, aoi){ let o = []; for(const W of this.subs) o = o.concat(W.snap(P, aoi)); return o; }
}
const mundoAberto = () => new Mundos([['campo', null]].concat(Object.keys(CFG).map(k => [k, xfDe(k)]).filter(q => q[1])));
module.exports = { grade, Mundo, Mundos, mundoAberto, MundoDg, criaDg, dgTorreOk, xfDe, praMundo, praLocal, CFG, BONUS_PT, recarrega: carrega, dif: mapa => mapa === 'campo' ? 'campo' : ((SP && SP[CFG[mapa].spots] && SP[CFG[mapa].spots].dif) || mapa) };
