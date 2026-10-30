/* Controle (CC): estados de golpe e super armadura (SA), regras do Dragon Nest. Ver DESIGN_COMBATE_CC.md.
   Mesmos numeros para PvE e PvP. Deterministico: sem sorte, para o combo ser aprendivel.
   Skill (data/armas/*.json): "q": SA Quebra 0-3 e "golpe": {"e": estado, "d": deslocamento em metros}
   (ou uma lista, um golpe por parte da skill). Duracao: tabela abaixo, ou "t" no golpe para trocar. */
export const CC = {
  /* segundos (marcados como proposta no design; ajustar jogando) */
  ESTADOS: { leve: .2, medio: .35, stagger: .6, empurrao: .8, derrubado: 1.2, lift: 1.5, stun: 1.8 },
  NOMES: { leve: 'IMPACTO', medio: 'IMPACTO', stagger: 'ATORDOADO LEVE', empurrao: 'EMPURRADO', derrubado: 'DERRUBADO', lift: 'NO AR', stun: 'STUN' },

  /* SA Defesa de um mob: brutamontes (armor) aguenta mais enquanto prepara o golpe; os outros nao tem */
  saMob(m) { return m.T.armor ? (m.state === 'windup' ? 2 : 1) : 0; },

  /* escolhe o golpe da skill para esta parte (hit 1, 2...) */
  golpeDe(skill, part) {
    var g = skill && skill.golpe;
    if (!g) return null;
    return Array.isArray(g) ? (g[(part || 1) - 1] || null) : ((!part || part === 1) ? g : null);
  },

  /* aplica o estado a um mob; devolve o nome do estado aplicado ou null se a SA aguentou */
  mob(m, skill, part, hooks) {
    var g = CC.golpeDe(skill, part);
    if (!g || m.dead) return null;
    if ((skill.q || 0) < CC.saMob(m)) return null;        /* SA Quebra < SA Defesa: so dano */
    var t = g.t || CC.ESTADOS[g.e];
    if (!t) return null;
    if (m.cc && m.cc.t > t) return m.cc.e;                /* nao encurta um controle maior que ja esta valendo */
    m.cc = { e: g.e, t: t };
    m.ccT = t;
    if (g.e === 'stun') m.stun = t;                       /* stun ja da +35% de dano (fraqueza) no damageMob */
    if (m.state === 'windup') { m.state = 'chase'; m.t = 0; m.wait = .4; }
    if (hooks && hooks.desloca && g.d) hooks.desloca(m, g.d);
    return g.e;
  },

  /* chamar todo quadro por mob; devolve true enquanto ele esta controlado (nao age) */
  tick(m, dt) {
    if (!(m.ccT > 0)) return false;
    m.ccT -= dt;
    if (m.ccT <= 0) { m.ccT = 0; m.cc = null; return false; }
    return true;
  }
};
