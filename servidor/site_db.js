/* site_db.js — "servidor do site" (l2ikarus.com) dentro do servidor do jogo, na VPS nova.
   Substitui a API da VPS antiga (192.99.110.164, perdida em 11/2026). O site (Vercel) chama, servidor a servidor:
     POST /sitedb/query     {sql, params}                        -> {result}   (banco do site no MariaDB local)
     POST /sitedb/register  {login, email, passwordHash, referredBy} -> {success|message}
     GET  /sitedb/status/all                                      -> {online, players}
   Tudo exige o cabecalho x-api-key. Configuracao fora do git: <DATA_DIR>/sitedb.json
     { "host": "127.0.0.1", "port": 3306, "user": "...", "password": "...", "database": "l2ikarus_site", "apiKey": "..." }
   (criado pelo vps_windows/instalar_banco_site.ps1). Sem o arquivo, responde 503 e o jogo segue normal.
   Senha das contas: scrypt (formato "scrypt$sal$hash"), gerada e conferida no site (api/register.js e api/player.js). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

module.exports = function(opts){
  const ARQ = path.join(opts.dir, 'sitedb.json'), jogadores = opts.jogadores || (() => 0);
  let cfg = null, pool = null;
  function carrega(){
    if(pool) return pool;
    try { cfg = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch(e){ return null; }
    let mysql; try { mysql = require('mysql2/promise'); } catch(e){ console.error('site_db: falta o pacote mysql2 (npm ci na pasta servidor)'); return null; }
    pool = mysql.createPool({ host: cfg.host || '127.0.0.1', port: cfg.port || 3306, user: cfg.user, password: cfg.password, database: cfg.database,
      waitForConnections: true, connectionLimit: 8, charset: 'utf8mb4', supportBigNumbers: true, bigNumberStrings: false });
    console.log('site_db: banco do site ligado (' + cfg.database + ')');
    return pool;
  }
  function resp(res, cod, obj){ res.writeHead(cod, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); }
  function corpo(req, max){
    return new Promise((ok, falha) => {
      let n = 0; const p = [];
      req.on('data', c => { n += c.length; if(n > max){ falha(new Error('grande')); req.destroy(); } else p.push(c); });
      req.on('end', () => { try { ok(JSON.parse(Buffer.concat(p).toString('utf8') || '{}')); } catch(e){ falha(new Error('json')); } });
      req.on('error', falha);
    });
  }
  function chaveOk(req){
    const k = String(req.headers['x-api-key'] || ''), a = Buffer.from(k), b = Buffer.from(String(cfg && cfg.apiKey || ''));
    return b.length >= 24 && a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async function cadastra(b){
    /* o site manda a senha ja' embaralhada (passwordHash = "scrypt$sal$hash", feito na Vercel); texto puro nunca trafega */
    const login = String(b.login || '').trim(), email = String(b.email || '').trim().toLowerCase() || null, hash = String(b.passwordHash || '');
    if(!/^[a-zA-Z0-9_]{4,16}$/.test(login)) return [400, { message: 'Login: 4 a 16 letras, números ou _' }];
    if(email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)) return [400, { message: 'E-mail inválido.' }];
    if(!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(hash)) return [400, { message: 'Senha inválida.' }];
    const [ja] = await pool.query('SELECT login, email FROM accounts WHERE login = ? OR (email IS NOT NULL AND email = ?) LIMIT 1', [login, email]);
    if(ja.length) return [409, { message: String(ja[0].login).toLowerCase() === login.toLowerCase() ? 'Esse login já existe.' : 'Esse e-mail já tem conta.' }];
    await pool.query('INSERT INTO accounts (login, password, email, access_level, created_time) VALUES (?, ?, ?, 0, ?)', [login, hash, email, Math.floor(Date.now() / 1000)]);
    const ref = String(b.referredBy || '').toLowerCase();
    if(/^[a-z0-9_-]{2,32}$/.test(ref)){
      try {
        const [s] = await pool.query('SELECT slug FROM streamers WHERE slug = ? AND active = 1', [ref]);
        if(s.length) await pool.query('INSERT IGNORE INTO account_referrals (account_name, streamer_slug, created_at) VALUES (?, ?, ?)', [login, ref, Date.now()]);
      } catch(e){ console.error('site_db: indicacao', e.message); }
    }
    return [200, { success: true, message: 'Conta criada com sucesso!' }];
  }

  async function http(req, res, url){
    if(!carrega()) return resp(res, 503, { error: 'banco do site nao configurado' });
    if(!chaveOk(req)) return resp(res, 401, { error: 'unauthorized' });
    try {
      if(url === '/sitedb/status/all' || url === '/sitedb/status'){
        const n = jogadores();
        return resp(res, 200, { online: true, players: n, offline: 0, status_login: 'ONLINE', status_game: 'ONLINE' });
      }
      if(url === '/sitedb/query' && req.method === 'POST'){
        const b = await corpo(req, 2 * 1024 * 1024);
        if(typeof b.sql !== 'string' || !b.sql.trim()) return resp(res, 400, { error: 'sql vazio' });
        const [result] = await pool.query(b.sql, Array.isArray(b.params) ? b.params : []);
        return resp(res, 200, { result });
      }
      if(url === '/sitedb/register' && req.method === 'POST'){
        const [cod, obj] = await cadastra(await corpo(req, 64 * 1024));
        return resp(res, cod, obj);
      }
      return resp(res, 404, { error: 'rota' });
    } catch(e){
      console.error('site_db:', e.message);
      return resp(res, 500, { error: e.message });
    }
  }
  return { http };
};
