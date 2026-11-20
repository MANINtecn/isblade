// Compara materiais/texturas de um GLB de origem e da entrega: node tools/assets_web/comparar_mat.mjs <origem.glb> <entrega.glb>
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder } from 'meshoptimizer'; import fs from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const f of process.argv.slice(2)) {
  const d = await io.readBinary(new Uint8Array(fs.readFileSync(f))); const r = d.getRoot(); console.log('==', f.split('/').slice(-2).join('/'));
  const mats = r.listMaterials(); const cont = {};
  for (const m of mats) { const k = [m.getAlphaMode(), m.getAlphaCutoff(), m.getDoubleSided() ? 'DS' : 'SS', m.getBaseColorTexture() ? m.getBaseColorTexture().getMimeType() : '-', m.getBaseColorTexture() ? m.getBaseColorTexture().getSize().join('x') : '-', m.getNormalTexture() ? 'N' : '', m.getEmissiveTexture() ? 'E' : '', m.getMetallicRoughnessTexture() ? 'MR' : ''].join(' '); cont[k] = (cont[k] || 0) + 1; }
  console.log(Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => v + 'x ' + k).join('\n'));
  const ts = r.listTextures(); const tipos = {}; ts.forEach(t => { tipos[t.getMimeType()] = (tipos[t.getMimeType()] || 0) + 1; }); console.log('texturas', ts.length, JSON.stringify(tipos));
}
