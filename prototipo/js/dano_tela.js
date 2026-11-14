/* [dano-tela] Numeros de dano na tela, modelo Cabal (14/11/2026).
   Normal = amarelo, critico = azul (hoje: golpe PERFEITO), dano recebido = vermelho.
   Numeros seguidos no mesmo alvo empilham para cima (sem total, como no Cabal).
   Fonte provisoria: Teko 600 (OFL, assets/fonts/teko600.woff2); trocar pela fonte propria do IS BLADE depois.
   Uso: DanoTela.num(valor, {x,y,z}, tipo, chave, rotulo, camera)  tipo: 'n' | 'c' | 'r' */
(function(){
  var css=''
  +"@font-face{font-family:'ISDano';src:url(assets/fonts/teko600.woff2) format('woff2');font-display:swap}"
  +'.dn{position:fixed;pointer-events:none;z-index:3;white-space:nowrap;text-align:center;line-height:.9;'
  +"font-family:'ISDano',Impact,'Arial Narrow',sans-serif;font-weight:600;letter-spacing:.04em;"
  +'transform:translate(-50%,-50%) skewX(-8deg);animation:dnSobe .95s cubic-bezier(.2,.9,.3,1) forwards}'
  +'.dn b{display:block;font-weight:600;-webkit-background-clip:text;background-clip:text;color:transparent}'
  +'.dn i{display:block;font-style:normal;font-size:.42em;letter-spacing:.12em;color:#fff6dc;text-shadow:0 1px 2px #000,0 0 4px #000}'
  /* amarelo: dano normal */
  +'.dn.n b{background-image:linear-gradient(#fffbd6 0%,#ffe45a 42%,#ffb400 70%,#ff8a00 100%);'
  +'filter:drop-shadow(1px 0 0 #3d1c00) drop-shadow(-1px 0 0 #3d1c00) drop-shadow(0 1px 0 #3d1c00) drop-shadow(0 -1px 0 #3d1c00) drop-shadow(0 2px 3px rgba(0,0,0,.8))}'
  /* azul: critico */
  +'.dn.c b{background-image:linear-gradient(#f0ffff 0%,#8ff0ff 40%,#2fb2ff 70%,#1462ff 100%);'
  +'filter:drop-shadow(1px 0 0 #001a4d) drop-shadow(-1px 0 0 #001a4d) drop-shadow(0 1px 0 #001a4d) drop-shadow(0 -1px 0 #001a4d) drop-shadow(0 0 6px rgba(60,170,255,.75))}'
  /* vermelho: dano recebido */
  +'.dn.r b{background-image:linear-gradient(#ffe0d8 0%,#ff6a52 45%,#e01a10 75%,#9a0000 100%);'
  +'filter:drop-shadow(1px 0 0 #2a0000) drop-shadow(-1px 0 0 #2a0000) drop-shadow(0 1px 0 #2a0000) drop-shadow(0 -1px 0 #2a0000) drop-shadow(0 2px 3px rgba(0,0,0,.8))}'
  +'@keyframes dnSobe{0%{opacity:0;scale:1.9}7%{opacity:1;scale:1}65%{opacity:1;translate:0 -16px}100%{opacity:0;translate:0 -34px}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  var PILHA={},TAM={n:30,c:40,r:30};
  function camada(){return document.getElementById('floats')||document.body;}
  window.DanoTela={
    num:function(valor,pos,tipo,chave,rotulo,camera){
      try{
        if(!camera||!window.THREE||!pos)return;
        tipo=TAM[tipo]?tipo:'n';
        var v=new THREE.Vector3(pos.x,pos.y,pos.z).project(camera);
        if(v.z>1)return;/* atras da camera */
        var x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight,tam=TAM[tipo]*(innerWidth<700?.8:1);
        /* pilha: golpes em sequencia no mesmo alvo sobem um degrau */
        var agora=performance.now(),k=chave||'_',p=PILHA[k];
        if(p&&agora-p.t<650)p.i=(p.i+1)%6;else p={i:0};
        p.t=agora;PILHA[k]=p;
        var d=document.createElement('div');d.className='dn '+tipo;
        d.style.left=(x+(p.i%2?10:-10)*(p.i?1:0))+'px';d.style.top=(y-p.i*tam*.78)+'px';d.style.fontSize=tam+'px';
        if(rotulo){var r=document.createElement('i');r.textContent=rotulo;d.appendChild(r);}
        var b=document.createElement('b');b.textContent=String(valor);d.appendChild(b);
        camada().appendChild(d);setTimeout(function(){d.remove();},1000);
      }catch(_){}
    }
  };
})();
