"""Skills 2 a 5 do mago em TODOS os lugares que usam arena.html: mapas abertos, Torre e dungeon (com mobs). Uso: python teste_mago_skills2_mapas.py <pasta_prints> <url_base>"""
from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
SC = sys.argv[1]; B = sys.argv[2]
def api(m, c, corpo=None, tk=None):
    r = urllib.request.Request(B + c, method=m, data=json.dumps(corpo).encode() if corpo is not None else None, headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
LUGARES_TODOS = [('fortress', '/arena.html?mapa=fortress&wpn=staff&q=media'), ('pantano', '/arena.html?mapa=blazing_swamp&wpn=staff&q=media'), ('curuma', '/arena.html?mapa=curuma&wpn=staff&q=media'),
           ('torre', '/arena.html?mapa=torre&wpn=staff&q=media'), ('dungeon', '/arena.html?mode=dungeon&go=normal&wpn=staff&q=media')]
LUGARES = [l for l in LUGARES_TODOS if len(sys.argv) < 4 or l[0] in sys.argv[3].split(',')]
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for nome, rota in LUGARES:
        u = 'm' + str(time.time_ns())[-8:]; tk = api('POST', '/api/conta/criar', {'user': u, 'senha': '123456'})['token']; t = 'magic_f'
        ch = api('POST', '/api/personagens', {'name': 'Mp' + u[-6:], 'race': t, 'charType': t, 'weapon': 'staff'}, tk)['char']
        c = b.new_context(viewport={'width': 900, 'height': 520})
        c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s')" % (tk, ch['id'], t))
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)[:240]))
        pg.goto(B + rota); pg.wait_for_function("window.__torreDbg", timeout=300000)
        for i in range(90):
            if pg.evaluate("()=>{const r=__torreDbg().rig();return !!(r&&r.mCast&&r.clips.m_cast1)&&!!(window.MagoFX2&&MagoFX2.pronto)}"): break
            pg.wait_for_timeout(1000)
        pg.wait_for_timeout(6000 if nome != 'dungeon' else 9000)
        pg.evaluate("()=>{__torreDbg().SK.forEach(s=>s.unlock=0)}")
        info = pg.evaluate("()=>{const d=__torreDbg();return {mobs:d.MOBS.filter(m=>!m.dead).length,boss:d.boss(),dgOn:!!d.dg.on,px:+d.S.px.toFixed(1),pz:+d.S.pz.toFixed(1)}}")
        print('==', nome, info)
        for i, sk in (((1, 'shuriken'),) if len(sys.argv) > 4 else ((2, 'meteoro'), (5, 'disco'), (4, 'coluna'), (3, 'espinho'))):
            antes = pg.evaluate("()=>{const d=__torreDbg();return d.MOBS.filter(m=>!m.dead).reduce((a,m)=>a+m.hp,0)}")
            alvo0 = pg.evaluate("()=>{const d=__torreDbg(),S=d.S;const m=d.MOBS.filter(x=>!x.dead).sort((a,b)=>Math.hypot(a.x-S.px,a.z-S.pz)-Math.hypot(b.x-S.px,b.z-S.pz))[0];window.__m0=m;return m?[m.type,m.hp,+Math.hypot(m.x-S.px,m.z-S.pz).toFixed(1),!!m.srv,!!m.net]:null}")
            hp_ini = pg.evaluate("()=>__torreDbg().S.hp")
            r = pg.evaluate("""(i)=>{const d=__torreDbg(),S=d.S;const m=d.MOBS.filter(x=>!x.dead).sort((a,b)=>Math.hypot(a.x-S.px,a.z-S.pz)-Math.hypot(b.x-S.px,b.z-S.pz))[0];
                if(m){const f=Math.atan2(m.x-S.px,m.z-S.pz);S.face=f;S.px=m.x-Math.sin(f)*5.5;S.pz=m.z-Math.cos(f)*5.5;S.aimM=m;S.aimT=false;}else if(d.boss()){const f=Math.atan2(S.ex-S.px,S.ez-S.pz);S.face=f;S.px=S.ex-Math.sin(f)*5.5;S.pz=S.ez-Math.cos(f)*5.5;S.aimT=true;}
                S.cd[i]=0;S.st=100;S.anim=null;S.php=S.pmax;return d.castSkill(i)}""", i)
            pg.wait_for_timeout(1300); pg.screenshot(path='%s/m_%s_%s.png' % (SC, nome, sk)); pg.wait_for_timeout(9500)
            dep = pg.evaluate("()=>{const d=__torreDbg();return d.MOBS.filter(m=>!m.dead).reduce((a,m)=>a+m.hp,0)}")
            print('  chefe', hp_ini, '->', pg.evaluate("()=>__torreDbg().S.hp")) if info['boss'] else None
            print('  ', sk, 'cast', r, '| vida dos mobs', antes, '->', dep, '| alvo mais perto', alvo0, '->', pg.evaluate("()=>window.__m0&&[window.__m0.hp,window.__m0.dead]"))
        print('  erros de pagina:', errs[:4]); c.close()
    b.close()
