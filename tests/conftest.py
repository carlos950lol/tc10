import os
import re
import json
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options as ChromeOptions
from selenium.webdriver.edge.options import Options as EdgeOptions
from selenium.common.exceptions import WebDriverException


EVIDENCE_FOLDERS = {
    "demo_01_inicio_sesion_credenciales_validas": "screens/acceso",
    "demo_02_inicio_sesion_datos_incorrectos": "screens/acceso",
    "demo_03_acceso_modulo_matricula": "screens/matricula",
    "demo_04_consulta_matricula_alumno": "screens/matricula",
    "demo_05_busqueda_alumno_inexistente": "screens/matricula",
    "demo_06_consulta_campo_vacio": "screens/matricula",
    "demo_07_validacion_permisos_rol": "screens/matricula",
    "demo_08_acceso_sin_iniciar_sesion": "screens/acceso",
    "demo_09_verificacion_datos_matricula": "screens/matricula",
    "demo_10_navegacion_panel_matricula": "screens/matricula",
    "demo_11_validaciones_alumno_tc9": "screens/registro_alumno",
    "demo_12_integridad_alumno_tc9": "screens/registro_alumno",
    "demo_13_caracteres_alumno_tc9": "screens/registro_alumno",
    "demo_tc9_casos": "screens/tc9",
}


@pytest.fixture
def base_url():
    return os.environ.get("SELENIUM_BASE_URL", "http://localhost:3000").rstrip("/")


@pytest.fixture
def mysql_available(base_url):
    try:
        with urlopen(f"{base_url}/api/salud", timeout=5) as response:
            status = json.load(response)
    except URLError as error:
        pytest.fail(f"No se pudo consultar {base_url}/api/salud: {error}")

    if not status.get("mysql"):
        pytest.skip("Esta prueba necesita MySQL; /api/salud indica modo local.")


@pytest.fixture
def driver():
    browser = os.environ.get("SELENIUM_BROWSER", "chrome").lower()
    headless = os.environ.get("SELENIUM_HEADLESS", "1") != "0"

    if browser == "chrome":
        options = ChromeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1000")
        options.set_capability("goog:loggingPrefs", {"browser": "ALL"})
        instance = webdriver.Chrome(options=options)
    elif browser == "edge":
        options = EdgeOptions()
        if headless:
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1000")
        options.set_capability("ms:loggingPrefs", {"browser": "ALL"})
        instance = webdriver.Edge(options=options)
    else:
        pytest.fail("SELENIUM_BROWSER debe ser 'chrome' o 'edge'.")

    instance.implicitly_wait(0)
    instance.set_page_load_timeout(30)
    yield instance
    instance.quit()


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    expected_failure = report.skipped and hasattr(report, "wasxfail")
    blocked = report.skipped and not expected_failure
    if report.when != "call" or not (
        report.passed or report.failed or expected_failure or blocked
    ):
        return

    browser = item.funcargs.get("driver")
    if browser is None:
        return

    module_name = Path(str(item.path)).stem
    test_name = getattr(item, "originalname", item.name)
    folder = EVIDENCE_FOLDERS.get(test_name)
    if folder is None:
        folder = EVIDENCE_FOLDERS.get(module_name)
    if folder is None:
        return
    evidence_root = Path(os.environ.get("SELENIUM_EVIDENCE_DIR", item.config.rootpath / "capturas_evidencia"))
    if not evidence_root.is_absolute():
        evidence_root = Path(item.config.rootpath) / evidence_root
    evidence_dir = evidence_root / folder
    evidence_dir.mkdir(parents=True, exist_ok=True)
    parameter = item.name[len(test_name):].strip("[]")
    safe_parameter = re.sub(r"[^A-Za-z0-9_.-]+", "_", parameter).strip("_")
    if report.failed or expected_failure:
        result = "FALLO"
    elif blocked:
        result = "BLOQUEADO"
    else:
        result = "PASO"
    file_stem = module_name
    if folder in {"screens/registro_alumno", "screens/tc9"} or module_name in {
        "demo_05_busqueda_alumno_inexistente",
        "demo_07_validacion_permisos_rol",
        "demo_08_acceso_sin_iniciar_sesion",
    }:
        safe_test_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", test_name).strip("_")
        file_stem = f"{file_stem}_{safe_test_name}"
    if safe_parameter:
        file_stem = f"{file_stem}_{safe_parameter}"
    screenshot = evidence_dir / f"{file_stem}_{result}.png"
    details = [
        f"Resultado: {result}",
        f"Test: {item.nodeid}",
        f"URL: {browser.current_url}",
        f"Title: {browser.title}",
    ]

    try:
        browser.save_screenshot(str(screenshot))
        details.append(f"Screenshot: {screenshot}")
    except WebDriverException as error:
        details.append(f"Screenshot error: {error}")

    if report.failed or expected_failure or blocked:
        diagnostics = evidence_dir / f"{file_stem}_{result}.txt"
        try:
            if expected_failure:
                details.append(f"Expected failure: {report.wasxfail}")
            elif blocked:
                details.append(f"Blocked: {report.longrepr}")
            details.append("Visible page text:\n" + browser.find_element("tag name", "body").text[:12000])
        except WebDriverException as error:
            details.append(f"Page text error: {error}")

        try:
            logs = browser.get_log("browser")
            details.append(f"Browser console:\n{logs[-30:]}")
        except WebDriverException as error:
            details.append(f"Browser console unavailable: {error}")

        diagnostics.write_text("\n\n".join(details), encoding="utf-8")
