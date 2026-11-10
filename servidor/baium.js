'use strict';
/* Luta do BAIUM no SERVIDOR (10/11/2026, pedido do dono: "leve a luta para o servidor"). Port FIEL da IA que rodava no navegador do lider (prototipo/arena.html):
   enemyThink, startAttack, resolveEnemyHit, triggerBaiumThunderStorm / spawnBaiumBolt (dano), hitGauge, tryLaunch. Nenhum numero e padrao foi mudado: os 6 ataques vem de
   data/combate.json -> boss.attacks e a arena de assets/maps/baium_house/mini_toi_regioes.json. Dificuldade: vida = 1800 x bossHp (dungeon.json); o dano escala no cliente (hurtPlayer).
   O cliente so desenha (bsnap) e manda o golpe (bhit), o parry e a provocacao. Mensagens para o jogador: dano = { t:'dg', k:'mdmg', ... } (o mesmo que o lider mandava aos convidados),
   raios = { t:'dg', k:'bolt', x, z, t }, estado do chefe = { t:'dgs', k:'bsnap', ex, ez, eh, ey, hp, mx, st, ak, dead }. */
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..', 'prototipo');
let ATK = {}, ARENA = { centro: [-28.4, -53.85], raio: 62, spawn: [-53.75, -100.46] }, DG = null;
function carrega(){
  try { ATK = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'combate.json'), 'utf8')).boss.attacks; } catch(e){ console.error('baium: sem combate.json', e.message); }
  try { const R = JSON.parse(fs.readFileSync(path.join(RAIZ, 'assets', 'maps', 'baium_house', 'mini_toi_regioes.json'), 'utf8')); if(R.arena) ARENA = { centro: R.arena.centro, raio: R.arena.raio, spawn: R.arena.spawn }; } catch(e){ console.error('baium: sem regioes da torre', e.message); }
  try { DG = JSON.parse(fs.readFileSync(path.join(RAIZ, 'data', 'dungeon.json'), 'utf8')); } catch(e){ console.error('baium: sem dungeon.json', e.message); }
}
carrega();
const BASE_HP = 1800, FOCO_S = 6, GMAX = 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDif = (a, b) => { let d = (b - a) % (Math.PI * 2); if(d > Math.PI) d -= Math.PI * 2; if(d < -Math.PI) d += Math.PI * 2; return d; };      /* igual ao angDiff do cliente: menor giro de a para b */
const fwd = a => [Math.sin(a), Math.cos(a)];
const r1 = v => Math.round(v * 10) / 10;

