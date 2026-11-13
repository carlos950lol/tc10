# TC10 - Sistema Academico

Aplicacion web, API local y pruebas automatizadas con Selenium.

## Preparacion

1. Instala Node.js, Python, MySQL y Chrome o Edge.
2. Crea la base de datos importando `sistema_academico.sql`.
3. Copia `.env.example` a `.env` y configura las credenciales locales de MySQL.
   Para una base ya creada, aplica una vez `backend/migrations/20261111_alumno_grupo_opcional.sql`.
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

Estas son pruebas de navegador con Selenium, no pruebas unitarias. Para reducir el tiempo de ejecucion, reutilizan una instancia del navegador y limpian cookies y almacenamiento entre casos.

El registro de alumnos valida nombres, apellidos y DNI de 8 digitos en el navegador y en la API. La tabla `alumno` aplica una restriccion unica al DNI; la API tambien convierte duplicados en respuestas HTTP 409. Con MySQL desconectado, los registros quedan guardados en el almacenamiento local del navegador y se conservan al actualizar o volver a iniciar sesion.

Para guardar un reporte JUnit junto con las capturas, ejecuta:

```powershell
.\.venv\Scripts\python.exe -m pytest -q --junitxml=capturas_evidencia\reporte_selenium.xml
```

El esquema de `sistema_academico.sql` incluye sexo, procedencia y direccion para los alumnos, y una tabla `apoderado` relacionada con cada alumno. Los contactos incluidos son datos ficticios para pruebas; sus correos usan el dominio reservado `example.invalid`. El script SQL reinicia las tablas y sus datos, por lo que debe usarse solo para crear o restablecer la base de demostracion.
