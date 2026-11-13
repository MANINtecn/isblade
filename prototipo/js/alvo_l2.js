/* Janela do ALVO Autêntica estilo Lineage 2 (Mobs, Chefes, Espantalho e Jogadores).
   Utiliza as texturas originais extraídas de l2ui.utx e L2UI_CH3.utx do cliente Lineage 2 Interlude:
   TargetBack.png, TargetCloseButton.png, hpbar_back.png e hpbar.png. */
(function(){
  var A = window.AlvoL2 = {}, el = null, ult = '';

  function corNivel(nv, meu){
    if(!nv || !meu) return '#ffffff';
    var d = nv - meu;
    if(d <= -9) return '#9e9e9e'; // Cinza (muito fraco)
    if(d <= -3) return '#4ade80'; // Verde (fraco)
    if(d < 3)   return '#ffffff'; // Branco (pareado)
    if(d < 9)   return '#facc15'; // Amarelo (forte)
    return '#ef4444';             // Vermelho (muito forte)
  }

  function iconeAlvo(nome, nv, tipo){
    var n = (nome || '').toLowerCase();
    if(tipo === 'dummy' || n.indexOf('espantalho') >= 0) return '🎯';
    if(n.indexOf('baium') >= 0 || tipo === 'boss') return '👑';
    if(n.indexOf('guardi') >= 0) return '🛡️';
    if(n.indexOf('mago') >= 0 || n.indexOf('feitic') >= 0) return '🔮';
    if(n.indexOf('clérigo') >= 0 || n.indexOf('clerigo') >= 0) return '✨';
    if(n.indexOf('espadachim') >= 0 || n.indexOf('guerreiro') >= 0) return '⚔️';
    if(tipo === 'player') return '👤';
    if(nv >= 30) return '💀';
    return '👺';
  }

  function monta(){
    if(el) return;
    var st = document.createElement('style');
    st.textContent = [
      '#alvoMob{',
      '  position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:64;display:none;',
      '  width:320px;max-width:92vw;padding:8px 12px 10px 12px;border-radius:2px;',
      '  background:#0c101a url("assets/ui/TargetBack.png") repeat;',
      '  border:2px solid #3c301c;',
      '  box-shadow:inset 0 0 0 1px #8a7038, inset 0 0 18px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.85);',
      '  color:#eaf2ff;font-family:"Cinzel", Georgia, "Times New Roman", serif;pointer-events:all;user-select:none;',
      '}',
      '#alvoMob .l2-topo{display:flex;align-items:center;gap:9px;}',
      '#alvoMob .l2-brasao{',
      '  width:32px;height:32px;border-radius:50%;flex-shrink:0;',
      '  border:1px solid #d4af37;',
      '  background:radial-gradient(circle, #22324f 0%, #0d1422 100%);',
      '  display:flex;align-items:center;justify-content:center;font-size:16px;',
      '  box-shadow:inset 0 0 6px rgba(0,0,0,0.8), 0 0 6px rgba(212,175,55,0.4);',
      '}',
      '#alvoMob .l2-info{flex:1;min-width:0;}',
      '#alvoMob .l2-nome-linha{display:flex;align-items:baseline;justify-content:space-between;gap:6px;}',
      '#alvoMob .l2-nome{',
      '  font-size:13px;font-weight:700;letter-spacing:0.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;',
      '  text-shadow:0 1px 3px #000, 0 0 8px rgba(0,0,0,0.9);',
      '}',
      '#alvoMob .l2-badge-nv{',
      '  font-size:10px;font-weight:800;padding:1px 5px;border-radius:2px;',
      '  background:rgba(0,0,0,0.75);border:1px solid #4a3a1f;flex-shrink:0;',
      '  font-family:system-ui, sans-serif;letter-spacing:0.02em;',
      '}',
      '#alvoMob .l2-sub{',
      '  font-size:10px;font-weight:600;color:#9eb3cc;letter-spacing:0.03em;',
      '  font-family:system-ui, sans-serif;margin-top:1px;',
      '}',
      '#alvoMob .l2-fechar{',
      '  width:16px;height:16px;flex-shrink:0;border:none;outline:none;',
      '  background:transparent url("assets/ui/TargetCloseButton.png") no-repeat center;',
      '  cursor:pointer;margin-left:4px;',
      '  transition:transform 0.1s ease;',
      '}',
      '#alvoMob .l2-fechar:hover, #alvoMob .l2-fechar:active{',
      '  background-image:url("assets/ui/TargetCloseButton_click.png");',
      '}',
      '#alvoMob .l2-barras{margin-top:7px;display:flex;flex-direction:column;gap:4px;}',
      '#alvoMob .l2-trilho{',
      '  height:11px;border-radius:1px;',
      '  background:#09090b url("assets/ui/hpbar_back.png") repeat-x center;',
      '  border:1px solid #20181a;box-shadow:inset 0 1px 3px rgba(0,0,0,0.95);',
      '  position:relative;overflow:hidden;',
      '}',
      '#alvoMob .l2-trilho.mp{background:#040d1a;border-color:#142d54;}',
      '#alvoMob .l2-trilho.cp{background:#1a1404;border-color:#544314;}',
      '#alvoMob .l2-fill-hp{',
      '  height:100%;',
      '  background:#b01018 url("assets/ui/hpbar.png") repeat-x center;',
      '  box-shadow:inset 0 1px 0 rgba(255,255,255,0.45);',
      '  transition:width 0.15s ease;',
      '}',
      '#alvoMob .l2-fill-mp{',
      '  height:100%;background:linear-gradient(180deg, #6bb8ff 0%, #1c72e6 42%, #084aa8 55%, #002259 100%);',
      '  box-shadow:inset 0 1px 0 rgba(255,255,255,0.45);',
      '  transition:width 0.15s ease;',
      '}',
      '#alvoMob .l2-fill-cp{',
      '  height:100%;background:linear-gradient(180deg, #ffe066 0%, #d4a017 42%, #8a6500 55%, #423000 100%);',
      '  box-shadow:inset 0 1px 0 rgba(255,255,255,0.45);',
      '  transition:width 0.15s ease;',
      '}',
      '#alvoMob .l2-txt-hp{',
      '  position:absolute;left:0;top:0;width:100%;height:100%;',
      '  display:flex;align-items:center;justify-content:center;',
      '  font-size:8.5px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000;',
      '  font-family:system-ui, sans-serif;letter-spacing:0.04em;',
      '}'
    ].join('\n');
    document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'alvoMob';
    el.addEventListener('click', function(e){
      if(e.target && e.target.classList.contains('l2-fechar')){
        A.atualiza(null);
        if(window.Net && Net.alvo) Net.selecionar(0);
      }
    });
    document.body.appendChild(el);
  }

  A.fechar = function(){ A.atualiza(null); };

  A.atualiza = function(a){
    if(!document.body) return; monta();
    if(!a){
      if(ult){ ult = ''; el.style.display = 'none'; }
      return;
    }
    var kHp = Math.max(0, Math.min(1, a.hp / (a.max || 1)));
    var cor = corNivel(a.nv, a.meuNv);
    var ico = iconeAlvo(a.nome, a.nv, a.tipo);
    var pct = Math.ceil(kHp * 100);
    
    var sub = a.sub;
    if(!sub){
      if(a.tipo === 'dummy' || (a.nome && a.nome.toLowerCase().indexOf('espantalho') >= 0)){
        sub = 'Alvo de Treino · Imortal';
      } else if(a.tipo === 'boss'){
        sub = 'Raid Boss';
      } else if(a.nv){
        sub = 'Monstro Nv ' + a.nv;
      } else {
        sub = 'Alvo';
      }
    }
    if(a.agr) sub += ' · Agressivo';

    var html = [
      '<div class="l2-topo">',
      '  <div class="l2-brasao">' + ico + '</div>',
      '  <div class="l2-info">',
      '    <div class="l2-nome-linha">',
      '      <span class="l2-nome" style="color:' + cor + '">' + String(a.nome || 'Alvo').replace(/[<>&]/g, '') + '</span>',
      (a.nv ? '      <span class="l2-badge-nv" style="color:' + cor + '">Nv ' + a.nv + '</span>' : ''),
      '    </div>',
      '    <div class="l2-sub">' + sub + '</div>',
      '  </div>',
      '  <button class="l2-fechar" title="Fechar alvo (Esc)"></button>',
      '</div>',
      '<div class="l2-barras">',
      '  <div class="l2-trilho">',
      '    <div class="l2-fill-hp" style="width:' + (kHp * 100).toFixed(1) + '%"></div>',
      '    <div class="l2-txt-hp">' + (a.hp != null && a.max != null ? Math.round(a.hp) + ' / ' + Math.round(a.max) + ' (' + pct + '%)' : pct + '%') + '</div>',
      '  </div>',
      (a.cp != null && a.maxcp ? '  <div class="l2-trilho cp"><div class="l2-fill-cp" style="width:' + Math.min(100, Math.max(0, (a.cp / a.maxcp) * 100)).toFixed(1) + '%"></div><div class="l2-txt-hp">CP ' + Math.round(a.cp) + '</div></div>' : ''),
      (a.mp != null && a.maxmp ? '  <div class="l2-trilho mp"><div class="l2-fill-mp" style="width:' + Math.min(100, Math.max(0, (a.mp / a.maxmp) * 100)).toFixed(1) + '%"></div><div class="l2-txt-hp">MP ' + Math.round(a.mp) + '</div></div>' : ''),
      '</div>'
    ].join('');

    if(html !== ult){
      ult = html;
      el.innerHTML = html;
    }
    el.style.display = 'block';
  };
})();
