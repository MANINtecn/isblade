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
  +'transform:translate(-50%,-50%) skewX(-8deg);animation:dnEntra .22s cubic-bezier(.2,.9,.3,1) forwards;transition:top .12s ease-out,left .12s ease-out}'
  +'.dn.sai{animation:dnSai .28s ease-out forwards}'
  +'.dn b{display:block;font-weight:600;-webkit-background-clip:text;background-clip:text;color:transparent}'
  +'.dn i{display:block;font-style:normal;font-size:.42em;letter-spacing:.12em;color:#fff6dc;text-shadow:0 1px 2px #000,0 0 4px #000}'
  /* amarelo: dano normal */
  +'.dn.n b{background-image:linear-gradient(#fffbd6 0%,#ffe45a 42%,#ffb400 70%,#ff8a00 100%);'
  +'filter:drop-shadow(2px 0 0 #3d1c00) drop-shadow(-2px 0 0 #3d1c00) drop-shadow(0 2px 0 #3d1c00) drop-shadow(0 -2px 0 #3d1c00) drop-shadow(0 2px 3px rgba(0,0,0,.8))}'
  /* azul: critico */
  +'.dn.c b{background-image:linear-gradient(#f0ffff 0%,#8ff0ff 40%,#2fb2ff 70%,#1462ff 100%);'
  +'filter:drop-shadow(2px 0 0 #001a4d) drop-shadow(-2px 0 0 #001a4d) drop-shadow(0 2px 0 #001a4d) drop-shadow(0 -2px 0 #001a4d) drop-shadow(0 0 6px rgba(60,170,255,.75))}'
  /* [hits-cabal 23/11/2026] dourado grande: TOTAL da skill de varios golpes (soma, quantos golpes e criticos) */
  +'.dn.t b{background-image:linear-gradient(#fffef0 0%,#ffe27a 38%,#ffb000 68%,#ff6a00 100%);'
  +'filter:drop-shadow(1px 0 0 #4a1f00) drop-shadow(-1px 0 0 #4a1f00) drop-shadow(0 1px 0 #4a1f00) drop-shadow(0 -1px 0 #4a1f00) drop-shadow(0 0 8px rgba(255,180,40,.8))}'
  +'.dn.t{animation:dnTotal 2.2s cubic-bezier(.2,.9,.3,1) forwards}'
  +'.dn.t i{font-size:.36em;color:#fff6dc}'
  +'@keyframes dnTotal{0%{opacity:0;scale:2.4}9%{opacity:1;scale:1.15}16%{scale:1}72%{opacity:1;translate:0 -10px}100%{opacity:0;translate:0 -42px}}'
  /* vermelho: dano recebido */
  +'.dn.r b{background-image:linear-gradient(#ffe0d8 0%,#ff6a52 45%,#e01a10 75%,#9a0000 100%);'
  +'filter:drop-shadow(2px 0 0 #2a0000) drop-shadow(-2px 0 0 #2a0000) drop-shadow(0 2px 0 #2a0000) drop-shadow(0 -2px 0 #2a0000) drop-shadow(0 2px 3px rgba(0,0,0,.8))}'
  +'@keyframes dnEntra{0%{opacity:0;scale:2}60%{opacity:1;scale:.95}100%{opacity:1;scale:1}}'      /* [dano-tela 25/11/2026] entra e FICA: quem tira e a pilha (some 1 s depois do ultimo hit, de cima para baixo) */
  +'@keyframes dnSai{to{opacity:0;translate:0 -12px}}';
  var st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

  var PILHA={},TAM={n:50,c:66,r:44,t:76},MAXP=6,OCIOSO=1000;      /* [dano-tela 25/11/2026] como no Cabal (video lido quadro a quadro): coluna de ate 6 linhas, some ~1 s depois do ultimo hit */      /* [dano-tela 23/11/2026] numeros maiores (eram 30/40/30) */
  function camada(){return document.getElementById('floats')||document.body;}
  /* [hits-cabal] total de uma skill de varios golpes: numero dourado grande acima da pilha ('x7 GOLPES  2 CRIT') */
  function total(valor,pos,n,c,chave,camera){
    return;      /* [dano-tela 25/11/2026] o dono NAO quer total: o Cabal so mostra a coluna de hits. Mantido como funcao vazia (quem chama nao quebra). */
    try{
      if(!camera||!window.THREE||!pos)return;
      var v=new THREE.Vector3(pos.x,pos.y,pos.z).project(camera);if(v.z>1)return;
      var x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight,tam=TAM.t*(innerWidth<700?.8:1);
      y=Math.max(TAM.n*.64*5.4+tam,Math.min(innerHeight-70,y));      /* o total tambem sempre cabe na tela */
      var d=document.createElement('div');d.className='dn t';d.style.left=x+'px';d.style.top=(y-TAM.n*.64*5.4)+'px';d.style.fontSize=tam+'px';
      var r=document.createElement('i');r.textContent=n+' GOLPES'+(c?'  ·  '+c+' CRIT':'');d.appendChild(r);
      var b=document.createElement('b');b.textContent=String(valor);d.appendChild(b);
      camada().appendChild(d);setTimeout(function(){d.remove();},2300);
    }catch(_){}
  }
  window.DanoTela={
    total:total,
    num:function(valor,pos,tipo,chave,rotulo,camera){
      try{
        if(!camera||!window.THREE||!pos)return;
        tipo=TAM[tipo]?tipo:'n';
        var v=new THREE.Vector3(pos.x,pos.y,pos.z).project(camera);
        if(v.z>1)return;/* atras da camera */
        var x=(v.x*.5+.5)*innerWidth,y=(-v.y*.5+.5)*innerHeight,tam=TAM[tipo]*(innerWidth<700?.85:1);
        /* [dano-tela 23/11/2026] pilha por alvo: o numero NOVO nasce embaixo e empurra os anteriores para cima (ate 8); a pilha some junta quando os hits param */
        y=Math.max(tam*3.2,Math.min(innerHeight-70,y));      /* [dano-tela 24/11/2026] o numero NOVO sempre cabe na tela (chefe grande perto da camera empurrava tudo para cima do topo) */
        var k=chave||'_',P=PILHA[k]||(PILHA[k]=[]),i,passo=tam*.45;      /* [dano-tela 25/11/2026] ESCADINHA do Cabal (video 1:44, quadro a quadro): o hit novo fica NA FRENTE e cobre a parte de baixo do anterior; do de cima aparece ~metade. Sem tremido, sem desvio lateral */
        for(i=P.length-1;i>=0;i--)if(!P[i].isConnected)P.splice(i,1);
        var d=document.createElement('div');d.className='dn '+tipo;d.style.fontSize=tam+'px';
        if(rotulo){var r=document.createElement('i');r.textContent=rotulo;d.appendChild(r);}
        var b=document.createElement('b');b.textContent=String(valor);d.appendChild(b);
        d.style.left=x+'px';d.style.top=y+'px';
        P.unshift(d);      /* o mais novo entra por ultimo no DOM: fica na frente sem mexer no z-index (que e baixo de proposito, abaixo do HUD) */
        P.forEach(function(e,n){
          if(n>=MAXP){e.classList.add('sai');setTimeout(function(){e.remove();},320);return;}
          e.style.left=x+'px';e.style.top=(y-n*passo)+'px';
        });
        if(P.length>MAXP)P.length=MAXP;
        camada().appendChild(d);setTimeout(function(){d.remove();},6000);      /* seguranca */
        clearTimeout(P.tm);P.tm=setTimeout(function(){var L=P.splice(0);for(var j=L.length-1,q=0;j>=0;j--,q++)(function(e,q){setTimeout(function(){e.classList.add('sai');setTimeout(function(){e.remove();},300);},q*60);})(L[j],q);},OCIOSO);      /* parou de chegar hit: some do topo para baixo */
      }catch(_){}
    }
  };
})();
