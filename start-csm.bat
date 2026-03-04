@echo off
echo Iniciando o Servidor CSM (Backend)...
start "CSM Backend" powershell -NoProfile -Command "$env:PATH = 'C:\Users\nicole.guimaraes_ipn\Documents\Antigravitry 01\node-portable\node-v20.11.1-win-x64;' + $env:PATH; cd '.\csm-app\server'; npm start"

echo.
echo ===================================================
echo Aguardando 5 segundos para garantir que o 
echo servidor da base de dados iniciou corretamente...
echo ===================================================
timeout /t 5 /nobreak >nul

echo Iniciando a Interface CSM (Frontend)...
start "CSM Frontend" powershell -NoProfile -Command "$env:PATH = 'C:\Users\nicole.guimaraes_ipn\Documents\Antigravitry 01\node-portable\node-v20.11.1-win-x64;' + $env:PATH; cd '.\csm-app\client'; npm run dev"

echo.
echo ===================================================
echo   Pode agora abrir o seu navegador Chrome/Edge
echo   no endereco de acesso: http://localhost:5173
echo ===================================================
echo.
pause
