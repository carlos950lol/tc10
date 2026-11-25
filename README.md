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

Estas son pruebas de navegador con Selenium, no pruebas unitarias. Cada caso crea y cierra su propia instancia del navegador; durante la limpieza se borran cookies y almacenamiento local.

GitHub Actions ejecuta los casos Selenium en Chrome headless al hacer push o abrir un pull request hacia `main`. Los casos marcados `mysql` se omiten si la base de datos no esta disponible; los casos `local` se ejecutan sin MySQL. El reporte JUnit, las capturas y los logs se descargan desde **Actions > ejecucion > Artifacts > evidencias-selenium**. Actualmente no hay una suite separada de pruebas unitarias.

## Pruebas de carga con JMeter

El plan `jmeter/tc10-load-test.jmx` verifica la pagina principal, el estado de salud, el inicio de sesion y una consulta autenticada. El workflow de GitHub Actions ejecuta una carga acotada por defecto (5 usuarios, ramp-up de 5 segundos y 2 iteraciones); al iniciarlo manualmente se pueden cambiar esos valores dentro de los limites del formulario. El reporte HTML, los resultados JTL y los logs se descargan desde **Actions > ejecucion > Artifacts > reporte-jmeter**.

Para ejecutar el plan localmente, inicia la aplicacion en el puerto 3001 (`$env:API_PORT = "3001"; node backend/servidor.js`) y ejecuta desde la raiz con JMeter instalado:

```powershell
$run = Get-Date -Format yyyyMMdd-HHmmss
New-Item -ItemType Directory -Force "jmeter\results\$run"
jmeter.bat -n -t jmeter\tc10-load-test.jmx -Jhost=127.0.0.1 -Jport=3001 -Jthreads=5 -JrampUp=5 -Jloops=2 -l "jmeter\results\$run\results.jtl" -e -o "jmeter\results\$run\html"
```

Los valores `threads`, `rampUp` y `loops` tambien se pueden cambiar en la linea de comandos; el plan permite parametrizar host, puerto y credenciales de demostracion mediante propiedades `-J`.

## Auditoria de accesibilidad con WAVE

El workflow `.github/workflows/wave.yml` usa la API oficial de WAVE y se ejecuta solo manualmente desde **Actions**. WAVE analiza la pagina desde sus servidores, asi que necesita una URL HTTPS publica; `localhost` no es accesible para el servicio remoto. Configura `WAVE_API_KEY` como secret y `WAVE_TARGET_URL` como variable del repositorio en **Settings > Secrets and variables > Actions**. En una ejecucion manual puedes indicar otra URL; dejala vacia para usar la variable. La auditoria solicita `reporttype=2` (2 creditos API por pagina) y el JSON se descarga desde el artefacto `wave-accessibility-report`.

## Reportes de pruebas en Kiwi TCMS

El workflow `.github/workflows/kiwi-tcms.yml` importa a Kiwi TCMS el reporte JUnit que produce el workflow Selenium, sin volver a ejecutar las pruebas. Se ejecuta al terminar Selenium para un push a `main`; los pull requests no se importan porque su artefacto no debe procesarse con credenciales privilegiadas. Configura la variable `KIWI_TCMS_URL` (endpoint HTTPS terminado en `/xml-rpc/`) y los secrets `KIWI_TCMS_USERNAME` y `KIWI_TCMS_PASSWORD` en GitHub. Si faltan credenciales o el reporte, el workflow lo indica y omite la importacion; el reporte Selenium sigue descargable como artefacto.

El registro de alumnos valida nombres, apellidos y DNI de 8 digitos en el navegador y en la API. La tabla `alumno` aplica una restriccion unica al DNI; la API tambien convierte duplicados en respuestas HTTP 409. Con MySQL desconectado, los registros quedan guardados en el almacenamiento local del navegador y se conservan al actualizar o volver a iniciar sesion.

Para guardar un reporte JUnit junto con las capturas, ejecuta:

```powershell
.\.venv\Scripts\python.exe -m pytest -q --junitxml=capturas_evidencia\reporte_selenium.xml
```

El esquema de `sistema_academico.sql` incluye sexo, procedencia y direccion para los alumnos, y una tabla `apoderado` relacionada con cada alumno. Los contactos incluidos son datos ficticios para pruebas; sus correos usan el dominio reservado `example.invalid`. El script SQL reinicia las tablas y sus datos, por lo que debe usarse solo para crear o restablecer la base de demostracion.
