/* Verifica a entrega (assets_web/) contra a origem (assets/) num navegador de verdade, com o three e o gancho do jogo.
   Sobe um servidor local, abre o Chrome/Edge sem janela em tools/assets_web/verificar.html e espera o resultado.
   Uso (na pasta prototipo):   node tools/assets_web/verificar.mjs            todos
                               node tools/assets_web/verificar.mjs fortress   so os que tem "fortress" no caminho
                               node tools/assets_web/verificar.mjs personagens --three128   com o three antigo da selecao.html
   Sai com codigo 1 se algum arquivo mudou de forma (malhas, ossos, nomes, texturas, animacoes). */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.bin': 'application/octet-stream' };
const NAVEGADORES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const nav = NAVEGADORES.find(f => fs.existsSync(f));
if (!nav) { console.error('Chrome/Edge nao encontrado'); process.exit(2); }
const a128 = process.argv.includes('--three128'), filtro = process.argv.slice(2).find(x => !x.startsWith('--')) || '';

let fim;
const pronto = new Promise(r => { fim = r; });
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'POST' && u.pathname === '/__resultado') { let b = ''; req.on('data', d => { b += d; }); req.on('end', () => { res.end('ok'); fim(JSON.parse(b)); }); return; }
  const f = path.join(RAIZ, decodeURIComponent(u.pathname));
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const porta = srv.address().port, perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'isblade-verifica-'));
const proc = spawn(nav, ['--headless=new', '--disable-gpu', '--no-first-run', '--user-data-dir=' + perfil,
  'http://127.0.0.1:' + porta + '/tools/assets_web/verificar.html' + '?so=' + encodeURIComponent(filtro) + (a128 ? '&three=128' : '')], { stdio: 'ignore' });
const limite = setTimeout(() => fim(null), 15 * 60 * 1000);
const r = await pronto;
clearTimeout(limite); proc.kill(); srv.close();
try { fs.rmSync(perfil, { recursive: true, force: true }); } catch (_) { /* o navegador pode demorar a soltar a pasta */ }

if (!r) { console.error('sem resposta do navegador (tempo esgotado)'); process.exit(2); }
console.log('three r' + r.three + ': ' + r.ok + ' de ' + r.total + ' arquivos iguais a origem; maior diferenca de animacao: ' + (r.piorAnim || 0).toExponential(2));
for (const x of r.problemas) console.log('  PROBLEMA ' + x.u + '\n     ' + x.p.join('\n     '));
process.exit(r.problemas.length ? 1 : 0);
