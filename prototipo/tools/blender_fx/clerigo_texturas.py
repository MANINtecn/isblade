"""Texturas dos efeitos do Clerigo (geradas por codigo, sem material do L2): tudo branco com alfa; a cor vem do material.
Formas angulares (brilho em losango/hexagono, nunca circular). Saida: prototipo/assets/fx/clerigo_*.png
Rodar:  python prototipo/tools/blender_fx/clerigo_texturas.py"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "fx")
os.makedirs(OUT, exist_ok=True)
rng = random.Random(7); np.random.seed(7)

def salva(arr, nome):
    a = np.clip(arr, 0, 1); h, w = a.shape[:2]
    img = np.zeros((h, w, 4), np.uint8); img[..., :3] = 255; img[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(os.path.join(OUT, nome)); print(nome, w, h)
def grade(n, w=None):
    w = w or n; y, x = np.mgrid[0:n, 0:w].astype(np.float32); return (x / (w - 1)) * 2 - 1, (y / (n - 1)) * 2 - 1
def hexdist(x, y):
    """distancia em hexagono (vertices em +-x): 1.0 na borda"""
    ax, ay = np.abs(x), np.abs(y); return np.maximum(ay / 0.8660254, ax + ay * 0.5773503)
def blur(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0
def desenha(n, fn, esp=6):
    im = Image.new("L", (n, n), 0); d = ImageDraw.Draw(im); fn(d, n / 2); return np.asarray(im, np.float32) / 255.0

# ---------------------------------------------------------------- 1. estrela de 4 pontas (brilho): nucleo em losango + 2 espinhos longos + 2 diagonais curtos
def estrela(n=256):
    x, y = grade(n); ax, ay = np.abs(x), np.abs(y)
    losango = np.exp(-(ax + ay) * 9.0)                                          # nucleo (metrica de losango, nao circular)
    h = np.exp(-ay * 55.0) * np.exp(-ax * 3.2); v = np.exp(-ax * 55.0) * np.exp(-ay * 3.2)
    dx, dy = (x + y) * 0.7071, (x - y) * 0.7071
    diag = (np.exp(-np.abs(dy) * 70.0) * np.exp(-np.abs(dx) * 7.0) + np.exp(-np.abs(dx) * 70.0) * np.exp(-np.abs(dy) * 7.0)) * 0.5
    a = losango * 1.1 + h + v + diag; a *= np.clip(1.2 - np.maximum(ax, ay), 0, 1); salva(a, "clerigo_estrela.png")
# ---------------------------------------------------------------- 2. cruz de cura com brilho
def cruz(n=256):
    def f(d, c):
        r = c * 0.52; e = c * 0.17; d.rectangle([c - e, c - r, c + e, c + r], fill=255); d.rectangle([c - r, c - e, c + r, c + e], fill=255)
    base = desenha(n, f); x, y = grade(n); nucleo = np.exp(-(np.abs(x) + np.abs(y)) * 3.0)
    a = np.clip(base * 0.95 + blur(base, n * 0.035) * 1.1 + blur(base, n * 0.09) * 0.8, 0, 1.4)
    salva(a * np.clip(1.15 - np.maximum(np.abs(x), np.abs(y)), 0, 1), "clerigo_cruz.png")
# ---------------------------------------------------------------- 3/4. glifos: hexagrama e octagrama com aneis, marcas e runas
def poligono(c, R, n, rot):
    return [(c + R * math.cos(rot + 2 * math.pi * i / n), c + R * math.sin(rot + 2 * math.pi * i / n)) for i in range(n)]
def glifo_hex(n=1024):
    def f(d, c):
        for R, w in ((0.97, 9), (0.90, 4), (0.64, 5)):
            p = poligono(c, c * R, 6, 0); d.line(p + [p[0]], fill=255, width=w)
        for rot in (0, math.pi):                                                 # hexagrama = dois triangulos (linha dupla)
            for R, w in ((0.90, 7), (0.85, 2)):
                p = poligono(c, c * R, 3, rot); d.line(p + [p[0]], fill=255, width=w)
        for k in range(6):                                                       # losango nos 6 vertices e raios curtos para dentro
            a = k * math.pi / 3; px, py = c + c * 0.97 * math.cos(a), c + c * 0.97 * math.sin(a); s = c * 0.045
            d.polygon([(px + s * math.cos(a), py + s * math.sin(a)), (px - s * math.sin(a), py + s * math.cos(a)), (px - s * math.cos(a), py - s * math.sin(a)), (px + s * math.sin(a), py - s * math.cos(a))], fill=255)
            for j in (-1, 1):                                                    # runas: tracinhos angulares entre os aneis
                b = a + j * math.pi / 14
                for t in range(3):
                    r0 = c * (0.905 + 0.018 * t); d.line([(c + r0 * math.cos(b), c + r0 * math.sin(b)), (c + (r0 + c * 0.04) * math.cos(b + j * 0.02), c + (r0 + c * 0.04) * math.sin(b + j * 0.02))], fill=255, width=3)
        for k in range(12):                                                      # triangulos pequenos no anel interno
            a = k * math.pi / 6 + math.pi / 12; r1, r2 = c * 0.64, c * 0.70; s = 0.05
            d.polygon([(c + r1 * math.cos(a - s), c + r1 * math.sin(a - s)), (c + r1 * math.cos(a + s), c + r1 * math.sin(a + s)), (c + r2 * math.cos(a), c + r2 * math.sin(a))], fill=255)
        p = poligono(c, c * 0.20, 6, math.pi / 6); d.line(p + [p[0]], fill=255, width=5)
        d.polygon(poligono(c, c * 0.06, 4, 0), fill=255)
    base = desenha(n, f); a = np.clip(base + blur(base, 6) * 1.2 + blur(base, 22) * 0.9, 0, 1.3)
    salva(a, "clerigo_glifo_hex.png")
def glifo_octa(n=1024):
    def f(d, c):
        for R, w in ((0.97, 9), (0.91, 4), (0.40, 5)):
            p = poligono(c, c * R, 8, math.pi / 8); d.line(p + [p[0]], fill=255, width=w)
        for rot in (0, math.pi / 4):                                             # dois quadrados = estrela de 8 pontas
            for R, w in ((0.90, 7), (0.85, 2)):
                p = poligono(c, c * R, 4, rot + math.pi / 4); d.line(p + [p[0]], fill=255, width=w)
        for k in range(8):                                                       # espinho de luz nas 8 pontas
            a = k * math.pi / 4 + math.pi / 8; r = c * 0.97; px, py = c + r * math.cos(a), c + r * math.sin(a); s = c * 0.05
            d.polygon([(px + s * 1.6 * math.cos(a), py + s * 1.6 * math.sin(a)), (px - s * math.sin(a), py + s * math.cos(a)), (px - s * math.cos(a), py - s * math.sin(a)), (px + s * math.sin(a), py - s * math.cos(a))], fill=255)
            for j in (-1, 1):
                b = a + j * math.pi / 12
                for t in range(3):
                    r0 = c * (0.915 + 0.016 * t); d.line([(c + r0 * math.cos(b), c + r0 * math.sin(b)), (c + (r0 + c * 0.04) * math.cos(b), c + (r0 + c * 0.04) * math.sin(b))], fill=255, width=3)
        for k in range(8):
            a = k * math.pi / 4; d.line([(c + c * 0.40 * math.cos(a), c + c * 0.40 * math.sin(a)), (c + c * 0.62 * math.cos(a), c + c * 0.62 * math.sin(a))], fill=255, width=4)
        d.polygon(poligono(c, c * 0.07, 4, 0), fill=255)
    base = desenha(n, f); a = np.clip(base + blur(base, 6) * 1.2 + blur(base, 22) * 0.9, 0, 1.3); salva(a, "clerigo_glifo_octa.png")
# ---------------------------------------------------------------- 5. raios verticais (veios de luz que sobem), repete na vertical
def raios(w=256, h=512):
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]; y = np.linspace(0, 1, h, dtype=np.float32)[:, None]; a = np.zeros((h, w), np.float32)
    for _ in range(46):
        cx = rng.random(); wd = rng.uniform(0.004, 0.02); amp = rng.uniform(0.35, 1.0); ph = rng.random(); fq = rng.choice((1, 2, 3)); tail = rng.uniform(0.3, 0.9)
        dxs = np.minimum(np.abs(x - cx), 1 - np.abs(x - cx)); core = np.exp(-(dxs / wd) ** 2)
        vert = 0.55 + 0.45 * np.sin((y * fq + ph) * 2 * math.pi) ** 2; a += amp * core * vert * (0.6 + 0.4 * np.sin((y * 2 + ph) * math.pi) ** 2 * tail)
    a = a / a.max() * 1.15; a = np.clip(a, 0, 1) ** 0.85; salva(a, "clerigo_raios.png")
# ---------------------------------------------------------------- 6. leque de raios (luz abrindo para cima), base estreita
def leque(n=512):
    x, y = grade(n); y = 1 - (y + 1) / 2; yy = np.clip(y, 0.001, 1); ang = np.arctan2(x, yy); a = np.zeros((n, n), np.float32)
    for k in range(-7, 8):
        c = k * 0.16 + rng.uniform(-.03, .03); w = rng.uniform(0.012, 0.03) * (1.0 - abs(k) * 0.05); a += rng.uniform(0.5, 1.0) * np.exp(-((ang - c) / w) ** 2) * (1 - abs(k) / 9)
    a *= np.clip(1 - y, 0, 1) ** 0.8 * np.clip(y * 8, 0, 1); a += 0.35 * np.exp(-(np.abs(x) * 5 + y * 3)); salva(np.clip(a, 0, 1.2), "clerigo_leque.png")
# ---------------------------------------------------------------- 7. brilho no chao em hexagono (centro claro, cai ate a borda hexagonal)
def hex_brilho(n=512):
    x, y = grade(n); d = hexdist(x, y); a = np.clip(1 - d, 0, 1) ** 1.6 * 1.1 + 0.25 * np.clip(1 - np.abs(d - 0.9) / 0.1, 0, 1); salva(np.clip(a, 0, 1), "clerigo_hex_brilho.png")
# ---------------------------------------------------------------- 8. favo (hexagonos) para as placas do escudo
def favo(n=512):
    im = Image.new("L", (n, n), 0); d = ImageDraw.Draw(im); R = n / 7.0; dx, dy = R * 1.5, R * 0.8660254 * 2
    for i in range(-1, 9):
        for j in range(-1, 9):
            cx = i * dx; cy = j * dy + (R * 0.8660254 if i % 2 else 0); p = poligono(0, R * 0.92, 6, 0); p = [(cx + a, cy + b) for a, b in p]; d.line(p + [p[0]], fill=255, width=3)
    a = np.asarray(im, np.float32) / 255.0; salva(np.clip(a + blur(a, 4) * 0.8, 0, 1), "clerigo_favo.png")
# ---------------------------------------------------------------- 9. brilho de borda para cacos/placas: gradiente em hexagono (cheio no meio)
def cristal(n=256):
    x, y = grade(n); a = np.clip(1 - (np.abs(x) * 0.8660254 + np.abs(y) * 0.5) / 0.95, 0, 1) ** 0.6; salva(a, "clerigo_facetas.png")

def onda(n=512):
    x, y = grade(n); d = hexdist(x, y); borda = np.clip(1 - np.abs(d - 0.93) / 0.045, 0, 1) ** 1.2; cauda = np.clip((d - 0.55) / 0.38, 0, 1) ** 2.2 * (d < 0.95) * 0.55
    salva(np.clip(borda * 1.2 + cauda, 0, 1.2), "clerigo_onda.png")
for f in (estrela, cruz, glifo_hex, glifo_octa, raios, leque, hex_brilho, favo, cristal, onda): f()
