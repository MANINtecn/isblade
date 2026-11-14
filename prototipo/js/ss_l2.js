/* [ss-l2] Soulshot / Spiritshot ORIGINAL do Lineage 2, na mao do personagem (14/11/2026).
   Fonte: cliente Interlude, system/lineageeffect.u -> classes it_soul_shot_d_ca e it_spirit_shot_d_ca
   (emissores lidos com trabalho_l2fx/ferramentas/props2.py). Texturas e malhas originais em assets/fx/ss_l2/.
   Numeros abaixo = os do cliente (unidades do L2); `escala` converte para metros.
   Uso:
     SSL2.carregar(base)                       -> Promise (texturas + malhas)
     var fx = SSL2.criar({magia:false, semAneis:false, escala:.04, seed:1})
     scene.add(fx.grupo); fx.grupo.position.copy(maoMundo); fx.avaliar(segundosDesdeODisparo)
     fx.vivo(t) -> false quando acabou; fx.liberar() */
(function(){
  var T={},G={},pronto=false;
  var TEX=['fx_m_t0000','fx_m_t0050','fx_m_t0056','fx_m_t0060','fx_m_t0084','fx_m_t0116'];
  var MESH=['skill_power01','spirit_gun00'];

  /* emissores (Color = cinza nas duas ordens, entao BGRA = RGBA) */
  var GLOW={nome:'Glow',tipo:'sprite',tex:'fx_m_t0000',sub:[7,8],grade:4,n:6,vida:[1,1],
    cor:[[0,1,1],[.03929,0,0],[.05,1,1],[.05,.314,1],[.8,.314,1],[1,0,1]],/* [t, cinza, alfa] */
    mult:[[.1,.1],[.1,.1],[.5,.5]],opac:1,tam:[12,12],esc:[[.04,3.5],[.05,1]],
    polar:{r:5},spinIni:[0,1],sps:.5,anel:true};
  var SPIRITS={nome:'Spirits',tipo:'mesh',malha:'spirit_gun00',tex:'fx_m_t0084',n:3,vida:[1,1.2],
    cor:[[0,1,1],[.5214,.41,1],[1,1,1]],corRep:5,mult:[[.3,.5],[.2,.4],[.3,.5]],opac:.8,
    tamXYZ:[[.03,.03],[.09,.12],[.09,.12]],esc:[[.03,1],[.07,1.8],[.08,1],[.67,1],[1,.5]],
    spinIni3:[[0,1],[0,1],[0,1]],sps3:[.3,.3,2]};
  var IGNICAO={nome:'Ignicao',tipo:'mesh',malha:'skill_power01',tex:'fx_m_t0050',n:5,vida:[.4,.4],
    cor:[[0,1,1],[.1,1,1],[.1714,.5,1],[.6,.5,1],[1,0,1]],mult:[[.8,1],[.8,1],[.8,1]],opac:1,fadeOut:.08,
    tam:[.06,.1],esc:[[.09,2],[.24,2.5],[.6,3],[1,3.4]],spinIni3:[[-1,1],[-1,1],[-1,1]]};
  var FLASH={nome:'Flash',tipo:'sprite',tex:'fx_m_t0056',n:1,vida:[.5,.5],cor:[[0,1,1],[1,1,1]],
    mult:[[.6,.6],[.6,.6],[1,1]],opac:.8,fadeOut:.02,tam:[6,6],esc:[[.08,2],[.2,2.8],[.6,3.2],[1,3.4]],anel:true};
  /* so no spiritshot */
  var MC={nome:'MC',tipo:'sprite',tex:'fx_m_t0060',n:1,vida:[1.3,1.3],cor:[[0,1,1],[.6571,.7,1],[1,1,1]],corRep:18,
    mult:[[.7,.7],[.7,.7],[1,1]],opac:1,fadeOut:.702,tam:[8.4,8.4],esc:[[.04,1.3],[.07,1.4],[.13,1.45],[.37,1.49],[1,1.5]],
    polar:{r:5},spinIni:[.125,.125],anel:true};
  var MC2={nome:'MC2',tipo:'sprite',tex:'fx_m_t0116',n:1,vida:[1.7,1.7],cor:[[0,1,1],[.6857,.82,1],[1,1,1]],corRep:23,
    mult:[[.7,.7],[.7,.7],[1,1]],opac:1,fadeOut:1.122,tam:[6.5,6.5],esc:[[.03,1.6],[.07,2.1],[.12,2.3],[.21,2.37],[.6,2.4],[1,2.41]],
    spinIni:[.125,.125],anel:true};
  var SOUL=[GLOW,SPIRITS,IGNICAO,FLASH];
  var SPIRIT=[GLOW,
    Object.assign({},SPIRITS,{tamXYZ:[[.06,.06],[.12,.16],[.12,.16]]}),
    IGNICAO,MC,MC2];

  function rngDe(seed){var s=(seed|0)||1;return function(){s=(s*1664525+1013904223)|0;return ((s>>>0)%1e6)/1e6;};}
  function faixa(r,a){return a[0]+(a[1]-a[0])*r();}
  function curva(k,x,idx){/* interpolacao linear por RelativeTime; antes do 1o ponto vale o 1o */
    if(x<=k[0][0])return k[0][idx];
    for(var i=1;i<k.length;i++)if(x<=k[i][0]){var a=k[i-1],b=k[i],u=(b[0]-a[0])>1e-6?(x-a[0])/(b[0]-a[0]):1;return a[idx]+(b[idx]-a[idx])*u;}
    return k[k.length-1][idx];
  }

  function carregar(base){
    if(pronto)return Promise.resolve();
    base=base||'assets/fx/ss_l2/';
    var L=new THREE.TextureLoader();
    var ps=TEX.map(function(n){return new Promise(function(ok){L.load(base+n+'.png',function(t){T[n]=t;ok();},undefined,function(){ok();});});});
    ps=ps.concat(MESH.map(function(n){return fetch(base+n+'.json').then(function(r){return r.json();}).then(function(j){
      var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(j.p,3));
      g.setAttribute('uv',new THREE.Float32BufferAttribute(j.uv,2));g.setIndex(j.i);G[n]=g;}).catch(function(){});}));
    return Promise.all(ps).then(function(){pronto=true;});
  }

  function criar(o){
    o=o||{};var k=o.escala||.04,r=rngDe(o.seed||(Math.random()*1e9)),grupo=new THREE.Group(),parts=[];
    var lista=(o.magia?SPIRIT:SOUL).filter(function(e){return !(o.semAneis&&e.anel);});
    lista.forEach(function(e){
      for(var i=0;i<e.n;i++){
        var tex=T[e.tex],obj,mat;
        if(e.tipo==='sprite'){
          var t2=tex;
          if(e.sub&&tex){/* quadro aleatorio do atlas (UseRandomSubdivision) */
            var q=e.sub[0]+Math.floor(r()*(e.sub[1]-e.sub[0]+1));t2=tex.clone();t2.needsUpdate=true;
            t2.repeat.set(1/e.grade,1/e.grade);t2.offset.set((q%e.grade)/e.grade,1-(Math.floor(q/e.grade)+1)/e.grade);
          }
          mat=new THREE.SpriteMaterial({map:t2,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,depthTest:false,fog:false});
          obj=new THREE.Sprite(mat);
        }else{
          mat=new THREE.MeshBasicMaterial({map:tex,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,depthTest:false,side:THREE.DoubleSide,fog:false});
          obj=new THREE.Mesh(G[e.malha]||new THREE.BufferGeometry(),mat);
        }
        obj.renderOrder=999;
        var p={e:e,obj:obj,mat:mat,vida:faixa(r,e.vida),cm:[faixa(r,e.mult[0]),faixa(r,e.mult[1]),faixa(r,e.mult[2])]};
        if(e.polar){var th=r()*Math.PI*2;obj.position.set(Math.cos(th)*e.polar.r*k,0,Math.sin(th)*e.polar.r*k);}
        if(e.tam)p.tam=faixa(r,e.tam);
        if(e.tamXYZ)p.txyz=[faixa(r,e.tamXYZ[0]),faixa(r,e.tamXYZ[1]),faixa(r,e.tamXYZ[2])];
        if(e.spinIni)p.spin=faixa(r,e.spinIni);
        if(e.spinIni3)p.spin3=[faixa(r,e.spinIni3[0]),faixa(r,e.spinIni3[1]),faixa(r,e.spinIni3[2])];
        grupo.add(obj);parts.push(p);
      }
    });
    var fim=0;parts.forEach(function(p){fim=Math.max(fim,p.vida);});
    function avaliar(t){
      parts.forEach(function(p){
        var e=p.e,x=t/p.vida,ob=p.obj;
        if(t<0||x>=1){ob.visible=false;return;}ob.visible=true;
        var xc=e.corRep?((x*e.corRep)%1):x;
        var cinza=curva(e.cor,xc,1),alfa=curva(e.cor,xc,2),op=e.opac*alfa;
        if(e.fadeOut!=null&&t>e.fadeOut)op*=Math.max(0,1-(t-e.fadeOut)/Math.max(.001,p.vida-e.fadeOut));
        p.mat.color.setRGB(p.cm[0]*cinza*op,p.cm[1]*cinza*op,p.cm[2]*cinza*op);/* aditivo: escurecer = sumir */
        p.mat.opacity=1;
        var s=curva(e.esc,x,1);
        if(e.tipo==='sprite'){var w=p.tam*s*k;ob.scale.set(w,w,1);p.mat.rotation=2*Math.PI*((p.spin||0)+(e.sps||0)*t);}
        else{
          if(p.txyz)ob.scale.set(p.txyz[0]*s*k,p.txyz[2]*s*k,p.txyz[1]*s*k);else ob.scale.setScalar(p.tam*s*k);
          var sp=p.spin3||[0,0,0],v=e.sps3||[0,0,0];
          ob.rotation.set(2*Math.PI*(sp[0]+v[0]*t),2*Math.PI*(sp[2]+v[2]*t),2*Math.PI*(sp[1]+v[1]*t));
        }
      });
    }
    avaliar(0);
    return {grupo:grupo,avaliar:avaliar,duracao:fim,vivo:function(t){return t<fim;},
      liberar:function(){if(grupo.parent)grupo.parent.remove(grupo);parts.forEach(function(p){if(p.mat.map&&p.e.sub)p.mat.map.dispose();p.mat.dispose();});}};
  }
  /* disparo no jogo: segue o osso da mao a cada quadro e se apaga sozinho */
  var ATIVOS=[],laco=false,_v=null,_s=null;/* THREE chega depois (modulo), entao os vetores nascem no 1o uso */
  function passo(){
    var agora=performance.now();
    for(var i=ATIVOS.length-1;i>=0;i--){
      var a=ATIVOS[i],t=(agora-a.t0)/1000;
      if(!a.fx.vivo(t)){a.fx.liberar();ATIVOS.splice(i,1);continue;}
      try{if(a.osso){a.osso.getWorldPosition(_v);a.fx.grupo.position.copy(_v);}}catch(_){}
      a.fx.avaliar(t);
    }
    if(ATIVOS.length)requestAnimationFrame(passo);else laco=false;
  }
  function disparar(scene,osso,o){
    if(!scene||!osso||!window.THREE)return;
    if(!_v){_v=new THREE.Vector3();_s=new THREE.Vector3();}
    if(!pronto){carregar();return;}
    o=o||{};
    if(o.escala==null){/* osso do rig L2 esta em unidades do L2: a escala de mundo dele = metros por unidade */
      try{osso.getWorldScale(_s);var k=_s.x;o.escala=(k>.004&&k<.2)?k:.04;}catch(_){o.escala=.04;}
    }
    while(ATIVOS.length>=3){ATIVOS[0].fx.liberar();ATIVOS.shift();}/* ataque rapido: no maximo 3 ao mesmo tempo */
    var fx=criar(o);scene.add(fx.grupo);
    try{osso.getWorldPosition(_v);fx.grupo.position.copy(_v);}catch(_){}
    ATIVOS.push({fx:fx,osso:osso,t0:performance.now()});
    if(!laco){laco=true;requestAnimationFrame(passo);}
  }
  window.SSL2={carregar:carregar,criar:criar,disparar:disparar,pronto:function(){return pronto;}};
  (function pre(n){if(window.THREE){try{carregar();}catch(_){}}else if(n<40)setTimeout(function(){pre(n+1);},500);})(0);/* pre-carrega (580 KB) assim que o THREE existir */
})();
