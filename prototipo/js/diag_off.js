/* Liga/desliga pecas do visual por endereco, para achar no celular o que quebra o mapa (19/11/2026). Uso: cidade.html?off=solo,horizonte,ceu,fusao   (qualquer combinacao)
   solo = detalhe do chao (SoloDetalhe) | horizonte = silhuetas dos mapas | ceu = cupula do ceu | fusao = juncao das pecas dos mapas
   Outros testes: ?brutos=1 (arquivos originais, sem compressao) | ?semktx=1 (so as texturas KTX2 voltam ao original). Pagina com todos os links: diag.html */
(function(){
  var O = window.__OFF = {}, m = /[?&]off=([\w,]+)/.exec(location.search);
  if(m) m[1].split(',').forEach(function(k){ O[k] = 1; });
  if(O.fusao) window.__MV_SEM_FUSAO = 1;
})();
