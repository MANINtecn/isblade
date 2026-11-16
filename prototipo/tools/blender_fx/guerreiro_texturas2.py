"""Texturas das 7 skills novas do Guerreiro (estilo refinado: luz pura, nucleo em losango, Optical Lens Flare anamorfico, sem formas redondas).
Brancas com alfa; a cor vem do material.  Saida: prototipo/assets/fx/guerreiro2_*.png
Rodar:  python prototipo/tools/blender_fx/guerreiro_texturas2.py"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "fx")
rng = random.Random(23)

def salva(a, nome):
    a = np.clip(a, 0, 1); h, w = a.shape; img = np.zeros((h, w, 4), np.uint8); img[..., :3] = 255; img[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(img, "RGBA").save(os.path.join(OUT, nome)); print(nome, w, h)
def blur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0
def grade(h, w):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32); return (x / (w - 1)) * 2 - 1, (y / (h - 1)) * 2 - 1
def borda(x, y, k=1.15):
    """apaga suave ate a borda (metrica quadrada: nao circular)"""
    return np.clip(k - np.maximum(np.abs(x), np.abs(y)), 0, 1) ** 0.8

def flare(n=512):
    """Optical Lens Flare: nucleo em losango + feixe anamorfico horizontal longo (queda exponencial) + vertical curto + diagonais tenues + 2 linhas-fantasma"""
    x, y = grade(n, n); ax, ay = np.abs(x), np.abs(y)
    nucleo = np.exp(-(ax + ay) * 11.0) * 1.3 + np.exp(-(ax + ay) * 4.0) * 0.35
    anam = np.exp(-ay * 140.0) * np.exp(-ax * 1.7) * 1.1                                  # feixe anamorfico (o traco largo da lente)
    anam2 = np.exp(-ay * 38.0) * np.exp(-ax * 3.6) * 0.35                                  # brilho em volta do feixe
    vert = np.exp(-ax * 110.0) * np.exp(-ay * 5.5) * 0.75
    dx, dy = (x + y) * 0.7071, (x - y) * 0.7071
    diag = (np.exp(-np.abs(dy) * 120.0) * np.exp(-np.abs(dx) * 10.0) + np.exp(-np.abs(dx) * 120.0) * np.exp(-np.abs(dy) * 10.0)) * 0.30
    fant = (np.exp(-np.abs(y - 0.06) * 260.0) + np.exp(-np.abs(y + 0.06) * 260.0)) * np.exp(-ax * 2.6) * 0.22
    salva((nucleo + anam + anam2 + vert + diag + fant) * borda(x, y, 1.08), "guerreiro2_flare.png")

def flare_largo(w=1024, h=128):
    """so o feixe anamorfico (4:1 na tela): barra de luz fina que se dissolve nas pontas"""
    x, y = grade(h, w); ax, ay = np.abs(x), np.abs(y)
    a = np.exp(-ay * 26.0) * np.exp(-ax * 2.2) + np.exp(-ay * 7.0) * np.exp(-ax * 3.5) * 0.25 + np.exp(-(ax * 6 + ay * 1.2) * 3.0) * 0.6
    salva(a * np.clip(1.05 - ax, 0, 1) ** 0.6 * np.clip(1.05 - ay, 0, 1), "guerreiro2_flare_largo.png")

def losango(n=256):
    """estilhaco de energia: losango alongado com miolo branco e queda suave (Sede de Sangue, faiscas)"""
    x, y = grade(n, n); d = np.abs(x) / 0.34 + np.abs(y) / 0.95
    a = np.clip(1 - d, 0, 1) ** 1.4 * 1.2 + np.exp(-d * 3.0) * 0.35 + np.exp(-(np.abs(x) * 9 + np.abs(y) * 2.2)) * 0.5
    salva(a * borda(x, y), "guerreiro2_losango.png")

def selo(n=1024):
    """selo angular do chao: dois losangos de linha fina, quadrado a 45 graus, 8 raios afilados e chevrons; nada de serra nem circulo"""
    im = Image.new("L", (n, n), 0); d = ImageDraw.Draw(im); c = n / 2
    def poli(R, k, rot, w):
        p = [(c + R * math.cos(rot + 2 * math.pi * i / k), c + R * math.sin(rot + 2 * math.pi * i / k)) for i in range(k)]; d.line(p + [p[0]], fill=255, width=w)
    poli(c * 0.96, 4, 0, 6); poli(c * 0.90, 4, 0, 2); poli(c * 0.66, 4, math.pi / 4, 4); poli(c * 0.40, 4, 0, 3)
    for i in range(8):                                                                       # raios afilados (triangulos longos e finos)
        a = i * math.pi / 4 + math.pi / 8; r0, r1 = c * 0.42, c * (0.92 if i % 2 else 0.74); s = 0.022
        d.polygon([(c + r0 * math.cos(a - s), c + r0 * math.sin(a - s)), (c + r1 * math.cos(a), c + r1 * math.sin(a)), (c + r0 * math.cos(a + s), c + r0 * math.sin(a + s))], fill=200)
    for i in range(4):                                                                       # chevrons nas pontas do losango externo
        a = i * math.pi / 2
        for k in range(3):
            r = c * (0.70 + 0.06 * k); s = 0.10 - 0.02 * k
            d.line([(c + r * math.cos(a - s), c + r * math.sin(a - s)), (c + (r + c * 0.05) * math.cos(a), c + (r + c * 0.05) * math.sin(a)), (c + r * math.cos(a + s), c + r * math.sin(a + s))], fill=255, width=4)
    a = np.asarray(im, np.float32) / 255.0; x, y = grade(n, n)
    salva(np.clip(a + blur(a, 4) * 0.8 + blur(a, 14) * 0.45, 0, 1.2) * borda(x, y, 1.1), "guerreiro2_selo.png")

def fissura(w=1024, h=256):
    """rachadura reta e comprida (u = ao longo da fenda), com ramos curtos, miolo incandescente; a cor vem do material"""
    im = Image.new("L", (w, h), 0); d = ImageDraw.Draw(im); c = h / 2
    pts = [(0, c)]; x = 0
    while x < w:
        x += rng.uniform(26, 60); pts.append((x, c + rng.uniform(-h * 0.10, h * 0.10)))
    d.line(pts, fill=255, width=11, joint="curve")
    for (px, py) in pts[2:-2]:
        if rng.random() < 0.6:
            ang = rng.choice((-1, 1)) * rng.uniform(0.5, 1.1); L = rng.uniform(25, 75); qx, qy = px + math.cos(ang) * L * rng.choice((-1, 1)), py + math.sin(ang) * L
            d.line([(px, py), (qx, qy)], fill=200, width=4)
    a = np.asarray(im, np.float32) / 255.0; x, y = grade(h, w)
    salva(np.clip(a + blur(a, 5) * 0.9 + blur(a, 18) * 0.55, 0, 1.2) * np.clip(1.0 - np.abs(y) * 0.9, 0, 1), "guerreiro2_fissura.png")

def halo(n=256):
    """brilho suave em losango (camada de glow embaixo do flare): sem borda, so queda exponencial"""
    x, y = grade(n, n); d = np.abs(x) + np.abs(y)
    salva((np.exp(-d * 2.6) * 0.9 + np.exp(-d * 7.0) * 0.5) * borda(x, y, 1.05), "guerreiro2_halo.png")

def vento(w=1024, h=128):
    """linha de velocidade: fio de luz afilado nas duas pontas, mais forte na frente"""
    x, y = grade(h, w); ax, ay = np.abs(x), np.abs(y)
    a = np.exp(-ay * 30.0) * np.clip(1 - ax, 0, 1) ** 1.5 * (0.55 + 0.45 * (x + 1) / 2)
    salva(a, "guerreiro2_vento.png")

for f in (flare, flare_largo, losango, selo, fissura, halo, vento): f()
