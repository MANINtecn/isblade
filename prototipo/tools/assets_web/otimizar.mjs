/* Pipeline de assets do IS BLADE (regras em REGRAS_ASSETS_WEB.md, na raiz do repositorio).
   Le os GLB de prototipo/assets/ (a ORIGEM, que o Blender exporta e ninguem edita a mao depois) e grava a versao de entrega em prototipo/assets_web/:
     - malhas e animacoes comprimidas com meshopt (malha sem quantizar: os numeros continuam float, entao colisao/fusao de pecas nao mudam;
       rotacao das animacoes em 16 bits: diferenca medida < 0,001). NAO usar resample(): piorou a precisao (0,003) e nao reduziu o arquivo;
     - texturas embutidas em WebP (personagens/armas) ou KTX2 Basis (mapas, cidade, mobs, chefe; ver KTX2_ALVO), com teto de 2048 px.
   O jogo troca a URL sozinho (js/assets_web.js) usando js/assets_manifesto.js; se a versao de entrega falhar, cai no arquivo de origem.
   Uso (na pasta prototipo):   node tools/assets_web/otimizar.mjs            converte so o que mudou
                               node tools/assets_web/otimizar.mjs --tudo     refaz tudo
                               node tools/assets_web/otimizar.mjs assets/maps/fortress/fortress.glb   so os arquivos citados */
import { NodeIO, PropertyType, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP, KHRTextureBasisu } from '@gltf-transform/extensions';
import { encodeToKTX2 } from 'ktx2-encoder';
import { dedup, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSAO_PIPELINE = 3;          // subir quando mudar as opcoes abaixo: refaz tudo
const TETO_TEXTURA = 2048;          // px (lado maior)
const QUALIDADE_WEBP = 86;
const KTX2_ALVO = /^assets\/(maps|talking_island|mobs|baium|cenario)\//;   // texturas grandes (mapas, cidade, mobs, chefe): KTX2 (Basis ETC1S) = 4 a 8x menos memoria de video. Personagens e armas ficam em WebP (so ~4 MB de video por personagem)
const KTX2_QUALIDADE = 170, KTX2_ESFORCO = 2;   // ETC1S: qualidade 1-255, esforco 0-6 (so a lentidao da conversao)
const GANHO_MINIMO = 0.10;          // se nao ficar pelo menos 10% menor, o jogo continua usando a origem
const IGNORA = /(^|\/)(raw_|test_|extracted|umodel)|backup|_antes_|baium_export|\/talking_island\/models\//i;

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
process.chdir(RAIZ);
const SAIDA = 'assets_web', ARQ_JSON = 'tools/assets_web/manifesto.json', ARQ_JS = 'js/assets_manifesto.js';      // fora de assets_web/: la o cache e de 1 ano
const args = process.argv.slice(2), TUDO = args.includes('--tudo'), pedidos = args.filter(a => !a.startsWith('--')).map(a => a.replace(/\\/g, '/'));

function lista() {                  // so o que vai para o repositorio (rastreado ou novo e nao ignorado pelo .gitignore)
  const o = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z', '--', 'assets'], { maxBuffer: 1 << 28 }).toString('utf8');
  return o.split('\0').filter(f => /\.glb$/i.test(f) && !IGNORA.test(f) && fs.existsSync(f)).sort();
}
const mb = b => (b / 1048576).toFixed(1);
async function texturasWebp(doc) {    // PNG/JPEG embutidos -> WebP (com teto de tamanho); so troca se ficar menor
  let n = 0;
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage(), mime = t.getMimeType();
    if (!img || !/image\/(png|jpeg)/.test(mime)) continue;
    let s = sharp(img); const md = await s.metadata();
    if (Math.max(md.width || 0, md.height || 0) > TETO_TEXTURA) s = s.resize(TETO_TEXTURA, TETO_TEXTURA, { fit: 'inside' });
    const out = await s.webp({ quality: QUALIDADE_WEBP, alphaQuality: 90, effort: 5 }).toBuffer();
    if (out.length >= img.length) continue;
    t.setImage(new Uint8Array(out)).setMimeType('image/webp');
    if (t.getURI()) t.setURI(t.getURI().replace(/\.(png|jpe?g)$/i, '.webp'));
    n++;
  }
  return n;
}

