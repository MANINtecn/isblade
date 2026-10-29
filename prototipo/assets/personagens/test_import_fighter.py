import bpy
import os

base_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter\Fighter"
psk_dir = os.path.join(base_dir, "SkeletalMesh")
psa_path = os.path.join(base_dir, "MeshAnimation", "MFighter_anim.psa")

print(">>> Limpando cena...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

parts = ["MFighter_m000_u", "MFighter_m000_l", "MFighter_m000_g", "MFighter_m000_b", "MFighter_m000_h", "MFighter_m000_f"]

for part in parts:
    psk_file = os.path.join(psk_dir, f"{part}.psk")
    print(f"Importando {part}...")
    bpy.ops.import_scene.psk(filepath=psk_file)

armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
print(f"Total Armatures criadas: {len(armatures)}")
for a in armatures:
    print(f"  * {a.name} (bones: {len(a.data.bones)})")

meshes = [o for o in bpy.data.objects if o.type == 'MESH']
print(f"Total Meshes criadas: {len(meshes)}")
for m in meshes:
    print(f"  * {m.name}")

# Import PSA on primary armature
if armatures:
    arm = armatures[0]
    bpy.context.view_layer.objects.active = arm
    arm.select_set(True)
    print("Importando PSA no esqueleto principal...")
    psa_import_fn = getattr(bpy.ops.psa_import, 'import')
    res = psa_import_fn(filepath=psa_path)
    print(f"Resultado PSA: {res}, total de acoes: {len(bpy.data.actions)}")
    for act in bpy.data.actions[:10]:
        print(f"  - Action: {act.name}")
