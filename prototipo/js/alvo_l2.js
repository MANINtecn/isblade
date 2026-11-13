/* alvo_l2.js — Janela de ALVO Autêntica estilo Lineage 2 Interlude.
   Formato compacto clássico (230px) no topo central:
   TargetBack.png, TargetCloseButton.png, hpbar_back.png e hpbar.png.
   Exibe o nome colorido pela regra de perigo do L2, nível e barra de vida oficial. */
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
    return '👻';
  }

  function monta(){
    if(el) return;
    var st = document.createElement('style');
    st.textContent = [
      '#alvoMob{',
      '  position:fixed;left:50%;top:28px;transform:translateX(-50%);z-index:9000;display:none;',
      '  width:230px;max-width:92vw;padding:5px 8px 6px 8px;border-radius:2px;',
      '  background:#090d16 url("assets/ui/TargetBack.png") no-repeat center / 100% 100%;',
      '  border:1px solid #3c301c;',
      '  box-shadow:inset 0 0 0 1px #8a7038, inset 0 0 12px rgba(0,0,0,0.9), 0 6px 20px rgba(0,0,0,0.85);',
      '  color:#eaf2ff;font-family:"Cinzel", Georgia, serif;pointer-events:all;user-select:none;',
      '}',
      '#alvoMob .l2-topo{display:flex;align-items:center;justify-content:space-between;gap:4px;}',
      '#alvoMob .l2-esq{display:flex;align-items:center;gap:6px;min-width:0;flex:1;}',
      '#alvoMob .l2-ico{font-size:14px;flex-shrink:0;}',
      '#alvoMob .l2-nome{font-size:11px;font-weight:700;letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000;}',
      '#alvoMob .l2-nv{font-size:9.5px;font-weight:800;font-family:system-ui, sans-serif;flex-shrink:0;margin-left:2px;}',
      '#alvoMob .l2-fechar{width:14px;height:14px;flex-shrink:0;border:none;outline:none;background:transparent url("assets/ui/TargetCloseButton.png") no-repeat center;cursor:pointer;}',
      '#alvoMob .l2-fechar:hover, #alvoMob .l2-fechar:active{background-image:url("assets/ui/TargetCloseButton_click.png");}',
      '#alvoMob .l2-sub{font-size:8.5px;color:#8fa4c2;font-family:system-ui, sans-serif;margin:2px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
      '#alvoMob .l2-trilho{',
      '  height:9px;border-radius:1px;',
      '  background:#09090b url("assets/ui/hpbar_back.png") repeat-x center;',
      '  border:1px solid #1a1518;box-shadow:inset 0 1px 2px rgba(0,0,0,0.95);',
      '  position:relative;overflow:hidden;',
      '}',
      '#alvoMob .l2-fill-hp{',
      '  height:100%;',
      '  background:#b01018 url("assets/ui/hpbar.png") repeat-x center;',
      '  box-shadow:inset 0 1px 0 rgba(255,255,255,0.4);',
      '  transition:width 0.12s ease;',
      '}',
      '#alvoMob .l2-txt-hp{',
      '  position:absolute;left:0;top:0;width:100%;height:100%;',
      '  display:flex;align-items:center;justify-content:center;',
      '  font-size:7.5px;font-weight:800;color:#fff;text-shadow:0 1px 2px #000;',
      '  font-family:system-ui, sans-serif;letter-spacing:0.02em;',
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
      '  <div class="l2-esq">',
      '    <span class="l2-ico">' + ico + '</span>',
      '    <span class="l2-nome" style="color:' + cor + '">' + String(a.nome || 'Alvo').replace(/[<>&]/g, '') + '</span>',
      (a.nv ? '    <span class="l2-nv" style="color:' + cor + '">[' + a.nv + ']</span>' : ''),
      '  </div>',
      '  <button class="l2-fechar" title="Fechar alvo (Esc)"></button>',
      '</div>',
      '<div class="l2-sub">' + sub + '</div>',
      '<div class="l2-trilho">',
      '  <div class="l2-fill-hp" style="width:' + (kHp * 100).toFixed(1) + '%"></div>',
      '  <div class="l2-txt-hp">' + (a.hp != null && a.max != null ? Math.round(a.hp) + ' / ' + Math.round(a.max) + ' (' + pct + '%)' : pct + '%') + '</div>',
      '</div>'
    ].join('');

    if(html !== ult){
      ult = html;
      el.innerHTML = html;
    }
    el.style.display = 'block';
  };
})();
