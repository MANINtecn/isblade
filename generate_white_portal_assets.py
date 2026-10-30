from PIL import Image, ImageEnhance
import os

fx_dir = r"c:\TECX SOFTHOUSE\IS ONLINE\prototipo\assets\fx"

def convert_to_white_celestial(in_filename, out_filename, boost_contrast=1.2, boost_brightness=1.15):
    in_path = os.path.join(fx_dir, in_filename)
    out_path = os.path.join(fx_dir, out_filename)
    
    img = Image.open(in_path).convert("RGBA")
    r, g, b, a = img.split()
    
    # Obter escala de brilho/luminancia a partir dos canais rgb
    # Max(r, g, b) ou ponderado
    gray = Image.eval(r, lambda p: 0) # dummy
    pixels_r = list(r.getdata())
    pixels_g = list(g.getdata())
    pixels_b = list(b.getdata())
    
    new_r = []
    new_g = []
    new_b = []
    
    for i in range(len(pixels_r)):
        # Tomar o canal com maior intensidade (como era ciano/azul, g e b sao altos)
        lum = max(pixels_r[i], pixels_g[i], pixels_b[i])
        # Criar tom branco puro / celestial com sutil reflexo perolado prata
        new_r.append(int(min(255, lum * 0.98)))
        new_g.append(int(min(255, lum * 0.99)))
        new_b.append(int(min(255, lum * 1.0)))
        
    img_r = Image.new("L", img.size)
    img_r.putdata(new_r)
    img_g = Image.new("L", img.size)
    img_g.putdata(new_g)
    img_b = Image.new("L", img.size)
    img_b.putdata(new_b)
    
    white_img = Image.merge("RGBA", (img_r, img_g, img_b, a))
    
    # Ajustar contraste e brilho para o brilho celestial radiante
    if boost_contrast != 1.0:
        enh_c = ImageEnhance.Contrast(white_img)
        white_img = enh_c.enhance(boost_contrast)
        
    if boost_brightness != 1.0:
        enh_b = ImageEnhance.Brightness(white_img)
        white_img = enh_b.enhance(boost_brightness)
        
    white_img.save(out_path, "PNG")
    print(f"Salvo: {out_filename}")

convert_to_white_celestial("portal_vortex_blue.png", "portal_vortex_white.png", 1.25, 1.2)
convert_to_white_celestial("portal_event_horizon.png", "portal_event_horizon_white.png", 1.2, 1.15)
convert_to_white_celestial("portal_floor_seal.png", "portal_floor_seal_white.png", 1.15, 1.2)
convert_to_white_celestial("portal_monolith_rune.png", "portal_monolith_rune_white.png", 1.3, 1.25)
convert_to_white_celestial("portal_mist_blue.png", "portal_mist_white.png", 1.1, 1.1)

