// Lista as animacoes de um GLB: node tools/assets_web/lista_anims.mjs <arquivo.glb>
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { MeshoptDecoder } from 'meshoptimizer'; import fs from 'node:fs';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const d = await io.readBinary(new Uint8Array(fs.readFileSync(process.argv[2])));
for (const a of d.getRoot().listAnimations()) { let k = 0, t = 0; for (const c of a.listChannels()) t++; for (const s of a.listSamplers()) k += s.getInput().getCount(); console.log(a.getName() + '\t' + t + '\t' + k); }
