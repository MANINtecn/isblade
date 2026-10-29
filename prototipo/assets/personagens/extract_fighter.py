import subprocess
import os

umodel = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
l2_path = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x"
anim_path = os.path.join(l2_path, "animations")
out_dir = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\personagens\raw_fighter"

os.makedirs(out_dir, exist_ok=True)

# 1. Export Human Fighter Animations (.psa)
print(">>> Extraindo animacoes do Human Fighter (MFighter_anim)...")
cmd_anim = [umodel, f"-path={l2_path}", "-export", "-psk", "-obj=MFighter_anim", "Fighter.ukx", f"-out={out_dir}"]
res = subprocess.run(cmd_anim, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print("Animacoes:", "OK" if res.returncode == 0 else f"FAIL: {res.stderr}")

# 2. Export Human Fighter Base Meshes (m000) and Set S (m013 - Imperial Crusader)
objects_to_export = [
    # Base/Naked/Rosto/Cabelo
    "MFighter_m000_u",
    "MFighter_m000_l",
    "MFighter_m000_g",
    "MFighter_m000_b",
    "MFighter_m000_h",
    "MFighter_m000_f",
    # Set Imperial Crusader (m013)
    "MFighter_m013_u",
    "MFighter_m013_l",
    "MFighter_m013_g",
    "MFighter_m013_b",
]

print(">>> Extraindo malhas .psk e texturas .png do Human Fighter...")
for obj in objects_to_export:
    cmd_mesh = [umodel, f"-path={l2_path}", "-export", "-psk", "-png", f"-obj={obj}", "Fighter.ukx", f"-out={out_dir}"]
    res = subprocess.run(cmd_mesh, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    print(f"  * {obj}: {'OK' if res.returncode == 0 else 'FAIL'}")

# 3. Export uma espada classica (LineageWeapons.ukx)
print(">>> Extraindo espada classica do Lineage 2...")
# Vamos procurar uma espada icônica, ex: dragon_slayer ou sword_of_damascus ou dual_sword
cmd_wp = [umodel, f"-path={l2_path}", "-export", "-psk", "-png", "-obj=dragon_slayer_m00_wp", "LineageWeapons.ukx", f"-out={out_dir}"]
res = subprocess.run(cmd_wp, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
print("Dragon Slayer:", "OK" if res.returncode == 0 else f"STATUS {res.returncode}")

print(">>> Extração concluída!")
