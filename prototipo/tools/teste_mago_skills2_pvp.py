"""PvP: o mago A usa as skills 2 a 5 contra o jogador B (servidor decide o dano). Uso: python teste_mago_skills2_pvp.py <pasta_prints> [url_base]"""
from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
SC = sys.argv[1]; B = sys.argv[2] if len(sys.argv) > 2 else 'http://localhost:8000'
def api(m, c, corpo=None, tk=None):
    r = urllib.request.Request(B + c, method=m, data=json.dumps(corpo).encode() if corpo is not None else None, headers={'content-type': 'application/json', **({'authorization': 'Bearer ' + tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
def conta(t, n, w='sword'):
    u = 'm' + str(time.time_ns())[-7:] + n; tk = api('POST', '/api/conta/criar', {'user': u, 'senha': '123456'})['token']
    ch = api('POST', '/api/personagens', {'name': ('J' + n + t.replace('_', ''))[:10] + u[-6:], 'race': t, 'charType': t, 'weapon': w}, tk)['char']; return tk, ch, t
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']); pgs = []
    for (tk, ch, t), wpn in ((conta('magic_m', 'a', 'staff'), 'staff'), (conta('human_fighter', 'b'), 'sword')):
        c = b.new_context(viewport={'width': 900, 'height': 520})
        c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s')" % (tk, ch['id'], t))
        pg = c.new_page(); errs = []; pg.on('pageerror', lambda e, errs=errs: errs.append(str(e)[:200])); pg.errs = errs
        pg.goto(B + '/arena.html?go=pvp&wpn=' + wpn + '&q=media'); pg.wait_for_function("window.Net&&Net.on&&window.__torreDbg", timeout=300000); pgs.append(pg)
    A, Bp = pgs
    for i in range(60):
        if A.evaluate("()=>{const r=__torreDbg().rig();return !!(r&&r.mCast&&r.clips.m_cast1)}"): break
        A.wait_for_timeout(1000)
    A.evaluate("()=>{__torreDbg().SK.forEach(s=>s.unlock=0);const o=WebSocket.prototype.send;WebSocket.prototype.send=function(d){(window.__sent=window.__sent||[]).push(String(d).slice(0,200));return o.call(this,d)}}")
    print('skills A', A.evaluate("()=>__torreDbg().SK.map(s=>s.name+(s.area?'[area]':'')+(s.hits?'[hits'+s.hits.length+']':''))"))
    print('times', A.evaluate("()=>Net.status()"), Bp.evaluate("()=>Net.status()"))
    for i, nome in ((2, 'meteoro'), (5, 'disco'), (4, 'coluna'), (3, 'espinho')):
        Bp.evaluate("()=>{const s=__torreDbg().S;s.php=s.pmax;s.stun=0}")
        pos = Bp.evaluate("()=>{const s=__torreDbg().S;return [s.px,s.pz,s.php]}")
        A.evaluate("(p)=>{const d=__torreDbg(),f=d.S.face;d.S.px=p[0]-Math.sin(f)*5.7;d.S.pz=p[1]-Math.cos(f)*5.7;d.S.st=100;d.S.anim=null;d.S.cd[%d]=0}" % i, pos)
        A.wait_for_timeout(1200)
        r = A.evaluate("()=>__torreDbg().castSkill(%d)" % i); print(nome, 'cast', r)
        vistos = []
        for k in range(24):
            Bp.wait_for_timeout(600)
            if k in (3, 8, 14): Bp.screenshot(path=SC + '/pvp_%s_%d.png' % (nome, k // 5))
            vistos.append(Bp.evaluate("()=>{const s=__torreDbg().S;return [s.php,+(s.stun||0).toFixed(1)]}"))
        print('  alvo [vida, paralisia] ao longo do tempo:', vistos[::3])
        print('  enviado por A:', [m for m in A.evaluate("()=>window.__sent||[]") if '"atk"' in m][-2:])
    print('erros A', A.errs[:3], 'B', Bp.errs[:3]); b.close()
