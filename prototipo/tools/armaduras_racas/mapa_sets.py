"""Le o armorgrp do cliente L2 (L2 INTERLUDE ACIS/icones/armorgrp.txt) e gera mapa_sets.json: para cada raca e grau do jogo,
as 4 pecas (u=peito, l=pernas, g=luvas, b=botas) com a MALHA (.psk) e a TEXTURA do cliente.
Os 'visuais' sao os mesmos que o Humano M ja usa no jogo: D=t19 (Brigandine), C=t43 (Full Plate), B=t1004 (Doom), A/S=t88 (Imperial/Tallum)."""
import csv, re, json, sys
F = r"C:/TECX SOFTHOUSE/L2 IKARUS INTERCROW/L2 INTERLUDE ACIS/icones/armorgrp.txt"
rows = list(csv.reader(open(F, encoding='utf-8', errors='replace'), delimiter='\t'))
H = rows[0]; idx = {h: i for i, h in enumerate(H)}
RACAS = {  # nome no jogo -> (coluna do armorgrp, prefixo da malha/textura, arquivo .ukx da malha, pacote .utx da textura)
  'human_fighter_female': ('f_HumnFigh', 'FFighter', 'Fighter.ukx'),
  'magic_m':   ('m_HumnMyst', 'MMagic',   'Magic.ukx'),
  'magic_f':   ('f_HumnMyst', 'FMagic',   'Magic.ukx'),
  'elf_m':     ('m_Elf',      'MElf',     'Elf.ukx'),
  'elf_f':     ('f_Elf',      'FElf',     'Elf.ukx'),
  'orc_m':     ('m_OrcFigh',  'MOrc',     'Orc.ukx'),
  'orc_f':     ('f_OrcFigh',  'FOrc',     'Orc.ukx'),
  'darkelf_m': ('m_DarkElf',  'MDarkElf', 'DarkElf.ukx'),
  'darkelf_f': ('f_DarkElf',  'FDarkElf', 'DarkElf.ukx'),
}
GRAUS = {'D': 19, 'C': 43, 'B': 1004, 'A': 88}      # S usa o mesmo visual do A
def col(r, race, k, j=0):
    n = '%s_%s[%d]' % (race, k, j); return r[idx[n]] if n in idx and idx[n] < len(r) else ''
def achar(tid, parte):
    """linha do armorgrp cuja textura do Humano M termina em _t<tid>_<parte>"""
    for r in rows[1:]:
        if len(r) < len(H) - 5: continue
        t = col(r, 'm_HumnFigh', 't').lower()
        if t.endswith('_t%d_%s' % (tid, parte)): return r
    return None
out = {}
for rj, (rc, pre, ukx) in RACAS.items():
    out[rj] = {'ukx': ukx, 'prefixo': pre, 'graus': {}}
    for g, tid in GRAUS.items():
        pecas = {}
        for p in 'ulgb':
            r = achar(tid, p)
            if not r: pecas[p] = None; continue
            m = col(r, rc, 'm').split('.')[-1]; t = col(r, rc, 't').split('.')[-1]
            pecas[p] = {'malha': m, 'textura': t, 'item': r[idx['id']]}
        out[rj]['graus'][g] = pecas
json.dump(out, open('mapa_sets.json', 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
for rj, d in out.items():
    print(rj)
    for g, pe in d['graus'].items():
        print('  ', g, ' | '.join('%s:%s/%s' % (p, (v or {}).get('malha'), (v or {}).get('textura')) for p, v in pe.items()))
