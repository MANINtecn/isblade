"""Guerreiro - efeitos das 7 skills novas no estilo refinado (.claude/skills/estilo-fx-refinado):
Optical Lens Flare (nucleo losango + feixe anamorfico), veus de energia translucidos (prisma estrelado, nada de cilindro liso),
selo angular calmo no chao, fissura reta, estilhacos em losango. Usa a base do guerreiro_fx (U, M, sprite, esc...)."""
import bpy, math, random
from mathutils import Vector
import guerreiro_fx as X
from guerreiro_fx import U, M, FPS, sprite, esc, anim, para_obj, plano_chao, bm_feixe, mat_tex, mat_feixe, bm_laje, bm_lamina_energia

# b = aco branco-quente, c = carmesim, o = brasa, g = ouro, s = sangue (carmesim profundo). Nucleo quente (nunca branco frio no vermelho: evita rosa)
CORES2 = {"b": (1.0, 0.93, 0.80), "c": (0.85, 0.06, 0.02), "o": (1.0, 0.42, 0.06), "g": (1.0, 0.74, 0.25), "s": (0.50, 0.0, 0.01)}
QUENTE = {"b": (1.0, 0.97, 0.90), "c": (1.0, 0.70, 0.40), "o": (1.0, 0.88, 0.62), "g": (1.0, 0.95, 0.78), "s": (1.0, 0.45, 0.18)}

def init2():
    for c, t in CORES2.items():
        M["fl_" + c] = mat_tex("G2_fl_" + c, "guerreiro2_flare.png", t, 5.0, QUENTE[c])
        M["fll_" + c] = mat_tex("G2_fll_" + c, "guerreiro2_flare_largo.png", t, 4.4, QUENTE[c])
        M["los_" + c] = mat_tex("G2_los_" + c, "guerreiro2_losango.png", t, 4.0, QUENTE[c])
        M["selo_" + c] = mat_tex("G2_selo_" + c, "guerreiro2_selo.png", t, 2.6, QUENTE[c])
        M["fis_" + c] = mat_tex("G2_fis_" + c, "guerreiro2_fissura.png", t, 3.6, QUENTE[c])
        M["halo_" + c] = mat_tex("G2_halo_" + c, "guerreiro2_halo.png", t, 1.6, QUENTE[c])
        M["vento_" + c] = mat_tex("G2_vento_" + c, "guerreiro2_vento.png", t, 3.0, QUENTE[c])
    M["veu_c"] = mat_feixe("G2_veu_c", (1.0, 0.55, 0.25), (0.75, 0.04, 0.02), 2.2, 2.0, 1.0, 0.9, 0.50, 0.7, "clerigo_veu_energia.png")
    M["veu_o"] = mat_feixe("G2_veu_o", (1.0, 0.80, 0.50), (1.0, 0.30, 0.04), 2.2, 2.0, 1.0, 1.0, 0.50, 0.7, "clerigo_veu_energia.png")
    M["veu_s"] = mat_feixe("G2_veu_s", (1.0, 0.40, 0.15), (0.45, 0.0, 0.01), 2.4, 2.0, 1.0, 0.8, 0.50, 0.7, "clerigo_veu_energia.png")
    M["veuL_c"] = mat_feixe("G2_veuL_c", (1.0, 0.45, 0.18), (0.70, 0.03, 0.01), 1.8, 3.0, 1.0, 1.1, 0.26, 0.9, "clerigo_veu_energia.png")
    M["veuL_s"] = mat_feixe("G2_veuL_s", (0.95, 0.30, 0.10), (0.40, 0.0, 0.01), 1.8, 3.0, 1.0, 1.1, 0.26, 0.9, "clerigo_veu_energia.png")
    for c, t in X.CORES.items():                                                           # ondas e brilho do chao mais leves (sem placa maciça)
        M["onda_" + c] = mat_tex("G2_onda_" + c, "clerigo_onda.png", t, 0.75)
        M["bh_" + c] = mat_tex("G2_bh_" + c, "clerigo_hex_brilho.png", t, 0.8)
    M["aura_c"] = mat_feixe("G2_aura_c", (1.0, 0.85, 0.6), (0.90, 0.10, 0.02), 3.0, 1.0, 1.0, 1.8, 0.85, 0.25, "guerreiro_veios.png")
    M["aura_s"] = mat_feixe("G2_aura_s", (1.0, 0.45, 0.2), (0.45, 0.0, 0.01), 3.0, 1.0, 1.0, 1.8, 0.85, 0.25, "guerreiro_veios.png")

