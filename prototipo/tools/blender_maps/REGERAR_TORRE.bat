@echo off
rem Regera o mapa visual (GLB) e o mapa de colisao da torre a partir do .blend que voce editou.
rem Uso: salve o .blend no Blender (Ctrl+S) e de duplo clique aqui. Demora uns 10 minutos. Depois recarregue a pagina com Ctrl+F5.
rem Para outro arquivo: REGERAR_TORRE.bat "caminho\outro.blend"
setlocal
set BL="C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
set AQUI=%~dp0
set DEST=%AQUI%..\..\assets\maps\baium_house
if "%~1"=="" (set BLEND=%DEST%\mini_toi_montagem_v7.blend) else (set BLEND=%~1)
set TMP=%DEST%\_regerar_tmp.blend
echo Arquivo: %BLEND%
echo [0/4] preparando (sai do modo de edicao, refaz UV e textura dos pisos)...
%BL% -b "%BLEND%" --python "%AQUI%texturizar_bsp.py" -- - "%TMP%"
echo [1/4] salao e porta (regioes do jogo)...
%BL% -b "%TMP%" --python "%AQUI%gerar_regioes.py" -- "%DEST%\mini_toi_regioes.json"
echo [2/4] exportando o GLB...
%BL% -b "%TMP%" --python "%AQUI%exportar_glb.py" -- "%DEST%\mini_toi.glb"
echo [3/4] gerando o mapa de colisao (5 raios por quadradinho, uns 10 minutos)...
%BL% -b "%TMP%" --python "%AQUI%gerar_walkgrid.py" -- "%DEST%\mini_toi_walkgrid" 0.5 85 -27 51
del "%TMP%" 2>nul
echo.
echo PRONTO. Recarregue http://localhost:8765/arena.html?mapa=torre^&cenario=0 com Ctrl+F5.
pause
