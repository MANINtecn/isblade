"""Teste das skills 2 a 5 do mago (Meteoro, Disco de Fogo, Coluna de Agua, Espinho Paralisante) no navegador.
Uso: python teste_mago_skills2.py <pasta_prints> [url_base=http://localhost:8000] [pagina=arena|cidade]   (servidor local no ar; 1 conta por execucao: limite 10 contas/h)"""
from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
SC = sys.argv[1]; B = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8000'; PAG = sys.argv[3] if len(sys.argv) > 3 else 'arena'
def api(m, c, corpo=None, tk=None):
    r = urllib.request.Request(B + c, method=m, data=json.dumps(corpo).encode() if corpo is not None else None, headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
u = 'm' + str(time.time_ns())[-7:]; tk = api('POST', '/api/conta/criar', {'user': u, 'senha': '123456'})['token']; t = 'magic_f'
ch = api('POST', '/api/personagens', {'name': 'Mg' + u[-5:], 'race': t, 'charType': t, 'weapon': 'staff'}, tk)['char']
URL = B + ('/arena.html?mode=duel&wpn=staff&q=media' if PAG == 'arena' else '/cidade.html?wpn=staff&q=media')
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    c = b.new_context(viewport={'width': 900, 'height': 520})
    c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s')" % (tk, ch['id'], t))
    pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:240])); pg.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_function("window.__torreDbg||window.__dbg", timeout=300000)
    if PAG != 'arena': pg.wait_for_timeout(15000)
    DBG = '__torreDbg()' if PAG == 'arena' else '__dbg'
    for i in range(80):
        ok = pg.evaluate("()=>{const r=(window.__torreDbg?__torreDbg():{}).rig&&__torreDbg().rig();return !!(r&&r.mCast&&r.clips.m_cast1)}") if PAG == 'arena' else True
        if ok and pg.evaluate("()=>!!(window.MagoFX2&&MagoFX2.pronto)"): break
        pg.wait_for_timeout(1000)
    print('MagoFX2 pronto', pg.evaluate("()=>!!(window.MagoFX2&&MagoFX2.pronto)"), '| skills', pg.evaluate("()=>(window.__torreDbg?__torreDbg().SK:[]).map(s=>s.name+':'+s.pose).join(' | ')"))
    if PAG == 'arena':
        pg.evaluate("()=>{const d=__torreDbg();d.SK.forEach(s=>s.unlock=0);}"); pg.wait_for_timeout(800)
        pg.evaluate("()=>{const d=__torreDbg(),S=d.S,f=S.face;S.px=S.ex-Math.sin(f)*6;S.pz=S.ez-Math.cos(f)*6}"); pg.wait_for_timeout(500)
        for i, nome, esp in ((2, 'meteoro', (500, 1100, 1500)), (5, 'disco', (400, 900, 1700)), (4, 'coluna', (500, 1000, 1500)), (3, 'espinho', (500, 1400, 2400))):
            hp0 = pg.evaluate("()=>__torreDbg().S.hp")
            r = pg.evaluate("(i)=>{const d=__torreDbg();d.SK.forEach(s=>{});d.S.cd[i]=0;d.S.st=100;d.S.anim=null;return d.castSkill(i)}", i)
            print(nome, 'castSkill ->', r)
            for k, ms in enumerate(esp):
                pg.wait_for_timeout(ms); pg.screenshot(path='%s/s_%s_%d.png' % (SC, nome, k))
            pg.wait_for_timeout(3500)
            print('  hp chefe', hp0, '->', pg.evaluate("()=>__torreDbg().S.hp"), '| projeteis vivos', pg.evaluate("()=>__torreDbg().PROJ.length"))
            pg.evaluate("()=>{const d=__torreDbg(),S=d.S,f=S.face;S.px=S.ex-Math.sin(f)*6;S.pz=S.ez-Math.cos(f)*6}")
    else:
        pg.evaluate("()=>{__dbg.SK().forEach(s=>s.unlock=0);}"); pg.wait_for_timeout(1500)
        for i, nome, esp in ((2, 'meteoro', (400, 800, 1500)), (5, 'disco', (500, 1200, 2400)), (4, 'coluna', (400, 800, 1500)), (3, 'espinho', (500, 1500, 3000))):
            r = pg.evaluate("(i)=>{const S=__dbg.S;S.cd[i]=0;S.st=100;S.anim=null;return __dbg.castSkill(i)}", i)
            print(nome, 'castSkill ->', r)
            for k, ms in enumerate(esp):
                pg.wait_for_timeout(ms); pg.screenshot(path='%s/c_%s_%d.png' % (SC, nome, k))
            pg.wait_for_timeout(2500)
    print('erros', errs[:6]); b.close()
