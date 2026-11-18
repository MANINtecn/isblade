"""Mede o custo de cada skill do Guerreiro no navegador (WebGL por software: os tempos absolutos nao valem, mas a CONTAGEM vale):
shaders compilados por skill (renderer.info.programs), chamadas de desenho, geometrias/texturas novas, pico de quadro e tempo do JS dos efeitos.
Uso: python tools/medir_skill_guerreiro.py [url_base=http://localhost:8140] [pagina=cidade|arena]   (servidor local no ar; cria 1 conta de teste local por execucao)"""
from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
B = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8140'; PAG = sys.argv[2] if len(sys.argv) > 2 else 'cidade'
def api(m, c, corpo=None, tk=None):
    r = urllib.request.Request(B + c, method=m, data=json.dumps(corpo).encode() if corpo is not None else None, headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
u = 'm' + str(time.time_ns())[-7:]; tk = api('POST', '/api/conta/criar', {'user': u, 'senha': '123456'})['token']; t = 'human_fighter'
ch = api('POST', '/api/personagens', {'name': 'Me' + u[-5:], 'race': t, 'charType': t, 'weapon': 'sword'}, tk)['char']
URL = B + ('/arena.html?mode=duel&wpn=sword&q=media' if PAG == 'arena' else '/cidade.html?wpn=sword&q=media')
INIT = "sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');" % tk
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    c = b.new_context(viewport={'width': 900, 'height': 520})
    print('char', json.dumps(ch)[:200])
    c.add_init_script(INIT + "localStorage.setItem('isblade_active_char','%s');" % ch.get('id', ''))
    pg = c.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:240])); pg.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' else None)
    t0 = time.time(); pg.goto(URL); pg.wait_for_function("window.__torreDbg||window.__dbg", timeout=300000)
    print('pagina pronta em %.1fs' % (time.time() - t0))
    pg.wait_for_timeout(15000)
    ok = pg.evaluate("()=>!!(window.GuerreiroFX&&GuerreiroFX.pronto)"); print('GuerreiroFX pronto', ok)
    D = "(window.__dbg||window.__torreDbg())"
    print('slots', pg.evaluate("()=>{const d=%s;const sk=(d.SK&&d.SK())||d.SK||[];return sk.map((s,i)=>i+':'+(s.pose||s.id||s.name))}" % D))
    pg.evaluate("()=>{const d=%s;((d.SK&&d.SK())||d.SK||[]).forEach(s=>s.unlock=0)}" % D); pg.wait_for_timeout(1000)
    n = pg.evaluate("()=>{const d=%s;return ((d.SK&&d.SK())||d.SK||[]).length}" % D)
    pg.evaluate("()=>{window.__mw=true;window.__m={max:0,soma:0,n:0};let ult=performance.now();(function l(){if(!window.__mw)return;const a=performance.now(),d=a-ult;ult=a;__m.max=Math.max(__m.max,d);__m.soma+=d;__m.n++;requestAnimationFrame(l)})()}")
    pg.wait_for_timeout(3500)
    print('PARADO (sem skill): quadro medio %d ms, pico %d ms; desenhos por quadro %s' % tuple(pg.evaluate("()=>{window.__mw=false;return [Math.round(__m.soma/Math.max(1,__m.n)),Math.round(__m.max),%s.renderer.info.render.calls]}" % D)))
    for rodada in (1, 2):                                               # 2a vez: se ainda compila, o shader nao esta no cache
        for i in range(n):
            pg.evaluate("()=>{window.__m={max:0,soma:0,n:0};const R=%s.renderer;let ult=performance.now();window.__mw=true;(function l(){if(!window.__mw)return;const a=performance.now(),d=a-ult;ult=a;__m.max=Math.max(__m.max,d);__m.soma+=d;__m.n++;requestAnimationFrame(l)})()}" % D)
            nomes0 = pg.evaluate("()=>%s.renderer.info.programs.map(p=>p.cacheKey)" % D)
            a = pg.evaluate("()=>{const R=%s.renderer;return {prog:R.info.programs.length,geo:R.info.memory.geometries,tex:R.info.memory.textures}}" % D)
            r = pg.evaluate("(i)=>{const d=%s;const S=d.S;S.cd[i]=0;S.st=100;S.anim=null;return d.castSkill(i)}" % D, i)
            pg.wait_for_timeout(3500)
            m = pg.evaluate("()=>{window.__mw=false;const R=%s.renderer;return {prog:R.info.programs.length,geo:R.info.memory.geometries,tex:R.info.memory.textures,max:Math.round(__m.max),media:Math.round(__m.soma/Math.max(1,__m.n)),quadros:__m.n}}" % D)
            nv = pg.evaluate("(n)=>%s.renderer.info.programs.slice(n).map(p=>(p.cacheKey||'').replace(/s+/g,' '))" % D, a['prog'])
            if nv: print('   shaders novos:', nv)
            print('rodada %d skill %d cast=%s | shaders +%d | geometrias +%d | texturas +%d | quadro medio %d ms, pico %d ms (%d quadros)' % (rodada, i, r, m['prog'] - a['prog'], m['geo'] - a['geo'], m['tex'] - a['tex'], m['media'], m['max'], m['quadros']))
            pg.wait_for_timeout(1500)
    print('erros', errs[:8]); b.close()
