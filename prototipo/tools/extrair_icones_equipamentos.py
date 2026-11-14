import os, subprocess, shutil, glob

CLIENTE = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\L2 IKARUS PVP 300x\Cliente Interlud 300x"
UMODEL = r"C:\TECX SOFTHOUSE\L2 IKARUS INTERCROW\ferramentas para l2\umodel_materials.exe"
RAIZ = r"C:\TECX SOFTHOUSE\IS ONLINE\prototipo"
OUT_ICONS = os.path.join(RAIZ, 'assets', 'icones')
TMP = os.path.join(RAIZ, 'tools', 'temp_all_icons')
os.makedirs(OUT_ICONS, exist_ok=True)
os.makedirs(TMP, exist_ok=True)

MAPPING = {
    # No-Grade
    'legs_plate': 'armor_plate_gaiters_i00',
    'gladius': 'weapon_gladius_i00',

    # D-Grade
    'bastard_sword': 'weapon_bastard_sword_i00',
    'claymore': 'weapon_claymore_i00',
    'composite_shield': 'shield_composite_shield_i00',
    'ghost_staff': 'weapon_ghost_staff_i00',
    'brigandine_helmet': 'armor_helmet_i00',
    'brigandine_tunic': 'armor_brigandine_i00',
    'brigandine_gaiters': 'armor_brigandine_gaiters_i00',
    'legs_plate_d': 'armor_brigandine_gaiters_i00',
    'brigandine_gauntlets': 'armor_brigandine_gauntlet_i00',
    'brigandine_boots': 'armor_plate_boots_i00',

    # C-Grade
    'berserker_blade': 'weapon_berserker_blade_i00',
    'samurai_longsword': 'weapon_samurai_longsword_i00',
    'full_plate_shield': 'shield_full_plate_shield_i00',
    'ghouls_staff': 'weapon_ghouls_staff_i00',
    'fullplate_helmet': 'armor_helmet_i00',
    'fullplate_armor': 'armor_t43_u_i00',
    'fullplate_gauntlets': 'armor_t43_g_i00',
    'fullplate_boots': 'armor_t43_b_i00',

    # B-Grade
    'great_sword': 'weapon_great_sword_i00',
    'valhalla': 'weapon_sword_of_valhalla_i00',
    'doom_shield': 'shield_doom_shield_i00',
    'doom_helmet': 'armor_helmet_i00',
    'doom_armor': 'armor_t1004_ul_i00',
    'doom_gauntlets': 'armor_t1004_g_i00',
    'doom_boots': 'armor_t1004_b_i00',

    # A-Grade
    'dragon_slayer': 'weapon_dragon_slayer_i00',
    'sword_of_miracles': 'weapon_sword_of_miracle_i00',
    'shield_imperial': 'shield_imperial_crusader_shield_i00',
    'tallum_helmet': 'armor_helmet_i00',
    'tallum_armor': 'armor_t1005_u_i00',
    'tallum_gauntlets': 'armor_t1005_g_i00',
    'tallum_boots': 'armor_t1005_b_i00',
}

# Unique texture names to extract
unique_tex = set(MAPPING.values())
print(f"Total icones unicos para extrair: {len(unique_tex)}")

for tex in sorted(unique_tex):
    cmd = [
        UMODEL,
        f"-path={CLIENTE}",
        "-export",
        "-png",
        f"-obj={tex}",
        f"-out={TMP}",
        "Icon.utx"
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# Agora copia para assets/icones com o id correto do item
copiados = 0
for item_id, tex_name in MAPPING.items():
    src_matches = glob.glob(os.path.join(TMP, '**', f"{tex_name}.png"), recursive=True)
    if src_matches:
        dst = os.path.join(OUT_ICONS, f"{item_id}.png")
        shutil.copyfile(src_matches[0], dst)
        copiados += 1
        print(f"[OK] {item_id}.png <- {tex_name}.png")
    else:
        print(f"[ERRO] Nao encontrou {tex_name}.png para {item_id}")

print(f"\nFinalizado! {copiados}/{len(MAPPING)} icones copiados com sucesso.")
