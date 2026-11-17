# Instala o banco do SITE (l2ikarus.com) na VPS nova do L2 Ikarus: MariaDB so' para esta maquina (127.0.0.1),
# banco l2ikarus_site com as tabelas (servidor\sitedb_schema.sql), usuario proprio, chave da API e backup diario.
# Rodar UMA vez, no PowerShell COMO ADMINISTRADOR:
#   cd C:\IS-sync\servidor\vps_windows ; powershell -ExecutionPolicy Bypass -File .\instalar_banco_site.ps1
# Pode rodar de novo sem estragar nada (pula o que ja existe). NAO mexe no jogo nem nas contas do jogo.
# Gera (fora do git): ..\dados\sitedb.json (usado pelo servidor do jogo) e ..\dados\mariadb_root.txt (senha root).
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$serv = Split-Path -Parent $dir
$dados = Join-Path $serv 'dados'
New-Item -ItemType Directory -Force -Path $dados | Out-Null
function Passo($t){ Write-Host ''; Write-Host ('== ' + $t) -ForegroundColor Cyan }
function Aleatorio($n){ $b = New-Object byte[] $n; [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b); return (($b | ForEach-Object { $_.ToString('x2') }) -join '') }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if(-not $admin){ Write-Host 'Abra o PowerShell como ADMINISTRADOR (botao direito > Executar como administrador) e rode de novo.' -ForegroundColor Red; exit 1 }

