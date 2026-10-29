@echo off
rem Abre o IS BLADE pelo servidor local (necessario para carregar o personagem .vrm)
cd /d "%~dp0"
start "" http://localhost:8000/arena.html
python -m http.server 8000
