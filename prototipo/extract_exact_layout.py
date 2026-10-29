import struct
import json
import parse_unr

buf = parse_unr.buf
names = parse_unr.names
exports = parse_unr.exports
imports = parse_unr.imports
read_compact_index = parse_unr.read_compact_index
get_object_name = parse_unr.get_object_name

sm_actors = [e for e in exports if e['class'] == 'StaticMeshActor']
print(f"Total StaticMeshActors: {len(sm_actors)}")

all_import_names = set(imp['obj_name'] for imp in imports if 'staticmesh' in imp['class_name'].lower())
print(f"Total StaticMesh import names: {len(all_import_names)}")

extracted_village = []

for a in sm_actors:
    raw = buf[a['offset']:a['offset'] + a['size']]
    
    # 1. Find StaticMesh object reference
    mesh_name = None
    for o in range(14, min(45, len(raw) - 2)):
        try:
            val, _ = read_compact_index(raw, o)
            obj = get_object_name(val)
            if obj in all_import_names:
                mesh_name = obj
                break
        except:
            pass
            
    # 2. Find Location Vector (3 floats X, Y, Z within Talking Island world range)
    # Talking Island bounds:
    # X: -95000 to -75000
    # Y: 230000 to 260000
    # Z: -6000 to 6000
    loc = None
    loc_offset = -1
    for o in range(14, len(raw) - 12):
        x, y, z = struct.unpack('<fff', raw[o:o+12])
        if -95000 < x < -75000 and 230000 < y < 260000 and -6000 < z < 6000:
            loc = (round(x, 2), round(y, 2), round(z, 2))
            loc_offset = o
            break
            
    # 3. Find Rotation (Rotator: 3 ints Pitch, Yaw, Roll)
    rot = (0, 0, 0)
    if loc_offset != -1:
        for ro in range(loc_offset + 12, min(loc_offset + 48, len(raw) - 12)):
            p, y, r = struct.unpack('<iii', raw[ro:ro+12])
            # In Unreal 65536 units = 360 degrees
            if abs(p) <= 131072 and abs(y) <= 524288 and abs(r) <= 131072:
                if p != 0 or y != 0 or r != 0:
                    # Check if plausible
                    rot = (p, y, r)
                    break
                    
    if mesh_name and loc:
        extracted_village.append({
            'actor': a['name'],
            'mesh': mesh_name,
            'x': loc[0],
            'y': loc[1],
            'z': loc[2],
            'pitch': rot[0],
            'yaw': rot[1],
            'roll': rot[2]
        })

print(f"Successfully extracted {len(extracted_village)} village objects with exact coordinates!")

mesh_counts = {}
for ev in extracted_village:
    mesh_counts[ev['mesh']] = mesh_counts.get(ev['mesh'], 0) + 1

for m, count in sorted(mesh_counts.items(), key=lambda x: -x[1]):
    print(f"  {m}: {count}")

with open(r'c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\talking_island_exact_layout.json', 'w') as f:
    json.dump(extracted_village, f, indent=2)
print("Saved exact layout to talking_island_exact_layout.json")
