/* >>> CLAUDE [solo-detalhe] 17/11/2026: nitidez do chao de perto.
   O chao do mundo (solo_*.png) e o dos mapas (terr_fortress, terr_curuma...) sao UMA imagem de 512 px do mapa inteiro esticada por centenas de metros
   (~57 cm por pixel no campo): de perto vira borrao. Aqui entra uma textura de DETALHE que repete (assets/mundo/solo_detalhe.png, tools/solo_detalhe.py),
   sem cor, que multiplica a cor que ja existe:
     R = folhas de grama a cada 6 m (some de 25 a 90 m, para nao aparecer o padrao repetido longe; some em encosta)
     G = tufos/torroes a cada 14 m, girado (quebra a repeticao do R)
     B = variacao larga de tom a cada 70 m (vale tambem longe)
   Uso: SoloDetalhe.aplica(THREE, material, { baixa })  -> encadeia com o onBeforeCompile que o material ja tiver.
        SoloDetalhe.seTerreno(THREE, material, { baixa })  -> so aplica se for o chao de um mapa (material "Terreno" ou textura terr_*). */
window.SoloDetalhe = (function(){
  var D = { tex: null };
  var U = { tSDet: { value: null }, uSDForca: { value: 1.0 } };
  function textura(THREE){
    if(D.tex) return D.tex;
    var t = new THREE.TextureLoader().load('assets/mundo/solo_detalhe.png?v=1');
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;      /* dado (nao cor): sem sRGB */
    D.tex = U.tSDet.value = t; return t;
  }
  D.aplica = function(THREE, mat, opt){
    if(!mat || mat.userData.soloDet) return mat;
    opt = opt || {}; textura(THREE); mat.userData.soloDet = 1;
    var antes = mat.onBeforeCompile, chave = mat.customProgramCacheKey ? mat.customProgramCacheKey() : '', baixa = !!opt.baixa;
    mat.onBeforeCompile = function(sh, rd){
      if(antes) antes.call(this, sh, rd);
      sh.uniforms.tSDet = U.tSDet; sh.uniforms.uSDForca = U.uSDForca;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSDW;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSDW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      var corpo =
        '{ float sdD = distance(vSDW, cameraPosition), sdPerto = 1.0 - smoothstep(25.0, 90.0, sdD);\n' +
        '  vec2 sdP = vSDW.xz;\n' +
        (baixa ? '  float sdPl = 1.0;\n'
               : '  vec3 sdN = normalize(cross(dFdx(vSDW), dFdy(vSDW))); float sdPl = smoothstep(.55, .85, abs(sdN.y));\n') +
        '  float sdR = texture2D(tSDet, sdP / 6.0).r;\n' +
        (baixa ? '  float sdG = .5;\n' : '  float sdG = texture2D(tSDet, mat2(.8, -.6, .6, .8) * sdP / 14.0).g;\n') +
        '  float sdB = texture2D(tSDet, sdP / 70.0).b;\n' +
        '  float sdK = (sdR - .5) * 1.6 * sdPerto * sdPl + (sdG - .5) * 1.1 * (.35 + .65 * sdPerto);\n' +
        '  diffuseColor.rgb *= clamp(1.0 + sdK * uSDForca, .45, 1.6) * (1.0 + (sdB - .5) * .3 * uSDForca);\n}\n';
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tSDet; uniform float uSDForca; varying vec3 vSDW;')
        .replace('#include <color_fragment>', corpo + '#include <color_fragment>');
    };
    mat.customProgramCacheKey = function(){ return chave + '|soloDet' + (baixa ? 'B' : ''); };
    mat.needsUpdate = true;
    return mat;
  };
  D.ehTerreno = function(m){ return !!m && (m.name === 'Terreno' || !!(m.map && /^terr/i.test(m.map.name || ''))); };
  D.seTerreno = function(THREE, m, opt){
    if(!D.ehTerreno(m)) return false;
    if(m.map && !(opt && opt.baixa)){ m.map.anisotropy = 8; m.map.needsUpdate = true; }
    D.aplica(THREE, m, opt); return true;
  };
  /* /solo no console: SoloDetalhe.forca(0) desliga, 1 normal, 1.5 forte (comparar antes/depois) */
  D.forca = function(v){ U.uSDForca.value = v; return v; };
  return D;
})();
/* <<< CLAUDE [solo-detalhe] */
