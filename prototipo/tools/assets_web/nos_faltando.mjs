// Compara nomes de nos (ossos/dummies) e alvos de animacao entre origem e entrega: node tools/assets_web/nos_faltando.mjs <pasta relativa, ex. mobs>
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder } from 'meshoptimizer'; import fs from 'node:fs'; import path from 'node:path';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const sub = process.argv[2] || 'mobs'; const O = 'assets/' + sub, E = 'assets_web/' + sub;
const lista = (d) => fs.readdirSync(d, { recursive: true }).filter(x => String(x).endsWith('.glb')).map(String);
for (const f of lista(O)) {
  if (!fs.existsSync(path.join(E, f))) continue;
  const a = (await io.readBinary(new Uint8Array(fs.readFileSync(path.join(O, f))))).getRoot(), b = (await io.readBinary(new Uint8Array(fs.readFileSync(path.join(E, f))))).getRoot();
  const na = new Set(a.listNodes().map(n => n.getName())), nb = new Set(b.listNodes().map(n => n.getName()));
  const falta = [...na].filter(x => !nb.has(x));
  const alvoB = new Set(); for (const an of b.listAnimations()) for (const c of an.listChannels()) alvoB.add(c.getTargetNode() && c.getTargetNode().getName());
  const alvoA = new Set(); for (const an of a.listAnimations()) for (const c of an.listChannels()) alvoA.add(c.getTargetNode() && c.getTargetNode().getName());
  console.log(f.padEnd(34), 'nos origem', na.size, 'entrega', nb.size, '| nomes que sumiram:', falta.length, falta.slice(0, 4).join(','), '| alvos de anim origem', alvoA.size, 'entrega', alvoB.size);
}
