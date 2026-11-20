// Une GLBs numa cena so: node tools/assets_web/unir_glb.mjs saida.glb a.glb b.glb ...   (usado para o mapa de Dion: chao + cidade)
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder } from 'meshoptimizer'; import { mergeDocuments } from '@gltf-transform/functions'; import fs from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const [saida, primeiro, ...resto] = process.argv.slice(2);
const doc = await io.readBinary(new Uint8Array(fs.readFileSync(primeiro))); const cena = doc.getRoot().listScenes()[0];
for (const f of resto) {
  const d2 = await io.readBinary(new Uint8Array(fs.readFileSync(f))); const antes = new Set(doc.getRoot().listScenes()); mergeDocuments(doc, d2);
  for (const s of doc.getRoot().listScenes()) { if (antes.has(s)) continue; for (const n of s.listChildren()) { s.removeChild(n); cena.addChild(n); } s.dispose(); }
}
const bs = doc.getRoot().listBuffers(); for (const b of doc.getRoot().listAccessors()) b.setBuffer(bs[0]); for (const b of bs.slice(1)) b.dispose();      /* GLB so aceita 1 buffer */
fs.writeFileSync(saida, Buffer.from(await io.writeBinary(doc))); console.log('ok', saida, (fs.statSync(saida).size / 1048576).toFixed(1), 'MB');
