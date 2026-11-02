from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
B='http://localhost:8000'; SC=sys.argv[1]
def api(m,c,corpo=None,tk=None):
    r=urllib.request.Request(B+c,method=m,data=json.dumps(corpo).encode() if corpo is not None else None,headers={'content-type':'application/json',**({'authorization':'Bearer '+tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
def conta(t,n):
    u='m'+str(time.time_ns())[-7:]+n; tk=api('POST','/api/conta/criar',{'user':u,'senha':'123456'})['token']
    ch=api('POST','/api/personagens',{'name':('J'+n+t.replace('_',''))[:10]+u[-3:],'race':t,'charType':t,'weapon':'sword'},tk)['char']; return tk,ch,t
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    pgs=[]
    for (tk,ch,t),wpn in ((conta('magic_m','a'),'staff'),(conta('human_fighter','b'),'sword')):
        c=b.new_context(viewport={'width':900,'height':520}); c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s')"%(tk,ch['id'],t))
        pg=c.new_page(); errs=[]; pg.on('pageerror',lambda e,errs=errs:errs.append(str(e)[:160])); pg.errs=errs
        pg.goto(B+'/arena.html?go=pvp&wpn='+wpn+'&q=media'); pg.wait_for_function("window.Net&&Net.on&&window.__torreDbg",timeout=300000); pgs.append(pg)
    A,Bp=pgs
    for i in range(60):
        if A.evaluate("()=>{const r=__torreDbg().rig();return !!(r&&r.mCast&&r.clips.m_cast1)}"): break
        A.wait_for_timeout(1000)
    print('times',A.evaluate("()=>Net.status()"),Bp.evaluate("()=>Net.status()"))
    for rodada in range(3):
        pos=Bp.evaluate("()=>{const s=__torreDbg().S;return [s.px,s.pz,s.php]}")
        A.evaluate("()=>{const d=__torreDbg();d.S.st=100;d.S.anim=null;d.perform('sweep',.5);d.S.anim=null;d.S.cd=0}")
        A.wait_for_timeout(1200)
        A.evaluate("(p)=>{const d=__torreDbg(),f=d.S.face;d.S.px=p[0]-Math.sin(f)*5.7;d.S.pz=p[1]-Math.cos(f)*5.7;d.S.st=100;d.S.anim=null}",pos)
        A.wait_for_timeout(700)
        A.evaluate("()=>{__torreDbg().perform(['sweep','thrust','spin'][%d],.5)}"%rodada)
        for k in range(6):
            Bp.wait_for_timeout(120); Bp.screenshot(path=SC+'/b2_%d_%d.png'%(rodada,k))
        Bp.wait_for_timeout(1200)
        print('rodada',rodada,'vida alvo antes/depois:',pos[2],Bp.evaluate("()=>__torreDbg().S.php"))
    print('erros A',A.errs[:3],'B',Bp.errs[:3]); b.close()
