import json
import math

with open(r'c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\talking_island_exact_layout.json') as f:
    items = json.load(f)

cx = -84263.0
cy = 243000.0

SCALE_WORLD = 2.8

obsts = []

# 1. 8 Braseiros ao redor da Praça Central (raio 19.5m)
for i in range(8):
    ang = i * (math.pi * 2 / 8)
    obsts.append({
        'x': round(math.sin(ang) * 19.5, 2),
        'z': round(math.cos(ang) * 19.5, 2),
        'r': 1.6
    })

# 2. Pilares do Portal Dimensional (Posição [-13.5, -13.0], rotação 0.65 rad)
rot_p = 0.65
cos_p = math.cos(rot_p)
sin_p = math.sin(rot_p)
# pLeft em local (-4.2, 0)
pl_x = -13.5 - 4.2 * cos_p
pl_z = -13.0 + 4.2 * sin_p
obsts.append({'x': round(pl_x, 2), 'z': round(pl_z, 2), 'r': 1.2})
# pRight em local (+4.2, 0)
pr_x = -13.5 + 4.2 * cos_p
pr_z = -13.0 - 4.2 * sin_p
obsts.append({'x': round(pr_x, 2), 'z': round(pr_z, 2), 'r': 1.2})

# 3. Boneco de Treino Oficial (z = -10, base sólida)
obsts.append({'x': 0.0, 'z': -10.0, 'r': 0.85})

# 4. Monumento Central / Obelisco da Fonte (ti_centertop)
obsts.append({'x': 0.0, 'z': 0.0, 'r': 3.2})

# 5. Edifícios e Prédios da Vila de Talking Island (Coordenadas Oficiais Lineage 2)
for it in items:
    m = it['mesh']
    rel_x = it['x'] - cx
    rel_y = it['y'] - cy
    bx = round((rel_x / 100.0) * SCALE_WORLD, 2)
    bz = round((-rel_y / 100.0) * SCALE_WORLD, 2)
    
    if m == 'SI_CH_Body':
        # Catedral: paredes traseiras e laterais fechadas, portal frontal sul 100% aberto
        # Nave central caminha de (-22, -50) para dentro em (-13.0, -62.0) até o altar (-6.0, -69.0)
        obsts.append({'x': -4.5, 'z': -71.5, 'r': 6.5})   # Fundo da nave / Parede atrás do altar
        obsts.append({'x': -19.5, 'z': -69.0, 'r': 6.0})  # Parede lateral noroeste
        obsts.append({'x': -6.5, 'z': -56.0, 'r': 6.0})   # Parede lateral sudeste
        obsts.append({'x': -24.5, 'z': -62.0, 'r': 5.5})  # Torre sineira lateral
    elif 'SI_H0' in m and '_Rf' not in m:
        obsts.append({'x': bx, 'z': bz, 'r': 9.5})
    elif 'SI_SH0' in m and '_Rf' not in m:
        obsts.append({'x': bx, 'z': bz, 'r': 12.5})
    elif m == 'SI_Agit':
        obsts.append({'x': bx, 'z': bz, 'r': 14.0})
    elif m == 'sp_lighthouse001':
        obsts.append({'x': bx, 'z': bz, 'r': 9.5})

# Guilda dos Lutadores (Fighter Hall)
obsts.append({'x': 78.5, 'z': -86.0, 'r': 16.5})

# 6. Muralha Perimétrica a ~74m de raio com os 4 portões abertos
gate_angles = []
for it in items:
    if it['mesh'] == 'SI_G01':
        gx = (it['x'] - cx) / 100.0 * SCALE_WORLD
        gz = -(it['y'] - cy) / 100.0 * SCALE_WORLD
        gate_angles.append(math.atan2(gz, gx))

wall_r = 26.45 * SCALE_WORLD # 74.06m
steps = 84
for s in range(steps):
    ang = (s / steps) * math.pi * 2 - math.pi
    near_gate = any(abs(math.atan2(math.sin(ang - ga), math.cos(ang - ga))) < 0.18 for ga in gate_angles)
    if not near_gate:
        wx = round(math.cos(ang) * wall_r, 2)
        wz = round(math.sin(ang) * wall_r, 2)
        obsts.append({'x': wx, 'z': wz, 'r': 3.5})

out_file = r'c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\village_colliders.json'
with open(out_file, 'w') as f:
    json.dump(obsts, f)

print(f"Total colliders gerados: {len(obsts)}")
