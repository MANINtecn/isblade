/* Mira assistida no CELULAR (toque). Escolhe o alvo para o golpe/skill sem travar a camera:
   - analogico EMPURRADO: so ajuda se houver alvo perto da direcao do dedo (cone estreito, ~35 graus); senao o golpe vai para onde o analogico aponta (regra de 31/10);
   - analogico PARADO: o alvo mais facil na frente (cone de ~77 graus) ou colado (ate 4,5 m).
   Alcance 14 m. Guarda o alvo em S.softAlvo {x, z, t} para as skills de ponto mirado (pontoMira) cairem em cima dele.
   Cada pagina monta a lista de candidatos (chefe, mobs, jogadores hostis, espantalho) e chama MiraToque.angulo(S, moveVec(), lista). */
(function(){
  var M = window.MiraToque = { alcance: 14, cone: 1.35, coneAnalogico: 0.6, perto: 4.5 };
  function dif(a, b){ var d = a - b; while(d > Math.PI) d -= 6.2832; while(d < -Math.PI) d += 6.2832; return Math.abs(d); }
  M.angulo = function(S, mv, lista){
    var analog = !!(mv && mv.m > 0.15), base = analog ? Math.atan2(mv.x, mv.z) : (S.mdir !== undefined ? S.mdir : S.face), best = null, bs = 1e9;
    for(var i = 0; i < lista.length; i++){
      var c = lista[i], dx = c.x - S.px, dz = c.z - S.pz, d = Math.hypot(dx, dz);
      if(d > M.alcance || d < 0.05) continue;
      var ang = Math.atan2(dx, dz), df = dif(ang, base);
      if(analog ? df >= M.coneAnalogico : (d >= M.perto && df >= M.cone)) continue;
      var sc = d + df * (analog ? 4 : 2.5);
      if(sc < bs){ bs = sc; best = { ang: ang, x: c.x, z: c.z }; }
    }
    S.softAlvo = best ? { x: best.x, z: best.z, t: performance.now() } : null;
    return best ? best.ang : null;
  };
})();
