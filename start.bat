@echo off
echo ========================================
echo Iniciando Backend + Frontend
echo ========================================
echo.

REM Iniciar Backend em uma aba de terminal
echo Iniciando Backend...
start cmd /k "cd Backend && python app.py"

timeout /t 2 /nobreak

REM Iniciar Frontend em outra aba
echo Iniciando Frontend...
start cmd /k "cd Frontend && npm run dev"

timeout /t 2 /nobreak

echo.
echo ========================================
echo Backend estará em: http://localhost:5000
echo Frontend estará em: http://localhost:5173
echo ========================================
