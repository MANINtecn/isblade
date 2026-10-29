"""Gera os icones do PWA (icons/*.png): escudo IS (aco, borda dourada, brilho azul) sobre fundo escuro. Rodar de prototipo/: python tools/gerar_icones.py
O nome do jogo ainda nao e definitivo; o icone so mostra 'IS'. Para trocar, mude TEXTO e rode de novo."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math
TEXTO = 'IS'
def bezier(p0, p1, p2, p3, n=24):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t**3*p3[0], u**3*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t**3*p3[1]))
    return out
def escudo(cx, cy, w, h):
    """silhueta classica: topo reto, laterais retas, ponta embaixo (mesmo desenho da saida da skill)"""
    L, R, T, B = cx - w/2, cx + w/2, cy - h/2, cy + h/2; k = w * .06
    pts = [(L + k, T), (R - k, T), (R, T + k), (R, cy + h*.08)]
    pts += bezier((R, cy + h*.08), (R, cy + h*.30), (cx + w*.22, B - h*.14), (cx, B))[1:]
    pts += bezier((cx, B), (cx - w*.22, B - h*.14), (L, cy + h*.30), (L, cy + h*.08))[1:]
    pts += [(L, T + k)]
    return pts
def icone(S, seguro=1.0, fundo=True):
    """S = lado; seguro < 1 deixa margem (icone 'maskable' precisa do desenho dentro de 80% do centro)"""
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if fundo:
        for y in range(S):                                           # fundo: degrade azul-noite
            c = int(14 + 22 * (1 - y / S)); d.line([(0, y), (S, y)], fill=(c // 2 + 4, c // 2 + 8, c + 14, 255))
    w, h = S * .56 * seguro, S * .70 * seguro; cx, cy = S / 2, S / 2 + S * .005
    glow = Image.new('RGBA', (S, S), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
    gd.polygon(escudo(cx, cy, w * 1.1, h * 1.08), fill=(63, 140, 255, 150)); glow = glow.filter(ImageFilter.GaussianBlur(S * .045)); im.alpha_composite(glow)
    d = ImageDraw.Draw(im)
    d.polygon(escudo(cx, cy, w, h), fill=(245, 194, 74, 255))        # borda dourada
    d.polygon(escudo(cx, cy, w * .90, h * .91), fill=(48, 56, 74, 255))   # aco escuro
    d.polygon(escudo(cx, cy - h * .012, w * .78, h * .78), fill=(125, 134, 150, 255))   # painel claro
    d.polygon(escudo(cx, cy - h * .02, w * .66, h * .66), fill=(40, 70, 130, 255))      # miolo azul
    r = w * .30; d.ellipse([cx - r, cy - h * .09 - r, cx + r, cy - h * .09 + r], outline=(245, 194, 74, 255), width=max(2, int(S * .012)))
    try: f = ImageFont.truetype('C:/Windows/Fonts/ariblk.ttf', int(S * .20 * seguro))
    except Exception: f = ImageFont.load_default()
    bb = d.textbbox((0, 0), TEXTO, font=f); tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text((cx - tw / 2 - bb[0], cy - h * .09 - th / 2 - bb[1]), TEXTO, font=f, fill=(244, 251, 255, 255))
    return im
for nome, S, seg in (('icon-512', 512, 1.0), ('icon-192', 192, 1.0), ('icon-180', 180, 1.0), ('icon-maskable-512', 512, .80)):
    icone(S, seg).convert('RGBA').save('icons/' + nome + '.png'); print('icons/' + nome + '.png')
