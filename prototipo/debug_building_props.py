import test_parse_actors
import parse_unr

buf = parse_unr.buf
names = parse_unr.names
exports = parse_unr.exports
read_compact_index = parse_unr.read_compact_index

sm_actors = [e for e in exports if e['class'] == 'StaticMeshActor']

target_meshes = ['SI_Agit', 'SI_H01', 'SI_H02', 'SI_CH_Body', 'SI_Fighter_Hall', 'SI_Centertop', 'SI_G01', 'SI_SH01']

for a in sm_actors:
    start_pos = a['offset']
    for test_o in range(a['offset'], a['offset'] + 22):
        n_idx, _ = read_compact_index(buf, test_o)
        if 0 <= n_idx < len(names) and names[n_idx] in ['StaticMesh', 'Location', 'Rotation', 'Tag', 'DrawScale', 'bStatic']:
            start_pos = test_o
            break
            
    props = test_parse_actors.parse_properties(buf, start_pos, a['size'] - (start_pos - a['offset']))
    mesh = props.get('StaticMesh')
    if mesh in target_meshes:
        print(f"Actor {a['name']} ({mesh}):")
        for k, v in props.items():
            print(f"   {k}: {v}")
