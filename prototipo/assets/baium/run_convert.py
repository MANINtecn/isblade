import bpy
import os
import sys

base_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\baium"
psk_path = os.path.join(base_dir, "baium_m00.psk")
psa_path = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\baium_export\LineageMonsters\MeshAnimation\Baium_anim.psa"
out_glb = os.path.join(base_dir, "baium_boss.glb")

print(">>> Limpando objetos existentes na cena...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

print(f">>> Importando PSK: {psk_path}")
res_psk = bpy.ops.import_scene.psk(filepath=psk_path)
print(f"Resultado PSK: {res_psk}")

armature = None
for obj in bpy.data.objects:
    if obj.type == 'ARMATURE':
        armature = obj
        break

if not armature:
    print("ERRO: Nenhuma Armature encontrada!")
    sys.exit(1)

print(f">>> Armature encontrada: {armature.name}. Selecionando...")
bpy.context.view_layer.objects.active = armature
armature.select_set(True)

print(f">>> Importando PSA: {psa_path}")
psa_import_fn = getattr(bpy.ops.psa_import, 'import')
res_psa = psa_import_fn(filepath=psa_path)
print(f"Resultado PSA: {res_psa}")

print(f">>> Total de Acoes (animacoes): {len(bpy.data.actions)}")
for act in bpy.data.actions:
    print(f"  * {act.name}")

# Cria material com a textura do Baium
mat = bpy.data.materials.new(name="BaiumMat")
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get("Principled BSDF")
tex_path = os.path.join(base_dir, "baium_t00_sp.png")
if os.path.exists(tex_path) and bsdf:
    tex_img = bpy.data.images.load(tex_path)
    tex_node = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex_node.image = tex_img
    mat.node_tree.links.new(bsdf.inputs['Base Color'], tex_node.outputs['Color'])

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.data.materials.clear()
        obj.data.materials.append(mat)

print(f">>> Exportando GLB animado: {out_glb}")
bpy.ops.export_scene.gltf(
    filepath=out_glb,
    export_format='GLB',
    export_animations=True,
    export_skins=True,
    export_morph=True
)

print(">>> CONVERSAO FINALIZADA COM SUCESSO!")
