/* Contas do IS BLADE: cadastro rapido (usuario + senha, sem e-mail) e salvamento dos personagens no servidor.
   Rotas (JSON):  POST /api/conta/criar | /api/conta/entrar  {user, senha} -> {token, user, rev, chaves}
                  GET  /api/dados  (Authorization: Bearer <token>)         -> {rev, chaves}
                  PUT  /api/dados  {chaves}                                -> {rev}
                  POST /api/conta/sair                                      -> {ok}
                  GET  /api/personagens                                     -> {pers}
                  POST /api/personagens {name,race,charType,set,weapon,hairStyle,hairColor} -> {pers, char}   (cria; nome unico no servidor; ate PERS_MAX por conta)
                  POST /api/personagens/renomear {id,name} | /api/personagens/apagar {id}  -> {pers}
   O SERVIDOR e o dono dos personagens: a lista vem sempre de c.pers; o cliente nao consegue criar, apagar nem inventar personagem pelo /api/dados (so atualiza nivel/local
   dos que ja sao da conta, e guarda o progresso (inv, skills...) de ids que a conta possui).
   'chaves' = copia das chaves 'isblade*' do localStorage (personagens, inventario, skills, barra...). Senha com scrypt + sal; o token e guardado so como hash.
   Arquivo: <DATA_DIR>/contas.json (padrao servidor/dados/, fora do git). Sem recuperacao de senha por enquanto (nao pedimos e-mail). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

module.exports = function(opts){
  const DIR = opts.dir, FILE = path.join(DIR, 'contas.json'), origemOk = opts.origemOk;
  const MAX_CORPO = 300 * 1024, MAX_VALOR = 120 * 1024, MAX_CHAVES = 400, MAX_TOKENS = 6, PERS_MAX = 5, NOME_RE = /^[A-Za-z\u00C0-\u00FF0-9][A-Za-z\u00C0-\u00FF0-9 _-]{1,15}$/;
  let DB = { contas: {} };
  try { fs.mkdirSync(DIR, { recursive: true }); DB = JSON.parse(fs.readFileSync(FILE, 'utf8')); if(!DB.contas) DB.contas = {}; } catch(e){ DB = { contas: {} }; }
  let gravando = null;
  function grava(){
    if(gravando) return;
    gravando = setTimeout(() => {
      gravando = null; const tmp = FILE + '.tmp';
      try { fs.writeFileSync(tmp, JSON.stringify(DB)); fs.renameSync(tmp, FILE); } catch(e){ console.error('contas: falha ao gravar', e.message); }
    }, 400);
  }
  process.on('exit', () => { try { if(gravando) fs.writeFileSync(FILE, JSON.stringify(DB)); } catch(e){} });

  const sha = s => crypto.createHash('sha256').update(s).digest('hex');
  const hashSenha = (senha, sal) => crypto.scryptSync(senha, sal, 32, { N: 16384 }).toString('hex');
  const iguais = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

  /* limite por IP: 30 pedidos/min em geral e 10 contas novas/hora */
  const lim = new Map();
  function limite(ip, chave, max, janelaMs){
    const k = chave + '|' + ip, t = Date.now(), a = (lim.get(k) || []).filter(x => t - x < janelaMs);
    if(a.length >= max){ lim.set(k, a); return false; }
    a.push(t); lim.set(k, a); return true;
  }
  setInterval(() => { const t = Date.now(); for(const [k, a] of lim) if(!a.some(x => t - x < 3600e3)) lim.delete(k); }, 600e3).unref();

  function cors(req, res){
    const o = req.headers.origin;
    if(o && origemOk(o)){ res.setHeader('access-control-allow-origin', o); res.setHeader('vary', 'origin'); }
    res.setHeader('access-control-allow-headers', 'authorization, content-type'); res.setHeader('access-control-allow-methods', 'GET, PUT, POST, OPTIONS'); res.setHeader('access-control-max-age', '600');
  }
  function resp(res, cod, obj){ res.writeHead(cod, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); }
  function corpo(req){
    return new Promise((ok, falha) => {
      let n = 0; const p = [];
      req.on('data', c => { n += c.length; if(n > MAX_CORPO){ falha(new Error('grande')); req.destroy(); } else p.push(c); });
      req.on('end', () => { try { ok(JSON.parse(Buffer.concat(p).toString('utf8') || '{}')); } catch(e){ falha(new Error('json')); } });
      req.on('error', falha);
    });
  }
  function quem(req){
    const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || ''); if(!m) return null;
    const h = sha(m[1]);
    for(const u in DB.contas){ const c = DB.contas[u]; if(c.tokens.some(t => t.h === h)) return c; }
    return null;
  }
  function novoToken(c){
    const tk = crypto.randomBytes(32).toString('hex'); c.tokens.push({ h: sha(tk), t: Date.now() }); if(c.tokens.length > MAX_TOKENS) c.tokens.shift(); return tk;
  }
  function limpaChaves(ch){
    if(!ch || typeof ch !== 'object' || Array.isArray(ch)) return null;
    const ks = Object.keys(ch); if(ks.length > MAX_CHAVES) return null; const o = {};
    for(const k of ks){ const v = ch[k]; if(!/^isblade[._a-zA-Z0-9-]{0,90}$/.test(k) || typeof v !== 'string' || v.length > MAX_VALOR) return null; o[k] = v; }
    return o;
  }

  /* ---- personagens (dono: o servidor) ---- */
  const PROG = ['isblade.inv.', 'isblade.skillSel.', 'isblade.mastery.', 'isblade.dgbest.', 'isblade.custom_slots_v5.', 'isblade.hotbar_keys.', 'isblade.hotbar_init.'];
  const chaveNome = n => String(n).trim().toLowerCase();
  function nomeLivre(n, exceto){ const k = chaveNome(n); for(const u in DB.contas) for(const p of (DB.contas[u].pers || [])) if(p.id !== exceto && chaveNome(p.name) === k) return false; return true; }
  function migra(c){                                                /* contas antigas: os personagens que estavam no blob viram personagens do servidor (sem o "Icaro" de brinde) */
    if(c.pers) return; c.pers = [];
    try {
      const a = JSON.parse((c.dados.chaves || {}).isblade_characters || '[]');
      for(const x of a){
        if(!x || !/^char_[A-Za-z0-9_]{1,40}$/.test(x.id) || c.pers.length >= PERS_MAX) continue;
        if(x.id === 'char_default_1' && x.createdAt === 'Oficial' && (x.level | 0) <= 1) continue;
        let nome = String(x.name || 'Heroi').trim().slice(0, 16); if(!NOME_RE.test(nome)) nome = 'Heroi'; let k = nome, i = 2; while(!nomeLivre(k)){ k = nome.slice(0, 13) + ' ' + i++; }
        c.pers.push(limpaPers(Object.assign({}, x, { name: k })));
      }
    } catch(e){}
  }
  function limpaPers(x){
    const id = /^char_[A-Za-z0-9_]{1,40}$/.test(x.id) ? x.id : 'char_' + crypto.randomBytes(6).toString('hex'), tok = (v, d) => (/^[a-z0-9_]{1,30}$/.test(String(v || '')) ? String(v) : d);
    return { id, name: String(x.name).trim().slice(0, 16), race: tok(x.race, 'human_fighter'), charType: tok(x.charType, tok(x.race, 'human_fighter')), set: tok(x.set, 'starter'), weapon: /^(none|shield|sword)$/.test(x.weapon) ? x.weapon : 'sword',
      hairStyle: tok(x.hairStyle, 'both'), hairColor: /^#[0-9a-fA-F]{6}$/.test(x.hairColor || '') ? x.hairColor : '#ffffff', level: Math.max(1, Math.min(100, x.level | 0 || 1)), location: String(x.location || 'Talking Island').slice(0, 30), xp: Math.max(0, x.xp | 0), createdAt: String(x.createdAt || new Date().toLocaleDateString('pt-BR')).slice(0, 20) };
  }
  function chavesDaConta(c){                                        /* o que o cliente recebe: lista de personagens do servidor + progresso so dos ids que a conta possui */
    migra(c); const ids = new Set(c.pers.map(p => p.id)), out = {}, ch = c.dados.chaves || {};
    for(const k in ch){ if(k === 'isblade_characters') continue; const dono = PROG.find(pf => k.startsWith(pf)); if(dono){ if(ids.has(k.slice(dono.length))) out[k] = ch[k]; } else out[k] = ch[k]; }
    out.isblade_characters = JSON.stringify(c.pers); return out;
  }
  function guardaChaves(c, ch){                                      /* PUT: personagem so muda nivel/local; criar/apagar so pelas rotas */
    migra(c); let inc = []; try { inc = JSON.parse(ch.isblade_characters || '[]'); } catch(e){}
    for(const x of inc){ const p = c.pers.find(q => q.id === (x && x.id)); if(p){ if(typeof x.location === 'string') p.location = x.location.slice(0, 30); }                /* nivel e xp: so o servidor decide */ }
    const ids = new Set(c.pers.map(p => p.id)), out = {};
    for(const k in ch){ if(k === 'isblade_characters') continue; const dono = PROG.find(pf => k.startsWith(pf)); if(dono && !ids.has(k.slice(dono.length))) continue; out[k] = ch[k]; }
    return out;
  }
  function validaToken(tk){ if(!/^[a-f0-9]{64}$/.test(String(tk || ''))) return null; const h = sha(tk); for(const u in DB.contas){ const c = DB.contas[u]; if(c.tokens.some(t => t.h === h)){ migra(c); return c; } } return null; }

  async function http(req, res, url){
    cors(req, res);
    if(req.method === 'OPTIONS'){ res.writeHead(204); return res.end(); }
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
    if(!limite(ip, 'g', 60, 60e3)) return resp(res, 429, { erro: 'Muitos pedidos. Espere um minuto.' });
    try {
      if(url === '/api/conta/criar' && req.method === 'POST'){
        const b = await corpo(req), user = String(b.user || '').trim().toLowerCase(), senha = String(b.senha || '');
        if(!/^[a-z0-9_]{3,16}$/.test(user)) return resp(res, 400, { erro: 'Usuario: 3 a 16 letras minusculas, numeros ou _' });
        if(senha.length < 6 || senha.length > 64) return resp(res, 400, { erro: 'Senha: 6 a 64 caracteres' });
        if(!limite(ip, 'c', 10, 3600e3)) return resp(res, 429, { erro: 'Muitas contas criadas deste lugar. Tente mais tarde.' });
        if(DB.contas[user]) return resp(res, 409, { erro: 'Esse usuario ja existe. Escolha outro ou entre.' });
        const sal = crypto.randomBytes(16).toString('hex'), c = DB.contas[user] = { user, sal, hash: hashSenha(senha, sal), tokens: [], criada: Date.now(), dados: { rev: 0, chaves: {} } };
        c.pers = []; const token = novoToken(c); grava(); return resp(res, 200, { token, user, rev: 0, chaves: chavesDaConta(c) });
      }
      if(url === '/api/conta/entrar' && req.method === 'POST'){
        if(!limite(ip, 'e', 20, 600e3)) return resp(res, 429, { erro: 'Muitas tentativas. Espere uns minutos.' });
        const b = await corpo(req), user = String(b.user || '').trim().toLowerCase(), senha = String(b.senha || ''), c = DB.contas[user];
        const ok = c ? iguais(hashSenha(senha, c.sal), c.hash) : (hashSenha(senha, '0'.repeat(32)), false);      /* gasta o mesmo tempo com usuario inexistente */
        if(!ok) return resp(res, 401, { erro: 'Usuario ou senha incorretos.' });
        const token = novoToken(c); c.ult = Date.now(); const ch = chavesDaConta(c); grava(); return resp(res, 200, { token, user: c.user, rev: c.dados.rev, chaves: ch });
      }
      if(url === '/api/conta/sair' && req.method === 'POST'){
        const c = quem(req); if(c){ const h = sha(req.headers.authorization.slice(7)); c.tokens = c.tokens.filter(t => t.h !== h); grava(); } return resp(res, 200, { ok: true });
      }
      if(url === '/api/dados'){
        const c = quem(req); if(!c) return resp(res, 401, { erro: 'Entre na conta.' });
        if(req.method === 'GET') return resp(res, 200, { rev: c.dados.rev, chaves: chavesDaConta(c), user: c.user });
        if(req.method === 'PUT'){
          const b = await corpo(req), ch = limpaChaves(b.chaves); if(!ch) return resp(res, 400, { erro: 'Dados invalidos.' });
          c.dados = { rev: c.dados.rev + 1, chaves: guardaChaves(c, ch) }; grava(); return resp(res, 200, { rev: c.dados.rev });
        }
      }
      if(url === '/api/personagens' || url === '/api/personagens/renomear' || url === '/api/personagens/apagar'){
        const c = quem(req); if(!c) return resp(res, 401, { erro: 'Entre na conta.' }); migra(c);
        const mexeu = () => { c.dados.rev++; grava(); };
        if(url === '/api/personagens' && req.method === 'GET') return resp(res, 200, { pers: c.pers });
        if(req.method !== 'POST') return resp(res, 405, { erro: 'metodo' });
        const b = await corpo(req);
        if(url === '/api/personagens'){
          const nome = String(b.name || '').trim();
          if(!NOME_RE.test(nome)) return resp(res, 400, { erro: 'Nome: 2 a 16 letras, numeros, espaco, _ ou -.' });
          if(c.pers.length >= PERS_MAX) return resp(res, 400, { erro: 'Limite de ' + PERS_MAX + ' personagens por conta.' });
          if(!nomeLivre(nome)) return resp(res, 409, { erro: 'Esse nome ja esta em uso. Escolha outro.' });
          const novo = limpaPers(Object.assign({}, b, { id: '', name: nome, level: 1, location: 'Talking Island', createdAt: new Date().toLocaleDateString('pt-BR') })); c.pers.push(novo); mexeu();
          return resp(res, 200, { pers: c.pers, char: novo, rev: c.dados.rev });
        }
        const p = c.pers.find(q => q.id === String(b.id || '')); if(!p) return resp(res, 404, { erro: 'Personagem nao encontrado.' });
        if(url === '/api/personagens/renomear'){
          const nome = String(b.name || '').trim(); if(!NOME_RE.test(nome)) return resp(res, 400, { erro: 'Nome: 2 a 16 letras, numeros, espaco, _ ou -.' });
          if(!nomeLivre(nome, p.id)) return resp(res, 409, { erro: 'Esse nome ja esta em uso. Escolha outro.' });
          p.name = nome; mexeu(); return resp(res, 200, { pers: c.pers, rev: c.dados.rev });
        }
        c.pers = c.pers.filter(q => q.id !== p.id); const ch = c.dados.chaves || {}; for(const k of Object.keys(ch)) if(PROG.some(pf => k === pf + p.id)) delete ch[k];
        mexeu(); return resp(res, 200, { pers: c.pers, rev: c.dados.rev });
      }
    } catch(e){ return resp(res, e.message === 'grande' ? 413 : 400, { erro: 'Pedido invalido.' }); }
    return resp(res, 404, { erro: 'nao encontrado' });
  }
  const persPorId = id => { for(const u in DB.contas){ const p = (DB.contas[u].pers || []).find(q => q.id === id); if(p) return p; } return null; };
  return { http, validaToken, persPorId, grava, total: () => Object.keys(DB.contas).length };
};
