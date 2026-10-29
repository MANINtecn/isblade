# Servidor do jogo na VPS (passo a passo)

Esquema: o **jogo (arquivos)** fica na Vercel; a **VPS** roda só este servidor (conexão em tempo real). O navegador abre o jogo na Vercel e conecta por `wss://` na VPS.

```
jogador ──► https://jogar.l2ikarus.com   (Vercel: arquivos)
        └─► wss://play.l2ikarus.com/ws   (VPS: servidor do jogo, com HTTPS pelo Caddy)
```

Os nomes de domínio acima são exemplos; troque pelos seus.

## 1. O que a VPS precisa
- Node.js 20 ou mais novo. 1 vCPU e 1 GB de RAM são uma estimativa mais que suficiente para dezenas de jogadores (o servidor só repassa posições e decide dano); meça quando houver gente.
- Se for **reaproveitar a VPS do servidor de Lineage** (Java): confira a memória livre antes e use outra porta.
- Portas **80 e 443** abertas (no firewall da VPS e no painel do provedor), para o HTTPS automático.

## 2. DNS
Crie um registro **A**: `play` → IP da VPS (no painel onde está o DNS do l2ikarus.com).

## 3. Instalar e testar (Linux, Ubuntu/Debian)
```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
git clone --filter=blob:none --sparse <URL-DO-SEU-REPOSITORIO> jogo && cd jogo   # clone parcial: so a pasta do servidor (detalhes logo abaixo)
git sparse-checkout set servidor && cd servidor
npm install
STATIC=0 PORT=3000 node server.js          # deve mostrar "[so jogo, sem arquivos] Servidor em ..."
npm run teste                              # (opcional) 33 verificacoes com bots
```

### Sobre o git na VPS (e como atualizar depois)
O clone parcial acima baixa só a pasta `servidor/`, não os ~214 MB do jogo.
- **Repositório privado:** na VPS gere uma chave só de leitura (`ssh-keygen -t ed25519 -f ~/.ssh/deploy_jogo`), cadastre a pública em *Settings > Deploy keys* do repositório (sem permissão de escrita) e use a URL `git@github.com:...`.
- **Atualizar:** `bash servidor/atualizar_vps.sh` (faz `git pull --ff-only`, `npm ci` e reinicia o serviço; para se o pull não for limpo).
- **Automático:** `servidor/deploy-vps.yml.exemplo` mostra como atualizar a VPS sozinho a cada push (GitHub Actions + SSH). Não está ativo; leia o cabeçalho dele antes.
- **Não use o repositório do site de produção** (`l2ikarus`) para isto: mantenha o do jogo separado.

## 4. Deixar rodando sozinho (systemd)
`/etc/systemd/system/isblade.service`:
```ini
[Unit]
Description=Servidor IS BLADE
After=network.target

[Service]
WorkingDirectory=/home/USUARIO/jogo/servidor
Environment=STATIC=0 PORT=3000 CAP=50 PVP_MULT=0.5
Environment=ORIGINS=https://jogar.l2ikarus.com,https://*.vercel.app
ExecStart=/usr/bin/node server.js
Restart=always
User=USUARIO

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now isblade && sudo systemctl status isblade
```
(Windows: instale o Node, rode `npm install -g pm2`, depois `pm2 start server.js --name isblade` e `pm2 save`; defina as mesmas variáveis antes.)

## 5. HTTPS / WSS com Caddy
```bash
sudo apt install -y caddy
```
`/etc/caddy/Caddyfile`:
```
play.l2ikarus.com {
    reverse_proxy localhost:3000
}
```
```bash
sudo systemctl reload caddy
```
O Caddy pega o certificado sozinho. Confira em `https://play.l2ikarus.com/status` (deve mostrar o JSON dos canais).

## 6. Apontar o cliente para a VPS
No arquivo `prototipo/js/net.js`, preencha a constante no topo:
```js
var SRV_PADRAO = 'wss://play.l2ikarus.com/ws';
```
(depois suba a versão no `import ... net.js?v=N` das páginas e publique na Vercel). Para testar antes de mexer no código: abra o jogo com `?srv=wss://play.l2ikarus.com/ws` (o endereço fica guardado no navegador; `?srv=off` desfaz).

## 7. Variáveis do servidor
| Variável | Padrão | Para que serve |
|---|---|---|
| `PORT` | 8000 | porta do servidor |
| `STATIC` | 1 | `0` = não entrega arquivos (usar na VPS com a Vercel) |
| `ORIGINS` | (vazio = qualquer site) | sites que podem conectar; `*` vale um nível de subdomínio |
| `CAP` | 50 | jogadores por canal |
| `PVP_MULT` | 0.5 | multiplicador de dano no PvP |
| `AOI` | 90 | distância (m) em que um jogador vê os outros |

## Limites atuais (lembrete)
- A posição dos jogadores ainda é do cliente; o servidor só limita a velocidade. Dano, alcance, recarga, guarda e esquiva são do servidor.
- Nada é gravado: se o servidor reiniciar, os canais zeram (grupos e duelos se perdem).