class Baium {
  constructor(chave, x, z){
    const D = DG && DG.difficulties && DG.difficulties[chave]; this.chave = chave; this.dif = D ? chave : 'normal';
    this.max = Math.round(BASE_HP * (D ? D.bossHp : 1)); this.hp = this.max;
    this.ex = ARENA.spawn[0]; this.ez = ARENA.spawn[1]; this.eh = 0;
    if(typeof x === 'number' && typeof z === 'number' && Math.hypot(x - ARENA.centro[0], z - ARENA.centro[1]) < ARENA.raio){ this.ex = x; this.ez = z; }      /* onde o cliente posicionou o Baium (duelo: centro; DG: perto da porta) */
 this.ey = 0; this.evy = 0; this.air = false; this.airHits = 0;
    this.E = { state: 'idle', t: 0, dur: 0, wait: 1.8, strafe: Math.random() < .5 ? 1 : -1, atk: null, cx: 0, cz: 0 };
    this.gauge = GMAX; this.gT = 0; this.dead = false; this.foco = null; this.fila = []; this.snapT = 0; this.t = 0; this.tStrike = -9; this.golpeados = new Set();
    this.dano = null; this.raio = null; this.snapFn = null;      /* callbacks do server.js: dano(J, ev), raio(x, z, t), snap(obj) */
  }
  /* o Baium so acorda quando alguem esta no salao (circulo do 3o andar), como o cliente: Torre.chefeAtivo() */
  ativo(vivos){ for(const P of vivos){ if(Math.hypot(P.x - ARENA.centro[0], P.z - ARENA.centro[1]) <= ARENA.raio + 1.5 && (typeof P.y !== 'number' || P.y > -12)) return true; } return false; }
  alvo(vivos){                                                              /* provocado (6 s) ou o jogador mais perto */
    if(this.foco && this.t < this.foco.ate){ const P = vivos.find(q => q.id === this.foco.id); if(P) return P; }
    let b = null, bd = 1e9; for(const P of vivos){ const d = Math.hypot(P.x - this.ex, P.z - this.ez); if(d < bd){ bd = d; b = P; } } return b;
  }
  setEstado(st, dur){ const E = this.E; E.state = st; E.t = 0; E.dur = dur || 0; }
  turnTo(want, vel, dt){ this.eh += clamp(angDif(this.eh, want), -vel * dt, vel * dt); }
  inAtk(atk, px, pz){
    const rx = px - this.ex, rz = pz - this.ez, h = fwd(this.eh);
    if(atk.type === 'circ') return Math.hypot(rx, rz) < atk.rad;
    const along = rx * h[0] + rz * h[1], side = Math.abs(rx * h[1] - rz * h[0]);
    return along > -.4 && along < atk.len && side < atk.w;
  }
  startAttack(d){
    const r = Math.random(); let k;
    if(d > 6.5) k = r < .45 ? 'storm' : (r < .75 ? 'charge' : (r < .9 ? 'smash' : 'slash'));
    else if(d < 3.2) k = r < .3 ? 'slash' : (r < .55 ? 'slam' : (r < .75 ? 'sweep' : (r < .9 ? 'smash' : 'storm')));
    else k = r < .25 ? 'slash' : (r < .45 ? 'sweep' : (r < .65 ? 'slam' : (r < .82 ? 'smash' : (r < .93 ? 'storm' : 'charge'))));
    this.E.atk = Object.assign({ key: k }, ATK[k] || ATK.slash); if(!ATK[k]) this.E.atk.key = 'slash';
    this.setEstado('windup', this.E.atk.wind);
  }
  resolve(atk, vivos){
    this.tStrike = this.t; this.golpeados = new Set();
    if(atk.key === 'storm') this.tempestade(vivos);
    for(const P of vivos){
      if(!this.inAtk(atk, P.x, P.z)) continue;
      if(atk.parry) this.golpeados.add(P.id);
      if(this.dano) this.dano(P, { t: 'dg', k: 'mdmg', dmg: atk.dmg, cost: atk.cost || 30, parry: !!atk.parry, aoe: atk.type === 'circ', interrupt: true, stun: .45 });
    }
  }
  /* seis raios: o 1o no jogador 0, o 2o perto do jogador 1, o 3o perto do chefe, ... (mesma ordem e tempos de triggerBaiumThunderStorm) */
  tempestade(vivos){
    const ps = vivos.length ? vivos : [{ x: this.ex, z: this.ez }]; const alvoP = i => ps[i % ps.length], rn = a => (Math.random() - .5) * a;
    const strikes = [[alvoP(0).x, alvoP(0).z, 100], [alvoP(1).x + rn(4), alvoP(1).z + rn(4), 350], [this.ex + rn(5), this.ez + rn(5), 550], [alvoP(2).x + rn(6), alvoP(2).z + rn(6), 750], [this.ex + rn(8), this.ez + rn(8), 950], [alvoP(3).x + rn(3), alvoP(3).z + rn(3), 1150]];
    for(const s of strikes){
      if(this.raio) this.raio(r1(s[0]), r1(s[1]), s[2]);
      this.fila.push({ t: this.t + (s[2] + 380) / 1000, fn: vv => {                       /* o raio cai 380 ms depois do aviso: quem esta a menos de 2 m leva 20-27 */
        for(const P of vv) if(Math.hypot(P.x - s[0], P.z - s[1]) < 2.0 && this.dano) this.dano(P, { t: 'dg', k: 'mdmg', dmg: Math.round(20 + Math.random() * 8), cost: 0, parry: false, aoe: true, interrupt: false, stun: .3 });
      } });
    }
  }
  tryLaunch(){ if(this.dead) return; if(!this.air){ this.air = true; this.evy = 7.5; this.airHits = 0; this.setEstado('stagger', 99); } else if(this.airHits < 6) this.evy = Math.max(this.evy, 3.2); this.airHits++; }
  hitGauge(gd, launch){
    const E = this.E; this.gT = 3;
    if(E.state === 'stagger' || this.air){ if(launch) this.tryLaunch(); return; }
    this.gauge -= gd; if(this.gauge <= 0){ this.gauge = 0; this.setEstado('stagger', 2.6); }
    if(launch && (this.gauge <= 0 || E.state === 'idle' || E.state === 'recover')) this.tryLaunch();
  }
  /* golpe de um jogador: d = dano, gd = dano na guarda do chefe, launch = lanca. Devolve true se matou. */
  hit(d, gd, launch){
    if(this.dead) return false; d = clamp(d | 0, 0, 6000); if(!d) return false;
    this.hp = Math.max(0, this.hp - d); this.hitGauge(clamp(+gd || 6, 0, 60), !!launch);
    if(this.hp <= 0){ this.dead = true; this.air = false; this.ey = 0; this.snap(true); return true; }
    return false;
  }
  parry(id){                                                                   /* defendeu a tempo um golpe que se pode aparar: o chefe cambaleia 1,8 s */
    if(this.dead || !this.golpeados.has(id) || this.t - this.tStrike > 1.0) return false; this.golpeados.delete(id); this.setEstado('stagger', 1.8); return true;
  }
  provoca(P, r, t){ if(this.dead || Math.hypot(this.ex - P.x, this.ez - P.z) > r + 3) return false; this.foco = { id: P.id, ate: this.t + FOCO_S }; return true; }
  snap(forca){ if(this.snapFn) this.snapFn({ t: 'dgs', k: 'bsnap', ex: r1(this.ex), ez: r1(this.ez), eh: r1(this.eh), ey: r1(this.ey), hp: Math.round(this.hp), mx: this.max, st: this.E.state, ak: (this.E.atk && this.E.atk.key) || '', dead: this.dead ? 1 : 0 }); }
  tick(t, dt, jog){
    this.t += dt;
    const vivos = jog.filter(P => !P.morto && !(P.hp <= 0));
    for(let i = this.fila.length - 1; i >= 0; i--){ if(this.t >= this.fila[i].t){ const e = this.fila.splice(i, 1)[0]; e.fn(vivos); } }
    this.gT = Math.max(0, this.gT - dt); if(this.gT <= 0 && this.E.state !== 'stagger' && !this.dead) this.gauge = Math.min(GMAX, this.gauge + 14 * dt);
    this.snapT -= dt; if(this.snapT <= 0){ this.snapT = .1; this.snap(); }
    if(this.dead) return;
    const alvo = this.alvo(vivos); if(!alvo || !this.ativo(vivos)) return;
    const E = this.E; E.t += dt;
    if(this.air){ this.evy -= 16 * dt; this.ey += this.evy * dt; if(this.ey <= 0){ this.ey = 0; this.air = false; this.evy = 0; this.setEstado('stagger', 1.0); } return; }
    const dx = alvo.x - this.ex, dz = alvo.z - this.ez, d = Math.hypot(dx, dz), want = Math.atan2(dx, dz), f = fwd(this.eh);
    if(E.state === 'idle'){
      this.turnTo(want, 3.6, dt);
      if(d > 3.5){ this.ex += f[0] * 3.0 * dt; this.ez += f[1] * 3.0 * dt; }
      else if(d < 2.2){ this.ex -= f[0] * 1.5 * dt; this.ez -= f[1] * 1.5 * dt; }
      else { const s = E.strafe * 1.4 * dt; this.ex += f[1] * s; this.ez -= f[0] * s; }
      if(E.t >= E.wait) this.startAttack(d);
    } else if(E.state === 'windup'){
      if(E.t < E.atk.wind * .55) this.turnTo(want, E.atk.type === 'circ' ? 2.4 : 3.4, dt);
      if(E.t >= E.atk.wind){ this.setEstado('strike', E.atk.dash ? .32 : .2); E.cx = this.ex; E.cz = this.ez; this.resolve(E.atk, vivos); }
    } else if(E.state === 'strike'){
      if(E.atk.dash){ const pr = clamp(E.t / .3, 0, 1), ez = 1 - Math.pow(1 - pr, 3), h = fwd(this.eh), dd = E.atk.dash * ez; this.ex = E.cx + h[0] * dd; this.ez = E.cz + h[1] * dd; }
      if(E.t >= E.dur) this.setEstado('recover', E.atk.rec);
    } else if(E.state === 'recover'){
      this.turnTo(want, 1.2, dt);
      if(E.t >= E.dur){ this.setEstado('idle'); E.wait = .7 + Math.random() * 1.0; E.strafe = Math.random() < .5 ? 1 : -1; }
    } else if(E.state === 'stagger'){
      if(E.t >= E.dur){ this.gauge = GMAX; this.setEstado('idle'); E.wait = .8 + Math.random() * 1.0; E.strafe = Math.random() < .5 ? 1 : -1; }
    }
    const R = ARENA.raio * .9979 - 1.2, cx = ARENA.centro[0], cz = ARENA.centro[1], rr = Math.hypot(this.ex - cx, this.ez - cz);      /* o Baium nunca sai do salao (Torre.chefe -> prender) */
    if(rr > R){ this.ex = cx + (this.ex - cx) * R / rr; this.ez = cz + (this.ez - cz) * R / rr; }
  }
}
const baiumOk = chave => chave === 'duelo' || !!(DG && DG.difficulties && DG.difficulties[chave]);
module.exports = { Baium, baiumOk, ARENA, ATK: () => ATK };
