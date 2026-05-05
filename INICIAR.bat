@echo off
echo ============================================
echo  Sistema de Controle de Promotores em PDV
echo ============================================
echo.
echo Iniciando backend (porta 3001)...
start "Backend PDV" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo Iniciando frontend (porta 5173)...
start "Frontend PDV" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Sistema iniciado!
echo.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Login Admin:    admin@sistema.com / admin123
echo Login Promotor: promotor@sistema.com / promotor123
echo.
pause
