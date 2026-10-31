"""Gera assets/precarga.json: lista (com tamanho) dos arquivos pesados que a tela de carregamento baixa antes do lobby.
Regra: arquivos de assets/ cujo NOME aparece no codigo (html/js do jogo, sem os backups *_antes_*); a URL leva o ?v=N exatamente como o codigo pede,
porque o service worker guarda por URL completa. Rodar na pasta prototipo:  python tools/gerar_precarga.py"""
import re, os, json, glob
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(RAIZ)
codigo = ''
for f in glob.glob('*.html') + glob.glob('js/*.js'):
    if '_antes_' in f or f.startswith(('arena_backup', 'arena_r128', 'torre_teste', 'baium_house_view')): continue
    codigo += open(f, encoding='utf-8', errors='ignore').read() + '\n'
for f in ['assets/talking_island/village_data_threejs.json'] + glob.glob('data/*.json') + glob.glob('data/armas/*.json'): codigo += open(f, encoding='utf-8', errors='ignore').read() + '\n'
EXT = ('.glb', '.vrm', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ogg', '.mp3', '.wav')
EXCLUI = ('/raw_', '/test_', 'backup', '_antes_', '/maps/', 'baium_export', '.blend')
itens = []
for dp, dn, fn in os.walk('assets'):
    p = dp.replace(os.sep, '/') + '/'
    if any(x in p for x in ('/raw_', '/test_', 'baium_export', '/maps/', '/extracted', '/umodel', '/models/')): continue
    for n in fn:
        u = p + n
        if not n.lower().endswith(EXT) or any(x in u for x in EXCLUI): continue
        ms = list(re.finditer(re.escape(n) + r'(\?[A-Za-z0-9=._&-]+)?', codigo)); m = next((x for x in ms if x.group(1)), ms[0] if ms else None)      # prefere a citacao com ?v=
        if not m: continue
        itens.append({'u': u + (m.group(1) or ''), 'b': os.path.getsize(u)})
for i in itens: i['e'] = 0 if ('/baium/' in i['u'] or 'Talibrac' in i['u']) else 1      # e=1: essencial (lobby e cidade); e=0: so a dungeon/arena, baixa na hora
itens.sort(key=lambda x: (-x['e'], x['b']))                                                  # essenciais primeiro, os menores antes (a barra anda logo)
tot = sum(i['b'] for i in itens if i['e'])
json.dump({'total': tot, 'itens': itens}, open('assets/precarga.json', 'w', encoding='utf-8'), indent=0)
print(len(itens), 'arquivos', round(tot / 1e6, 1), 'MB')
for i in itens[:12]: print(round(i['b'] / 1e6, 2), i['u'])
