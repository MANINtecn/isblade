@echo off
rem Servidor do jogo (PvP): serve o jogo e a conexao em tempo real no mesmo endereco. Substitui o "python -m http.server" do INICIAR.bat quando for testar com varios jogadores.
rem Opcoes (antes de rodar): set PORT=8000  set CAP=50  set PVP=1  set PVP_MULT=0.5
cd /d "%~dp0.."
start "" http://localhost:8000/selecao.html
node servidor\server.js
