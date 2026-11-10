"""Texturas dos efeitos do Guerreiro (geradas por codigo): brancas com alfa, a cor vem do material. Formas angulares (rachaduras retas, riscos afilados).
Saida: prototipo/assets/fx/guerreiro_*.png      Rodar:  python prototipo/tools/blender_fx/guerreiro_texturas.py"""
import math, os, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "assets", "fx")
rng = random.Random(11)

def salva(a, nome):
    a = np.clip(a, 0, 1); h, w = a.shape; img = np.zeros((h, w, 4), np.uint8); img[..., :3] = 255; img[..., 3] = (a * 255).astype(np.uint8)
    Image.fromarray(img).save(os.path.join(OUT, nome)); print(nome, w, h)
def blur(a, r): return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r)), np.float32) / 255.0

def fenda(n=1024):
    """rachaduras retas que saem do centro: segmentos com desvio angular, ramificacoes, brilho forte no miolo e mais fraco para fora"""
    im = Image.new("L", (n, n), 0); d = ImageDraw.Draw(im); c = n / 2
    def racha(x, y, ang, comp, larg, prof):
        pts = [(x, y)]; passos = max(3, int(comp / 38))
        for i in range(passos):
            ang += rng.uniform(-0.22, 0.22); x += math.cos(ang) * comp / passos * rng.uniform(0.8, 1.25); y += math.sin(ang) * comp / passos * rng.uniform(0.8, 1.25); pts.append((x, y))
            if prof > 0 and i > 0 and rng.random() < 0.28: racha(pts[-1][0], pts[-1][1], ang + rng.choice((-1, 1)) * rng.uniform(0.5, 0.9), comp * rng.uniform(0.25, 0.42), max(3, larg * 0.65), prof - 1)
        d.line(pts, fill=255, width=int(max(2, larg)), joint="curve")
    k = 9
    for i in range(k):
        racha(c, c, i * 2 * math.pi / k + rng.uniform(-0.15, 0.15), c * rng.uniform(0.62, 0.95), 17, 1)
    a = np.asarray(im, np.float32) / 255.0; y, x = np.mgrid[0:n, 0:n].astype(np.float32); r = np.maximum(np.abs(x - c), np.abs(y - c)) / c            # metrica quadrada: nao circular
    brilho = np.clip(1.15 - r * 0.9, 0.25, 1.0); salva(np.clip(a * brilho + blur(a, 5) * 0.9 + blur(a, 16) * 0.5, 0, 1.2) * np.clip(1.25 - r, 0, 1) ** 0.5, "guerreiro_fenda.png")

def arco(w=1024, h=256):
    """risco de corte: lamina de luz afilada nas duas pontas, miolo branco e bordas serrilhadas, faiscas ao longo (u: 0..1 ao longo do corte)"""
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]; y = np.linspace(-1, 1, h, dtype=np.float32)[:, None]
    larg = np.sin(np.pi * np.clip(x, 0, 1)) ** 0.7 * (0.30 + 0.35 * x)                         # mais grosso na frente, afina atras
    serra = 0.0 * x
    dist = np.abs(y - serra * 2) / np.maximum(larg, 1e-3)
    nucleo = np.clip(1 - dist, 0, 1) ** 1.8; halo = np.clip(1 - dist / 2.4, 0, 1) ** 2.4 * 0.55
    a = nucleo * 1.1 + halo
    for _ in range(26):                                                                          # riscos finos de faisca saindo do corte
        px = rng.uniform(0.1, 0.95); py = rng.uniform(-0.8, 0.8); L = rng.uniform(0.02, 0.09)
        a += 0.8 * np.exp(-((y - py) / 0.012) ** 2) * np.clip(1 - np.abs(x - px) / L, 0, 1) * (x > px - L)
    salva(a * np.clip(1.15 - np.abs(x - 0.5) * 1.1, 0, 1), "guerreiro_arco.png")

def veios(w=256, h=1024):
    """veios de energia correndo ao longo da lamina gigante (vertical, repete na vertical)"""
    x = np.linspace(0, 1, w, dtype=np.float32)[None, :]; y = np.linspace(0, 1, h, dtype=np.float32)[:, None]; a = np.zeros((h, w), np.float32)
    for _ in range(18):
        cx = rng.uniform(0.1, 0.9); amp = rng.uniform(0.3, 0.9); ph = rng.random(); fq = rng.choice((1, 2, 3)); wd = rng.uniform(0.006, 0.02)
        centro = cx + 0.05 * np.sin((y * fq + ph) * 2 * math.pi); a += amp * np.exp(-((x - centro) / wd) ** 2) * (0.5 + 0.5 * np.sin((y * 2 + ph) * math.pi) ** 2)
    a += 0.25 * np.exp(-((x - 0.5) / 0.35) ** 2); salva(np.clip(a / a.max() * 1.1, 0, 1), "guerreiro_veios.png")

def estilhaco(n=256):
    """lasca angular de pedra/aco para brilho de borda (triangulo com bordas claras)"""
    im = Image.new("L", (n, n), 0); d = ImageDraw.Draw(im); d.polygon([(n * 0.5, n * 0.06), (n * 0.92, n * 0.86), (n * 0.1, n * 0.9)], outline=255, width=7, fill=70)
    a = np.asarray(im, np.float32) / 255.0; salva(np.clip(a + blur(a, 5), 0, 1), "guerreiro_estilhaco.png")

for f in (fenda, arco, veios, estilhaco): f()
