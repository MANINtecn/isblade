/* Divide cada primitiva de um GLB de mapa em celulas quadradas no plano XZ (o motor so desenha o que esta no campo de visao, entao o celular
   deixa de desenhar a cidade inteira de uma vez). Mantem material, normais e UV; so reparte os triangulos pelo centro deles.
   Uso (na pasta prototipo):  node tools/assets_web/dividir_glb.mjs assets/maps/dion/dion.glb [celula_em_metros=110]
   Roda em cima do GLB de origem (depois: node tools/assets_web/otimizar.mjs <glb>). Sobrescreve o arquivo. */
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune } from '@gltf-transform/functions';

const [arq, cel = '110'] = process.argv.slice(2), C = +cel;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(arq), raiz = doc.getRoot();
const buf = raiz.listBuffers()[0];
let antes = 0, depois = 0;
for (const mesh of raiz.listMeshes()) {
  const novas = [];
  for (const prim of mesh.listPrimitives()) {
    antes++;
    const nomes = prim.listSemantics(), attrs = nomes.map(n => prim.getAttribute(n));
    const pos = prim.getAttribute('POSITION').getArray(), idx = prim.getIndices().getArray();
    const celulas = new Map();
    for (let t = 0; t < idx.length; t += 3) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2];
      const cx = (pos[a * 3] + pos[b * 3] + pos[c * 3]) / 3, cz = (pos[a * 3 + 2] + pos[b * 3 + 2] + pos[c * 3 + 2]) / 3;
      const k = Math.floor(cx / C) + ',' + Math.floor(cz / C);
      let l = celulas.get(k); if (!l) celulas.set(k, l = []); l.push(a, b, c);
    }
    for (const [, tris] of celulas) {
      const mapa = new Map(), ordem = [];
      const novo = new Uint32Array(tris.length);
      for (let i = 0; i < tris.length; i++) { let v = mapa.get(tris[i]); if (v === undefined) { v = ordem.length; mapa.set(tris[i], v); ordem.push(tris[i]); } novo[i] = v; }
      const p = doc.createPrimitive().setMaterial(prim.getMaterial()).setMode(prim.getMode());
      nomes.forEach((n, j) => {
        const src = attrs[j], es = src.getElementSize(), arr = src.getArray(), saida = new arr.constructor(ordem.length * es);
        for (let i = 0; i < ordem.length; i++) for (let e = 0; e < es; e++) saida[i * es + e] = arr[ordem[i] * es + e];
        p.setAttribute(n, doc.createAccessor().setType(src.getType()).setArray(saida).setBuffer(buf));
      });
      p.setIndices(doc.createAccessor().setType('SCALAR').setArray(novo).setBuffer(buf));
      novas.push(p); depois++;
    }
    mesh.removePrimitive(prim);
  }
  novas.forEach(p => mesh.addPrimitive(p));
}
await doc.transform(prune());
await io.write(arq, doc);
console.log('primitivas %d -> %d (celula %d m)', antes, depois, C);
