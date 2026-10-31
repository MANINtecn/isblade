/* Qualidade grafica: baixa / media / alta. Celular (toque) comeca em BAIXA; computador em ALTA. Escolha manual: Opcoes (O) ou ?q=baixa|media|alta (fica salvo).
   Alem do nivel fixo, a resolucao se ajusta sozinha: se o jogo roda abaixo de ~25 quadros/s a resolucao interna cai, e sobe de volta quando ha folga.
   O que cada nivel muda: resolucao interna (ratio), suavizacao de bordas (aa), brilho dos efeitos (bloom; usa alvos de ponto flutuante e e pesado), corte de objetos longe (cull).
   Script comum, carregar ANTES do codigo do jogo:  <script src="js/qualidade.js"></script>   -> window.QUAL */
(function(){
  var touch = false;
  try { touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 1); } catch(e){}
  var NIVEIS = {
    baixa: { ratio: 1,    aa: false, bloom: false, cull: true  },
    media: { ratio: 1.25, aa: false, bloom: false, cull: true  },
    alta:  { ratio: 2,    aa: true,  bloom: true,  cull: false }
  };
  var nome = null;
  try { var m = /[?&]q=(baixa|media|alta)/.exec(location.search); if(m){ nome = m[1]; localStorage.setItem('isblade.qualidade', nome); } } catch(e){}
  try { if(!nome) nome = localStorage.getItem('isblade.qualidade'); } catch(e){}
  if(!NIVEIS[nome]) nome = touch ? 'baixa' : 'alta';
  var base = NIVEIS[nome];
  var Q = window.QUAL = { nivel: nome, touch: touch, ratio: base.ratio, max: base.ratio, aa: base.aa, bloom: base.bloom, cull: base.cull, fps: 0,
    escolher: function(n){ try { localStorage.setItem('isblade.qualidade', n); } catch(e){} location.reload(); } };

  /* resolucao dinamica: mede o intervalo medio dos quadros a cada 2 s */
  var ult = 0, soma = 0, n = 0, boa = 0;
  function medir(t){
    requestAnimationFrame(medir);
    if(document.hidden){ ult = 0; return; }
    if(ult){ var d = t - ult; if(d < 500){ soma += d; n++; } }
    ult = t;
    if(n >= 60){
      var ms = soma / n; Q.fps = Math.round(1000 / ms); soma = 0; n = 0;
      var mudou = false;
      if(ms > 40 && Q.ratio > 0.55){ Q.ratio = Math.max(0.55, Math.round(Q.ratio * 0.8 * 100) / 100); boa = 0; mudou = true; }
      else if(ms < 20){ if(++boa >= 3 && Q.ratio < Q.max){ Q.ratio = Math.min(Q.max, Math.round(Q.ratio * 1.15 * 100) / 100); boa = 0; mudou = true; } }
      else boa = 0;
      if(mudou) try { window.dispatchEvent(new Event('resize')); } catch(e){}      /* a pagina refaz o tamanho da tela com o novo ratio */
    }
  }
  requestAnimationFrame(medir);
})();
