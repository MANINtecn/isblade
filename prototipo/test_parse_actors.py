import struct
import parse_unr

buf = parse_unr.buf
names = parse_unr.names
exports = parse_unr.exports
imports = parse_unr.imports
read_compact_index = parse_unr.read_compact_index
get_object_name = parse_unr.get_object_name

sm_actors = [e for e in exports if e['class'] == 'StaticMeshActor']
print(f"Found {len(sm_actors)} StaticMeshActors")

def parse_properties(buf, start_offset, max_size):
    idx = start_offset
    end_offset = start_offset + max_size
    props = {}
    
    while idx < end_offset:
        name_idx, idx = read_compact_index(buf, idx)
        if name_idx < 0 or name_idx >= len(names):
            break
        prop_name = names[name_idx]
        if prop_name == 'None':
            break
            
        info = buf[idx]
        idx += 1
        
        prop_type = info & 0x0F
        size_code = (info >> 4) & 0x07
        is_array = (info & 0x80) != 0
        
        array_idx = 0
        if is_array:
            # array index
            b = buf[idx]
            idx += 1
            if b < 128:
                array_idx = b
            else:
                # compact index or 2 bytes
                array_idx = b & 0x7F # approx
                
        # Calculate size
        if size_code == 0: prop_size = 1
        elif size_code == 1: prop_size = 2
        elif size_code == 2: prop_size = 4
        elif size_code == 3: prop_size = 12
        elif size_code == 4: prop_size = 16
        elif size_code == 5:
            prop_size = buf[idx]
            idx += 1
        elif size_code == 6:
            prop_size = struct.unpack('<H', buf[idx:idx+2])[0]
            idx += 2
        elif size_code == 7:
            prop_size = struct.unpack('<I', buf[idx:idx+4])[0]
            idx += 4
            
        struct_name = None
        if prop_type == 10: # StructProperty
            struct_idx, idx = read_compact_index(buf, idx)
            struct_name = names[struct_idx] if 0 <= struct_idx < len(names) else 'UnknownStruct'
            
        raw_val = buf[idx:idx+prop_size]
        idx += prop_size
        
        try:
            val = raw_val
            if prop_type == 1: # Byte
                val = raw_val[0] if len(raw_val) >= 1 else 0
            elif prop_type == 2: # Int
                val = struct.unpack('<i', raw_val)[0] if len(raw_val) == 4 else raw_val
            elif prop_type == 3: # Bool
                val = (info & 0x20) != 0
            elif prop_type == 4: # Float
                val = struct.unpack('<f', raw_val)[0] if len(raw_val) == 4 else raw_val
            elif prop_type == 5: # Object
                if len(raw_val) > 0:
                    obj_ref, _ = read_compact_index(raw_val, 0)
                    val = get_object_name(obj_ref)
            elif prop_type == 6: # Name
                if len(raw_val) >= 4:
                    n_idx = struct.unpack('<I', raw_val[:4])[0]
                    val = names[n_idx] if 0 <= n_idx < len(names) else f'idx_{n_idx}'
                elif len(raw_val) > 0:
                    n_idx, _ = read_compact_index(raw_val, 0)
                    val = names[n_idx] if 0 <= n_idx < len(names) else f'idx_{n_idx}'
            elif prop_type == 10: # Struct
                if struct_name == 'Vector' and len(raw_val) == 12:
                    val = struct.unpack('<fff', raw_val)
                elif struct_name == 'Rotator' and len(raw_val) == 12:
                    val = struct.unpack('<iii', raw_val)
                elif struct_name == 'Color' and len(raw_val) == 4:
                    val = struct.unpack('<BBBB', raw_val)
                else:
                    val = (struct_name, raw_val.hex())
            props[prop_name] = val
        except Exception:
            props[prop_name] = raw_val
            
    return props


# Test on first 20 StaticMeshActors
village_actors = []
for a in sm_actors:
    # Try finding where 'StaticMesh' or other property starts in the first 25 bytes
    start_pos = a['offset']
    for test_o in range(a['offset'], a['offset'] + 22):
        n_idx, _ = read_compact_index(buf, test_o)
        if 0 <= n_idx < len(names) and names[n_idx] in ['StaticMesh', 'Location', 'Rotation', 'Tag', 'DrawScale', 'bStatic']:
            start_pos = test_o
            break
            
    props = parse_properties(buf, start_pos, a['size'] - (start_pos - a['offset']))
    mesh = props.get('StaticMesh')
    if mesh:
        village_actors.append({
            'actor': a['name'],
            'mesh': mesh,
            'loc': props.get('Location'),
            'rot': props.get('Rotation'),
            'scale': props.get('DrawScale', 1.0),
            'scale3d': props.get('DrawScale3D')
        })

print(f"Total village actors with StaticMesh: {len(village_actors)}")
for va in village_actors[:25]:
    print(f"  {va['mesh']} -> loc={va['loc']} rot={va['rot']} scale={va['scale']}")

