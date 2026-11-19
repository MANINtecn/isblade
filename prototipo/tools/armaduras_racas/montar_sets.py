"""Monta os GLB dos conjuntos D/C/B/A de cada raca: corpo da raca (esqueleto + animacoes + rosto/cabelo) com as 4 pecas do set trocadas pelas malhas L2.
Mesmo processo de build_elf_armors.py / build_dwarf_armors.py. Entrada: raw_armaduras/resolvido.json (exportar_pecas.py).
Saida: assets/personagens/<raca>_brigandine|fullplate|doom|tallum.glb
Rodar (sem janela, nao mexe no Blender aberto):
  "C:\\Program Files\\Blender Foundation\\Blender 5.1\\blender.exe" -b --python montar_sets.py -- human_fighter_female magic_m ...
Peca sem malha/textura no cliente: mantem a peca do corpo base (nao some)."""
import bpy, os, sys, json

RAIZ = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
PERS = os.path.join(RAIZ, "assets", "personagens")
SAIDA = os.path.join(PERS, "raw_armaduras")
BASE = {  # corpo base de cada raca (naked: esqueleto, animacoes, rosto e cabelo)
    'human_fighter_female': 'human_fighter_female.glb', 'magic_m': 'magic_m.glb', 'magic_f': 'magic_f.glb', 'elf_m': 'elf_m.glb',
    'orc_m': 'orc_m.glb', 'orc_f': 'orc_f.glb', 'darkelf_m': 'darkelf_m.glb', 'darkelf_f': 'darkelf_f.glb',
}
SETS = {'D': ('brigandine', .55, .40), 'C': ('fullplate', .85, .28), 'B': ('doom', .80, .32), 'A': ('tallum', .85, .26)}
SLOT = {'u': 'Chest', 'l': 'Legs', 'g': 'Gloves', 'b': 'Boots'}
# elfo negro: as malhas de armadura dele sao ilegiveis no cliente (UModel 'bad base mesh'); usa as do elfo (mesmo esqueleto/proporcoes) no corpo do elfo negro
FONTE = {'darkelf_f': 'elf_f', 'darkelf_m': 'elf_m'}
racas = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else list(BASE)
RES = json.load(open(os.path.join(SAIDA, 'resolvido.json'), encoding='utf-8'))

def png(race, tex):
    for suf in ('_sp', '', '_ori'):
        p = os.path.join(SAIDA, race, 'tex', tex + suf + '.png')
        if os.path.exists(p): return p
    return None

def monta(race, grau):
    nome, metal, rough = SETS[grau]; fonte = FONTE.get(race, race); res = RES[fonte][grau]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    try: bpy.ops.preferences.addon_enable(module='bl_ext.user_default.io_scene_psk_psa')
    except Exception: pass
    bpy.ops.import_scene.gltf(filepath=os.path.join(PERS, BASE[race]))
    arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
    if not arms: print('[ERRO] sem armature em', race); return False
    master = arms[0]; usadas = []
    for p in 'ulgb':
        e = res[p]; psk = os.path.join(SAIDA, fonte, 'psk', (e.get('malha') or '') + '.psk'); tp = png(fonte, e['textura']) if e.get('textura') else None
        if not e.get('malha') or not os.path.exists(psk) or not tp:
            print('   [mantem corpo] %s %s %s: malha=%s tex=%s' % (race, grau, SLOT[p], e.get('malha'), e.get('textura'))); continue
        for o in list(bpy.data.objects):          # tira a peca antiga do corpo
            if o.type == 'MESH' and o.name == SLOT[p]: bpy.data.objects.remove(o, do_unlink=True)
        antes = set(bpy.data.objects); bpy.ops.import_scene.psk(filepath=psk)
        novos = [o for o in bpy.data.objects if o not in antes]
        malhas = [o for o in novos if o.type == 'MESH']; tmp = [o for o in novos if o.type == 'ARMATURE']
        if not malhas: print('   [ERRO] psk sem malha', psk); continue
        m = malhas[0]; m.name = SLOT[p]
        for md in m.modifiers:
            if md.type == 'ARMATURE': md.object = master
        m.parent = master
        for a in tmp: bpy.data.objects.remove(a, do_unlink=True)
        mat = bpy.data.materials.new(name='Mat_%s_%s_%s' % (SLOT[p], race, nome)); mat.use_nodes = True
        bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        img = bpy.data.images.load(tp); tn = mat.node_tree.nodes.new('ShaderNodeTexImage'); tn.image = img
        if bsdf:
            mat.node_tree.links.new(bsdf.inputs['Base Color'], tn.outputs['Color'])
            if 'Metallic' in bsdf.inputs: bsdf.inputs['Metallic'].default_value = metal
            if 'Roughness' in bsdf.inputs: bsdf.inputs['Roughness'].default_value = rough
        m.data.materials.clear(); m.data.materials.append(mat); usadas.append(SLOT[p])
    out = os.path.join(PERS, '%s_%s.glb' % (race, nome))
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB')
    print('[OK] %s (%s) pecas trocadas: %s -> %.2f MB' % (os.path.basename(out), grau, usadas, os.path.getsize(out) / 1048576))
    return True

for r in racas:
    for g in SETS:
        try: monta(r, g)
        except Exception as ex: print('[FALHOU]', r, g, ex)
