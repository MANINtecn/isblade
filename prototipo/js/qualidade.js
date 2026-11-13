/* Qualidade grafica: baixa / media / alta. Celular (toque) comeca em BAIXA; computador em ALTA. Escolha manual: Opcoes (O) ou ?q=baixa|media|alta (fica salvo).
   Alem do nivel fixo, a resolucao se ajusta sozinha: se o jogo roda abaixo de ~25 quadros/s a resolucao interna cai, e sobe de volta quando ha folga.
   O que cada nivel muda: resolucao interna (ratio), suavizacao de bordas (aa), brilho dos efeitos (bloom; usa alvos de ponto flutuante e e pesado), corte de objetos longe (cull).
   Script comum, carregar ANTES do codigo do jogo:  <script src="js/qualidade.js"></script>   -> window.QUAL */
(function(){
  var touch = false;
  try { touch = window.matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 1); } catch(e){}
  var NIVEIS = {
    baixa: { ratio: 1,    aa: false, bloom: false, cull: true,  fps: 30, mobs: .6, anim: 28, nevoa: [38, 95] },        /* aparelho basico (ex.: Redmi C13): 30 quadros/s travados, 60% dos monstros, anima so ate 28 m */
    media: { ratio: 1.5,  aa: false, bloom: false, cull: true,  fps: 45, mobs: .85, anim: 36, nevoa: [48, 120] },
    alta:  { ratio: 2,    aa: true,  bloom: true,  cull: false, fps: 0,  mobs: 1,  anim: 44, nevoa: [60, 150] }   /* nevoa = [inicio, fim] em metros (arena/DG); antes era 22-62 e escondia mobs */
  };
  var nome = null;
  try { var m = /[?&]q=(baixa|media|alta)/.exec(location.search); if(m){ nome = m[1]; localStorage.setItem('isblade.qualidade', nome); } } catch(e){}
  try { if(!nome) nome = localStorage.getItem('isblade.qualidade'); } catch(e){}
  /* celular: aparelho com folga (6+ nucleos e 4+ GB) ja comeca em MEDIA; a resolucao dinamica abaixo derruba se nao der */
  var forte = false; try { forte = (navigator.hardwareConcurrency || 0) >= 6 && (navigator.deviceMemory || 4) >= 4; } catch(e){}
  if(!NIVEIS[nome]) nome = touch ? (forte ? 'media' : 'baixa') : 'alta';
  var base = NIVEIS[nome];
  /* ratio acima do dpr da tela nao muda nada (a pagina usa min(dpr, ratio)): limita ao dpr real, senao a "resolucao dinamica" gira em falso e dispara resize inutil */
  try { var dpr = window.devicePixelRatio || 1; if (base.ratio > dpr) base = Object.assign({}, base, { ratio: Math.max(1, dpr) }); } catch(e){}
  var Q = window.QUAL = { nivel: nome, touch: touch, ratio: base.ratio, max: base.ratio, aa: base.aa, bloom: base.bloom, cull: base.cull, fps: 0, fpsMax: base.fps, mobMult: base.mobs, animRaio: base.anim, nevoa: base.nevoa,
    escolher: function(n){ try { localStorage.setItem('isblade.qualidade', n); } catch(e){} location.reload(); } };

  /* resolucao dinamica: mede o intervalo medio dos quadros a cada 2 s */
  var ult = 0, soma = 0, n = 0, boa = 0, ruim = 0;
  function medir(t){
    requestAnimationFrame(medir);
    if(document.hidden){ ult = 0; return; }
    if(ult){ var d = t - ult; if(d < 500){ soma += d; n++; } }
    ult = t;
    if(n >= 60){
      var ms = soma / n; Q.fps = Math.round(1000 / ms); soma = 0; n = 0;
      var mudou = false;
      /* piso 0.75 (antes 0.55 deixava a imagem borrada sem ganho: o log mostrou 20-25 fps mesmo a 0.55, ou seja, gargalo e CPU, nao pixel); exige 2 janelas ruins seguidas */
      if(ms > 40 && Q.ratio > 0.75){ if(++ruim >= 2){ Q.ratio = Math.max(0.75, Math.round(Q.ratio * 0.8 * 100) / 100); ruim = 0; mudou = true; } boa = 0; }
      else if(ms <= 40) ruim = 0;
      if(mudou){}
      else if(ms < 20){ if(++boa >= 3 && Q.ratio < Q.max){ Q.ratio = Math.min(Q.max, Math.round(Q.ratio * 1.15 * 100) / 100); boa = 0; mudou = true; } }
      else boa = 0;
      if(mudou) try { window.dispatchEvent(new Event('resize')); } catch(e){}      /* a pagina refaz o tamanho da tela com o novo ratio */
    }
  }
  requestAnimationFrame(medir);
})();
