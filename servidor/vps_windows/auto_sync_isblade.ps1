# Sincroniza o servidor do jogo IS BLADE com o git (VPS Windows). Roda a cada 5 min por tarefa agendada (ver instalar_isblade.ps1).
# Faz: git fetch; se o remoto mudou -> git reset --hard origin/<branch>, npm ci, e reinicia SOMENTE o node.exe que roda
# <Repo>\servidor\server.js (confere o CAMINHO COMPLETO; nunca mexe em outros node/java). O .bat em loop sobe o servidor de novo.
# Nao altera arquivos fora de <Repo>. Log: <Repo>\servidor\vps_windows\sync.log
param(
  [string]$Repo = 'C:\IS-sync',
  [string]$Branch = 'main',
  [switch]$SemNpm          # so para testes
)
$ErrorActionPreference = 'Stop'
$Repo = (Resolve-Path $Repo).Path
$log = Join-Path $Repo 'servidor\vps_windows\sync.log'
function Log($m){ $l = '{0} {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m; try { Add-Content -Path $log -Value $l -ErrorAction SilentlyContinue } catch {}; Write-Host $l }
function Invoke-Git { & git.exe @args; if($LASTEXITCODE -ne 0){ throw ('git ' + ($args -join ' ') + ' falhou (codigo ' + $LASTEXITCODE + ')') } }      # nome diferente de 'git': a funcao se chamaria a si mesma
# ---- VIGIA (a cada 5 min, antes de qualquer outra coisa): se o jogo ou o Caddy cairam, liga de novo. ----
# Servidor: /status em localhost:3000. Se nao responde e a tarefa IS_Servidor nao esta rodando, roda a tarefa (o .bat em loop cuida do resto);
# se a tarefa esta rodando mas o servidor nao responde 2 vezes seguidas (travado), mata so o node deste servidor (o loop sobe de novo).
# Caddy: se caddy.exe existe aqui e nao ha processo caddy, roda a tarefa IS_Caddy.
function Vigia {
  $dirv = Join-Path $Repo 'servidor\vps_windows'; $estado = Join-Path $dirv 'vigia.falhas'
  function Tarefa-Rodando($nome){ try { return ((Get-ScheduledTask -TaskName $nome -ErrorAction Stop).State -eq 'Running') } catch { return $false } }
  $ok = $false; try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000/status' -TimeoutSec 5; $ok = ($r.StatusCode -eq 200) } catch {}
  if($ok){ if(Test-Path $estado){ Remove-Item $estado -Force -ErrorAction SilentlyContinue } }
  else {
    $n = 1; if(Test-Path $estado){ try { $n = [int](Get-Content $estado -ErrorAction Stop) + 1 } catch {} }; Set-Content -Path $estado -Value $n
    if(-not (Tarefa-Rodando 'IS_Servidor')){ Log 'VIGIA: servidor fora do ar e tarefa parada: ligando IS_Servidor'; & schtasks.exe /Run /TN IS_Servidor | Out-Null; Remove-Item $estado -Force -ErrorAction SilentlyContinue }
    elseif($n -ge 2){
      $alvo = Join-Path $Repo 'servidor\server.js'
      $procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($alvo, [StringComparison]::OrdinalIgnoreCase) -ge 0 }
      foreach($p in $procs){ Log ('VIGIA: servidor sem resposta ha ' + $n + ' checagens: reiniciando node PID ' + $p.ProcessId); Stop-Process -Id $p.ProcessId -Force }
      Remove-Item $estado -Force -ErrorAction SilentlyContinue
    }
  }
  if((Test-Path (Join-Path $dirv 'caddy.exe')) -and -not (Get-Process caddy -ErrorAction SilentlyContinue)){
    if(-not (Tarefa-Rodando 'IS_Caddy')){ Log 'VIGIA: Caddy fora do ar: ligando IS_Caddy'; & schtasks.exe /Run /TN IS_Caddy | Out-Null }
  }
}
try { Vigia } catch { Log ('VIGIA erro: ' + $_.Exception.Message) }

try {
  Set-Location $Repo
  Invoke-Git fetch --quiet origin $Branch
  $local = (& git.exe rev-parse HEAD).Trim(); $remoto = (& git.exe rev-parse ('origin/' + $Branch)).Trim()
  if($local -eq $remoto){ exit 0 }                       # nada novo: nao enche o log
  Log ('atualizando {0} -> {1}' -f $local.Substring(0, 7), $remoto.Substring(0, 7))
  Invoke-Git reset --hard ('origin/' + $Branch) --quiet
  if(-not $SemNpm){ Push-Location (Join-Path $Repo 'servidor'); try { & npm ci --omit=dev --silent; if($LASTEXITCODE -ne 0){ throw 'npm ci falhou' } } finally { Pop-Location } }
  $alvo = Join-Path $Repo 'servidor\server.js'
  $procs = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($alvo, [StringComparison]::OrdinalIgnoreCase) -ge 0 }
  foreach($p in $procs){ Log ('reiniciando node PID ' + $p.ProcessId + ' (' + $alvo + ')'); Stop-Process -Id $p.ProcessId -Force }
  if(-not $procs){ Log 'nenhum node deste servidor estava rodando (o .bat em loop sobe quando ligar)' }
  Log 'ok'
} catch { Log ('ERRO: ' + $_.Exception.Message); exit 1 }
