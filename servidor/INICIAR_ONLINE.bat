@echo off
rem Servidor de teste online (gratis): liga o servidor deste PC e, se o cloudflared estiver instalado, gera o link publico para os amigos.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar_online.ps1"