# ---------- 1. MariaDB ----------
Passo '1/6 MariaDB'
$rootArq = Join-Path $dados 'mariadb_root.txt'
$svc = Get-Service -Name 'MariaDB' -ErrorAction SilentlyContinue
if(-not $svc){
  $rootSenha = Aleatorio 18
  Set-Content -Path $rootArq -Value $rootSenha -NoNewline -Encoding ascii
  $msi = Join-Path $env:TEMP 'mariadb.msi'
  $versoes = @('11.4.4', '11.4.3', '11.4.2', '10.11.10', '10.11.9')
  $baixou = $false
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  foreach($v in $versoes){
    $url = "https://archive.mariadb.org/mariadb-$v/winx64-packages/mariadb-$v-winx64.msi"
    try { Write-Host "baixando MariaDB $v ..."; Invoke-WebRequest -Uri $url -OutFile $msi -UseBasicParsing; $baixou = $true; break } catch { Write-Host "  $v nao encontrado, tentando outra" }
  }
  if(-not $baixou){ throw 'Nao consegui baixar o MariaDB. Confira a internet da VPS.' }
  Write-Host 'instalando (leva 1-2 minutos)...'
  $p = Start-Process msiexec.exe -Wait -PassThru -ArgumentList @('/i', "`"$msi`"", '/qn', "PASSWORD=$rootSenha", 'SERVICENAME=MariaDB', 'PORT=3306', 'UTF8=1', '/l*v', "`"$env:TEMP\mariadb_install.log`"")
  if($p.ExitCode -ne 0){ throw "Instalacao do MariaDB falhou (codigo $($p.ExitCode)). Log: $env:TEMP\mariadb_install.log" }
  $svc = Get-Service -Name 'MariaDB'
} else {
  if(-not (Test-Path $rootArq)){ throw "MariaDB ja instalado, mas falta $rootArq com a senha root. Crie esse arquivo com a senha e rode de novo." }
  $rootSenha = (Get-Content $rootArq -Raw).Trim()
  Write-Host 'MariaDB ja instalado: ok'
}
$exe = Get-ChildItem 'C:\Program Files\MariaDB*\bin\mariadb.exe', 'C:\Program Files\MariaDB*\bin\mysql.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
if(-not $exe){ throw 'Nao achei o mariadb.exe em C:\Program Files\MariaDB*' }
$bin = Split-Path -Parent $exe.FullName

# ---------- 2. so' nesta maquina (127.0.0.1) ----------
Passo '2/6 Banco so na propria VPS (127.0.0.1)'
$ini = Get-ChildItem 'C:\Program Files\MariaDB*\data\my.ini' -ErrorAction SilentlyContinue | Select-Object -First 1
if($ini){
  $txt = Get-Content $ini.FullName -Raw
  if($txt -notmatch 'bind-address'){
    $txt = $txt -replace '\[mysqld\]', "[mysqld]`r`nbind-address=127.0.0.1"
    Set-Content -Path $ini.FullName -Value $txt -Encoding ascii
    Restart-Service MariaDB; Start-Sleep -Seconds 3
  }
  Write-Host 'ok'
}
if((Get-Service MariaDB).Status -ne 'Running'){ Start-Service MariaDB; Start-Sleep -Seconds 3 }

function Sql($q, $banco){
  $a = @('-u', 'root', "--password=$rootSenha", '-h', '127.0.0.1', '-e', $q); if($banco){ $a += $banco }
  & $exe.FullName @a
  if($LASTEXITCODE -ne 0){ throw "Erro no SQL: $q" }
}

# ---------- 3. banco, usuario e tabelas ----------
Passo '3/6 Banco l2ikarus_site, usuario e tabelas'
$cfgArq = Join-Path $dados 'sitedb.json'
if(Test-Path $cfgArq){ $cfg = Get-Content $cfgArq -Raw | ConvertFrom-Json; $userSenha = $cfg.password; $apiKey = $cfg.apiKey }
else { $userSenha = Aleatorio 18; $apiKey = Aleatorio 32 }
Sql "CREATE DATABASE IF NOT EXISTS l2ikarus_site CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Sql "CREATE USER IF NOT EXISTS 'site'@'127.0.0.1' IDENTIFIED BY '$userSenha'; ALTER USER 'site'@'127.0.0.1' IDENTIFIED BY '$userSenha'; GRANT ALL PRIVILEGES ON l2ikarus_site.* TO 'site'@'127.0.0.1'; FLUSH PRIVILEGES;"
$schema = Join-Path $serv 'sitedb_schema.sql'
Sql ("source " + $schema.Replace([char]92, [char]47)) 'l2ikarus_site'
$cfg = [ordered]@{ host = '127.0.0.1'; port = 3306; user = 'site'; password = $userSenha; database = 'l2ikarus_site'; apiKey = $apiKey }
($cfg | ConvertTo-Json) | Set-Content -Path $cfgArq -Encoding ascii
Write-Host 'ok (configuracao em dados\sitedb.json)'

# ---------- 4. backup diario ----------
Passo '4/6 Backup diario (04:00, guarda 14 dias em C:\IS-backups)'
$bk = Join-Path $dir 'backup_banco_site.ps1'
& schtasks /Create /TN 'IS_BackupSite' /TR ('powershell -NoProfile -ExecutionPolicy Bypass -File "' + $bk + '"') /SC DAILY /ST 04:00 /RU SYSTEM /RL HIGHEST /F | Out-Null
& powershell -NoProfile -ExecutionPolicy Bypass -File $bk
Write-Host 'ok (primeiro backup ja feito)'

# ---------- 5. pacote do banco no servidor do jogo e reinicio ----------
Passo '5/6 Ligando o banco no servidor do jogo'
Push-Location $serv
try { & npm install --omit=dev --no-audit --no-fund | Out-Null } catch {}
Pop-Location
$alvo = Join-Path $serv 'server.js'
$procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($alvo, [StringComparison]::OrdinalIgnoreCase) -ge 0 }
foreach($p in $procs){ Stop-Process -Id $p.ProcessId -Force }
Write-Host 'servidor do jogo reiniciando (volta sozinho em ~5 s)'
Start-Sleep -Seconds 10
try { $r = Invoke-WebRequest -Uri 'http://localhost:3000/sitedb/status/all' -Headers @{ 'x-api-key' = $apiKey } -UseBasicParsing; Write-Host ('teste: ' + $r.Content) -ForegroundColor Green } catch { Write-Host ('teste falhou: ' + $_.Exception.Message + ' (espere 1 minuto e veja de novo)') -ForegroundColor Yellow }

# ---------- 6. o que colar na Vercel ----------
Passo '6/6 PRONTO. Na Vercel, projeto do SITE (l2ikarus) > Settings > Environment Variables:'
Write-Host ''
Write-Host '  VPS_API_URL      = https://play.isblade.tecx.pro/sitedb' -ForegroundColor Yellow
Write-Host '  VPS_STATUS_URL   = https://play.isblade.tecx.pro/sitedb/status' -ForegroundColor Yellow
Write-Host ('  VPS_STATUS_TOKEN = ' + $apiKey) -ForegroundColor Yellow
Write-Host ''
Write-Host 'Troque o valor dessas 3 (Production e Preview) e faca Redeploy. Guarde a chave: ela tambem esta em dados\sitedb.json.'
