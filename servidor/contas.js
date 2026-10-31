/* Contas do IS BLADE: cadastro rapido (usuario + senha, sem e-mail) e salvamento dos personagens no servidor.
   Rotas (JSON):  POST /api/conta/criar | /api/conta/entrar  {user, senha} -> {token, user, rev, chaves}
                  GET  /api/dados  (Authorization: Bearer <token>)         -> {rev, chaves}
                  PUT  /api/dados  {chaves}                                -> {rev}
                  POST /api/conta/sair                                      -> {ok}
   'chaves' = copia das chaves 'isblade*' do localStorage (personagens, inventario, skills, barra...). Senha com scrypt + sal; o token e guardado so como hash.
   Arquivo: <DATA_DIR>/contas.json (padrao servidor/dados/, fora do git). Sem recuperacao de senha por enquanto (nao pedimos e-mail). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

module.exports = function(opts){
  const DIR = opts.dir, FILE = path.join(DIR, 'contas.json'), origemOk = opts.origemOk;
  const MAX_CORPO = 300 * 1024, MAX_VALOR = 120 * 1024, MAX_CHAVES = 400, MAX_TOKENS = 6;
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
        const token = novoToken(c); grava(); return resp(res, 200, { token, user, rev: 0, chaves: {} });
      }
      if(url === '/api/conta/entrar' && req.method === 'POST'){
        if(!limite(ip, 'e', 20, 600e3)) return resp(res, 429, { erro: 'Muitas tentativas. Espere uns minutos.' });
        const b = await corpo(req), user = String(b.user || '').trim().toLowerCase(), senha = String(b.senha || ''), c = DB.contas[user];
        const ok = c ? iguais(hashSenha(senha, c.sal), c.hash) : (hashSenha(senha, '0'.repeat(32)), false);      /* gasta o mesmo tempo com usuario inexistente */
        if(!ok) return resp(res, 401, { erro: 'Usuario ou senha incorretos.' });
        const token = novoToken(c); c.ult = Date.now(); grava(); return resp(res, 200, { token, user: c.user, rev: c.dados.rev, chaves: c.dados.chaves });
      }
      if(url === '/api/conta/sair' && req.method === 'POST'){
        const c = quem(req); if(c){ const h = sha(req.headers.authorization.slice(7)); c.tokens = c.tokens.filter(t => t.h !== h); grava(); } return resp(res, 200, { ok: true });
      }
      if(url === '/api/dados'){
        const c = quem(req); if(!c) return resp(res, 401, { erro: 'Entre na conta.' });
        if(req.method === 'GET') return resp(res, 200, { rev: c.dados.rev, chaves: c.dados.chaves, user: c.user });
        if(req.method === 'PUT'){
          const b = await corpo(req), ch = limpaChaves(b.chaves); if(!ch) return resp(res, 400, { erro: 'Dados invalidos.' });
          c.dados = { rev: c.dados.rev + 1, chaves: ch }; grava(); return resp(res, 200, { rev: c.dados.rev });
        }
      }
    } catch(e){ return resp(res, e.message === 'grande' ? 413 : 400, { erro: 'Pedido invalido.' }); }
    return resp(res, 404, { erro: 'nao encontrado' });
  }
  return { http, total: () => Object.keys(DB.contas).length };
};
