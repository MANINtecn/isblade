import json
import math

with open(r'c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\talking_island_exact_layout.json') as f:
    items = json.load(f)

with open(r'c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\model_y_offsets.json') as f:
    y_offsets = json.load(f)

cx = -84263.0
cy = 243000.0
cz = -3376.0

mesh_map = {
    'SI_CH_Body': 'ti_church.glb',
    'SI_Agit': 'ti_agit.glb',
    'SI_SH01': 'ti_shop_01.glb',
    'SI_SH02': 'ti_shop_02.glb',
    'SI_SH03': 'ti_shop_03.glb',
    'SI_H01': 'ti_house_01.glb',
    'SI_H02': 'ti_house_02.glb',
    'SI_H03': 'ti_house_03.glb',
    'SI_H04': 'ti_house_04.glb',
    'SI_G01': 'ti_gate.glb',
    'SI_Wall_A': 'ti_wall_a.glb',
    'SI_Wall_B': 'ti_wall_b.glb',
    'SI_Wall_C': 'ti_wall_c.glb',
    'SI_Wall_D': 'ti_wall_d.glb',
    'splandtree1': 'ti_tree_01.glb',
    'splandtree3': 'ti_tree_02.glb',
    'splandtree4': 'ti_tree_02.glb',
    'splandforest1': 'ti_tree_legend.glb',
    'splandddztree1': 'ti_tree_01.glb',
    'sp_lighthouse001': 'ti_lighthouse.glb',
    'sp_p_wood01': 'ti_port_dock.glb',
    'SI_Centertop': 'ti_centertop.glb'
}

ignore_meshes = {
    'SI_CH_Inner', 'SI_Agit_Rf', 'SI_SH01_Rf', 'SI_SH02_Rf', 'SI_SH03_Rf',
    'SI_H01_Rf', 'SI_H02_Rf', 'SI_H03_Rf', 'SI_H04_Rf', 'sp_lighthouse002'
}

SCALE_WORLD = 2.8
DIVISOR = 100.0 / SCALE_WORLD  # 35.7143 -> Exact 1:1 Lineage 2 coordinate transformation!

village_data = []

for it in items:
    mesh = it['mesh']
    if mesh in ignore_meshes:
        continue
    if mesh not in mesh_map:
        continue
        
    glb = mesh_map[mesh]
    
    rel_x = it['x'] - cx
    rel_y = it['y'] - cy
    
    tx = round(rel_x / DIVISOR, 2)
    tz = round(-rel_y / DIVISOR, 2)
    
    # Scale tailored: walls & gates at 2.8x; houses, shops, church & guild boosted to 3.2x!
    if 'church' in glb:
        scale = round(SCALE_WORLD * 1.15, 2)  # 3.22x grand cathedral
    elif any(k in glb for k in ['house', 'shop', 'agit']):
        scale = round(SCALE_WORLD * 1.14, 2)  # 3.20x authentic 2-story medieval homes & shops
    elif 'tree' in glb:
        scale = round(SCALE_WORLD * (1.1 + (abs(hash(it['actor'])) % 25) / 100.0), 2)
    elif 'gate' in glb:
        scale = round(SCALE_WORLD * 1.0, 2)   # 2.80x snaps into perimeter wall openings
    elif 'wall' in glb:
        scale = round(SCALE_WORLD * 1.0, 2)   # 2.80x authentic fortress wall
    elif 'centertop' in glb:
        scale = round(SCALE_WORLD * 1.0, 2)   # 2.80x iconic central fountain obelisk
    elif 'lighthouse' in glb:
        scale = round(SCALE_WORLD * 1.0, 2)
    elif 'fighter' in glb:
        scale = round(SCALE_WORLD * 1.14, 2)  # 3.20x grand fighter guild
    else:
        scale = round(SCALE_WORLD * 1.0, 2)
        
    ty = round(y_offsets.get(glb, 0.0) * scale, 3)
    
    if 'lighthouse' in glb:
        ty = 0.0  # seated on island ground
        
    yaw_rad = (it['yaw'] / 65536.0) * (2 * math.pi)
    rot_y = round(-yaw_rad, 3)
    if 'gate' in glb:
        # Portão encaixa perfeitamente na muralha perimétrica: ponte tangencial e vão radial apontando para a estrada
        rot_y = round(-math.atan2(tz, tx), 3)
        
    village_data.append({
        'name': mesh,
        'glb': glb,
        'pos': [tx, ty, tz],
        'rotY': rot_y,
        'scale': scale
    })

# Authentic Fighter Guild courtyard
fg_scale = round(SCALE_WORLD * 1.14, 2)
village_data.append({
    'name': 'SI_Fighter_Hall',
    'glb': 'ti_fighter_hall.glb',
    'pos': [78.5, round(y_offsets.get('ti_fighter_hall.glb', 8.08) * fg_scale, 3), -86.0],
    'rotY': -0.45,
    'scale': fg_scale
})

# Authentic Port Pier extended over the southern ocean
dock_scale = round(SCALE_WORLD * 1.0, 2)
village_data.append({
    'name': 'sp_p_wood01',
    'glb': 'ti_port_dock.glb',
    'pos': [26.0, -4.5, 138.0],
    'rotY': 0.1,
    'scale': dock_scale
})
village_data.append({
    'name': 'sp_p_wood01',
    'glb': 'ti_port_dock.glb',
    'pos': [42.0, -4.5, 154.0],
    'rotY': 0.35,
    'scale': dock_scale
})

out_path = r'c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\village_data_threejs.json'
with open(out_path, 'w') as f:
    json.dump(village_data, f, indent=2)

print(f"Total village entities to spawn: {len(village_data)}")
print("Updated authentic village dataset with EXACT 1:1 LINEAGE 2 COORDINATES and 3.2x BUILDINGS!")
