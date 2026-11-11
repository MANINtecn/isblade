/* Molde de particulas fluidas (THREE.Points + ShaderMaterial) para efeitos do IS BLADE.
   Vale para Claude e Gemini. Origem: pesquisa do dono (10/11/2026), ADAPTADA a regra "sem formas redondas".
   Ideia: movimento organico por ruido (curl/simplex) no vertex shader + forma desenhada no fragment shader (sem imagem),
   aditivo e sem escrever profundidade. A FORMA e angular (losango / faisca / lasca), nao circulo.
   Uso:  const fx = ParticulasFluidas.criar(THREE, {n:600, raio:2.5, cor:[1,.7,.25], tam:60, forma:0});  scene.add(fx.points);
         no loop: fx.update(dt);   ao sair: fx.dispose();   forma: 0 = losango, 1 = faisca (cruz fina), 2 = lasca (losango esticado)  */
const ParticulasFluidas = (() => {
  // Simplex 3D (Ashima/Gustavson, dominio publico)
  const NOISE = `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
  vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
    float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw); vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 nr=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=nr.x; p1*=nr.y; p2*=nr.z; p3*=nr.w;
    vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
    return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
  vec3 curl(vec3 p){ const float e=.1; // campo sem divergencia: fluido que nao se amontoa
    float a=snoise(p+vec3(0,e,0))-snoise(p-vec3(0,e,0)), b=snoise(p+vec3(0,0,e))-snoise(p-vec3(0,0,e)), c=snoise(p+vec3(e,0,0))-snoise(p-vec3(e,0,0));
    float d=snoise(p+vec3(0,0,e)+17.)-snoise(p-vec3(0,0,e)+17.), f=snoise(p+vec3(e,0,0)+31.)-snoise(p-vec3(e,0,0)+31.), g=snoise(p+vec3(0,e,0)+31.)-snoise(p-vec3(0,e,0)+31.);
    return vec3(d-b, f-c, a-g)/(2.*e); }`;
  const VERT = NOISE + `
    uniform float uTime, uTam, uRaio, uTurb; attribute float aSeed; varying float vVida; varying float vSeed;
    void main(){
      vec3 p = position;
      float t = uTime*.35 + aSeed*10.;
      p += curl(p*.35 + t) * uTurb;                       // turbulencia organica
      p += normalize(position+1e-3) * sin(t*2.+aSeed*6.28) * .15*uRaio*.2;  // respira
      vVida = .5+.5*snoise(vec3(aSeed*7., uTime*.2, 0.)); vSeed = aSeed;
      vec4 mv = modelViewMatrix*vec4(p,1.);
      gl_PointSize = uTam*(.6+.8*vVida)*(1./max(.1,-mv.z));   // atenuacao por distancia (uTam em unidades de tela*metro)
      gl_Position = projectionMatrix*mv; }`;
  const FRAG = `
    uniform vec3 uCor; uniform float uForma, uAlfa; varying float vVida; varying float vSeed;
    void main(){
      vec2 q = gl_PointCoord*2.-1.;                      // -1..1
      float ang = vSeed*6.2831; q = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*q;   // cada particula com um giro
      float d;
      if(uForma<.5) d = abs(q.x)+abs(q.y);                // losango (norma L1): ANGULAR, nunca circulo
      else if(uForma<1.5) d = min(abs(q.x)*6.+abs(q.y), abs(q.y)*6.+abs(q.x))*.6;   // faisca: cruz fina
      else d = abs(q.x)*2.2+abs(q.y)*.7;                  // lasca: losango esticado
      float a = 1.-smoothstep(.55,1.,d);                  // borda suave (smoothstep) so no brilho, a silhueta continua com pontas
      float nucleo = 1.-smoothstep(0.,.5,d);              // miolo quente
      if(a<.01) discard;
      vec3 c = mix(uCor, vec3(1.,.95,.8), nucleo*.7);
      gl_FragColor = vec4(c*(a+nucleo*.6), a*uAlfa*(.4+.6*vVida)); }`;
  function criar(THREE, o = {}) {
    const n = o.n || 600, raio = o.raio || 2.5, g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), seed = new Float32Array(n);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.2831, r = raio * Math.cbrt(Math.random()), s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(a), r * u, r * s * Math.sin(a)], i * 3); seed[i] = Math.random(); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uTam: { value: o.tam || 60 }, uRaio: { value: raio }, uTurb: { value: o.turb || 0.9 }, uCor: { value: new THREE.Color(...(o.cor || [1, .7, .25])) }, uForma: { value: o.forma || 0 }, uAlfa: { value: o.alfa || 1 } } });
    const points = new THREE.Points(g, m); points.frustumCulled = false;
    return { points, update(dt) { m.uniforms.uTime.value += dt; }, dispose() { g.dispose(); m.dispose(); } };
  }
  return { criar, NOISE };
})();
if (typeof module !== 'undefined') module.exports = ParticulasFluidas;