def flare(col, nome, pos, f, tam, cor="b", dur=18, largo=True, ataque=2, pai=None):
    """Optical Lens Flare: estrela anamorfica + barra larga (2 sprites que olham para a camera, mesmo centro)"""
    s = sprite(col, nome, M["fl_" + cor], tam * U, tuple(pos))
    esc(s, [(f - 1, 0.0), (f, 0.45), (f + ataque, 1.0), (f + dur * 0.45, 0.45), (f + dur, 0.0)])
    h = sprite(col, nome + "_H", M["halo_" + cor], tam * U * 1.25, tuple(pos))                # camada de glow: larga, fraca, some depois
    esc(h, [(f - 1, 0.0), (f + 1, 0.7), (f + ataque + 2, 1.0), (f + dur * 0.7, 0.55), (f + dur * 1.4, 0.0)])
    if pai is not None: h.parent = pai
    l = None
    if largo:
        l = sprite(col, nome + "_L", M["fll_" + cor], tam * U * 3.0, tuple(pos), alto=tam * U * 0.38)
        esc(l, [(f - 1, 0.0), (f + 1, 1.0), (f + dur * 0.35, 0.6), (f + dur * 0.8, 0.0)])
    if pai is not None:
        for o in (s, l):
            if o: o.parent = pai
    return s, l

