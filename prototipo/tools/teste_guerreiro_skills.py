"""Teste das skills do Guerreiro (Humano M, Dragon Slayer) no navegador: Golpe Poderoso, Atordoante, Furia, Grito, Redemoinho (10 golpes).
Uso: python teste_guerreiro_skills.py <pasta_prints> [url_base=http://localhost:8140] [pagina=arena|cidade]   (servidor local no ar; 1 conta por execucao)"""
from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
SC = sys.argv[1]; B = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8140'; PAG = sys.argv[3] if len(sys.argv) > 3 else 'arena'
def api(m, c, corpo=None, tk=None):
    r = urllib.request.Request(B + c, method=m, data=json.dumps(corpo).encode() if corpo is not None else None, headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
u = 'w' + str(time.time_ns())[-7:]; tk = api('POST', '/api/conta/criar', {'user': u, 'senha': '123456'})['token']; t = 'human_fighter'
ch = api('POST', '/api/personagens', {'name': 'Gu' + u[-5:], 'race': t, 'charType': t, 'weapon': 'sword'}, tk)['char']
URL = B + ('/arena.html?mode=duel&wpn=sword&q=media' if PAG == 'arena' else '/cidade.html?wpn=sword&q=media')
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    c = b.new_context(viewport={'width': 900, 'height': 520})
    c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_char','%s');localStorage.setItem('isblade.char_type','%s');" % (tk, ch.get('id', ''), t))
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:240])); pg.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_function("window.__torreDbg||window.__dbg", timeout=300000)
    if PAG != 'arena': pg.wait_for_timeout(15000)
    for i in range(90):
        ok = pg.evaluate("()=>{const d=window.__torreDbg?__torreDbg():null;const r=d&&d.rig&&d.rig();return !!(r&&r.wClips&&r.clips.w_s1&&r.clips.w_s6&&r.swd2h)}") if PAG == 'arena' else True
        if ok and pg.evaluate("()=>!!(window.GuerreiroFX&&GuerreiroFX.pronto)"): break
        pg.wait_for_timeout(1000)
    print('GuerreiroFX pronto', pg.evaluate("()=>!!(window.GuerreiroFX&&GuerreiroFX.pronto)"), '| clipes', pg.evaluate("()=>{const d=window.__torreDbg?__torreDbg():null;const r=d&&d.rig&&d.rig();return r&&r.wClips?Object.keys(r.wClips).join(','):'-'}"), '| skills', pg.evaluate("()=>(window.__torreDbg?__torreDbg().SK:__dbg.SK()).map(s=>s.name+':'+s.pose).join(' | ')"))
    pg.evaluate("()=>{window.__partes=[];if(window.Net&&Net.atacou){const o=Net.atacou;Net.atacou=function(an){try{window.__partes.push([an.skill?an.skill.pose:'b',an.part||0,Math.round(performance.now())]);}catch(_){}return o.apply(this,arguments);};}}")
    if PAG == 'arena':
        pg.evaluate("()=>{const d=__torreDbg();d.SK.forEach(s=>s.unlock=0);}"); pg.wait_for_timeout(800)
        pos = "()=>{const d=__torreDbg(),S=d.S,f=S.face;S.px=S.ex-Math.sin(f)*3.4;S.pz=S.ez-Math.cos(f)*3.4}"
        pg.evaluate(pos); pg.wait_for_timeout(500)
        for i, nome, esp in ((1, 'poderoso', (300, 700, 1200)), (2, 'atordoante', (700, 1300, 2200)), (5, 'redemoinho', (800, 1700, 3000)), (4, 'grito', (900, 1500, 2500)), (3, 'furia', (400, 1400, 2600))):
            hp0 = pg.evaluate("()=>__torreDbg().S.hp"); pg.evaluate("()=>{window.__partes=[]}")
            r = pg.evaluate("(i)=>{const d=__torreDbg();d.S.cd[i]=0;d.S.st=100;d.S.anim=null;return d.castSkill(i)}", i)
            print(nome, 'castSkill ->', r)
            for k, ms in enumerate(esp):
                pg.wait_for_timeout(ms); pg.screenshot(timeout=120000, path='%s/w_%s_%d.png' % (SC, nome, k))
            pg.wait_for_timeout(4500)
            print('  hp chefe', hp0, '->', pg.evaluate("()=>__torreDbg().S.hp"), '| golpes enviados', pg.evaluate("()=>window.__partes.length"), pg.evaluate("()=>JSON.stringify(window.__partes.map(x=>x[1]))"))
            pg.evaluate(pos)
    else:
        pg.evaluate("()=>{__dbg.SK().forEach(s=>s.unlock=0);}"); pg.wait_for_timeout(1500)
        for i, nome, esp in ((1, 'poderoso', (300, 700, 1200)), (2, 'atordoante', (700, 1300, 2200)), (5, 'redemoinho', (800, 1700, 3000)), (4, 'grito', (900, 1500, 2500)), (3, 'furia', (400, 1400, 2600))):
            r = pg.evaluate("(i)=>{const S=__dbg.S;S.cd[i]=0;S.st=100;S.anim=null;return __dbg.castSkill(i)}", i)
            print(nome, 'castSkill ->', r)
            for k, ms in enumerate(esp):
                pg.wait_for_timeout(ms); pg.screenshot(timeout=120000, path='%s/c_%s_%d.png' % (SC, nome, k))
            pg.wait_for_timeout(3500)
    print('erros', errs[:8]); b.close()
