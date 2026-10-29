import os

path = r'C:\Users\icaro\AppData\Roaming\Blender Foundation\Blender\5.1\extensions\user_default\io_scene_psk_psa\psa\importer.py'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

target = 'action = bpy.data.actions.new(name=action_name)'
replacement = '''action = bpy.data.actions.new(name=action_name)
        if armature_object.animation_data is None:
            armature_object.animation_data_create()
        armature_object.animation_data.action = action'''

if target in code and 'armature_object.animation_data.action = action' not in code:
    code = code.replace(target, replacement, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Assigned action to armature_object before fcurve creation!")
