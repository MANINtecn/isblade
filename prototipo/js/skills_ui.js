/* ==========================================================================
   skills_ui.js — Janela de Habilidades Oficial 1:1 Lineage 2 Interlude (MagicSkillWnd)
   Fiel ao 0053_MagicSkillWnd.xml e MagicSkillWnd.uc:
   - Dimensões: 256 x 335 px
   - Fundo: L2UI_CH3.SkillWnd.skill_back (l2_skill_wnd_clean.png)
   - Abas: Active (ASkill) e Passive (PSkill)
   - Skills soltas e livres: SEM tag/tarja de tecla fixa (Q, E, R)
   - Suporte completo a Drag & Drop para os 12 slots da barra de atalhos (ShortcutWnd)
   ========================================================================== */

(function(){
  var SUI = window.SkillsUI = {}, aba = 'active';

  function esc(t){
    return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  SUI.render = function(box, weapon, skills, ml, op){
    if(!box) return;
    op = op || {};

    var h = [
      '<div class="l2-sk-title">Skills</div>',
      '<button type="button" class="l2-sk-close" data-a="fechar" title="Fechar (K)"></button>',
      '<div class="l2-sk-tab tab-act ' + (aba === 'active' ? 'ativa' : '') + '" data-a="tab-act">Active</div>',
      '<div class="l2-sk-tab tab-pas ' + (aba === 'passive' ? 'ativa' : '') + '" data-a="tab-pas">Passive</div>'
    ];

    if(aba === 'active'){
      h.push('<div class="l2-sk-list">');
      h.push('<div class="l2-sk-header-info"><b>' + esc(weapon.name || 'Arma') + '</b><span>Maestria Nv ' + ml + '</span></div>');

      skills.forEach(function(s, i){
        var cs = op.skillCands ? op.skillCands(i) : [s];
        var cur = s;
        cs.forEach(function(cand, idx){
          var lock = (cand.unlock || 0) > ml || cand.pronta === false;
          var on = (cand === cur);
          var svgIcon = op.skillIconSVG ? op.skillIconSVG(cand, 32) : '';

          h.push(
            '<div class="l2-sk-row' + (on ? ' on' : '') + (lock ? ' lock' : '') + '" ' +
                 'draggable="' + (!lock ? 'true' : 'false') + '" ' +
                 'data-slot="' + i + '" data-idx="' + idx + '" title="' + esc(cand.name) + '">' +
              '<div class="l2-sk-ico">' + (cand.ico ? '<img src="' + esc(cand.ico) + '" width="30" height="30" style="display:block;border-radius:2px;pointer-events:none;" alt="">' : svgIcon) + '</div>' +
              '<div class="l2-sk-desc">' +
                '<b class="l2-sk-name">' + esc(cand.name) + (on ? ' <span class="chk">✓</span>' : '') + '</b>' +
                '<small class="l2-sk-sub">' + (lock ? '<span class="lk">Maestria Nv ' + cand.unlock + '</span>' : esc(cand.desc || (cand.proj ? 'Alcance ' + cand.range : 'Ataque Físico'))) + '</small>' +
              '</div>' +
            '</div>'
          );
        });
      });

      h.push('</div>');
    } else {
      // Aba Passive
      h.push(
        '<div class="l2-sk-list" style="padding-top:16px;text-align:center;color:#8fa4c2;font-size:10px;">',
        '  <div class="l2-sk-row" style="cursor:default;opacity:0.85;">',
        '    <div class="l2-sk-ico"><img src="assets/icones/sword_long.png" width="30" height="30" style="display:block;border-radius:2px;" alt=""></div>',
        '    <div class="l2-sk-desc">',
        '      <b class="l2-sk-name">Maestria em Armas</b>',
        '      <small class="l2-sk-sub">Aumenta o P.Atk em +10%</small>',
        '    </div>',
        '  </div>',
        '  <div class="l2-sk-row" style="cursor:default;opacity:0.85;margin-top:4px;">',
        '    <div class="l2-sk-ico"><img src="assets/icones/chest_plate.png" width="30" height="30" style="display:block;border-radius:2px;" alt=""></div>',
        '    <div class="l2-sk-desc">',
        '      <b class="l2-sk-name">Maestria em Armadura</b>',
        '      <small class="l2-sk-sub">Aumenta o P.Def em +10%</small>',
        '    </div>',
        '  </div>',
        '</div>'
      );
    }

    box.innerHTML = h.join('');

    // Previne que cliques vazem para o jogo
    box.onpointerdown = function(e){ e.stopPropagation(); };
    box.onmousedown = function(e){ e.stopPropagation(); };

    // Drag & Drop livre da skill para qualquer slot da hotbar
    box.ondragstart = function(ev){
      var row = ev.target.closest('.l2-sk-row');
      if(!row || row.classList.contains('lock')) return;
      var sIdx = +row.getAttribute('data-slot');
      var s = skills[sIdx];
      if(!s) return;

      var payload = JSON.stringify({
        type: 'skill',
        skillSlot: sIdx,
        name: s.name,
        ico: s.ico || '',
        svg: op.skillIconSVG ? op.skillIconSVG(s, 32) : ''
      });
      ev.dataTransfer.setData('text/plain', payload);
      ev.dataTransfer.setData('application/json', payload);
    };

    // Eventos de clique (fechar, abas, alternar variante da skill)
    box.onclick = function(ev){
      var t = ev.target.closest('[data-a],.l2-sk-row');
      if(!t) return;
      ev.stopPropagation();

      var a = t.getAttribute('data-a');
      if(a === 'fechar'){ op.fechar && op.fechar(); return; }
      if(a === 'tab-act'){ aba = 'active'; SUI.render(box, weapon, skills, ml, op); return; }
      if(a === 'tab-pas'){ aba = 'passive'; SUI.render(box, weapon, skills, ml, op); return; }

      if(t.classList.contains('l2-sk-row')){
        if(t.classList.contains('lock')) return;
        var slot = +t.getAttribute('data-slot');
        var idx = +t.getAttribute('data-idx');
        if(op.selectSkill) op.selectSkill(slot, idx);
      }
    };

    if (window.L2Drag && typeof window.L2Drag.restore === 'function') {
      window.L2Drag.restore('skp');
    }
  };
})();
