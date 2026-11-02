from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
B='http://localhost:8000'; SC=sys.argv[1]
def api(m,c,corpo=None,tk=None):
    r=urllib.request.Request(B+c,method=m,data=json.dumps(corpo).encode() if corpo is not None else None,headers={'content-type':'application/json',**({'authorization':'Bearer '+tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
u='m'+str(time.time_ns())[-7:]; tk=api('POST','/api/conta/criar',{'user':u,'senha':'123456'})['token']; t='elf_f'
ch=api('POST','/api/personagens',{'name':'Pve'+u[-5:],'race':t,'charType':t,'weapon':'sword'},tk)['char']
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    c=b.new_context(viewport={'width':900,'height':520}); c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s')"%(tk,ch['id'],t))
    pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
    pg.goto(B+'/arena.html?mode=duel&wpn=staff&q=media'); pg.wait_for_function("window.__torreDbg",timeout=300000)
    for i in range(60):
        if pg.evaluate("()=>{const r=__torreDbg().rig();return !!(r&&r.mCast&&r.clips.m_cast1)}"): break
        pg.wait_for_timeout(1000)
    print(pg.evaluate("()=>{const d=__torreDbg();return {hp:d.S.hp,boss:d.boss(),ex:d.S.ex,ez:d.S.ez,px:d.S.px,pz:d.S.pz}}"))
    pg.evaluate("()=>{const d=__torreDbg();d.perform('sweep',.5);d.S.anim=null}"); pg.wait_for_timeout(800)
    pg.evaluate("()=>{const d=__torreDbg(),S=d.S,f=S.face;S.px=S.ex-Math.sin(f)*6;S.pz=S.ez-Math.cos(f)*6}"); pg.wait_for_timeout(500)
    print('pos',pg.evaluate("()=>{const d=__torreDbg();return {hp:d.S.hp,boss:d.boss(),ex:d.S.ex,ez:d.S.ez,px:d.S.px,pz:d.S.pz}}"))
    for n in ('sweep','thrust','spin'):
        pg.evaluate("(id)=>{const d=__torreDbg();d.S.st=100;d.S.anim=null;d.perform(id,.5)}",n)
        pg.wait_for_timeout(300); pg.screenshot(path=SC+'/pve_%s.png'%n); pg.wait_for_timeout(1000)
        print(n,pg.evaluate("()=>{const d=__torreDbg();return {hp:d.S.hp,face:d.S.face}}"))
    print('erros',errs[:3]); b.close()
