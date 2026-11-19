"""Exporta do cliente L2 (UModel) as malhas (.psk) e texturas (.png) dos conjuntos D/C/B/A de cada raca listada em mapa_sets.json.
Pecas sem linha no armorgrp (ex.: luvas/botas do D, calcas do B) caem para a mesma malha do peito ou do grau vizinho (mesmo criterio do Humano M no jogo).
Saida: assets/personagens/raw_armaduras/<raca>/{psk,tex}/ e resolvido.json (usado por montar_sets.py no Blender)."""
import json, os, re, subprocess, sys
RAIZ = r"C:/TECX SOFTHOUSE/IS ONLINE/prototipo"
CLI = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/L2 IKARUS PVP 300x/Cliente Interlud 300x"
UMODEL = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/ferramentas para l2/umodel_materials.exe"
SAIDA = os.path.join(RAIZ, 'assets', 'personagens', 'raw_armaduras')
mapa = json.load(open(os.path.join(os.path.dirname(__file__), 'mapa_sets.json'), encoding='utf-8'))
cache = {}
def listar(pasta, arq, tipo):
    k = (pasta, arq, tipo)
    if k in cache: return cache[k]
    r = subprocess.run([UMODEL, '-path=' + os.path.join(CLI, pasta), '-list', arq], capture_output=True, text=True, errors='replace')
    nomes = set(l.split()[-1] for l in r.stdout.splitlines() if (' %s ' % tipo) in l); cache[k] = nomes; return nomes
def variantes_tex(pre, nome):      # o cliente tem a textura como '<nome>', '<nome>_sp' ou '<nome>_ori' (varia por peca)
    t = listar('systextures', pre + '.utx', 'Texture'); return [v for v in (nome + '_sp', nome, nome + '_ori') if v in t]
def existe_tex(pre, nome): return bool(variantes_tex(pre, nome))
def resolve(race, d):
    """Para cada peca escolhe (malha, textura) que EXISTEM no cliente, nesta ordem: malha do armorgrp -> malha do peito do set -> malhas vizinhas, primeiro com a textura do
    visual do grau (D=t19, C=t43, B=t1004, A=t88), depois com a de outro grau (88, 1004, 43, 19). Peca sem nada fica de fora (o corpo base cobre)."""
    pre, ukx = d['prefixo'], d['ukx']; malhas = listar('animations', ukx, 'SkeletalMesh'); out = {}
    def nums(p): return sorted(int(m.group(1)) for n in malhas for m in [re.match(r'%s_m(\d+)_%s$' % (pre, p), n)] if m)
    def tem_tex(num, tid, p): return existe_tex(pre, '%s_m%03d_t%s_%s' % (pre, num, tid, p))
    def numde(x):
        m = re.search(r'_m(\d+)_', x or ''); return int(m.group(1)) if m else None
    for g, pecas in d['graus'].items():
        chest = pecas.get('u') or {}
        cnum = numde(chest.get('malha')) if numde(chest.get('malha')) is not None else numde(chest.get('textura'))
        ct = re.search(r'_t(\d+)_', chest.get('textura') or ''); tid = ct.group(1) if ct else {'D': '19', 'C': '43', 'B': '1004', 'A': '88'}[g]
        r = {}
        for p in 'ulgb':
            e = pecas.get(p) or {}; disp = nums(p); mapped = numde(e.get('malha'))
            base = [x for x in (mapped, cnum) if x is not None]
            vizinhas = sorted(disp, key=lambda n: abs(n - (cnum if cnum is not None else 0)))
            ordem = []
            for n in base + vizinhas:
                if n in disp and n not in ordem: ordem.append(n)
            escolha = None
            for n in ordem:
                if tem_tex(n, tid, p): escolha = (n, tid); break
            if not escolha:
                for n in ordem:
                    for t2 in [tid, '88', '1004', '43', '19']:
                        if tem_tex(n, t2, p): escolha = (n, t2); break
                    if escolha: break
            if escolha: r[p] = {'malha': '%s_m%03d_%s' % (pre, escolha[0], p), 'textura': '%s_m%03d_t%s_%s' % (pre, escolha[0], escolha[1], p), 'visual': escolha[1]}
            else: r[p] = {'malha': None, 'textura': None}
        out[g] = r
    return out
def exporta(race, d, res):
    pre, ukx = d['prefixo'], d['ukx']; base = os.path.join(SAIDA, race); os.makedirs(base, exist_ok=True)
    for g, r in res.items():
        for p, e in r.items():
            if e['malha'] and not os.path.exists(os.path.join(base, 'psk', e['malha'] + '.psk')):
                subprocess.run([UMODEL, '-path=' + os.path.join(CLI, 'animations'), '-export', '-psk', '-obj=' + e['malha'], ukx, '-out=' + os.path.join(base, 'psk_tmp')], capture_output=True)
            if e['textura']:
                for v in variantes_tex(pre, e['textura']):
                    subprocess.run([UMODEL, '-path=' + os.path.join(CLI, 'systextures'), '-export', '-png', '-obj=' + v, pre + '.utx', '-out=' + os.path.join(base, 'tex_tmp')], capture_output=True)
    # achata (UModel cria subpastas por pacote)
    for sub, alvo in (('psk_tmp', 'psk'), ('tex_tmp', 'tex')):
        os.makedirs(os.path.join(base, alvo), exist_ok=True)
        for raiz, _, fs in os.walk(os.path.join(base, sub)):
            for f in fs:
                if f.lower().endswith(('.psk', '.png')): os.replace(os.path.join(raiz, f), os.path.join(base, alvo, f))
alvo = sys.argv[1:] or list(mapa)
tudo = {}
for race in alvo:
    d = mapa[race]; res = resolve(race, d); tudo[race] = res; exporta(race, d, res)
    for g, r in res.items():
        for p, e in r.items():
            if e['malha'] and not os.path.exists(os.path.join(SAIDA, race, 'psk', e['malha'] + '.psk')): e['malha_falhou'] = True
    falta = [(g, p) for g, r in res.items() for p, e in r.items() if not e['malha'] or not e['textura'] or e.get('malha_falhou')]
    print(race, 'ok; pecas sem malha/textura:', falta)
arq = os.path.join(SAIDA, 'resolvido.json')
antigo = json.load(open(arq, encoding='utf-8')) if os.path.exists(arq) else {}
antigo.update(tudo); json.dump(antigo, open(arq, 'w', encoding='utf-8'), indent=1)
