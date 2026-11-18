import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs'; import path from 'node:path';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder});
const walk = d => fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):/\.glb$/.test(e.name)?[path.join(d,e.name)]:[]);
const grp = {};
for (const f of walk('../../assets_web')) {
  const k = f.split(path.sep).slice(3,5).join('/').replace('.glb','');
  const doc = await io.readBinary(new Uint8Array(fs.readFileSync(f)));
  const g = grp[k] ??= {arq:0,tex:0,px:0,bytes:0,prims:0,maxpx:0};
  g.arq++; g.bytes+=fs.statSync(f).size;
  for (const t of doc.getRoot().listTextures()) { const m = await sharp(t.getImage()).metadata(); const p=m.width*m.height; g.tex++; g.px+=p; g.maxpx=Math.max(g.maxpx,m.width); }
  for (const me of doc.getRoot().listMeshes()) g.prims += me.listPrimitives().length;
}
for (const [k,g] of Object.entries(grp)) console.log(k.padEnd(34), 'arq',String(g.arq).padStart(3),'MB',(g.bytes/1048576).toFixed(1).padStart(6),'tex',String(g.tex).padStart(4),'maior',String(g.maxpx).padStart(5),'VRAM(rgba+mip)',(g.px*4*1.33/1048576).toFixed(0).padStart(5),'MB  prims',g.prims);
