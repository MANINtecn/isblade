# Liga o servidor do jogo neste PC e, se o tunel gratuito (cloudflared) estiver instalado, gera um endereco PUBLICO para os amigos entrarem.
# Sem tunel: so quem esta na mesma rede (Wi-Fi) entra, pelo endereco local que o script mostra.
# Nao precisa de conta nem de dinheiro. O PC precisa ficar ligado e com este script aberto durante o teste.
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
$porta = 8000
$log = Join-Path $env:TEMP 'isblade_tunel.log'
$meusProcessos = @()

Write-Host ''
Write-Host '=== IS BLADE - servidor online de teste ===' -ForegroundColor Yellow

# 1) servidor (se a porta ja estiver em uso, assume que o servidor ja esta rodando)
$emUso = Get-NetTCPConnection -LocalPort $porta -State Listen -ErrorAction SilentlyContinue
if($emUso){
  Write-Host "A porta $porta ja esta em uso: usando o que ja esta rodando. (Se for o 'python -m http.server', feche-o: so o servidor Node faz o multiplayer.)" -ForegroundColor DarkYellow
} else {
  $node = Get-Command node -ErrorAction SilentlyContinue
  if(-not $node){ Write-Host 'Node.js nao encontrado. Instale o Node 20+ (https://nodejs.org) e rode de novo.' -ForegroundColor Red; Read-Host 'Enter para sair'; exit 1 }
  $p = Start-Process -FilePath $node.Source -ArgumentList 'servidor\server.js' -WorkingDirectory $raiz -PassThru -WindowStyle Minimized
  $meusProcessos += $p
  Start-Sleep -Seconds 2
  if($p.HasExited){ Write-Host 'O servidor fechou ao iniciar. Rode "node servidor\server.js" numa janela para ver o erro.' -ForegroundColor Red; Read-Host 'Enter para sair'; exit 1 }
  Write-Host "Servidor Node ligado na porta $porta." -ForegroundColor Green
}

# 2) endereco na rede local
$ip = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -like '192.168.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.1[6-9].*' -or $_.IPAddress -like '172.2?.*' } | Select-Object -First 1).IPAddress
Write-Host ''
Write-Host 'No seu PC:' -ForegroundColor Cyan
Write-Host "  http://localhost:$porta/selecao.html"
if($ip){ Write-Host 'Mesma rede / Wi-Fi (amigos na sua casa):' -ForegroundColor Cyan; Write-Host "  http://${ip}:$porta/selecao.html" }

# 3) tunel publico gratuito
$cf = Get-Command cloudflared -ErrorAction SilentlyContinue
if(-not $cf){
  Write-Host ''
  Write-Host 'Para amigos de FORA da sua rede falta o tunel gratuito (cloudflared). Instale uma vez, no PowerShell:' -ForegroundColor DarkYellow
  Write-Host '  winget install --id Cloudflare.cloudflared' -ForegroundColor White
  Write-Host 'Feche e abra este script de novo depois. Nao precisa de conta.' -ForegroundColor DarkYellow
} else {
  if(Test-Path $log){ Remove-Item $log -Force -ErrorAction SilentlyContinue }
  $t = Start-Process -FilePath $cf.Source -ArgumentList "tunnel --url http://localhost:$porta --no-autoupdate" -RedirectStandardError $log -WindowStyle Hidden -PassThru
  $meusProcessos += $t
  Write-Host ''
  Write-Host 'Abrindo o tunel publico (ate 40 s)...' -ForegroundColor Cyan
  $url = $null
  for($i = 0; $i -lt 40 -and -not $url; $i++){
    Start-Sleep -Seconds 1
    if(Test-Path $log){ $m = Select-String -Path $log -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1; if($m){ $url = $m.Matches[0].Value } }
  }
  if(-not $url){ Write-Host 'Nao consegui o endereco do tunel. Veja o log em ' $log -ForegroundColor Red }
  else {
    $host_ = $url -replace '^https://', ''
    Write-Host ''
    Write-Host 'LINK PARA OS AMIGOS (jogo servido deste PC):' -ForegroundColor Green
    Write-Host "  $url/selecao.html" -ForegroundColor White
    Write-Host ''
    Write-Host 'Se o jogo estiver na Vercel, o amigo abre o endereco da Vercel com este final (so o servidor vem do seu PC):' -ForegroundColor Cyan
    Write-Host "  /selecao.html?srv=wss://$host_/ws" -ForegroundColor White
    try { Set-Clipboard -Value "$url/selecao.html"; Write-Host '(o link dos amigos foi copiado para a area de transferencia)' -ForegroundColor DarkGray } catch {}
    Write-Host ''
    Write-Host 'Aviso: o endereco muda a cada vez que voce roda este script. O download inicial do jogo sai da internet de casa;' -ForegroundColor DarkYellow
    Write-Host 'com muitos amigos ao mesmo tempo, prefira o jogo na Vercel e so o servidor aqui.' -ForegroundColor DarkYellow
  }
}

Write-Host ''
Write-Host 'Deixe esta janela aberta durante o teste. Para encerrar, pressione Enter.' -ForegroundColor Yellow
try { $null = Read-Host } catch {}
foreach($p in $meusProcessos){ try { if(-not $p.HasExited){ Stop-Process -Id $p.Id -Force } } catch {} }
Write-Host 'Encerrado.'
