# Instala o servidor do jogo IS BLADE na VPS Windows. Rodar UMA vez, em PowerShell COMO ADMINISTRADOR, dentro do clone:
#   cd C:\IS-sync\servidor\vps_windows ; powershell -ExecutionPolicy Bypass -File .\instalar_isblade.ps1
# O que faz (e mostra antes de pedir confirmacao): npm ci; regras de firewall 80/443 (so se faltarem); 3 tarefas agendadas (IS_Servidor e IS_Caddy no boot,
# IS_Sync a cada 5 min). NAO mexe no MySQL, nos servidores de Lineage nem no vps/server.js (porta 8080). Para desfazer: schtasks /Delete /TN IS_Servidor /F (idem IS_Sync, IS_Caddy).
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot; $repo = (Resolve-Path (Join-Path $dir '..\..')).Path; $serv = Join-Path $repo 'servidor'
$ehAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $ehAdmin){ Write-Host 'Abra o PowerShell como Administrador e rode de novo.' -ForegroundColor Red; exit 1 }
foreach($c in 'node', 'git', 'npm'){ if(-not (Get-Command $c -ErrorAction SilentlyContinue)){ Write-Host ('Faltando: ' + $c + '. Instale o Node 20+ (inclui npm) e o Git for Windows e rode de novo.') -ForegroundColor Red; exit 1 } }
$caddy = Join-Path $dir 'caddy.exe'
$porta80 = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue
$porta443 = Get-NetTCPConnection -LocalPort 443 -State Listen -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'Vai fazer:' -ForegroundColor Yellow
Write-Host ('  1) npm ci em ' + $serv)
Write-Host '  2) regras de firewall TCP 80 e 443 (se ainda nao existirem)'
Write-Host '  3) tarefas: IS_Servidor (boot), IS_Sync (a cada 5 min), IS_Caddy (boot, so se o caddy.exe estiver nesta pasta)'
if($porta80 -or $porta443){ Write-Host '  ATENCAO: ja existe algo escutando na porta 80/443. O Caddy nao vai conseguir subir ate resolver isso:' -ForegroundColor Red; $porta80, $porta443 | Where-Object { $_ } | ForEach-Object { Write-Host ('   porta ' + $_.LocalPort + ' -> PID ' + $_.OwningProcess + ' (' + (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName + ')') } }
if(-not (Test-Path $caddy)){ Write-Host '  Obs.: caddy.exe NAO esta em vps_windows\ (baixe em https://caddyserver.com/download, Windows amd64). Sem ele o jogo roda mas sem HTTPS/wss.' -ForegroundColor DarkYellow }
$r = Read-Host 'Continuar? (s/N)'; if($r -notmatch '^[sSyY]'){ Write-Host 'Cancelado.'; exit 0 }

Push-Location $serv; try { & npm ci --omit=dev; if($LASTEXITCODE -ne 0){ throw 'npm ci falhou' } } finally { Pop-Location }
foreach($p in 80, 443){ $nome = 'IS_BLADE_TCP_' + $p; if(-not (Get-NetFirewallRule -DisplayName $nome -ErrorAction SilentlyContinue)){ New-NetFirewallRule -DisplayName $nome -Direction Inbound -Protocol TCP -LocalPort $p -Action Allow | Out-Null; Write-Host ('firewall: ' + $nome) } }

$bat = Join-Path $dir 'iniciar_isblade_auto.bat'; $sync = Join-Path $dir 'auto_sync_isblade.ps1'
Write-Host ''; Write-Host ('As tarefas vao rodar com o usuario ' + $env:USERNAME + ' (o git precisa do acesso dele ao repositorio). O Windows vai pedir a senha.') -ForegroundColor Cyan
& schtasks /Create /TN 'IS_Servidor' /TR ('"' + $bat + '"') /SC ONSTART /RU $env:USERNAME /RP * /RL HIGHEST /F
& schtasks /Create /TN 'IS_Sync' /TR ('powershell -NoProfile -ExecutionPolicy Bypass -File "' + $sync + '" -Repo "' + $repo + '"') /SC MINUTE /MO 5 /RU $env:USERNAME /RP * /F
if(Test-Path $caddy){ & schtasks /Create /TN 'IS_Caddy' /TR ('"' + $caddy + '" run --config "' + (Join-Path $dir 'Caddyfile') + '"') /SC ONSTART /RU $env:USERNAME /RP * /RL HIGHEST /F }
Write-Host ''
Write-Host 'Pronto. Para ligar agora sem reiniciar a VPS:  schtasks /Run /TN IS_Servidor   (e IS_Caddy)' -ForegroundColor Green
Write-Host 'Conferir: http://localhost:3000/status   e, com DNS+Caddy,  https://play.isblade.tecx.pro/status'
Write-Host ('Logs: ' + (Join-Path $dir 'servidor.log') + '  e  ' + (Join-Path $dir 'sync.log'))
