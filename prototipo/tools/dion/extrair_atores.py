"""Tira de cada tile decifrado de Dion (raw_dion/<x>_<y>_dec.unr) tudo que o mapa L2 diz: casas/arvores (StaticMeshActor: malha, posicao, rotacao, escala), sons de ambiente,
musica (MusicVolume), portas (Mover), pontos de nascimento, neblina/zonas, luzes e agua. Saida: raw_dion/atores_<tile>.json + resumo.
Coordenadas = mundo L2 em unidades (50 uu = 1 m).   Uso: python extrair_atores.py 20_22 [outros tiles]"""
import sys, json, os, collections
from ue2_pkg import Pacote
tiles = sys.argv[1:] or ['20_22']
resumo = {}
for t in tiles:
    pk = Pacote('raw_dion/%s_dec.unr' % t); out = collections.defaultdict(list); falhas = 0
    pacote_de = {}      # nome da malha -> pacote (import)
    for im in pk.imports:
        if im['classe'] == 'StaticMesh': pacote_de[im['nome']] = pk.nomes[0] and im['grupo']
    def ref(v): return pk.nome_ref(v) if isinstance(v, int) else v
    for e in pk.exports:
        c = e['classe']
        if c not in ('StaticMeshActor', 'AmbientSoundObject', 'MusicVolume', 'Mover', 'PlayerStart', 'ZoneInfo', 'WaterVolume', 'Light', 'SkyZoneInfo', 'TerrainInfo') or e['tam'] <= 0: continue
        try: pr = pk.propriedades(e)
        except Exception: falhas += 1; continue
        loc = pr.get('Location') or pr.get('BasePos') or (None, None, None)
        if not isinstance(loc, tuple): loc = (None, None, None)
        if c == 'StaticMeshActor':
            if 'StaticMesh' not in pr or loc[0] is None: falhas += 1; continue
            out[c].append({'n': e['nome'], 'malha': ref(pr['StaticMesh']), 'x': loc[0], 'y': loc[1], 'z': loc[2], 'rot': pr.get('Rotation', (0, 0, 0)), 'esc': pr.get('DrawScale', 1.0), 'grupo': pr.get('Group')})
        elif c == 'AmbientSoundObject':
            out[c].append({'n': e['nome'], 'som': ref(pr.get('AmbientSound', 0)), 'x': loc[0], 'y': loc[1], 'z': loc[2], 'raio': pr.get('SoundRadius'), 'vol': pr.get('SoundVolume'), 'aleat': pr.get('AmbientRandom'), 'grupo': pr.get('Group')})
        elif c == 'MusicVolume':
            out[c].append({'n': e['nome'], 'musica': pr.get('nMusicID'), 'x': loc[0], 'y': loc[1], 'z': loc[2], 'grupo': pr.get('Group')})
        elif c == 'Mover':
            out[c].append({'n': e['nome'], 'malha': ref(pr.get('StaticMesh', 0)), 'x': loc[0], 'y': loc[1], 'z': loc[2], 'rot': pr.get('BaseRot'), 'id_servidor': pr.get('L2ServerObjectID'), 'tipo': pr.get('L2ServerObjectType')})
        elif c == 'ZoneInfo':
            out[c].append({'n': e['nome'], 'x': loc[0], 'y': loc[1], 'z': loc[2], 'neblina': [pr.get('DistanceFogStart'), pr.get('DistanceFogEnd')], 'cor': pr.get('AmbientVector') if not isinstance(pr.get('AmbientVector'), bytes) else None})
        elif c == 'TerrainInfo':
            out[c].append({'escala': pr.get('TerrainScale'), 'MapX': pr.get('MapX'), 'MapY': pr.get('MapY')})
        else:
            out[c].append({'n': e['nome'], 'x': loc[0] if loc else None, 'y': loc[1] if loc else None, 'z': loc[2] if loc else None})
    json.dump(out, open('raw_dion/atores_%s.json' % t, 'w'), indent=0)
    malhas = collections.Counter(a['malha'] for a in out['StaticMeshActor'])
    resumo[t] = {k: len(v) for k, v in out.items()}; resumo[t]['malhas_distintas'] = len(malhas); resumo[t]['falhas'] = falhas
    print(t, resumo[t])
