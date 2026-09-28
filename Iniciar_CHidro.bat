@echo off
echo ========================================================
echo                Iniciando o C-Hidro 2.0
echo ========================================================
echo.

:: Verifica se a pasta node_modules existe
IF NOT EXIST "node_modules\" (
    echo [INFO] Primeira inicializacao detectada. Instalando dependencias...
    call npm install
    echo.
)

echo [INFO] Iniciando o servidor de desenvolvimento...
call npm run dev
pause
