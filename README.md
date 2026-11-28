# TC10 - Sistema Academico

Aplicacion web, API local y pruebas automatizadas con Selenium.

## Preparacion

1. Instala Node.js, Python, MySQL y Chrome o Edge.
2. Usa una base de datos de pruebas y ejecuta `sistema_academico.sql`. **El script elimina todas las tablas y sus datos en `sistema_academico` y las vuelve a crear**, cargando los datos demo. No lo ejecutes sobre una base con información que quieras conservar.
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

Abre `http://localhost:3001`. En otra terminal, ejecuta las pruebas:

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

## Flujo de cursos y matrícula

La ubicacion de cada alumno se registra como nivel, grado y seccion: primaria tiene seis grados y secundaria cinco, cada uno con secciones A, B y C. La edad de referencia va de 6-7 años en primero de primaria a 16-17 años en quinto de secundaria. Un alumno puede matricularse en varios cursos. El catalogo demo contiene Matematicas, Comunicacion, Programacion y Educacion Fisica.

Un curso puede ser impartido por varios docentes en ofertas distintas, pero cada docente queda asociado a un solo curso. Cada oferta (curso, nivel, grado, seccion y periodo) admite un docente. El SQL general conserva intactas las cuatro cuentas demo originales, agrega 120 alumnos, 10 docentes, 2 jefes academicos y 4 registradores, y matricula a 110 de los alumnos nuevos en los cuatro cursos para el periodo `2026-II`. Los otros 10 alumnos nuevos quedan sin matricula.

Las cuentas nuevas usan la contraseña temporal `Temporal#2026!` y deben cambiarla al iniciar sesion. Los correos se forman con la primera letra del nombre y el apellido, seguidos del dominio correspondiente: `@academiadecam.edu.pe` para alumnos y `@acadecam.edu.pe` para personal.

## Pruebas de carga con JMeter

El plan `jmeter/tc10-load-test.jmx` verifica la pagina principal, el estado de salud, el inicio de sesion y una consulta autenticada. El workflow de GitHub Actions ejecuta una carga acotada por defecto (5 usuarios, ramp-up de 5 segundos y 2 iteraciones); al iniciarlo manualmente se pueden cambiar esos valores dentro de los limites del formulario. El reporte HTML, los resultados JTL y los logs se descargan desde **Actions > ejecucion > Artifacts > reporte-jmeter**.

Para ejecutar el plan localmente, inicia la aplicacion en el puerto 3001 (`$env:API_PORT = "3001"; node backend/servidor.js`) y ejecuta desde la raiz con JMeter instalado:

```powershell
$run = Get-Date -Format yyyyMMdd-HHmmss
New-Item -ItemType Directory -Force "jmeter\results\$run"
jmeter.bat -n -t jmeter\tc10-load-test.jmx -Jhost=127.0.0.1 -Jport=3001 -Jthreads=5 -JrampUp=5 -Jloops=2 -l "jmeter\results\$run\results.jtl" -e -o "jmeter\results\$run\html"
```

Los valores `threads`, `rampUp` y `loops` tambien se pueden cambiar en la linea de comandos; el plan permite parametrizar host, puerto y credenciales de demostracion mediante propiedades `-J`.

## Reportes de pruebas en Kiwi TCMS

El workflow `.github/workflows/kiwi-tcms.yml` importa a Kiwi TCMS el reporte JUnit que produce el workflow Selenium, sin volver a ejecutar las pruebas. Se ejecuta al terminar Selenium para un push a `main`; los pull requests no se importan porque su artefacto no debe procesarse con credenciales privilegiadas. Configura la variable `KIWI_TCMS_URL` (endpoint HTTPS terminado en `/xml-rpc/`) y los secrets `KIWI_TCMS_USERNAME` y `KIWI_TCMS_PASSWORD` en GitHub. Si faltan credenciales o el reporte, el workflow lo indica y omite la importacion; el reporte Selenium sigue descargable como artefacto.

El registro de alumnos valida nombres, apellidos y DNI de 8 digitos en el navegador y en la API. La tabla `alumno` aplica una restriccion unica al DNI; la API tambien convierte duplicados en respuestas HTTP 409. Con MySQL desconectado, los registros quedan guardados en el almacenamiento local del navegador y se conservan al actualizar o volver a iniciar sesion.

Al registrar personal, la API genera el correo institucional con el nombre completo normalizado y el dominio `acadecam.edu.pe` (por ejemplo, `ana.perez@acadecam.edu.pe`). Si el correo ya aparece en las cuentas o registros existentes, rechaza el alta con HTTP 409.

Para guardar un reporte JUnit junto con las capturas, ejecuta:

```powershell
.\.venv\Scripts\python.exe -m pytest -q --junitxml=capturas_evidencia\reporte_selenium.xml
```

El esquema de `sistema_academico.sql` incluye sexo, procedencia y direccion para los alumnos, y una tabla `apoderado` relacionada con cada alumno. Los contactos demo usan el dominio reservado `example.invalid`. El script reinicia las tablas y los datos de prueba en cada ejecucion.