const decodificaImagem = async b => { const { data, info } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8ClampedArray(data) }; };
function slotsDaTextura(t) {
  const raiz = Document.fromGraph(t.getGraph()).getRoot();
  return t.getGraph().listParentEdges(t).filter(e => e.getParent() !== raiz).map(e => e.getName());
}
async function texturasKtx2(doc) {    // PNG/JPEG/WebP embutidos -> KTX2 ETC1S com mipmaps (cor e emissiva em sRGB); teto de 2048 px
  let n = 0; const log = console.log;
  for (const t of doc.getRoot().listTextures()) {
    const img = t.getImage(), mime = t.getMimeType();
    if (!img || !/image\/(png|jpeg|webp)/.test(mime)) continue;
    let b = Buffer.from(img); const md = await sharp(b).metadata();
    if (Math.max(md.width || 0, md.height || 0) > TETO_TEXTURA) b = await sharp(b).resize(TETO_TEXTURA, TETO_TEXTURA, { fit: 'inside' }).png().toBuffer();
    const sl = slotsDaTextura(t), srgb = !sl.length || sl.some(x => /baseColor|emissive/i.test(x));
    console.log = () => {};                                     // o codificador despeja uma linha por fatia
    let out; try { out = await encodeToKTX2(new Uint8Array(b), { isUASTC: false, qualityLevel: KTX2_QUALIDADE, compressionLevel: KTX2_ESFORCO, generateMipmap: true, isSetKTX2SRGBTransferFunc: srgb, imageDecoder: decodificaImagem, enableDebug: false }); } finally { console.log = log; }
    t.setImage(out).setMimeType('image/ktx2');
    if (t.getURI()) t.setURI(t.getURI().replace(/\.(png|jpe?g|webp)$/i, '.ktx2'));
    n++;
  }
  return n;
}

await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

let man = { versao: VERSAO_PIPELINE, arquivos: {} };
try { const m = JSON.parse(fs.readFileSync(ARQ_JSON, 'utf8')); if (m.versao === VERSAO_PIPELINE) man = m; } catch (_) { /* primeira vez */ }

const todos = lista(), alvo = pedidos.length ? todos.filter(f => pedidos.includes(f)) : todos;
if (pedidos.length && alvo.length !== pedidos.length) console.warn('aviso: nem todos os arquivos pedidos existem em assets/ (ou estao ignorados)');
let feitos = 0, pulados = 0, falhas = [];

for (const src of alvo) {
  const bytes = fs.readFileSync(src), h = createHash('sha1').update(bytes).digest('hex').slice(0, 10);
  const dst = SAIDA + '/' + src.slice('assets/'.length), ant = man.arquivos[src];
  if (!TUDO && ant && ant.h === h && (ant.manter || fs.existsSync(dst))) { pulados++; continue; }
  try {
    const doc = await io.readBinary(new Uint8Array(bytes));
    doc.setLogger({ debug() {}, info() {}, warn() {}, error(m) { console.error(m); } });
    await doc.transform(
      dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.TEXTURE] }),      // nao junta material nem malha: o jogo mexe neles por peca
      reorder({ encoder: MeshoptEncoder, target: 'size' }),
    );
    const ktx = KTX2_ALVO.test(src);
    if (ktx) { if (await texturasKtx2(doc)) doc.createExtension(KHRTextureBasisu).setRequired(true); }
    else if (await texturasWebp(doc)) doc.createExtension(EXTTextureWebP).setRequired(true);
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.FILTER });
    const out = await io.writeBinary(doc);
    if (out.byteLength > bytes.length * (1 - GANHO_MINIMO)) {
      man.arquivos[src] = { h, de: bytes.length, para: bytes.length, manter: true };
      if (fs.existsSync(dst)) fs.unlinkSync(dst);
      console.log('  = ' + src + '  (sem ganho, fica a origem)');
    } else {
      fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.writeFileSync(dst, out);
      man.arquivos[src] = ktx ? { h, de: bytes.length, para: out.byteLength, k: 1 } : { h, de: bytes.length, para: out.byteLength };
      console.log('  ' + mb(bytes.length).padStart(6) + ' -> ' + mb(out.byteLength).padStart(5) + ' MB  ' + (ktx ? '[KTX2] ' : '') + src);
    }
    feitos++;
  } catch (e) {
    falhas.push(src); delete man.arquivos[src]; if (fs.existsSync(dst)) fs.unlinkSync(dst);
    console.error('  FALHOU ' + src + ': ' + (e && e.message || e));
  }
}

