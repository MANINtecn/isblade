import json, struct, os

def get_glb_animations(filepath):
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'rb') as f:
        magic = f.read(4)
        if magic != b'glTF':
            return []
        version, length = struct.unpack('<II', f.read(8))
        chunk_len, chunk_type = struct.unpack('<II', f.read(8))
        if chunk_type != 0x4E4F534A: # JSON
            return []
        json_data = json.loads(f.read(chunk_len).decode('utf-8'))
        anims = json_data.get('animations', [])
        return [a.get('name', '') for a in anims]

models = [
    'prototipo/assets/personagens/human_fighter_nograde.glb',
    'prototipo/assets/personagens/human_fighter_female_nograde.glb',
    'prototipo/assets/personagens/magic_m_nograde.glb',
    'prototipo/assets/personagens/magic_f_nograde.glb',
    'prototipo/assets/personagens/elf_f_nograde.glb',
    'prototipo/assets/personagens/orc_m_nograde.glb',
    'prototipo/assets/personagens/dwarf_f_nograde.glb'
]

for m in models:
    names = get_glb_animations(m)
    print(f'=== {os.path.basename(m)} ({len(names)} anims) ===')
    # Filter for Wait / Idle / 1HS / Staff / Hand
    relevant = [n for n in names if any(k in n for k in ['Wait', 'Idle', 'AtkWait', '1HS', '2HS', 'Staff', 'Pole', 'Bow', 'Dagger', 'Dual', 'Hand'])]
    print(relevant[:25])