def flare_vivo(col, nome, pos, f0, f1, tam, cor="c", pulso=0.18, pai=None, entra=8, sai=8):
    """flare que fica aceso de f0 a f1 com um pulso suave (aura de buff, marca de alvo)"""
    s = sprite(col, nome, M["fl_" + cor], tam * U, tuple(pos))
    if pai is not None: s.parent = pai
    pts = [(f0 - 1, 0.0), (f0 + entra, 1.0)]
    f = f0 + entra
    while f < f1 - sai:
        f += 10; pts.append((f, 1.0 - pulso if (f // 10) % 2 else 1.0))
    pts += [(f1, 0.9), (f1 + sai, 0.0)]; esc(s, pts); return s

def veu(col, nome, pos, f, R, H, mat="veu_c", dur=40, sai=14, r2=0.85, pontas=8, cresce=6):
    """veu de energia: prisma estrelado translucido com filamentos que sobem (sem cilindro liso, sem tampa)"""
    o = para_obj(col, nome, bm_feixe(R * U, R * U * r2, H * U, pontas), M[mat]); o.location = tuple(pos)
    esc(o, [(f - 1, (1e-3,) * 3), (f, (1, 1, 0.02)), (f + cresce, (1, 1, 1)), (f + dur, (1, 1, 1)), (f + dur + sai, (1.15, 1.15, 1e-3)), (f + dur + sai + 1, (1e-3,) * 3)]); return o

def selo(col, nome, centro, f0, f1, R, cor="c", giro=18, z=0.35):
    """selo angular no chao: entra devagar, gira pouco (calmo), some no fim"""
    o = plano_chao(col, nome, R * 2 * U, M["selo_" + cor], z); o.location = (centro[0], centro[1], z)
    esc(o, [(f0 - 1, (1e-3,) * 3), (f0 + 10, (1, 1, 1)), (f1, (1, 1, 1)), (f1 + 12, (1e-3,) * 3)])
    anim(o, "rotation_euler", f0, f1 + 12, lambda t: (0, 0, math.radians(giro) * t), 6); return o

def faixa_chao(col, nome, centro, ang, comp, larg, mat, z=0.4):
    import bmesh
    bm = bmesh.new(); uvl = bm.loops.layers.uv.verify(); a, b = comp / 2, larg / 2
    fc = bm.faces.new([bm.verts.new(p) for p in ((-a, -b, 0), (a, -b, 0), (a, b, 0), (-a, b, 0))])
    for lp, uv in zip(fc.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]): lp[uvl].uv = uv
    o = para_obj(col, nome, bm, mat); o.location = (centro[0], centro[1], z); o.rotation_euler = (0, 0, ang); return o

def converge(col, nome, alvo, f0, f1, n, raio, cor="o", tam=0.13):
    """estilhacos de energia em espiral que se juntam num ponto que se move (alvo: {quadro: Vector})"""
    for i in range(n):
        a0 = random.uniform(0, 6.28); z0 = random.uniform(-0.4, 1.4) * U; r0 = raio * U * random.uniform(.7, 1.2)
        fs = f0 + int((f1 - f0) * random.uniform(0, .65)); fe = min(fs + random.randint(14, 24), f1)
        o = sprite(col, "%s%d" % (nome, i), M["los_" + cor], tam * U * random.uniform(.7, 1.1), (0, 0, 0))
        for ff in list(range(fs, fe, 2)) + [fe]:
            t = (ff - fs) / max(1, fe - fs); e = t * t; a = a0 + t * 2.4; tg = alvo[ff]
            o.location = tg + Vector((math.cos(a) * r0, math.sin(a) * r0, z0)) * (1 - e); o.keyframe_insert("location", frame=ff)
        esc(o, [(fs - 1, 0.0), (fs + 3, 1.0), (fe - 2, 0.7), (fe, 0.0)])

def absorve(col, nome, orig, dest, f, n, cor="s", tam=0.2, dur=(20, 30), espera=8):
    """estilhacos saem do inimigo (orig) e voam em curva ate o peito do guerreiro (dest: {quadro: Vector}); devolve os quadros de chegada"""
    chegadas = []; ult = max(dest)
    for i in range(n):
        fs = f + random.randint(0, espera); fe = fs + random.randint(*dur); lado = Vector((random.uniform(-1.5, 1.5), random.uniform(-0.5, 0.5), random.uniform(0.2, 1.5))) * U
        o = sprite(col, "%s%d" % (nome, i), M["los_" + cor], tam * U * random.uniform(.7, 1.15), tuple(orig))
        for ff in list(range(fs, fe, 2)) + [fe]:
            t = (ff - fs) / (fe - fs); e = t * t * (3 - 2 * t); D = dest[min(ff, ult)]; C = (orig + D) / 2 + lado
            o.location = orig * (1 - e) ** 2 + C * 2 * (1 - e) * e + D * e * e; o.keyframe_insert("location", frame=ff)
        esc(o, [(fs - 1, 0.0), (fs + 2, 1.0), (fe - 3, 0.85), (fe, 0.0)]); chegadas.append(fe)
    return chegadas

def estrelas_stun(col, nome, centro_fn, f, T, alt=2.55, raio=0.5):
    """4 flares pequenos girando sobre a cabeca (centro_fn(quadro) -> Vector do pe do alvo)"""
    for k in range(4):
        o = sprite(col, "%s%d" % (nome, k), M["fl_g"], 0.6 * U, (0, 0, 0))
        for ff in list(range(f, f + T, 3)) + [f + T]:
            t = (ff - f) / 48.0; a = k * math.pi / 2 + t * 6.0; c = centro_fn(ff)
            o.location = (c.x + math.cos(a) * raio * U, c.y + math.sin(a) * raio * U, c.z + alt * U + 0.06 * U * math.sin(t * 9)); o.keyframe_insert("location", frame=ff)
        esc(o, [(f - 1, 0.0), (f + 4, 1.0), (f + T - 4, 1.0), (f + T, 0.0)])

def aura_lamina(col, nome, espada, f0, f1, ponta_x, mat="aura_c", larg=0.26, ini=0.22):
    """aura de energia colada na lamina (presa a espada): veios que correm, cresce do cabo para a ponta"""
    L = ponta_x * (1.04 - ini); o = para_obj(col, nome, bm_lamina_energia(L, larg * U, 0.05 * U), M[mat]); o.parent = espada
    o.location = (ponta_x * ini, 0, 0); o.rotation_euler = (0, math.pi / 2, 0)
    esc(o, [(f0 - 1, (1e-3,) * 3), (f0, (1, 1, 0.02)), (f0 + 10, (1, 1, 1)), (f1, (1, 1, 1)), (f1 + 10, (1, 1, 1e-3)), (f1 + 11, (1e-3,) * 3)]); return o

def lajes_erguem(col, nome, pos, f, n, lado_ang, alt=(0.8, 1.4), dur=50):
    for k in range(n):
        a = lado_ang + random.uniform(-0.5, 0.5); q = (pos[0] + math.cos(a) * 0.45 * U, pos[1] + math.sin(a) * 0.45 * U, 0.4)
        o = para_obj(col, "%s%d" % (nome, k), bm_laje(0.42 * U, 0.18 * U, random.uniform(*alt) * U), M["pedra"]); o.location = q
        o.rotation_euler = (math.radians(random.uniform(14, 30)) * (1 if math.sin(a) > 0 else -1), math.radians(random.uniform(-14, 14)), a + math.pi / 2)
        esc(o, [(f - 1, (1e-3,) * 3), (f + 1, (1, 1, 0.25)), (f + 4, (1, 1, 1.1)), (f + 7, (1, 1, 1)), (f + dur, (1, 1, 1)), (f + dur + 12, (1, 1, 1e-3))])

def trilha_leve(col, nome, d, f0, f1, cauda=0.2, forca=2.2):
    """trilha fina: so a faixa da ponta (84% a 100% da lamina), luz que some rapido"""
    d2 = {f: (v[0], v[0] + (v[1] - v[0]) * 0.45) for f, v in d.items()}
    return X.trilha(col, nome, d2, f0, f1, min(cauda, 0.22), min(forca * 0.6, 2.4))

def balistico(z0, z1, T, g):
    """velocidade inicial para ir de z0 a z1 em T segundos sob gravidade g (mesma unidade)"""
    return (z1 - z0) / T + g * T / 2


# ------------------------------------------------------------------ glow de pos-processo (bloom + raios anamorficos), visivel no viewport
def glow(sc, forte=1.0):
    ng = bpy.data.node_groups.get("GW_GLOW_" + sc.name)                                    # um por cena: o no Render Layers aponta para a cena dele
    if ng is None:
        ng = bpy.data.node_groups.new("GW_GLOW_" + sc.name, "CompositorNodeTree"); N = ng.nodes; L = ng.links
        ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = N.new("CompositorNodeRLayers"); rl.scene = sc; out = N.new("NodeGroupOutput")
        b = N.new("CompositorNodeGlare"); b.name = "bloom"
        _menu(b, "Type", ("Bloom", "BLOOM", "Fog Glow", "FOG_GLOW")); _menu(b, "Quality", ("High", "HIGH"))
        b.inputs["Threshold"].default_value = 0.85; b.inputs["Strength"].default_value = 0.9 * forte; b.inputs["Size"].default_value = 0.7; b.inputs["Saturation"].default_value = 1.0
        st = N.new("CompositorNodeGlare"); st.name = "raios"
        _menu(st, "Type", ("Streaks", "STREAKS")); _menu(st, "Quality", ("High", "HIGH"))
        st.inputs["Threshold"].default_value = 1.6; st.inputs["Strength"].default_value = 0.35 * forte; st.inputs["Streaks"].default_value = 2; st.inputs["Streaks Angle"].default_value = 0.0; st.inputs["Fade"].default_value = 0.93
        L.new(rl.outputs["Image"], b.inputs["Image"]); L.new(b.outputs[0], st.inputs["Image"]); L.new(st.outputs[0], out.inputs[0])
    sc.compositing_node_group = ng
    return ng
def _menu(no, sock, opcoes):
    for o in opcoes:
        try: no.inputs[sock].default_value = o; return
        except Exception: pass
    print("menu sem opcao", sock, opcoes)

# ------------------------------------------------------------------ materiais de corpo (fantasma / contorno): brilho na silhueta (fresnel), alfa animado
def mat_corpo(nome, cor, forca=3.0, miolo=0.10):
    m = X.mat_base(nome); nt = m.node_tree; N = nt.nodes; L = nt.links
    lw = N.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    pw = N.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 2.6; L.new(lw.outputs["Facing"], pw.inputs[0])          # so a borda da silhueta
    ad = N.new("ShaderNodeMath"); ad.operation = "ADD"; ad.inputs[1].default_value = miolo; L.new(pw.outputs[0], ad.inputs[0])
    va = N.new("ShaderNodeValue"); va.name = "alfa"; va.outputs[0].default_value = 0.0
    mu = N.new("ShaderNodeMath"); mu.operation = "MULTIPLY"; L.new(ad.outputs[0], mu.inputs[0]); L.new(va.outputs[0], mu.inputs[1])
    rp = N.new("ShaderNodeValToRGB"); el = rp.color_ramp.elements; el[0].color = (*cor, 1); el[1].color = (1.0, 0.62, 0.22, 1); el[0].position = 0.45          # borda vai para brasa (nunca branco sobre vermelho = rosa)
    L.new(lw.outputs["Facing"], rp.inputs[0])
    em = N.new("ShaderNodeEmission"); em.inputs["Strength"].default_value = forca * X.GAIN; L.new(rp.outputs[0], em.inputs["Color"])
    X._fim(m, em, mu.outputs[0], N); return m
def alfa(m, pts):
    v = m.node_tree.nodes["alfa"]
    for f, a in pts: v.outputs[0].default_value = a; m.node_tree.keyframe_insert('nodes["alfa"].outputs[0].default_value', frame=f)
def _veste(o, mat):
    if not o.material_slots: o.data.materials.append(None)
    for sl in o.material_slots: sl.link = "OBJECT"; sl.material = mat

def _corpo(col, arm):
    """so as malhas do personagem (com modificador de armature apontando para ele): nada de selo, contorno ou efeito preso no corpo"""
    return [o for o in col.objects if o.parent == arm and o.type == "MESH" and not any(m.type == "DISPLACE" for m in o.modifiers)
            and any(m.type == "ARMATURE" and m.object == arm for m in o.modifiers)]

def fantasmas(col, nome, arm, esp, quadros, cor=(0.9, 0.08, 0.02), vida=16, a0=0.75, forca=3.2, so_espada=False):
    """imagens residuais: copia do guerreiro congelada na pose do quadro fk (NLA de 1 quadro), brilho de silhueta que some em 'vida' quadros"""
    act = arm.animation_data.action; slot = arm.animation_data.action_slot
    corpo = [] if so_espada else _corpo(col, arm)
    for i, fk in enumerate(quadros):
        g = arm.copy(); g.name = "%s%d_arm" % (nome, i); g.animation_data_clear(); col.objects.link(g)
        ad = g.animation_data_create(); tr = ad.nla_tracks.new(); st = tr.strips.new("pose", 1, act)
        try: st.action_slot = slot
        except Exception: pass
        st.action_frame_end = fk + 0.01; st.action_frame_start = fk; st.extrapolation = "HOLD"
        m = mat_corpo("%s%d_mat" % (nome, i), cor, forca); alfa(m, [(fk - 1, 0.0), (fk, a0), (int(fk + vida * 0.4), a0 * 0.5), (fk + vida, 0.0)])
        for c in corpo:
            c2 = c.copy(); c2.name = "%s%d_%s" % (nome, i, c.name); c2.parent = g; col.objects.link(c2)
            for mod in c2.modifiers:
                if mod.type == "ARMATURE": mod.object = g
            _veste(c2, m)
        e2 = esp.copy(); e2.name = "%s%d_espada" % (nome, i); col.objects.link(e2)
        for k in e2.constraints:
            if k.type == "COPY_TRANSFORMS": k.target = g
        _veste(e2, m)

def contorno(col, nome, arm, pts, cor=(0.9, 0.08, 0.02), forca=3.6, grossura=0.025):
    """casca de energia colada no corpo (mesma animacao, inflada pelas normais): brilho de contorno; pts = [(quadro, alfa)]"""
    corpo = [o for o in _corpo(col, arm) if not o.name.startswith(nome)]
    m = mat_corpo(nome + "_mat", cor, forca, 0.0); alfa(m, pts)
    for c in corpo:
        c2 = c.copy(); c2.name = "%s_%s" % (nome, c.name); col.objects.link(c2)
        dm = c2.modifiers.new("infla", "DISPLACE"); dm.mid_level = 0.0; dm.strength = grossura * U
        _veste(c2, m)
    return m

def tremor(sc, f, forca=0.12, dur=10, seed=0):
    """tremor de camera no impacto (todas as cameras da cena): deslocamento que decai"""
    rnd = random.Random(seed + f)
    for c in [o for o in sc.objects if o.type == "CAMERA"]:
        base = Vector(c.get("base", tuple(c.location))); c["base"] = tuple(base)
        c.location = base; c.keyframe_insert("location", frame=f - 1)
        for k in range(1, dur + 1):
            a = forca * U * (1 - k / dur) ** 1.5
            c.location = base + Vector((rnd.uniform(-a, a), rnd.uniform(-a, a) * 0.5, rnd.uniform(-a, a))); c.keyframe_insert("location", frame=f + k - 1)
        c.location = base; c.keyframe_insert("location", frame=f + dur)

def _fcs(act):
    out = []
    if hasattr(act, "layers"):
        for layer in act.layers:
            for strip in layer.strips:
                for bag in getattr(strip, "channelbags", []): out.extend(list(bag.fcurves))
    if not out and hasattr(act, "fcurves"): out = list(act.fcurves)
    return out
def hitstop(acao, f, n):
    """pausa de impacto: a pose do quadro f fica parada n quadros (tudo depois de f anda n quadros)"""
    for fc in _fcs(acao):
        val = fc.evaluate(f); kps = fc.keyframe_points
        for kp in kps:
            if kp.co[0] > f + 1e-3: kp.co[0] += n; kp.handle_left[0] += n; kp.handle_right[0] += n
        kps.insert(f, val, options={"FAST"}); kps.insert(f + n, val, options={"FAST"})
        for kp in kps: kp.interpolation = "LINEAR"
        fc.update()

def linhas_vento(col, nome, ini, fim, f, n, cor="b", alt=(0.3, 1.9), dur=10):
    """linhas de velocidade ao longo do caminho do dash (sprites que olham para a camera, esticadas)"""
    d = (fim - ini); L = d.length
    for i in range(n):
        t = random.uniform(0.1, 0.9); p = ini + d * t; p = Vector((p.x + random.uniform(-0.35, 0.35) * U, p.y, random.uniform(*alt) * U)); fs = f + int(t * 6) + random.randint(0, 3)
        s = sprite(col, "%s%d" % (nome, i), M["vento_" + cor], L * random.uniform(0.25, 0.5), tuple(p), alto=0.06 * U)
        for ff, q in ((fs - 1, p), (fs + dur, p + d.normalized() * 0.8 * U)): s.location = q; s.keyframe_insert("location", frame=ff)
        esc(s, [(fs - 1, 0.0), (fs, 1.0), (int(fs + dur * 0.5), 0.7), (fs + dur, 0.0)])

def trilha_glow(col, nome, d, f0, f1, cauda=0.2, forca=2.2):
    """trilha em 2 camadas: nucleo fino e forte (84-100% da lamina) + manga de glow larga e fraca que passa da ponta e demora mais a sumir"""
    trilha_leve(col, nome, d, f0, f1, cauda, forca)
    d2 = {f: (v[0], v[1]) for f, v in d.items()}                  # glow interno: forte na ponta, some suave para o cabo (sem borda dura)
    return X.trilha(col, nome + "_glow", d2, f0, f1, min(cauda * 1.8, 0.4), 0.4)


def sombras_espada(col, nome, arm, esp, f0, f1, passo=1, cor=(0.95, 0.12, 0.03), vida=12, a0=0.6):
    """sombra da arma: por onde a lamina passa fica uma copia dela brilhando na silhueta, que vai sumindo (igual aos ecos do dash, so a espada)"""
    fantasmas(col, nome, arm, esp, list(range(f0, f1 + 1, passo)), cor, vida, a0, 3.4, so_espada=True)

# ------------------------------------------------------------------ pedra com cara de pedra (no lugar dos cubos): icosfera deformada por ruido, facetada, material com variacao
def bm_pedra(r, alongar=(1.0, 1.0, 1.0), seed=None):
    import bmesh
    from mathutils import noise
    rnd = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r)
    off = Vector((rnd.uniform(0, 100), rnd.uniform(0, 100), rnd.uniform(0, 100)))
    corte = rnd.uniform(-0.35, -0.1) * r                                                   # base achatada (pedra assenta)
    for v in bm.verts:
        n = noise.noise(v.co / r * 1.3 + off) * 0.38 + noise.noise(v.co / r * 3.1 + off) * 0.12
        v.co = v.co * (1.0 + n)
        v.co = Vector((v.co.x * alongar[0], v.co.y * alongar[1], max(v.co.z, corte) * alongar[2]))
    for f in bm.faces: f.smooth = False
    return bm
def bm_laje(w, d, h):
    """laje de rocha que sobe do chao: pedra alongada (nada de caixa)"""
    d = max(d, w * 0.75); r = max(w, d, h) / 2; return bm_pedra(r, (w / (2 * r), d / (2 * r), h / (2 * r)))                 # bloco de rocha grosso, nao tabua
def bm_lasca_pedra(r):
    return bm_pedra(r, (random.uniform(.7, 1.2), random.uniform(.6, 1.1), random.uniform(.45, .8)))
def mat_rocha(nome, escura=(0.045, 0.040, 0.036), clara=(0.16, 0.13, 0.11), brasa=0.0):
    m = bpy.data.materials.new(nome); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; L = nt.links
    b = next(n for n in N if n.type == "BSDF_PRINCIPLED")
    tc = N.new("ShaderNodeTexCoord"); nz = N.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.35; nz.inputs["Detail"].default_value = 8.0
    rp = N.new("ShaderNodeValToRGB"); rp.color_ramp.elements[0].color = (*escura, 1); rp.color_ramp.elements[1].color = (*clara, 1); rp.color_ramp.elements[0].position = 0.35; rp.color_ramp.elements[1].position = 0.7
    bp = N.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.6
    L.new(tc.outputs["Object"], nz.inputs["Vector"]); L.new(nz.outputs["Fac"], rp.inputs[0]); L.new(rp.outputs[0], b.inputs["Base Color"]); L.new(nz.outputs["Fac"], bp.inputs["Height"]); L.new(bp.outputs[0], b.inputs["Normal"])
    b.inputs["Roughness"].default_value = 0.92
    if brasa > 0: b.inputs["Emission Color"].default_value = (1.0, 0.28, 0.04, 1); b.inputs["Emission Strength"].default_value = brasa
    return m
def troca_pedras():
    """liga as pedras novas nas funcoes de efeito (lascas, lajes) e nos materiais 'pedra'"""
    X.bm_lasca_pedra = bm_lasca_pedra; X.bm_laje = bm_laje
    globals()["bm_laje"] = bm_laje
    M["pedra"] = mat_rocha("G2_rocha", brasa=0.05); M["pedra2"] = mat_rocha("G2_rocha2", (0.07, 0.06, 0.05), (0.22, 0.18, 0.15), 0.0)

def vortice(col, nome, centro_fn, f0, f1, n=60, raio=(1.0, 1.9), omega=14.0, cor="b", tam=(0.5, 1.1), sobe=2.6):
    """vento do tornado: rajadas finas (linhas de velocidade) e estilhacos orbitando o corpo depressa e subindo em espiral; nada solido"""
    for i in range(n):
        fs = f0 + int((f1 - f0) * random.uniform(0, 0.92)); vida = random.randint(14, 26); fe = min(fs + vida, f1 + 10)
        r0 = random.uniform(*raio) * U; a0 = random.uniform(0, 6.28); z0 = random.uniform(0.1, 0.9) * U; w = math.radians(omega) * random.uniform(0.8, 1.2)
        mat = M["vento_" + cor] if i % 3 else M["los_o"]; t0 = random.uniform(*tam)
        s = sprite(col, "%s%d" % (nome, i), mat, t0 * U if i % 3 else 0.26 * U, (0, 0, 0), alto=0.11 * U if i % 3 else None)
        for ff in list(range(fs, fe, 2)) + [fe]:
            k = ff - fs; c = centro_fn(ff); a = a0 + w * k; r = r0 * (1 - 0.25 * k / vida)
            s.location = (c.x + math.cos(a) * r, c.y + math.sin(a) * r, z0 + sobe * U * k / vida); s.keyframe_insert("location", frame=ff)
        esc(s, [(fs - 1, 0.0), (fs + 3, 1.0), (fe - 5, 0.7), (fe, 0.0)])
