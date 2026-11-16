"""Teste do kit novo do Guerreiro (15/11/2026): 7 skills w_n0..w_n6 com o Humano M e a espada de 2 maos.
Uso: python teste_guerreiro_kit_novo.py <pasta_prints> [url_base=http://localhost:8140] [pagina=arena|cidade]   (servidor local no ar; 1 conta por execucao)
Confere: clipes w_n* anexados, cada skill sai sem erro de pagina, golpes enviados (partes) batem com o json, vida do chefe cai (arena),
Tufao anda com o direcional (W) durante o giro, prints em 3 instantes de cada skill."""
from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
SC = sys.argv[1]; B = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8140'; PAG = sys.argv[3] if len(sys.argv) > 3 else 'arena'
def api(m, c, corpo=None, tk=None):
    r = urllib.request.Request(B + c, method=m, data=json.dumps(corpo).encode() if corpo is not None else None, headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
u = 'k' + str(time.time_ns())[-7:]; tk = api('POST', '/api/conta/criar', {'user': u, 'senha': '123456'})['token']; t = 'human_fighter'
ch = api('POST', '/api/personagens', {'name': 'Kg' + u[-5:], 'race': t, 'charType': t, 'weapon': 'sword'}, tk)['char']
URL = B + ('/arena.html?mode=duel&wpn=sword&q=media' if PAG == 'arena' else '/cidade.html?wpn=sword&q=media')
SKILLS = ((0, 'investida', (500, 900, 1500)), (1, 'contra', (900, 1900, 2400)), (2, 'lancador', (900, 2400, 4000)), (3, 'fenda', (1000, 1500, 2300)),
          (4, 'tufao', (1200, 2500, 4300)), (5, 'modo', (1500, 2600, 4000)), (6, 'execucao', (800, 2400, 3300)))
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    c = b.new_context(viewport={'width': 900, 'height': 520})
    c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s');" % (tk, ch.get('id', ''), t))
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:240])); pg.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_function("window.__torreDbg||window.__dbg", timeout=300000)
    if PAG != 'arena': pg.wait_for_timeout(15000)
    for i in range(90):
        ok = pg.evaluate("()=>{const d=window.__torreDbg?__torreDbg():null;const r=d&&d.rig&&d.rig();return !!(r&&r.wClips&&r.clips.w_n0&&r.clips.w_n6&&r.swd2h)}") if PAG == 'arena' else True
        if ok and pg.evaluate("()=>!!(window.GuerreiroFX&&GuerreiroFX.pronto&&GuerreiroFX.swingN)"): break
        pg.wait_for_timeout(1000)
    print('GuerreiroFX pronto', pg.evaluate("()=>!!(window.GuerreiroFX&&GuerreiroFX.pronto&&GuerreiroFX.swingN)"), '| clipes', pg.evaluate("()=>{const d=window.__torreDbg?__torreDbg():null;const r=d&&d.rig&&d.rig();return r&&r.wClips?Object.keys(r.wClips).join(','):'-'}"))
    print('skills', pg.evaluate("()=>(window.__torreDbg?__torreDbg().SK:__dbg.SK()).map(s=>s.name+':'+s.pose+(s.hits?'x'+s.hits.length:'')).join(' | ')"))
    pg.evaluate("()=>{window.__partes=[];if(window.Net&&Net.atacou){const o=Net.atacou;Net.atacou=function(an){try{window.__partes.push([an.skill?an.skill.pose:'b',an.part||0]);}catch(_){}return o.apply(this,arguments);};}}")
    D = "__torreDbg()" if PAG == 'arena' else "__dbg"
    SK = D + ".SK" if PAG == 'arena' else "__dbg.SK()"
    pg.evaluate("()=>{%s.forEach(s=>s.unlock=0);}" % SK); pg.wait_for_timeout(800)
    pos = "()=>{const d=__torreDbg(),S=d.S,f=S.face;S.px=S.ex-Math.sin(f)*3.0;S.pz=S.ez-Math.cos(f)*3.0}"
    for i, nome, esp in SKILLS:
        if PAG == 'arena': pg.evaluate(pos); pg.wait_for_timeout(400)
        hp0 = pg.evaluate("()=>__torreDbg().S.hp") if PAG == 'arena' else None; pg.evaluate("()=>{window.__partes=[]}")
        px0 = pg.evaluate("()=>{const S=%s.S;return [S.px,S.pz]}" % D)
        r = pg.evaluate("(i)=>{const S=%s.S;S.cd[i]=0;S.st=100;S.stun=0;S.anim=null;const r=%s.castSkill(i);S.ifr=60;return r}" % (D, D), i)   # so no teste: invulneravel, para o chefe nao interromper a skill
        print(nome, 'castSkill ->', r)
        if nome == 'tufao': pg.keyboard.down('w')
        for k, ms in enumerate(esp):
            pg.wait_for_timeout(ms); pg.screenshot(timeout=120000, path='%s/%s_%s_%d.png' % (SC, PAG[0], nome, k))
        if nome == 'tufao':
            pg.keyboard.up('w'); px1 = pg.evaluate("()=>{const S=%s.S;return [S.px,S.pz]}" % D)
            print('  tufao andou %.2f m com W' % (((px1[0] - px0[0]) ** 2 + (px1[1] - px0[1]) ** 2) ** .5))
        for _ in range(90):                                                    # o navegador de teste (WebGL por software) roda devagar: espera a skill acabar de verdade
            if pg.evaluate("()=>!%s.S.anim" % D): break
            pg.wait_for_timeout(500)
        pg.wait_for_timeout(1500)
        msg = '  golpes enviados %d %s' % (pg.evaluate("()=>window.__partes.length"), pg.evaluate("()=>JSON.stringify(window.__partes.map(x=>x[1]))"))
        if PAG == 'arena': msg += ' | hp chefe %s -> %s' % (hp0, pg.evaluate("()=>__torreDbg().S.hp"))
        msg += ' | sup ' + pg.evaluate("()=>{try{const s=window.__sup&&__sup();return s?JSON.stringify({atk:s.atk,ate:Math.round((s.preceAte||0)-performance.now()/1000)}):'-'}catch(e){return '-'}}")
        print(msg)
    print('erros', errs[:10]); b.close()
