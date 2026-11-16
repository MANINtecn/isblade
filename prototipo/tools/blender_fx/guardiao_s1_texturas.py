"""Texturas da skill 1 do Guardiao (Feixe do Escudo): branco com alfa, a cor vem do material.
Formas angulares (nucleo em losango, feixes anamorficos), nada circular. Saida: prototipo/assets/fx/guardiao_s1_*.png
Rodar:  python prototipo/tools/blender_fx/guardiao_s1_texturas.py"""
import math, os, random
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "fx")
os.makedirs(OUT, exist_ok=True)
rng = random.Random(11); np.random.seed(11)

def salva(arr, nome):
    a = np.clip(arr, 0, 1); h, w = a.shape[:2]
    a = np.clip(a + (np.random.rand(h, w) - np.random.rand(h, w)) / 255.0 * (a > 0.002), 0, 1)   # dither: sem degraus (banding) com bloom forte
    img = np.zeros((h, w, 4), np.uint8); img[..., :3] = 255; img[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(os.path.join(OUT, nome)); print(nome, w, h)
def grade(h, w):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32); return (x / (w - 1)) * 2 - 1, (y / (h - 1)) * 2 - 1
def blur(a, r):
    m = max(a.max(), 1e-6)
    return np.asarray(Image.fromarray((np.clip(a / m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0 * m

# 1. Optical Lens Flare anamorfico: nucleo losango + feixe horizontal longo + vertical curto + 2 diagonais finas
def flare(n=512):
    x, y = grade(n, n); ax, ay = np.abs(x), np.abs(y)
    nucleo = np.exp(-(ax + ay) * 11.0) * 1.3 + np.exp(-(ax + ay) * 4.0) * 0.35
    hor = np.exp(-ay * 90.0) * np.exp(-ax * 1.6)                     # anamorfico: longo e fino
    hor2 = np.exp(-ay * 22.0) * np.exp(-ax * 4.5) * 0.35             # halo do feixe
    ver = np.exp(-ax * 80.0) * np.exp(-ay * 4.2) * 0.8
    dx, dy = (x + y) * 0.7071, (x - y) * 0.7071
    diag = (np.exp(-np.abs(dy) * 110.0) * np.exp(-np.abs(dx) * 8.0) + np.exp(-np.abs(dx) * 110.0) * np.exp(-np.abs(dy) * 8.0)) * 0.35
    a = nucleo + hor + hor2 + ver + diag
    a *= np.clip(1.08 - np.maximum(ax, ay), 0, 1) ** 0.6           # zera na borda do quadro
    salva(a, "guardiao_s1_flare.png")

# 2. Corpo do feixe (U = comprimento, V = largura): filamentos de luz correndo, centro quente, bordas que dissolvem
def feixe(w=1024, h=256):
    u = np.linspace(0, 1, w, dtype=np.float32)[None, :]; v = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    a = np.zeros((h, w), np.float32)
    for _ in range(38):
        c = rng.uniform(-0.75, 0.75); wd = rng.uniform(0.012, 0.05); amp = rng.uniform(0.25, 0.8)
        fq = rng.choice((1, 2, 3, 4)); ph = rng.random(); ond = rng.uniform(0.01, 0.06)
        cc = c + ond * np.sin((u * fq + ph) * 2 * math.pi)                 # filamento ondulando de leve (repete em U)
        brilho = 0.55 + 0.45 * np.sin((u * fq * 2 + ph) * 2 * math.pi) ** 2
        a += amp * np.exp(-((v - cc) / wd) ** 2) * brilho
    a = a / a.max()
    miolo = np.exp(-(np.abs(v) / 0.045) ** 1.4) * 1.0                    # linha central branca, fina
    corpo = np.exp(-(np.abs(v) / 0.35) ** 2) * 0.35
    a = ((a * 0.7 + corpo) * np.clip(1 - np.abs(v), 0, 1) ** 2.2 + miolo) * 0.9
    salva(np.clip(a, 0, 1), "guardiao_s1_feixe.png")

# 3. Lasca de luz (faisca angular alongada em losango)
def lasca(w=128, h=512):
    x, y = grade(h, w); ax, ay = np.abs(x), np.abs(y)
    a = np.clip(1 - (ax / np.maximum(1 - ay, 1e-3)), 0, 1) ** 1.5 * np.clip(1 - ay, 0, 1) ** 0.6
    a = a + np.exp(-(ax * 6 + ay * 2.2)) * 0.6
    salva(np.clip(a, 0, 1), "guardiao_s1_lasca.png")

# 4. Onda de pressao frontal em losango (chao e boca do feixe): moldura em losango com borda brilhante e centro vazio
def losango_onda(n=512):
    x, y = grade(n, n); d = np.abs(x) + np.abs(y) * 1.0
    a = np.exp(-((d - 0.8) / 0.09) ** 2) * 0.8 + np.exp(-((d - 0.75) / 0.25) ** 2) * 0.3
    a *= np.clip(1 - d, 0, 1) ** 0.05 * (d < 1)
    salva(np.clip(a, 0, 1), "guardiao_s1_onda.png")

if __name__ == "__main__":
    flare(); feixe(); lasca(); losango_onda()
