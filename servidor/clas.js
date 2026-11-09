'use strict';
/* Clas (estilo L2, versao simples): nome + sigla sobre o nome, lider, convidar/sair/expulsar, chat do cla (@ no comeco).
   Arquivo: <DATA_DIR>/clas.json { clas: { id: { id, nome, sigla, lider, membros: { persId: nome }, criado } } }. O personagem guarda pers.cla = id.
   Regras: criar a partir do Nv CRIAR_NV pagando CRIAR_ADENA; nome 3-16 e sigla 2-4 (letras/numeros), unicos no servidor; ate MAX membros.
   Lider que sai passa a lideranca para o membro mais antigo; ultimo que sai desfaz o cla. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const CRIAR_NV = 10, CRIAR_ADENA = 2000, MAX = 30;
const NOME_RE = /^[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9 _-]{2,15}$/, SIGLA_RE = /^[A-Za-z0-9]{2,4}$/;
module.exports = function(opts){
  const FILE = path.join(opts.dir, 'clas.json'); let DB = { clas: {} }, timer = null;
  try { DB = JSON.parse(fs.readFileSync(FILE, 'utf8')); if(!DB.clas) DB.clas = {}; } catch(e){}
  const grava = () => { if(timer) return; timer = setTimeout(() => { timer = null; try { const tmp = FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(DB)); fs.renameSync(tmp, FILE); } catch(e){ console.error('clas: falha ao gravar', e.message); } }, 500); };
  const de = pers => { const c = pers && pers.cla && DB.clas[pers.cla]; if(c && c.membros[pers.id] !== undefined) return c; if(pers && pers.cla) delete pers.cla; return null; };
  const livre = (campo, v) => !Object.values(DB.clas).some(c => c[campo].toLowerCase() === v.toLowerCase());
  function criar(pers, nome, sigla){
    nome = String(nome || '').trim(); sigla = String(sigla || '').trim().toUpperCase();
    if(!pers) return 'Sem personagem.'; if(de(pers)) return 'Você já está em um clã.';
    if((pers.level | 0) < CRIAR_NV) return 'Precisa do nível ' + CRIAR_NV + ' para criar um clã.';
    if(!NOME_RE.test(nome)) return 'Nome do clã: 3 a 16 letras, números, espaço, _ ou -.'; if(!SIGLA_RE.test(sigla)) return 'Sigla: 2 a 4 letras ou números.';
    if(!livre('nome', nome)) return 'Já existe um clã com esse nome.'; if(!livre('sigla', sigla)) return 'Já existe um clã com essa sigla.';
    const inv = pers.inv; if(!inv || (inv.adena | 0) < CRIAR_ADENA) return 'Criar um clã custa ' + CRIAR_ADENA + ' Adena.';
    inv.adena -= CRIAR_ADENA; const id = 'c' + crypto.randomBytes(5).toString('hex');
    DB.clas[id] = { id, nome, sigla, lider: pers.id, membros: { [pers.id]: pers.name }, criado: Date.now() }; pers.cla = id; grava(); return '';
  }
  function entrar(c, pers){ if(!c || !pers) return 'O clã não existe mais.'; if(de(pers)) return 'Você já está em um clã.'; if(Object.keys(c.membros).length >= MAX) return 'O clã está cheio (' + MAX + ').';
    c.membros[pers.id] = pers.name; pers.cla = c.id; grava(); return ''; }
  function sair(pers){
    const c = de(pers); if(!c) return 'Você não está em um clã.'; delete c.membros[pers.id]; delete pers.cla;
    const resto = Object.keys(c.membros); if(!resto.length) delete DB.clas[c.id]; else if(c.lider === pers.id) c.lider = resto[0];
    grava(); return '';
  }
  function expulsar(lider, alvoId, achaPers){
    const c = de(lider); if(!c) return 'Você não está em um clã.'; if(c.lider !== lider.id) return 'Só o líder expulsa.'; if(alvoId === lider.id) return 'Use Sair.';
    if(c.membros[alvoId] === undefined) return 'Não é do seu clã.'; delete c.membros[alvoId]; const p = achaPers(alvoId); if(p) delete p.cla; grava(); return '';
  }
  const sigla = pers => { const c = de(pers); return c ? c.sigla : ''; };
  return { de, criar, entrar, sair, expulsar, sigla, porId: id => DB.clas[id] || null, CRIAR_NV, CRIAR_ADENA, MAX };
};
