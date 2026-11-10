"""Audicao dos clipes 2HS: mede a ponta/mao da espada (velocidade, pico) e o giro do corpo, e renderiza quadros de cada clipe.
blender -b prototipo/assets/personagens/guerreiro_base.blend --python guerreiro_audicao.py -- <pasta_saida> [clipe ...]"""
import bpy, sys, math, os
from mathutils import Vector
args = sys.argv[sys.argv.index("--") + 1:]; pasta = args[0]; clipes = args[1:] or ["SpAtk01_2HS", "SpAtk03_2HS", "SpAtk07_2HS", "SpAtk11_2HS", "SpAtk18_2HS", "SpAtk19_2HS", "Atk01_2HS", "Atk02_2HS", "Atk03_2HS"]
os.makedirs(pasta, exist_ok=True)
sc = bpy.context.scene; arm = bpy.data.objects["HumanFighter_Armature"]; arma = bpy.data.objects["DragonSlayer"]
sc.render.engine = "BLENDER_EEVEE"; sc.render.resolution_x = 360; sc.render.resolution_y = 420
sc.world = bpy.data.worlds.new("w"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[0].default_value = (0.05, 0.06, 0.08, 1); sc.world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
sc.view_settings.view_transform = "Standard"
ld = bpy.data.lights.new("sol", "SUN"); ld.energy = 3.5; so = bpy.data.objects.new("sol", ld); sc.collection.objects.link(so); so.rotation_euler = (math.radians(55), 0, math.radians(35))
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); sc.collection.objects.link(cam); cam.data.lens = 40; cam.data.clip_end = 5000; sc.camera = cam
alvo = bpy.data.objects.new("alvo", None); sc.collection.objects.link(alvo); k = cam.constraints.new("TRACK_TO"); k.target = alvo; k.track_axis = "TRACK_NEGATIVE_Z"; k.up_axis = "UP_Y"
ch = arm.pose.bones.get("Weapon_R_Bone"); pel = arm.pose.bones["Bip01_Pelvis"]
def yaw_corpo():
    m = arm.matrix_world @ pel.matrix; f = m.to_3x3() @ Vector((1, 0, 0)); return math.degrees(math.atan2(f.y, f.x))
for c in clipes:
    act = bpy.data.actions["W_" + c]; arm.animation_data.action = act; a, b = int(act.frame_range[0]), int(round(act.frame_range[1]))
    pos, yaws = [], []
    for f in range(a, b + 1):
        sc.frame_set(f); bpy.context.view_layer.update()
        pos.append((f, (arm.matrix_world @ ch.matrix).translation.copy(), (arma.matrix_world @ Vector((0, 0, 0))).copy())); yaws.append(yaw_corpo())
    # ponta da lamina = ponto do PSK mais distante do encaixe
    vel = [(pos[i][0], (pos[i][2] - pos[i - 1][2]).length) for i in range(1, len(pos))]
    pico = max(vel, key=lambda v: v[1]) if vel else (0, 0)
    giro = 0.0
    for i in range(1, len(yaws)):
        d = (yaws[i] - yaws[i - 1] + 180) % 360 - 180; giro += d
    print("AUD %-12s %3d quadros (%.2f s) pico de velocidade no quadro %3d (%.2f s) | giro total do corpo %.0f graus" % (c, b - a + 1, (b - a + 1) / 48.0, pico[0], pico[0] / 48.0, giro))
    n = 8; quadros = [a + round(i * (b - a) / (n - 1)) for i in range(n)]
    for j, f in enumerate(quadros):
        sc.frame_set(f); bpy.context.view_layer.update(); p = (arm.matrix_world @ pel.matrix).translation
        alvo.location = (p.x, p.y, 20); cam.location = (p.x + 95, p.y - 95, 38)
        sc.render.filepath = os.path.join(pasta, "%s_%d.png" % (c, j)); bpy.ops.render.render(write_still=True)
