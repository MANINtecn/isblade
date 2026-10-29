import os
import re
import math
import json

md5_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\baium_export\LineageMonsters\MeshAnimation\Baium_anim"
out_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\baium\anims"
os.makedirs(out_dir, exist_ok=True)

def parse_md5anim(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    num_frames = int(re.search(r'numFrames\s+(\d+)', content).group(1))
    num_joints = int(re.search(r'numJoints\s+(\d+)', content).group(1))
    frame_rate = int(re.search(r'frameRate\s+(\d+)', content).group(1))

    # Parse hierarchy
    hier_match = re.search(r'hierarchy\s*\{([^}]+)\}', content, re.DOTALL)
    joint_names = []
    for line in hier_match.group(1).strip().splitlines():
        line = line.strip()
        if not line: continue
        m = re.match(r'"([^"]+)"\s+(-?\d+)\s+(\d+)\s+(\d+)', line)
        if m:
            joint_names.append(m.group(1))

    # Parse baseframe
    base_match = re.search(r'baseframe\s*\{([^}]+)\}', content, re.DOTALL)
    base_joints = []
    for line in base_match.group(1).strip().splitlines():
        line = line.strip()
        if not line: continue
        nums = [float(x) for x in re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', line)]
        if len(nums) >= 6:
            base_joints.append(nums[:6])

    # Parse frames
    frame_blocks = re.findall(r'frame\s+\d+\s*\{([^}]+)\}', content, re.DOTALL)
    frames_data = []
    for fb in frame_blocks:
        nums = [float(x) for x in re.findall(r'[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', fb)]
        frames_data.append(nums)

    duration = num_frames / frame_rate
    times = [round(i / frame_rate, 4) for i in range(num_frames)]

    tracks = []
    for j_idx, j_name in enumerate(joint_names):
        pos_values = []
        quat_values = []
        
        has_pos_anim = False
        first_p = None

        for f_idx in range(num_frames):
            fdata = frames_data[f_idx]
            off = j_idx * 6
            if off + 5 < len(fdata):
                px, py, pz, qx, qy, qz = fdata[off:off+6]
            else:
                px, py, pz, qx, qy, qz = base_joints[j_idx]

            t = 1.0 - (qx*qx + qy*qy + qz*qz)
            qw = math.sqrt(t) if t > 0 else 0.0

            # Conversao de coordenadas Unreal/MD5 (Z-up) para glTF/Three.js (Y-up)
            # x -> x, y -> z, z -> -y
            p = [round(px * 0.01, 4), round(pz * 0.01, 4), round(-py * 0.01, 4)]
            q = [round(qx, 4), round(qz, 4), round(-qy, 4), round(qw, 4)]

            if f_idx == 0:
                first_p = p
            else:
                if p != first_p: has_pos_anim = True

            pos_values.extend(p)
            quat_values.extend(q)

        # Pula o osso raiz Bip01 para preservar a orientacao e escala nativa do glTF
        if j_name == "Bip01":
            continue

        clean_name = j_name.replace(' ', '_')

        tracks.append({
            "name": f"{clean_name}.quaternion",
            "type": "quaternion",
            "times": times,
            "values": quat_values
        })

        if has_pos_anim:
            tracks.append({
                "name": f"{clean_name}.position",
                "type": "vector",
                "times": times,
                "values": pos_values
            })

    clip_json = {
        "name": os.path.splitext(os.path.basename(filepath))[0],
        "duration": round(duration, 4),
        "tracks": tracks
    }
    return clip_json

anim_files = ['Wait.md5anim', 'Walk.md5anim', 'run.md5anim', 'atk01.md5anim', 'spatk01.md5anim', 'spatk02.md5anim', 'spatk03.md5anim', 'spatk04.md5anim', 'death.md5anim', 'Social01.md5anim']

for af in anim_files:
    fpath = os.path.join(md5_dir, af)
    if os.path.exists(fpath):
        print(f"Exportando {af} nativo...")
        clip = parse_md5anim(fpath)
        out_file = os.path.join(out_dir, clip["name"] + ".json")
        with open(out_file, 'w', encoding='utf-8') as out:
            json.dump(clip, out, separators=(',', ':'))
        sz_kb = os.path.getsize(out_file) / 1024
        print(f"  -> Salvo: {clip['name']}.json ({sz_kb:.1f} KB)")

print(">>> Concluido!")
