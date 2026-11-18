/* Trava de super admin (18/11/2026). Quem manda comando de GM (admin_cmd, bot_cmd, set_team e os //comandos do chat) precisa estar na lista.
   Lista (qualquer uma das duas):
     - arquivo <DATA_DIR>/admins.txt (fora do git; na VPS: C:\IS-sync\servidor\dados\admins.txt), uma conta por linha, '#' comenta. Lido de novo a cada 5 s: nao precisa reiniciar.
     - variavel de ambiente ADMINS="conta1,conta2".
   A chave da conta e': login da conta do jogo (minusculo) ou  site:<login do site>  (minusculo). Quem nao esta na lista ve a propria chave na mensagem de recusa.
   AUTH=0 (teste local sem conta): todos sao admin, so para desenvolvimento. */
const fs = require('fs'), path = require('path');
module.exports = function(opts){
  const arq = path.join(opts.dir, 'admins.txt'), liberaTodos = !!opts.liberaTodos; let cache = new Set(), lido = 0;
  const envLista = String(process.env.ADMINS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  function recarrega(){
    const t = Date.now(); if(t - lido < 5000) return; lido = t;
    const s = new Set(envLista);
    try { for(const l of fs.readFileSync(arq, 'utf8').split(/\r?\n/)){ const x = l.replace(/#.*/, '').trim().toLowerCase(); if(x) s.add(x); } } catch(e) { /* sem arquivo: so a variavel de ambiente */ }
    cache = s;
  }
  const chaveDaConta = conta => conta && conta.user ? (conta.site ? 'site:' : '') + String(conta.user).toLowerCase() : '';
  function ehAdmin(chave){ if(liberaTodos) return true; if(!chave) return false; recarrega(); return cache.has(String(chave).toLowerCase()); }
  return { ehAdmin, chaveDaConta, arquivo: arq };
};
