# Gera assets/mundo/solo_detalhe.png: textura de DETALHE do chao (repete sem emenda), usada por js/solo_detalhe.js.
# Nao tem cor: cada canal e um padrao em torno de 0.5 que MULTIPLICA a cor do terreno (a imagem do mapa continua dando a cor).
#   R = fino: folhas de grama (tracos curtos inclinados) + grao      (repete a cada ~6 m)  
#   G = medio: tufos, torroes e pedrinhas (manchas irregulares)     (repete a cada ~14 m, girado)
#   B = largo: variacao suave de tom, quebra a repeticao            (repete a cada ~70 m)
# Uso: python tools/solo_detalhe.py
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import os

N = 512
rng = np.random.default_rng(7)

def ruido(freq_min, freq_max, pot=1.0):
    """ruido periodico (repete sem emenda) por filtro de frequencia sobre ruido branco"""
    w = rng.standard_normal((N, N))
    F = np.fft.fft2(w)
    fy = np.fft.fftfreq(N)[:, None] * N; fx = np.fft.fftfreq(N)[None, :] * N
    r = np.sqrt(fx * fx + fy * fy) + 1e-6
    filt = ((r >= freq_min) & (r <= freq_max)) / r ** pot
    out = np.real(np.fft.ifft2(F * filt))
    out -= out.mean(); out /= (out.std() + 1e-9)
    return out

def norm(a, contraste):
    a = a - a.mean(); a = a / (np.abs(a).max() + 1e-9)
    return np.clip(.5 + a * contraste, 0, 1)

# --- R: folhas de grama (tracos), desenhados com volta (wrap) para emendar ---
img = Image.new('L', (N, N), 128)
d = ImageDraw.Draw(img)
for _ in range(16000):
    x, y = rng.uniform(0, N), rng.uniform(0, N)
    ang = rng.normal(-np.pi / 2, .45)                  # quase em pe, inclinadas
    L = rng.uniform(4, 13)
    x2, y2 = x + np.cos(ang) * L * .55, y + np.sin(ang) * L
    v = int(np.clip(rng.normal(128, 55), 20, 240))
    wid = 1 if rng.random() < .8 else 2
    for ox in (-N, 0, N):
        for oy in (-N, 0, N):
            d.line([(x + ox, y + oy), (x2 + ox, y2 + oy)], fill=v, width=wid)
blades = np.asarray(img.filter(ImageFilter.GaussianBlur(.6)), dtype=np.float64) / 255.0
grao = ruido(60, 256, .3)
R = norm((blades - .5) * 1.0 + grao * .025, .48)

# --- G: tufos e torroes (manchas medias irregulares, nada redondo: limiar de ruido) ---
g1 = ruido(4, 30, 1.0)
g2 = ruido(30, 120, .6)
tufo = np.tanh(g1 * .9) * .75 + g2 * .25
G = norm(tufo, .32)

# --- B: variacao larga e suave ---
B = norm(ruido(1, 6, 1.2), .45)

rgb = np.stack([R, G, B], -1)
out = os.path.join(os.path.dirname(__file__), '..', 'assets', 'mundo', 'solo_detalhe.png')
Image.fromarray((rgb * 255 + .5).astype(np.uint8)).save(out, optimize=True)
print('ok', os.path.abspath(out), os.path.getsize(out) // 1024, 'KB', [round(float(c.mean()), 3) for c in (R, G, B)])
