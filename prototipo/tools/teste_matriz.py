"""Teste em matriz: raca x sexo x classe (12 corpos x 4 classes = 48 combinacoes).
Para cada combinacao entra no jogo (cidade.html, servidor local), sobe nivel 45, spawna sapos e confere:
  - modelo carregou e tem clipes (drv.actions)
  - cada skill da classe (e o golpe basico) gera numero de dano na tela (DanoTela.num) em pelo menos 1 alvo
  - nenhum erro de pagina / animacao travada
Uso:  python tools/teste_matriz.py [--base http://localhost:8144] [--corpos human_m,elf_f] [--classes guardiao,mago] [--saida matriz.json] [--paralelo 3]
Saida: tabela OK/FALHA por combinacao (+ JSON). Servidor local: node servidor/server.js (porta 8144, DATA_DIR de teste)."""
import sys, json, time, argparse, urllib.request
from concurrent.futures import ThreadPoolExecutor
from playwright.sync_api import sync_playwright

CORPOS = ['human_m', 'human_f', 'magic_m', 'magic_f', 'elf_m', 'elf_f', 'darkelf_m', 'darkelf_f', 'orc_m', 'orc_f', 'dwarf_m', 'dwarf_f']
CLASSES = {'guerreiro': 'sword', 'guardiao': 'shield', 'mago': 'staff', 'clerico': 'staff'}
def conta(corpo, classe): return ('mx%s%s' % (corpo, classe[:3])).replace('_', '')   # contas admin (servidor de teste: ADMINS=$(python tools/teste_matriz.py --admins))

ap = argparse.ArgumentParser()
ap.add_argument('--base', default='http://localhost:8144'); ap.add_argument('--corpos', default=','.join(CORPOS))
ap.add_argument('--classes', default=','.join(CLASSES)); ap.add_argument('--saida', default='matriz.json'); ap.add_argument('--paralelo', type=int, default=1)
ap.add_argument('--admins', action='store_true'); ap.add_argument('--refaz', action='store_true', help='refaz as combinacoes que falharam no .jsonl')
A = ap.parse_args(); B = A.base
if A.admins:
    print(','.join(conta(c, k) for c in CORPOS for k in CLASSES)); sys.exit(0)

def api(m, c, corpo=None, tk=None):
    rq = urllib.request.Request(B + c, data=json.dumps(corpo).encode() if corpo is not None else None, method=m,
                                headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + tk} if tk else {})})
    return json.loads(urllib.request.urlopen(rq).read())

