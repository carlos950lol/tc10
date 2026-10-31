@echo off
cd /d "%~dp0"
echo Ejecutando los 20 casos de prueba de tc10...
echo.
".venv\Scripts\pytest.exe" -v tc10_pruebas
echo.
pause
