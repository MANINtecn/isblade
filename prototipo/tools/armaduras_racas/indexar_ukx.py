"""Indice malha -> .ukx de TODO o cliente (algumas malhas de conjunto nao estao no ukx da raca)."""
import os, subprocess, json, re
CLI = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/L2 IKARUS PVP 300x/Cliente Interlud 300x"
UMODEL = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/ferramentas para l2/umodel_materials.exe"
idx = {}
pasta = os.path.join(CLI, 'animations')
for f in sorted(os.listdir(pasta)):
    if not f.lower().endswith('.ukx'): continue
    r = subprocess.run([UMODEL, '-path=' + pasta, '-list', f], capture_output=True, text=True, errors='replace')
    for l in r.stdout.splitlines():
        if ' SkeletalMesh ' in l and re.search(r'_m\d+_[ulgb]$', l.split()[-1]): idx.setdefault(l.split()[-1], []).append(f)
json.dump(idx, open('indice_malhas.json', 'w'), indent=0)
print(len(idx), 'malhas de pecas em', len(set(x for v in idx.values() for x in v)), 'ukx')
