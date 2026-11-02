"""Exporta o .blend editado para GLB leve (texturas <=512 px; opacas em JPEG).
Rodar:  blender -b <montagem.blend> --python exportar_glb.py -- <saida.glb> [max_px=512] [qualidade_jpeg=80]
Usa todos os objetos MESH da cena. As malhas ja estao corrigidas (espelho em Y) dentro do .blend."""
import bpy, sys, numpy as np
_a = sys.argv[sys.argv.index('--') + 1:]
OUT = _a[0]
MAXPX = int(_a[1]) if len(_a) > 1 else 512
QJPG = int(_a[2]) if len(_a) > 2 else 80

def _sair_do_modo_edicao():
    """O .blend pode ter sido salvo com uma peca em modo de edicao (Tab): as ferramentas nao conseguem ler/gravar a malha assim."""
    import bpy
    for ob in list(bpy.data.objects):
        if ob.mode == 'EDIT':
            bpy.context.view_layer.objects.active = ob
            bpy.ops.object.mode_set(mode='OBJECT')
            print('saiu do modo de edicao:', ob.name)
_sair_do_modo_edicao()
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
alpha = set(); used = set()
for o in objs:
    for m in o.data.materials:
        if not (m and m.use_nodes): continue
        bsdf = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        tn = next((n for n in m.node_tree.nodes if n.type == 'TEX_IMAGE' and n.image), None)
        if not (bsdf and tn): continue
        used.add(tn.image); im = tn.image; w, h = im.size
        a = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(a); frac = float((a[3::4] < 0.5).mean())
        if 0.02 < frac < 0.9:                                   # recorte real (folhas, grades); alpha todo zero = textura opaca
            m.node_tree.links.new(tn.outputs['Alpha'], bsdf.inputs['Alpha']); alpha.add(im)
for im in used:
    w, h = im.size
    if max(w, h) > MAXPX: k = MAXPX / max(w, h); im.scale(max(1, int(w * k)), max(1, int(h * k)))
    im.file_format = 'PNG' if im in alpha else 'JPEG'
for o in bpy.context.view_layer.objects: o.select_set(False)
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_image_format='AUTO',
                          export_jpeg_quality=QJPG, export_cameras=False, export_lights=False, export_yup=True)
print('EXPORTADO', OUT, len(objs), 'objetos')
