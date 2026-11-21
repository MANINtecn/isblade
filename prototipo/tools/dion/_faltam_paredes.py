import json, struct, numpy as np, sys
sys.path.insert(0,'.')
from geodata_l2j import le_tile
from PIL import Image
OX,OY,OZ=16169.0,146880.0,-1966.0
chao,topo,cam,nswe=le_tile(20,22)
# geodata: celulas fechadas (nenhuma direcao livre) = parede/objeto solido
solido=(nswe!=15)
print('celulas solidas geodata',int(solido.sum()),'de',solido.size)
import sys
b=open(sys.argv[1],'rb').read()
n=struct.unpack_from('<I',b,12)[0]; j=json.loads(b[20:20+n]); off=20+n+8; BIN=b[off:]
def acc(i):
    a=j['accessors'][i]; v=j['bufferViews'][a['bufferView']]; nn={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']]
    dt={5126:'<f4',5125:'<u4'}[a['componentType']]; return np.frombuffer(BIN,dt,a['count']*nn,v['byteOffset']+a.get('byteOffset',0)).reshape(-1,nn)
mask=np.zeros((2048,2048),bool)   # [cx, cy] celula fina 16 uu = 0.32 m
for pr in j['meshes'][0]['primitives']:
    P=acc(pr['attributes']['POSITION']); I=acc(pr['indices']).reshape(-1,3)
    T=P[I]; e1=T[:,1]-T[:,0]; e2=T[:,2]-T[:,0]; N=np.cross(e1,e2); L=np.linalg.norm(N,axis=1)+1e-9; ny=np.abs(N[:,1])/L
    sel=(ny<0.45)&(L>0.05)           # triangulos verticais (paredes)
    for k in np.nonzero(sel)[0]:
        t=T[k]
        for w in (0.2,0.5,0.8):
            pts=t[0]*(1-w)+t[1]*w*0.5+t[2]*w*0.5
            ux=pts[0]*50+OX; uy=pts[2]*50+OY
            cx=int(ux/16); cy=int((uy-4*32768)/16)
            if 0<=cx<2048 and 0<=cy<2048: mask[cx,cy]=True
from scipy import ndimage as ndi
m2=ndi.binary_dilation(mask,iterations=4); s2=ndi.binary_dilation(solido,iterations=4)
rec=(solido&m2).sum()/solido.sum(); prec=(mask&s2).sum()/max(1,mask.sum())
print('%s recall %.3f precisao %.3f F1 %.3f'%(sys.argv[1].split('/')[-1],rec,prec,2*rec*prec/(rec+prec)))
