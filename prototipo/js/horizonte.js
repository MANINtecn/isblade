/* Horizonte da cidade: silhueta leve de cada mapa na direcao da saida (portao) que leva a ele.
   Modelos: assets/horizonte/<id>.glb (~6 mil triangulos, sem textura; gerar_horizonte.py). Cor = cor da neblina (acompanha dia/noite),
   mais escura no alto e dissolvendo no mar na base. Material sem neblina propria e camera.far pequeno (modo baixa) => a distancia
   e a escala sao reduzidas juntas, o tamanho aparente na tela e o mesmo. */
window.Horizonte = (function(){
  var H = { itens: [], pronto: false };
  var ESCALA = { toi: .6, blazing: .85, fortress: 1.0, curuma: .44 };      /* escala na distancia REF */
  var REF = 270, MAR_Y = -6.0;                                              /* 08/11: era 430 (o dono achou longe demais); mesma escala, ~1,6x maior na tela */

  H.init = function(THREE, scene, camera, saidas){
    var R = Math.min(REF, camera.far * .72), f = R / REF;
    saidas.forEach(function(s){
      var L = Math.hypot(s.gx, s.gz) || 1, dx = s.gx / L, dz = s.gz / L;
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
        var e = (ESCALA[s.id] || 1) * f; grupo.scale.set(e, e, e);
        grupo.position.set(dx * R, MAR_Y, dz * R);
        grupo.rotation.y = Math.atan2(-dx, -dz);                      /* a "frente" do modelo olha para a cidade */
        scene.add(grupo); H.itens.push({ id: s.id, grupo: grupo, mat: mat });
        H.pronto = true;
      }, undefined, function(err){ console.warn('horizonte', s.id, err); });
    });
    H.scene = scene;
  };
  /* chamado todo quadro: acompanha a cor da neblina (dia/noite) */
  H.tick = function(){
    var fg = H.scene && H.scene.fog; if(!fg) return;
    for(var i = 0; i < H.itens.length; i++) H.itens[i].mat.color.copy(fg.color);
  };
  return H;
})();
