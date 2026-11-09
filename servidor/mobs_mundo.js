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
  pantano:  { spots: 'blazing_swamp', pasta: 'blazing_swamp', grid: 'blazing_swamp_walkgrid', chaoMin: -30.8 }
};
const ALT = 2.0, PASSO = 1.04, FOCO_S = 6, BONUS_PT = [1, 1, 1.3, 1.39, 1.5, 1.54, 1.58];      /* XP total da party pelo numero de membros perto (estilo L2) */
let SP = null, DG = null; const GRADES = {};
function carrega(){ try { SP = J('data/spots.json'); DG = J('data/dungeon.json'); } catch(e){ console.error('mobs_mundo: dados', e.message); } }
carrega();

/* [campo] 09/11/2026: Campo de Talking Island (mundo aberto): relevo e spots vem do mapa-mundi (prototipo/assets/mundo/mundo_grade.*, tools/blender_mundo/exporta_mundo.py).
   Mob nao entra na cidade (100 m do centro) nem em celula nao andavel; spots por faixa de nivel. */
const CAMPO_TIPOS = { '1-5': ['sapo_curuma'], '5-10': ['aranha_curuma'], '10-15': ['stakato_curuma', 'stalker_curuma'], '15-20': ['formiga_fort', 'olho_fort'] };
const CAMPO_AGR = { '1-5': 0, '5-10': .15, '10-15': .25, '15-20': .3 };
let CAMPO = null;
function campo(){
  if(CAMPO !== null) return CAMPO;
  try {
    const dir = path.join(RAIZ, 'assets', 'mundo'), J = JSON.parse(fs.readFileSync(path.join(dir, 'mundo_grade.json'), 'utf8')), bin = fs.readFileSync(path.join(dir, 'mundo_grade.bin'));
    const n = J.nx * J.nz, B = J.bytes_celula || 9, H = new Float32Array(n), A = new Uint8Array(n);
    for(let k = 0; k < n; k++){ H[k] = bin.readInt16LE(k * B) / 100; A[k] = bin.readUInt8(k * B + 8); }
    const chao = (x, z) => {
      if(Math.hypot(x, z) < 100) return null; const fx = (x - J.x0) / J.passo, fz = (z - J.z0) / J.passo, i = Math.floor(fx), j = Math.floor(fz);
      if(i < 0 || j < 0 || i >= J.nx - 1 || j >= J.nz - 1 || !A[Math.round(fz) * J.nx + Math.round(fx)]) return null;
      const ax = fx - i, az = fz - j, k = j * J.nx + i, a = H[k] + (H[k + 1] - H[k]) * ax, b = H[k + J.nx] + (H[k + J.nx + 1] - H[k + J.nx]) * ax; return a + (b - a) * az;
    };
    const spots = (J.spots || []).map((s, i) => { const L = CAMPO_TIPOS[s.faixa] || CAMPO_TIPOS['1-5'], h = chao(s.x, s.z); return { tipo: L[i % L.length], n: 4, raio: 7, agr: CAMPO_AGR[s.faixa] || 0, x: s.x, z: s.z, h: h === null ? s.y : h }; });
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

class Mundo {
  constructor(mapa){
    this.mapa = mapa; const C = mapa === 'campo' ? campo() : null;
    this.G = C ? C.G : grade(mapa); this.M = C ? C.M : (SP && SP[CFG[mapa].spots]); this.prox = 1; this.mobs = new Map(); this.t = 0; this.tSpot = 0;
    const A = (DG && DG.agressao) || {}; this.A = { visao: A.visao || 7, ajuda: A.ajuda || 4.5, volta: A.volta || 26 };
    this.L = (this.M ? this.M.spots : []).map(s => ({ s, v: Array.from({ length: s.chefe ? 1 : Math.max(2, s.n | 0) }, () => ({ m: null, t: 0 })) }));
  }
  ok(){ return !!(this.M && this.G); }
  /* ponto livre no chao do spot */
  ponto(s){ for(let k = 0; k < 30; k++){ const a = Math.random() * 6.283, d = Math.sqrt(Math.random()) * s.raio, x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d, h = this.G.chao(x, z, s.h); if(h !== null && Math.abs(h - s.h) < 1.5) return [x, z, h]; } return null; }
  nasce(sp, vg, jog){
    const s = sp.s, T = DG.mobs[s.tipo]; if(!T) return; const p = this.ponto(s); if(!p) return;
    for(const P of jog) if(Math.hypot(P.x - p[0], P.z - p[1]) < 9) return;           /* nao nasce colado em ninguem */
    const m = { id: this.prox++, tipo: s.tipo, T, x: p[0], z: p[1], y: p[2], hx: p[0], hz: p[1], hy: p[2], f: Math.random() * 6.283, hp: T.hp, max: T.hp,
      agr: !!(s.chefe || T.agressivo || Math.random() < (s.agr || 0)), engaj: false, volta: false, vt: 0, st: 0, stT: 0, alvo: 0, dano: new Map(), foco: null, morto: false, mT: 0, chefe: !!s.chefe };
    this.mobs.set(m.id, m); vg.m = m;
    if(s.chefe && this.aviso) this.aviso(T.name + ' apareceu em ' + ({ curuma: 'Cruma', fortress: 'Fortaleza', pantano: 'Pantano Flamejante' })[this.mapa] + '!');
  }
  /* jogadores vivos do canal (lista de J do server.js) */
  tick(t, dt, jog){
    if(!this.ok()) return;
    const vivos = jog.filter(P => !P.morto);
    this.tSpot -= dt;
    if(this.tSpot <= 0){ this.tSpot = .5;
      for(const sp of this.L){
        const s = sp.s; let d = 1e9; for(const P of vivos) d = Math.min(d, Math.hypot(P.x - s.x, P.z - s.z));
        for(const vg of sp.v){
          if(vg.m && vg.m.morto && t - vg.m.mT > 2){ const mo = vg.m; this.mobs.delete(mo.id); vg.m = null; vg.t = t + (s.chefe ? (s.resp || 300) : (this.M.respawn || 30)) * (.85 + Math.random() * .3); if(s.chefe && this.aviso) this.aviso(mo.T.name + ' foi derrotado! Volta em cerca de ' + Math.round((vg.t - t) / 60) + ' min.'); }
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
    if(m.st === 1){ if(t >= m.stT){ this.golpe(m, P, vivos, t); m.st = 2; m.stT = t + (T.rec || 1.2); } return; }
    if(m.st === 2){ if(t >= m.stT) m.st = 0; return; }
    m.f = Math.atan2(dx, dz);
    if(T.ranged && T.keep && d < T.keep - 1){ this.anda(m, -dx, -dz, T.speed * .7 * dt); return; }        /* mago/olho: mantem distancia */
    if(d > alc){ this.anda(m, dx, dz, Math.min(d - alc * .8, T.speed * dt)); return; }
    m.st = 1; m.stT = t + (T.wind || .8);                                                            /* prepara o golpe (o jogo mostra e da para esquivar) */
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
module.exports = { grade, Mundo, CFG, BONUS_PT, recarrega: carrega, dif: mapa => mapa === 'campo' ? 'campo' : ((SP && SP[CFG[mapa].spots] && SP[CFG[mapa].spots].dif) || mapa) };
