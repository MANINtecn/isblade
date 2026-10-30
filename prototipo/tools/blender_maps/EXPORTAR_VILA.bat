@echo off
rem Grava as posicoes das casas do Blender (vila_montagem.blend) no jogo (village_data_threejs.json). Salve o .blend (Ctrl+S) antes. Faz backup do json.
set BL="C:\Program Files\Blender Foundation\Blender 5.1\blender.exe"
set DEST=%~dp0..\..\assets\talking_island
%BL% -b "%DEST%\vila_montagem.blend" --python "%~dp0exportar_vila.py" -- "%DEST%\village_data_threejs.json"
echo PRONTO. Recarregue a cidade com Ctrl+F5.
pause
