/* Horizonte da cidade: silhueta leve de cada mapa na direcao da saida (portao) que leva a ele.
   Modelos: assets/horizonte/<id>.glb (~6 mil triangulos, sem textura; gerar_horizonte.py). Cor = cor da neblina (acompanha dia/noite),
   mais escura no alto e dissolvendo no mar na base. Material sem neblina propria e camera.far pequeno (modo baixa) => a distancia
   e a escala sao reduzidas juntas, o tamanho aparente na tela e o mesmo. */
window.Horizonte = (function(){
  var H = { itens: [], pronto: false };
  var ESCALA = { toi: .6, blazing: .85, fortress: 1.0, curuma: .44 };      /* escala na distancia REF */
  var REF = 270, MAR_Y = -6.0;                                              /* 08/11: era 430 (o dono achou longe demais); mesma escala, ~1,6x maior na tela */

  /* 13/11: silhueta no PONTO REAL de cada mapa (assets/mundo/mundo_grade.json -> mapas), nao mais na direcao do portao.
     Escala = ESCALA * distancia/REF (mesmo tamanho aparente aprovado, so que na distancia verdadeira). Camera.far curto (baixa):
     distancia, escala e altura sao reduzidas juntas. Some quando o jogador chega perto (o mapa real carrega). */
  var REAL = { toi: 'torre', blazing: 'pantano', fortress: 'fortress', curuma: 'curuma' };
  H.init = function(THREE, scene, camera, saidas){
    H.scene = scene; H.camera = camera;
    fetch('assets/mundo/mundo_grade.json').then(function(r){ return r.json(); }).catch(function(){ return null; }).then(function(mg){
      saidas.forEach(function(s){
        var m = mg && mg.mapas && mg.mapas[REAL[s.id]];
        var rx, rz, ry = 0;
        if(m){ rx = m.pos[0]; rz = m.pos[2]; ry = m.pos[1]; }
        else { var L0 = Math.hypot(s.gx, s.gz) || 1; rx = s.gx / L0 * REF; rz = s.gz / L0 * REF; }
        if(window.MundoCampo && MundoCampo.pronto){ var hh = MundoCampo.altura(rx, rz); if(hh !== null && hh !== undefined) ry = hh; }
        var D = Math.hypot(rx, rz) || 1, dx = rx / D, dz = rz / D;
        var Dr = Math.min(D, camera.far * .72), f = Dr / D;
        new THREE.GLTFLoader().load('assets/horizonte/' + s.id + '.glb', function(g){
          var mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
          var grupo = new THREE.Group(); grupo.add(g.scene);
          var hmax = 1e-3;
          g.scene.traverse(function(o){ if(o.isMesh){ var p = o.geometry.attributes.position; for(var i = 0; i < p.count; i++) hmax = Math.max(hmax, p.getY(i)); } });
          g.scene.traverse(function(o){
            if(!o.isMesh) return;
            var p = o.geometry.attributes.position, c = new Float32Array(p.count * 3);
            for(var i = 0; i < p.count; i++){ var t = Math.min(1, Math.max(0, p.getY(i) / hmax)), v = 1 - .58 * Math.pow(t, .75); c[i * 3] = v; c[i * 3 + 1] = v; c[i * 3 + 2] = v * 1.03; }
            o.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3)); o.material = mat; o.frustumCulled = true;
          });
          var e = (ESCALA[s.id] || 1) * (D / REF) * f; grupo.scale.set(e, e, e);
          grupo.position.set(dx * Dr, (ry - 4) * f, dz * Dr);
          grupo.rotation.y = Math.atan2(-dx, -dz);                      /* a "frente" do modelo olha para a cidade */
          scene.add(grupo); H.itens.push({ id: s.id, grupo: grupo, mat: mat, rx: rx, rz: rz });
          H.pronto = true;
        }, undefined, function(err){ console.warn('horizonte', s.id, err); });
      });
    });
  };
  /* chamado todo quadro: acompanha a cor da neblina (dia/noite) */
  H.tick = function(){
    var fg = H.scene && H.scene.fog; if(!fg) return;
    var cp = H.camera && H.camera.position;
    for(var i = 0; i < H.itens.length; i++){ var it = H.itens[i]; it.mat.color.copy(fg.color); if(cp) it.grupo.visible = Math.hypot(cp.x - it.rx, cp.z - it.rz) > 130; }
  };
  return H;
})();
