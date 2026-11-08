# Depois do exporta() do cidade_saidas.py (Blender): poe no cidade.html os colisores (muro, portoes e casas pela malha + os pequenos da praca)
# e os portais (PORTAIS_CIDADE), com uma barreira logo atras de cada portal: a cidade so tem saida pelos portais.
# Uso: python tools/blender_luz/aplica_colisores.py
import json, math, re, os
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
TI = os.path.join(R, "assets", "talking_island"); HTML = os.path.join(R, "cidade.html")
C = json.load(open(os.path.join(TI, "colisores_blender.json"))); P = json.load(open(os.path.join(TI, "portais_cidade.json")))
t = open(HTML, encoding="utf-8", newline="").read()
m = re.search(r"var VILLAGE_STATIC_OBST = (\[.*?\]);", t); velhos = json.loads(m.group(1))
praca = [c for c in velhos if c["r"] <= 2 and math.hypot(c["x"], c["z"]) < 30 and not c.get("portal")]
B = []
for p in P:
    nx, nz = math.cos(p["rotY"]), -math.sin(p["rotY"])
    if nx * p["x"] + nz * p["z"] < 0: nx, nz = -nx, -nz
    k = int(p["w"] / .9)
    for i in range(k + 1):
        s = -p["w"] / 2 + p["w"] * i / k
        B.append({"x": round(p["x"] + nx * 1.0 - nz * s, 2), "z": round(p["z"] + nz * 1.0 + nx * s, 2), "r": .8, "portal": 1})
todos = praca + C + B
t = t[:m.start(1)] + json.dumps(todos, separators=(",", ":")) + t[m.end(1):]
t = re.sub(r"var PORTAIS_CIDADE=(\[.*?\]|__PORTAIS__);", lambda _: "var PORTAIS_CIDADE=" + json.dumps(P, separators=(",", ":")) + ";", t, count=1)
open(HTML, "w", encoding="utf-8", newline="").write(t)
json.dump(todos, open(os.path.join(TI, "village_colliders.json"), "w"), separators=(",", ":"))
print("colisores", len(todos), "(praca", len(praca), "malha", len(C), "portais", len(B), ") portais", [p["id"] for p in P])