def roda(corpo, classe):
    r = {'corpo': corpo, 'classe': classe, 'ok': False, 'falhas': [], 'skills': {}}
    try:
        u = conta(corpo, classe)
        try: tk = api('POST', '/api/conta/criar', {'user': u, 'senha': '123456'})['token']
        except Exception: tk = api('POST', '/api/conta/entrar', {'user': u, 'senha': '123456'})['token']
        try: ch = api('POST', '/api/personagens', {'name': 'M' + corpo.replace('_', '') + classe[:3], 'race': corpo, 'charType': corpo, 'classe': classe}, tk)['char']
        except Exception: ch = api('GET', '/api/personagens', None, tk)['pers'][0]      # ja existe (rodada anterior)
        init = ("sessionStorage.setItem('isblade.fluxo','1');localStorage.setItem('isblade.conta_token','%s');localStorage.setItem('isblade.conta_user','x');"
                "localStorage.setItem('isblade_active_character_id','%s');localStorage.setItem('isblade.char_type','%s');localStorage.setItem('isblade.weapon','%s');") % (tk, ch['id'], corpo, CLASSES[classe])
        with sync_playwright() as p:
            b = p.chromium.launch(channel='chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            c = b.new_context(service_workers='block', viewport={'width': 480, 'height': 300}); c.add_init_script(init); pg = c.new_page(); pg.set_default_timeout(120000); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
            pg.goto(B + '/cidade.html?q=baixa'); pg.wait_for_function('window.__DION_PRONTO', timeout=300000); pg.wait_for_timeout(8000)
            def adm(o): pg.evaluate("(o)=>Net.adminCmd(Object.assign({alvo:'eu'},o))", o)
            for _ in range(6):                       # comando de GM direto na rede (sem teclado/painel); repete ate o nivel valer
                adm({'acao': 'setlevel', 'lv': 85}); pg.wait_for_timeout(2500)
                if pg.evaluate("__dbg.mast().lv") >= 30: break
            adm({'acao': 'ress'}); pg.wait_for_timeout(800)          # personagem que sobrou morto de rodada anterior
            adm({'acao': 'god'}); pg.wait_for_timeout(800)
            r['nivel_mast'] = pg.evaluate("__dbg.mast().lv")
            if r['nivel_mast'] < 30: r['falhas'].append('nivel nao subiu (mast=%s): teste invalido' % r['nivel_mast'])
            r['modelo'] = pg.evaluate("(function(){var v=window.__dbg&&__dbg.vrm&&__dbg.vrm();if(!v)return null;return {tipo:v.charType||null,clipes:v.drv?Object.keys(v.drv.actions).length:0}})()")
            if not r['modelo'] or not r['modelo']['clipes']: r['falhas'].append('modelo/clipes nao carregou')
            if classe == 'guerreiro':                 # [guerreiro-l2] as skills 2,3,4,6,7 rodam nos golpes nativos do L2 (Investida e Tufao no clipe do Blender) (W_NAT em js/guardiao.js), em toda raca/sexo
                pg.wait_for_timeout(3000)
                r['clipes_guerreiro'] = pg.evaluate("(function(){var v=__dbg.vrm();var w=v&&v.wClips||{};var o={};Object.keys(w).forEach(function(k){o[k]=w[k].psa+(v.clips[k]?'':' SEM CLIPE')});return o})()")
                falta = [k for k in ('w_n1', 'w_n3', 'w_n4', 'w_n5', 'w_n6') if not str(r['clipes_guerreiro'].get(k, '')).startswith('L2:')] + [k for k in ('w_n0', 'w_n2') if not r['clipes_guerreiro'].get(k) or 'SEM CLIPE' in str(r['clipes_guerreiro'].get(k))]      # w_n0 (Investida) e w_n2 (Tufao) ficam no clipe do Blender
                if falta: r['falhas'].append('golpe nativo do L2 nao carregou em %s' % falta)
            def spawn(): adm({'acao': 'mob_spawn', 'tipo': 'sapo_curuma', 'qtd': 5, 'raio': 4, 'agr': 0, 'fixo': False}); pg.wait_for_timeout(3500)
            spawn()
            pg.evaluate("window.__p0=[S.px,S.pz]")
            pg.evaluate("""window.__log=[];var o=DanoTela.num,t=DanoTela.total;
              DanoTela.num=function(v,p,tp,k){window.__log.push(['n',v,k]);return o.apply(this,arguments);};
              DanoTela.total=function(v,p,n,c,k){window.__log.push(['T',v,k]);return t.apply(this,arguments);};""")
            ns = pg.evaluate("__dbg.SK().length"); r['n_skills'] = ns
            for i in range(ns):
                nome = pg.evaluate("(function(s){return s.name||s.nome||s.id||'?'})(__dbg.SK()[%d]||{})" % i)
                meta = pg.evaluate("(function(s){return {pronta:s.pronta,dmg:s.dmg||0,cura:!!s.cura,suporte:!!s.suporte}})(__dbg.SK()[%d]||{})" % i)
                if meta['pronta'] is False:
                    r.setdefault('pendentes', []).append('skill %d %s: marcada como nao pronta nos dados' % (i, nome)); r['skills'][i] = {'nome': nome, 'pendente': True}; continue
                sem_dano = meta['dmg'] == 0 and not meta['cura'] or meta['suporte']      # so cura/buff/glifo: nao exige numero de dano
                for tent in (1, 2):
                    # repoe alvos e posicao (skills de dash mudam a posicao; mortos sao respawnados). Na 2a tentativa sempre spawna alvos novos.
                    if tent == 2 or pg.evaluate("__dbg.MOBS.filter(function(m){return m.srv&&!m.dead}).length") < 2:
                        spawn()
                    pg.evaluate("S.px=__p0[0];S.pz=__p0[1];var q=__dbg.MOBS.filter(function(m){return m.srv&&!m.dead}).sort(function(a,b){return Math.hypot(a.x-S.px,a.z-S.pz)-Math.hypot(b.x-S.px,b.z-S.pz)})[0];if(q){S.face=Math.atan2(q.x-S.px,q.z-S.pz);S.aimM=q;}window.__log=[];S.php=S.pmax||9999;")
                    pg.evaluate("S.cd[%d]=0" % i)
                    res = pg.evaluate("__dbg.castSkill(%d)" % i)
                    pg.wait_for_timeout(1500)
                    fim = False
                    for _ in range(8):                # sem GPU o jogo roda em camera lenta: so e' travada se o tempo da animacao parar de andar
                        t0 = pg.evaluate("S.anim?S.anim.tt:-1")
                        try: pg.wait_for_function('!S.anim', timeout=60000); fim = True; break
                        except Exception: pass
                        if pg.evaluate("S.anim?S.anim.tt:-1") == t0: break
                    if not fim: r['falhas'].append('skill %d %s: animacao travada (tt=%s)' % (i, nome, pg.evaluate("S.anim&&[S.anim.tt,S.anim.total]")))
                    pg.wait_for_timeout(3000)
                    L = pg.evaluate("window.__log"); n = len([e for e in L if e[0] == 'n'])
                    if n > 0 or res == 'no': break
                r['skills'][i] = {'nome': nome, 'retorno': res, 'numeros': n, 'tentativas': tent}
                suporte = sem_dano
                if n == 0 and not suporte and res != 'no': r['falhas'].append('skill %d %s: sem numero de dano' % (i, nome))
                if res == 'no' and not suporte: r['falhas'].append('skill %d %s: nao disparou (pronta=%s unlock=%s nivel=%s morto=%s recarga=%s ocupado=%s)' % ((i, nome) + tuple(pg.evaluate("(function(s,i){return [s.pronta,s.unlock,__dbg.mast().lv,!!S.pdead,S.cd[i],!!S.anim]})(__dbg.SK()[%d]||{},%d)" % (i, i)))))
            r['erros_pagina'] = errs[:5]
            if errs: r['falhas'].append('erros de pagina: %s' % errs[:2])
            b.close()
        r['ok'] = not r['falhas']; r['status'] = 'OK' if r['ok'] and not r.get('pendentes') else ('OK*' if r['ok'] else 'FALHA')
    except Exception as e:
        r['falhas'].append('excecao: %s' % str(e)[:200])
    return r

corpos = A.corpos.split(','); classes = A.classes.split(',')
combos = [(c, k) for c in corpos for k in classes]
parcial = A.saida + 'l'                        # .jsonl: uma linha por combinacao, gravada assim que termina (da para interromper e retomar)
feitos = {}
try:
    for l in open(parcial, encoding='utf8'):
        x = json.loads(l); feitos[(x['corpo'], x['classe'])] = x
except FileNotFoundError: pass
if A.refaz: feitos = {k: v for k, v in feitos.items() if v.get('ok')}
falta = [cb for cb in combos if cb not in feitos]
print('%d feitas, %d por fazer' % (len(combos) - len(falta), len(falta)), flush=True)
def roda_e_grava(cb):
    r = roda(*cb)
    with open(parcial, 'a', encoding='utf8') as f: f.write(json.dumps(r, ensure_ascii=False) + chr(10))
    print('  %s %s -> %s' % (cb[0], cb[1], r.get('status', 'FALHA')), flush=True); return r
with ThreadPoolExecutor(max_workers=A.paralelo) as ex:
    for r in ex.map(roda_e_grava, falta): feitos[(r['corpo'], r['classe'])] = r
out = [feitos[cb] for cb in combos if cb in feitos]
json.dump(out, open(A.saida, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
sys.stdout.reconfigure(encoding='utf8', errors='replace'); print('%-10s %-10s %-6s %s' % ('corpo', 'classe', 'status', 'falhas'))
for r in out: print('%-10s %-10s %-6s %s' % (r['corpo'], r['classe'], r.get('status', 'FALHA'), '; '.join(r['falhas'] + r.get('pendentes', []))[:200]))
print(chr(10) + '%d/%d OK (OK* = ok, com skill pendente nos dados)' % (sum(r['ok'] for r in out), len(out)))
