# TC10 - Sistema Academico

Aplicacion web, API local y pruebas automatizadas con Selenium.

## Preparacion

1. Instala Node.js, Python, MySQL y Chrome o Edge.
2. Crea la base de datos importando `sistema_academico.sql`.
3. Copia `.env.example` a `.env` y configura las credenciales locales de MySQL.
4. Instala dependencias:

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Ejecutar

Inicia la aplicacion:

```powershell
npm start
```

Abre `http://localhost:3000`. En otra terminal, ejecuta las pruebas:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Para seleccionar Microsoft Edge:

```powershell
$env:SELENIUM_BROWSER = "edge"
.\.venv\Scripts\python.exe -m pytest -q
```

Los casos marcados `local` no necesitan MySQL; los casos `mysql` requieren la base de datos y los datos de demostracion. Las capturas generadas durante las pruebas se guardan localmente y no se incluyen en el repositorio.
