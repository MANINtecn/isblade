import bpy
import os

mixamo_fbx = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\mixamo\roll.fbx"
psk_path = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter\Fighter\SkeletalMesh\MFighter_m000_u.psk"

print(">>> Limpando cena...")
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

print(">>> Importando L2 Armature (PSK)...")
bpy.ops.import_scene.psk(filepath=psk_path)
l2_arm = [o for o in bpy.data.objects if o.type == 'ARMATURE'][0]
l2_arm.name = "L2_Fighter"

print(">>> Importando Mixamo Roll (FBX)...")
bpy.ops.import_scene.fbx(filepath=mixamo_fbx)
mix_arm = [o for o in bpy.data.objects if o.type == 'ARMATURE' and o != l2_arm][0]
mix_arm.name = "Mixamo_Arm"

print(f"L2: {l2_arm.name}, Mixamo: {mix_arm.name}")
print("Mixamo action:", mix_arm.animation_data.action.name if mix_arm.animation_data else "None")

# Mapping
BONE_MAP = {
    'Bip01_Pelvis': 'mixamorig:Hips',
    'bip01_spine': 'mixamorig:Spine',
    'Bip01_Spine1': 'mixamorig:Spine1',
    'bip01_spine2': 'mixamorig:Spine2',
    'Bip01_Neck': 'mixamorig:Neck',
    'Bip01_head': 'mixamorig:Head',
    'Bip01_L_Clavicle': 'mixamorig:LeftShoulder',
    'Bip01_L_UpperArm': 'mixamorig:LeftArm',
    'Bip01_L_Forearm': 'mixamorig:LeftForeArm',
    'Bip01_L_Hand': 'mixamorig:LeftHand',
    'Bip01_R_Clavicle': 'mixamorig:RightShoulder',
    'Bip01_R_UpperArm': 'mixamorig:RightArm',
    'Bip01_R_Forearm': 'mixamorig:RightForeArm',
    'Bip01_R_Hand': 'mixamorig:RightHand',
    'Bip01_L_Thigh': 'mixamorig:LeftUpLeg',
    'Bip01_L_Calf': 'mixamorig:LeftLeg',
    'bip01_l_foot': 'mixamorig:LeftFoot',
    'Bip01_L_Toe0': 'mixamorig:LeftToeBase',
    'Bip01_R_Thigh': 'mixamorig:RightUpLeg',
    'Bip01_R_Calf': 'mixamorig:RightLeg',
    'bip01_r_foot': 'mixamorig:RightFoot',
    'Bip01_R_Toe0': 'mixamorig:RightToeBase',
}

# Add constraints
bpy.context.view_layer.objects.active = l2_arm
bpy.ops.object.mode_set(mode='POSE')

for l2_bone_name, mix_bone_name in BONE_MAP.items():
    if l2_bone_name in l2_arm.pose.bones and mix_bone_name in mix_arm.pose.bones:
        pb = l2_arm.pose.bones[l2_bone_name]
        c = pb.constraints.new('COPY_ROTATION')
        c.target = mix_arm
        c.subtarget = mix_bone_name
        if l2_bone_name == 'Bip01_Pelvis':
            # Also copy location for pelvis/hips
            cl = pb.constraints.new('COPY_LOCATION')
            cl.target = mix_arm
            cl.subtarget = mix_bone_name

# Bake animation on L2_Fighter
mix_act = mix_arm.animation_data.action
frame_end = int(mix_act.frame_range[1])
print(f"Baking frames 1 to {frame_end}...")

bpy.ops.nla.bake(
    frame_start=1,
    frame_end=frame_end,
    only_selected=False,
    visual_keying=True,
    clear_constraints=True,
    bake_types={'POSE'}
)

bpy.ops.object.mode_set(mode='OBJECT')
# Delete mixamo armature
bpy.data.objects.remove(mix_arm, do_unlink=True)

print("Baked action name on L2:", l2_arm.animation_data.action.name)
l2_arm.animation_data.action.name = "roll"
print("SUCCESS: Baked roll action onto L2 Armature!")
