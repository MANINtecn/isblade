@echo off
rem Servidor do jogo IS BLADE em loop (se cair ou for reiniciado pelo sync, sobe de novo em 5 s). Tarefa ONSTART: ver instalar_isblade.ps1.
rem A configuracao fica aqui (nao vai para o jogo): altere os valores abaixo na VPS se precisar.
set STATIC=0
set PORT=3000
set CAP=50
set PVP_MULT=0.5
set ORIGINS=https://www.isblade.tecx.pro,https://isblade.tecx.pro
for %%I in ("%~dp0..") do set SERV=%%~fI
:loop
echo [%date% %time%] iniciando servidor >> "%~dp0servidor.log"
node "%SERV%\server.js" >> "%~dp0servidor.log" 2>&1
echo [%date% %time%] servidor parou (codigo %errorlevel%); reiniciando em 5 s >> "%~dp0servidor.log"
timeout /t 5 /nobreak >nul
goto loop
