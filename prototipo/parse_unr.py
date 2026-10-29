import struct

fpath = r'c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\talking_island\17_25_dec.unr'
with open(fpath, 'rb') as f:
    buf = f.read()

tag, ver, flags, name_count, name_offset, export_count, export_offset, import_count, import_offset = struct.unpack('<IIIIIIIII', buf[:36])

names = []
idx = name_offset
for i in range(name_count):
    length = buf[idx]
    idx += 1
    if length >= 128:
        name = "SPECIAL"
    else:
        name = buf[idx:idx+length-1].decode('latin1', errors='ignore')
        idx += length
    n_flags = struct.unpack('<I', buf[idx:idx+4])[0]
    idx += 4
    names.append(name)

def read_compact_index(data, offset):
    b0 = data[offset]
    offset += 1
    sign = (b0 & 0x80) != 0
    more = (b0 & 0x40) != 0
    val = b0 & 0x3F
    if more:
        b1 = data[offset]
        offset += 1
        more = (b1 & 0x80) != 0
        val |= (b1 & 0x7F) << 6
        if more:
            b2 = data[offset]
            offset += 1
            more = (b2 & 0x80) != 0
            val |= (b2 & 0x7F) << 13
            if more:
                b3 = data[offset]
                offset += 1
                more = (b3 & 0x80) != 0
                val |= (b3 & 0x7F) << 20
                if more:
                    b4 = data[offset]
                    offset += 1
                    val |= b4 << 27
    if sign:
        val = -val
    return val, offset

# Parse imports
imports = []
idx = import_offset
for i in range(import_count):
    class_pkg, idx = read_compact_index(buf, idx)
    class_name, idx = read_compact_index(buf, idx)
    package = struct.unpack('<i', buf[idx:idx+4])[0]
    idx += 4
    obj_name, idx = read_compact_index(buf, idx)
    imports.append({
        'class_pkg': names[class_pkg] if 0 <= class_pkg < len(names) else f'idx_{class_pkg}',
        'class_name': names[class_name] if 0 <= class_name < len(names) else f'idx_{class_name}',
        'package': package,
        'obj_name': names[obj_name] if 0 <= obj_name < len(names) else f'idx_{obj_name}',
    })

def get_object_name(obj_idx):
    if obj_idx == 0:
        return 'None'
    elif obj_idx < 0:
        # Import table: -1 is imports[0]
        imp_idx = -obj_idx - 1
        if 0 <= imp_idx < len(imports):
            return imports[imp_idx]['obj_name']
        return f'Import_{imp_idx}'
    else:
        # Export table: 1 is exports[0]
        return f'Export_{obj_idx - 1}'

# Parse exports
exports = []
idx = export_offset
for i in range(export_count):
    class_idx, idx = read_compact_index(buf, idx)
    super_idx, idx = read_compact_index(buf, idx)
    package = struct.unpack('<i', buf[idx:idx+4])[0]
    idx += 4
    obj_name, idx = read_compact_index(buf, idx)
    obj_flags = struct.unpack('<I', buf[idx:idx+4])[0]
    idx += 4
    serial_size, idx = read_compact_index(buf, idx)
    serial_offset = 0
    if serial_size > 0:
        serial_offset, idx = read_compact_index(buf, idx)
    
    class_str = get_object_name(class_idx)
    name_str = names[obj_name] if 0 <= obj_name < len(names) else f'idx_{obj_name}'
    exports.append({
        'class': class_str,
        'name': name_str,
        'size': serial_size,
        'offset': serial_offset
    })

print(f"Total exports parsed: {len(exports)}")
classes = {}
for e in exports:
    classes[e['class']] = classes.get(e['class'], 0) + 1

for c, count in sorted(classes.items(), key=lambda x: -x[1])[:15]:
    print(f"  {c}: {count}")
