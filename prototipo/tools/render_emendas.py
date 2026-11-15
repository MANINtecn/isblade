import bpy, math, os
from mathutils import Vector

R_PROT = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
DIR_RENDERS_PROT = os.path.join(R_PROT, "assets", "mundo", "renders")
DIR_RENDERS_BRAIN = r"C:\Users\icaro\.gemini\antigravity\brain\996873e3-368d-46db-a44f-d1a494aa6d72"
os.makedirs(DIR_RENDERS_PROT, exist_ok=True)
os.makedirs(DIR_RENDERS_BRAIN, exist_ok=True)

scene = bpy.context.scene
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.film_transparent = False

if scene.render.engine == 'CYCLES':
    scene.cycles.samples = 24
    scene.cycles.use_adaptive_sampling = True
    scene.cycles.adaptive_threshold = 0.05
    scene.cycles.device = 'CPU'

# Criar camera de visualizacao
cam_obj = bpy.data.objects.get("CAM_INSPECAO")
if not cam_obj:
    cam_data = bpy.data.cameras.new("CAM_INSPECAO")
    cam_obj = bpy.data.objects.new("CAM_INSPECAO", cam_data)
    scene.collection.objects.link(cam_obj)
scene.camera = cam_obj

# Luz de sol caso nao tenha iluminacao suficiente
sol = bpy.data.objects.get("SOL_INSPECAO")
if not sol:
    sol_data = bpy.data.lights.new("SOL_INSPECAO", 'SUN')
    sol_data.energy = 4.0
    sol_obj = bpy.data.objects.new("SOL_INSPECAO", sol_data)
    sol_obj.rotation_euler = (math.radians(50), math.radians(20), math.radians(-40))
    scene.collection.objects.link(sol_obj)

def posiciona_camera(loc, look_at, fov=45):
    cam_obj.location = Vector(loc)
    cam_obj.data.lens_unit = 'FOV'
    cam_obj.data.angle = math.radians(fov)
    
    # Apontar para look_at
    direction = (Vector(look_at) - cam_obj.location).normalized()
    rot_quat = direction.to_track_quat('-Z', 'Y')
    cam_obj.rotation_euler = rot_quat.to_euler()

views = [
    {
        "nome": "01_mapa_mundi_visao_geral",
        "cam": (0, -750, 850),
        "target": (0, 0, 0),
        "fov": 65,
        "titulo": "Visao Geral Aerea do Mundo Aberto"
    },
    {
        "nome": "02_solda_fortaleza",
        "cam": (-110, -220, 85),
        "target": (-178.9, -125.1, 7.0),
        "fov": 48,
        "titulo": "Solda da Fortaleza (Rampa de Acesso)"
    },
    {
        "nome": "03_solda_torre_baium",
        "cam": (170, 150, 90),
        "target": (265, 235, 15.0),
        "fov": 52,
        "titulo": "Solda da Torre do Baium (Rodovia e Patio)"
    },
    {
        "nome": "04_solda_cruma",
        "cam": (-170, 230, 95),
        "target": (-267.9, 354.6, -2.0),
        "fov": 48,
        "titulo": "Solda da Torre de Cruma (Soleira e Acesso)"
    },
    {
        "nome": "05_solda_pantano",
        "cam": (220, -110, 95),
        "target": (313.2, -197.4, 2.5),
        "fov": 50,
        "titulo": "Solda do Pantano Flamejante (Aterro e Ponte)"
    }
]

print("=== INICIANDO RENDERIZACAO DAS VISTAS 3D NO BLENDER ===")
for v in views:
    posiciona_camera(v["cam"], v["target"], v["fov"])
    nome_arq = v["nome"] + ".png"
    p1 = os.path.join(DIR_RENDERS_PROT, nome_arq)
    p2 = os.path.join(DIR_RENDERS_BRAIN, nome_arq)
    
    scene.render.filepath = p1
    bpy.ops.render.render(write_still=True)
    
    import shutil
    shutil.copyfile(p1, p2)
    print(f"Renderizado com sucesso: {v['titulo']} -> {nome_arq}")

print("Todos os renders foram concluidos com sucesso!")
