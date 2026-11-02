from playwright.sync_api import sync_playwright
import json, urllib.request, time, sys
B='http://localhost:8000'; SC=sys.argv[1]; tipos=sys.argv[2].split(','); Q=sys.argv[3] if len(sys.argv)>3 else 'media'
def api(m,c,corpo=None,tk=None):
    r=urllib.request.Request(B+c,method=m,data=json.dumps(corpo).encode() if corpo is not None else None,headers={'content-type':'application/json',**({'authorization':'Bearer '+tk} if tk else {})})
    return json.load(urllib.request.urlopen(r))
u='m'+str(time.time_ns())[-7:]; tk=api('POST','/api/conta/criar',{'user':u,'senha':'123456'})['token']
with sync_playwright() as p:
    b=p.chromium.launch(channel='chrome',args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for t in tipos:
        try: ch=api('POST','/api/personagens',{'name':('T'+t.replace('_',''))[:10]+u[-3:],'race':t,'charType':t,'weapon':'sword'},tk)['char']
        except Exception as e: print(t,'criar falhou',e); continue
        c=b.new_context(viewport={'width':900,'height':520}); c.add_init_script("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s')"%(tk,ch['id'],t))
        pg=c.new_page(); logs=[]; pg.on('pageerror',lambda e:logs.append('ERR '+str(e)[:200]))
        pg.goto(B+'/arena.html?go=pvp&wpn=staff&q='+Q); pg.wait_for_function("window.Net&&Net.on&&window.__torreDbg",timeout=300000)
        for i in range(60):
            ok=pg.evaluate("()=>{const r=__torreDbg().rig();return !!(r&&r.mCast&&r.clips.m_cast1)}")
            if ok: break
            pg.wait_for_timeout(1000)
        info=pg.evaluate("()=>{const r=__torreDbg().rig();return r&&r.mCast?{psa:r.mCast.psa,hit:r.mCast.hit,dur:r.clips.m_cast1.duration,tr:r.clips.m_cast1.tracks.length}:null}")
        pg.evaluate("()=>{const d=__torreDbg();d.S.cd=[0,0,0,0,0,0,0];d.castSkill(1)}")
        n=0
        for k in range(8):
            pg.wait_for_timeout(250); pg.screenshot(path=SC+'/cast_%s_%d.png'%(t,k))
        nm=pg.evaluate("()=>{const r=__torreDbg().rig();return r.drv&&r.drv.curName}")
        print(t,info,'clipe tocando:',nm,'PROJ:',pg.evaluate("()=>__torreDbg().PROJ.length"),logs[:3]); c.close()
    b.close()
