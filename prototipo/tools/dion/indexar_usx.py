"""Indice malha -> .usx de TODO o cliente (o nome do pacote no mapa nem sempre e' o do arquivo)."""
import os, subprocess, json, re
CLI = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/L2 IKARUS PVP 300x/Cliente Interlud 300x"
UMODEL = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/ferramentas para l2/umodel_materials.exe"
pasta = CLI + '/staticmeshes'; idx = {}
for f in sorted(os.listdir(pasta)):
    if not f.lower().endswith('.usx'): continue
    r = subprocess.run([UMODEL, '-path=' + CLI, '-list', pasta + '/' + f], capture_output=True, text=True, errors='replace')
    for l in r.stdout.splitlines():
        m = re.match(r'\s*\d+\s+\S+\s+\S+\s+StaticMesh\s+(\S+)', l)
        if m: idx.setdefault(m.group(1).lower(), []).append(f)
json.dump(idx, open('raw_dion/indice_usx.json', 'w'))
print(len(idx), 'malhas em', len(set(x for v in idx.values() for x in v)), 'usx')
for n in ['girantree1', 'dgstone06', 'gl_fence', 'dionrsmtree1', 'grass010', 'dion_general_tree2', 'o_box01']: print(n, idx.get(n))
