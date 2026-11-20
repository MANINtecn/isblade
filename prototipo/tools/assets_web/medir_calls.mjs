// Conta objetos que viram chamadas de desenho num GLB: node tools/assets_web/medir_calls.mjs <arquivo.glb> ...
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder } from 'meshoptimizer'; import fs from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const d = await io.readBinary(new Uint8Array(fs.readFileSync(f))); const r = d.getRoot();
  let prims = 0, tris = 0, skinned = 0; const mats = new Set(), porMat = new Map();
  for (const n of r.listNodes()) { const m = n.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) { prims++; const mt = p.getMaterial(); mats.add(mt); porMat.set(mt, (porMat.get(mt) || 0) + 1); const ix = p.getIndices(); tris += ix ? ix.getCount() / 3 : 0; if (n.getSkin()) skinned++; } }
  const topo = [...porMat.values()].sort((a, b) => b - a).slice(0, 5);
  console.log(f.split('/').slice(-2).join('/'), '| nos:', r.listNodes().length, '| primitivas (=chamadas):', prims, '| materiais:', mats.size, '| tris:', Math.round(tris), '| skin:', skinned, '| mais repetidos:', topo.join(','));
}