// origem apagada -> some a entrega tambem
if (!pedidos.length) for (const k of Object.keys(man.arquivos)) if (!todos.includes(k)) {
  const d = SAIDA + '/' + k.slice('assets/'.length); if (fs.existsSync(d)) fs.unlinkSync(d); delete man.arquivos[k];
}

fs.mkdirSync(SAIDA, { recursive: true });
const ord = {}; for (const k of Object.keys(man.arquivos).sort()) ord[k] = man.arquivos[k];
man.arquivos = ord;
fs.writeFileSync(ARQ_JSON, JSON.stringify(man, null, 1) + '\n');
const m = {}, kk = {}; for (const [k, v] of Object.entries(ord)) if (!v.manter) { m[k] = v.h; if (v.k) kk[k] = 1; }
fs.writeFileSync(ARQ_JS, '/* GERADO por tools/assets_web/otimizar.mjs - nao editar a mao */\nwindow.ASSETS_WEB=' + JSON.stringify({ m, k: kk }) + ';\n');

// a tela de carregamento (assets/precarga.json) tem de baixar a MESMA URL que o jogo vai pedir; a lista de arquivos nao muda aqui (isso e do tools/gerar_precarga.py)
try {
  const PRE = 'assets/precarga.json', txt = fs.readFileSync(PRE, 'utf8'), nl = txt.includes(String.fromCharCode(13, 10)) ? String.fromCharCode(13, 10) : String.fromCharCode(10), pj = JSON.parse(txt);
  for (const i of pj.itens) {
    const q = i.u.indexOf('?'), cam = q < 0 ? i.u : i.u.slice(0, q), org = cam.startsWith(SAIDA + '/') ? 'assets/' + cam.slice(SAIDA.length + 1) : cam, w = ord[org];
    if (w && !w.manter) { i.u = SAIDA + '/' + org.slice(7) + '?h=' + w.h; i.b = w.para; }
    else if (cam !== org) { i.u = org; i.b = fs.statSync(org).size; }                       // deixou de ter entrega: volta para a origem
  }
  pj.total = pj.itens.reduce((t, i) => t + (i.e ? i.b : 0), 0);
  const L = ['{', '"total": ' + pj.total + ',', '"itens": ['];                             // mesmo formato do json.dump(indent=0) do gerar_precarga.py
  pj.itens.forEach((i, k) => L.push('{', '"u": ' + JSON.stringify(i.u) + ',', '"b": ' + i.b + ',', '"e": ' + i.e, k < pj.itens.length - 1 ? '},' : '}'));
  L.push(']', '}'); fs.writeFileSync(PRE, L.join(nl));
  console.log('pre-carga: ' + mb(pj.total) + ' MB essenciais');
} catch (e) { console.warn('aviso: nao atualizei assets/precarga.json: ' + e.message); }

let de = 0, para = 0; for (const v of Object.values(ord)) { de += v.de; para += v.para; }
console.log('\n' + feitos + ' convertidos, ' + pulados + ' ja estavam em dia, ' + falhas.length + ' falhas');
console.log('GLB do jogo: ' + mb(de) + ' MB de origem -> ' + mb(para) + ' MB de entrega (' + Math.round(100 - 100 * para / de) + '% menor)');
if (falhas.length) { console.log('falharam:\n  ' + falhas.join('\n  ')); process.exitCode = 1; }
