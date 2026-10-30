"""Gera o mapa de chao andavel (varios andares) a partir de um .blend montado.
Rodar:  blender -b <montagem.blend> --python gerar_walkgrid.py -- <saida_prefixo> [celula=0.5] [raio=90]
Para cada celula (x,z do jogo) guarda as CAMADAS de chao: altura do topo de cada superficie voltada para cima
(normal.z > 0.35) e o espaco livre acima dela (ate 12 unidades). Paredes/cercas aparecem como espaco livre baixo.
Saida: <prefixo>.bin (uint32 offsets + camadas) e <prefixo>.json (cabecalho). Unidades = unidades do jogo (35.714 uu do L2).
Coordenadas: Blender (x, y, z) = jogo (x, -z, y) apos o export glTF Y-up; aqui gravamos no sistema do glTF/three: (x, altura, z)."""
import bpy, sys, json, struct, math, mathutils, time

a = sys.argv[sys.argv.index('--') + 1:]
OUT = a[0]; CEL = float(a[1]) if len(a) > 1 else 0.5; RAIO = float(a[2]) if len(a) > 2 else 90.0
CX = float(a[3]) if len(a) > 3 else 0.0; CY = float(a[4]) if len(a) > 4 else 0.0     # centro da grade em coordenadas do Blender (x, y)

def _sair_do_modo_edicao():
    """O .blend pode ter sido salvo com uma peca em modo de edicao (Tab): as ferramentas nao conseguem ler/gravar a malha assim."""
    import bpy
    for ob in list(bpy.data.objects):
        if ob.mode == 'EDIT':
            bpy.context.view_layer.objects.active = ob
            bpy.ops.object.mode_set(mode='OBJECT')
            print('saiu do modo de edicao:', ob.name)
_sair_do_modo_edicao()
EXCLUIR = ('Terreno',)           # terreno aproximado nao entra (so os andares)
for o in list(bpy.data.objects):
    if o.name.startswith(EXCLUIR): o.hide_viewport = True; o.hide_render = True
import os
_rj = os.path.join(os.path.dirname(OUT), 'mini_toi_regioes.json')          # folhas da porta de entrada: a colisao delas e dinamica (o jogo bloqueia enquanto fechada)
if os.path.exists(_rj):
    for _n in json.load(open(_rj, encoding='utf-8')).get('porta_entrada', {}).get('objetos', []):
        _o = bpy.data.objects.get(_n)
        if _o: _o.hide_viewport = True; _o.hide_render = True; print('colisao ignora a folha da porta:', _n)
dg = bpy.context.evaluated_depsgraph_get(); sc = bpy.context.scene

# limites verticais da cena
mn_z, mx_z = 1e9, -1e9
for o in bpy.data.objects:
    if o.type == 'MESH' and not o.hide_viewport:
        for c in o.bound_box:
            z = (o.matrix_world @ mathutils.Vector(c)).z; mn_z = min(mn_z, z); mx_z = max(mx_z, z)
TOPO = mx_z + 5.0; PASSO = 0.02; LIVRE_MAX = 12.0; PASSO_JOGO = 0.9      # PASSO_JOGO: altura de degrau que o jogador sobe (igual a torre_teste.html)
n = int(2 * RAIO / CEL)
print('grade %dx%d celulas, z %.1f..%.1f' % (n, n, mn_z, mx_z))
t0 = time.time(); camadas = []; total = 0
SUB = CEL * 0.26                          # 5 amostras por celula (centro + 4 cantos): passarelas finas e diagonais nao somem
AMOSTRAS = [(0, 0), (SUB, SUB), (-SUB, SUB), (SUB, -SUB), (-SUB, -SUB)]
def camadas_ponto(bx, by):
    cel = []; z = TOPO
    while z > mn_z - 1:
        ok, loc, nor, idx, ob, mat = sc.ray_cast(dg, mathutils.Vector((bx, by, z)), mathutils.Vector((0, 0, -1)), distance=z - mn_z + 2)
        if not ok: break
        if nor.z > 0.35:                    # superficie voltada para cima = chao
            ok2, l2, n2, i2, o2, m2 = sc.ray_cast(dg, mathutils.Vector((bx, by, loc.z + 0.05)), mathutils.Vector((0, 0, 1)), distance=LIVRE_MAX)
            livre = (l2.z - loc.z) if ok2 else LIVRE_MAX
            if ok2 and n2.z > 0.1: livre = 0.0      # raio para cima bateu no verso de uma face: estamos DENTRO de um solido
            if not cel or abs(cel[-1][0] - loc.z) > 0.15:
                # paredes/cercas finas: raios HORIZONTAIS (+x e +y) ate a celula vizinha, acima da altura de um degrau
                mask = 0
                for bit, d in ((1, mathutils.Vector((1, 0, 0))), (2, mathutils.Vector((0, 1, 0)))):
                    for dz in (PASSO_JOGO + 0.15, 1.8):
                        if sc.ray_cast(dg, mathutils.Vector((bx, by, loc.z + dz)), d, distance=CEL)[0]: mask |= bit; break
                cel.append((loc.z, livre, mask))
        z = loc.z - PASSO
    return cel
for iz in range(n):                 # iz -> coordenada Blender y (jogo -z)
    for ix in range(n):
        bx = CX - RAIO + (ix + .5) * CEL; by = CY - RAIO + (iz + .5) * CEL
        grupos = []                                         # funde as camadas das 5 amostras (mesma altura +-0.15): folga = minima, aresta = uniao
        for ox, oy in AMOSTRAS:
            for h, l, m in camadas_ponto(bx + ox, by + oy):
                for g in grupos:
                    if abs(g[0] - h) < 0.15: g[1] = min(g[1], l); g[2] |= m; g[0] = max(g[0], h); break
                else: grupos.append([h, l, m])
        grupos.sort(key=lambda g: -g[0]); cel = [tuple(g) for g in grupos]
        camadas.append(cel); total += len(cel)
    if iz % 40 == 0: print('linha', iz, '/', n, 'camadas', total, '%.0fs' % (time.time() - t0), flush=True)
# gravacao: offsets uint32 [n*n+1], depois por camada (altura int16 em 1/50 un, livre uint8 em 1/10 un, mascara uint8)
offs = [0]
for c in camadas: offs.append(offs[-1] + len(c))
with open(OUT + '.bin', 'wb') as f:
    f.write(struct.pack('<%dI' % len(offs), *offs))
    for c in camadas:
        for h, l, m in c: f.write(struct.pack('<hBB', int(round(h * 50)), min(255, int(round(l * 10))), m))
json.dump(dict(versao=int(time.time()), celula=CEL, raio=RAIO, n=n, camadas=total, altura_escala=50, livre_escala=10, bytes_por_camada=4,
               x0=CX - RAIO, y0=CY - RAIO, nota='indice = iz*n+ix; x_blender = x0+(ix+.5)*celula; y_blender = y0+(iz+.5)*celula; no three/glTF: X=x_blender, Y=altura, Z=-y_blender'), open(OUT + '.json', 'w'), indent=1)
print('PRONTO', total, 'camadas em %.0fs' % (time.time() - t0))
