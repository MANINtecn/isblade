import subprocess
import os
import shutil
import glob

umodel = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
snd_dir = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x\sounds"
out_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\l2_sounds"

os.makedirs(out_dir, exist_ok=True)

targets = [
    ('skillsound.uax', ['soul_shot_shot', 'soul_shot_cast', 'spirits_shot_cast', 'power_strike_shot', 'mortal_blow_shot']),
    ('skillsound4.uax', ['baium_earthquake_shot', 'energywave_shot', 'fatal_strike_shot', 'dash_shot', 'doublewind_shot', 'onehand_shot']),
    ('SkillSound3.uax', ['focus_sonic_shot', 'battle_roar_shot', 'shieldstun_shot']),
    ('itemsound.uax', [
        'public_sword_shing_1', 'public_sword_shing_2', 'public_sword_shing_3', 'public_sword_shing_4',
        'sword_big_1', 'sword_big_2', 'sword_big_3', 'sword_great_1', 'sword_great_2', 'sword_great_3',
        'sword_mid_1', 'sword_mid_2', 'sword_mid_3', 'dagger_1', 'dagger_2',
        'public_armor_01', 'public_armor_02', 'public_armor_03', 'public_armor_04'
    ])
]

for pkg, objs in targets:
    for obj in objs:
        cmd = [umodel, f"-path={snd_dir}", "-export", "-sounds", f"-obj={obj}", pkg, f"-out={out_dir}"]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        status = "OK" if res.returncode == 0 else "FAIL"
        print(f"{pkg} -> {obj}: {status}")

# Flatten extracted wavs directly into out_dir
flatten_count = 0
for root, dirs, files in os.walk(out_dir):
    if root == out_dir:
        continue
    for f in files:
        if f.endswith('.wav'):
            src = os.path.join(root, f)
            dst = os.path.join(out_dir, f)
            shutil.copy2(src, dst)
            flatten_count += 1

print(f"Total WAV files flattened to root of l2_sounds: {flatten_count}")
