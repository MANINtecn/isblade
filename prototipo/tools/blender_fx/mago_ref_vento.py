"""Monta o arquivo de REFERENCIA dos efeitos de vento do L2 (malhas extraidas do cliente) para o mago.
Uso:  blender -b -P mago_ref_vento.py        -> salva trabalho_l2fx/vento_l2_ref.blend
Malhas: trabalho_l2fx/export_bruto (umodel_materials.exe -export -png LineageEffectsStaticmeshes.usx). Texturas: LineageEffectsTextures/Texture.
Cada malha recebe a textura do L2 como emissao com transparencia pelo brilho (o L2 usa mistura aditiva)."""
import bpy, os, math, addon_utils
RAIZ = r"C:/TECX SOFTHOUSE/IS ONLINE/trabalho_l2fx/"
MESH = RAIZ + "export_bruto/LineageEffectsStaticmeshes/StaticMesh/"
TEX = RAIZ + "export_bruto/LineageEffectsTextures/Texture/"
SAIDA = RAIZ + "vento_l2_ref.blend"
# (malha, textura que ela usa no L2)
LISTA = [("windknifeball00", "fx_m_t0001"), ("windknifewave00", "fx_m_t0005"), ("windblowin02", "fx_m_t0001"), ("windblowin03", "fx_m_t0001"),
         ("windblowin00", "fx_m_t0001"), ("windblowin01", "fx_m_t0001"), ("twist_m02", "fx_m_t2039"), ("twist_m00", "fx_m_t2039"), ("wind_L", "fx_m_t0001"),
         ("cubic_wind00", "fx_m_t0095"), ("spirit_wind00", "fx_m_t0059"), ("spirit_wind01", "fx_m_t0059")]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.preferences.addon_enable(module="bl_ext.user_default.io_scene_psk_psa")
sc = bpy.context.scene; sc.name = "L2_VENTO_REF"
col = bpy.data.collections.new("L2_vento"); sc.collection.children.link(col)
def material(nome, tex):
    m = bpy.data.materials.new("L2_" + nome); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission"); tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mx = nt.nodes.new("ShaderNodeMixShader"); im = nt.nodes.new("ShaderNodeTexImage"); bw = nt.nodes.new("ShaderNodeRGBToBW")
    p = TEX + tex + ".png"
    if os.path.exists(p): im.image = bpy.data.images.load(p); im.image.pack()
    nt.links.new(im.outputs["Color"], em.inputs["Color"]); nt.links.new(im.outputs["Color"], bw.inputs[0]); nt.links.new(bw.outputs[0], mx.inputs[0])
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], out.inputs[0])
    em.inputs["Strength"].default_value = 2.0
    try: m.surface_render_method = "BLENDED"
    except Exception: pass
    m.use_backface_culling = False
    return m
rel = []
for i, (n, t) in enumerate(LISTA):
    antes = set(bpy.data.objects.keys())
    try: bpy.ops.import_scene.psk(filepath=MESH + n + ".pskx")
    except Exception as e: rel.append((n, "ERRO " + str(e)[:70])); continue
    novos = [bpy.data.objects[k] for k in bpy.data.objects.keys() if k not in antes]
    mat = material(n, t)
    for o in novos:
        for c in list(o.users_collection): c.objects.unlink(o)
        col.objects.link(o)
        if o.type == "MESH":
            f = 3.0 / max(max(o.dimensions), 1e-6); o.scale = (f, f, f)          # normaliza para ~3 m (o L2 usa unidades de 1 a 1200)
            bpy.context.view_layer.update()
            o.location = ((i % 6) * 4.5, -(i // 6) * 4.5, 1.5); o.data.materials.clear(); o.data.materials.append(mat); o.name = "L2_" + n
            rel.append((n, tuple(round(x, 2) for x in o.dimensions), len(o.data.polygons)))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam)
cam.data.type = "ORTHO"; cam.data.ortho_scale = 30
cam.location = (11.25 + 14, -2.25 - 24, 22); cam.rotation_euler = (math.radians(58), 0, math.radians(30)); sc.camera = cam
sc.world = bpy.data.worlds.new("mundo"); sc.world.use_nodes = True
bg = sc.world.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.012, 0.016, 0.028, 1); bg.inputs[1].default_value = 1.0
sc.view_settings.view_transform = "Standard"
sc.render.engine = "BLENDER_EEVEE"; sc.render.resolution_x = 1280; sc.render.resolution_y = 720
bpy.ops.wm.save_as_mainfile(filepath=SAIDA)
for r in rel: print(r)
print("salvo:", SAIDA)
if os.environ.get('PREVIA'):
    sc.render.filepath = os.environ['PREVIA']; bpy.ops.render.render(write_still=True)
