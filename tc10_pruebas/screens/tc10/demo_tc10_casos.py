import uuid

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

from tc10_pruebas.screens.registro_alumno.helpers import (
    open_registration_page,
    registration_count_for_dni,
    submit_student_registration,
)
from tc10_pruebas.selenium_helpers import (
    USERS,
    login_as,
    open_login,
    open_registration_module,
)


def _query_student_matriculas(driver, wait, student_code):
    code = driver.find_element(By.ID, "matricula-codigo-alumno")
    code.clear()
    code.send_keys(student_code)
    driver.find_element(By.ID, "matricula-buscar-codigo").click()
    return wait.until(
        lambda browser: browser.find_element(
            By.ID, "matricula-consulta-mensaje"
        ).text.strip()
    )


def _select_existing_student(driver, wait):
    student_select = wait.until(
        EC.presence_of_element_located((By.ID, "ci-mat-alumno-registrado"))
    )
    wait.until(lambda browser: len(Select(student_select).options) > 1)
    select = Select(student_select)
    option = next(option for option in select.options if option.get_attribute("value"))
    select.select_by_value(option.get_attribute("value"))


def _unauthenticated_api_status(driver, path):
    return driver.execute_async_script(
        """
        const done = arguments[arguments.length - 1];
        fetch(arguments[0])
          .then(async response => done({
            status: response.status,
            body: await response.text()
          }))
          .catch(error => done({error: String(error)}));
        """,
        path,
    )


@pytest.mark.local
def test_tc001_inicio_sesion_y_modulo_matricula(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    assert "active" in driver.find_element(By.ID, "page-dashboard").get_attribute("class").split()
    open_registration_module(driver, wait)

    pytest.skip(
        "Bloqueado: el objetivo solo valida inicio de sesión, pero el criterio exige "
        "matricular curso/horario; además el dato ALU-NO-EXISTE contradice la precondición."
    )


@pytest.mark.local
def test_tc002_busqueda_de_alumno_inexistente(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    message = _query_student_matriculas(driver, wait, "ALU-NO-EXISTE")

    assert "no se encontraron registros" in message.lower()


@pytest.mark.local
def test_tc003_rechaza_registro_sin_apellidos(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"Ana TC003-{uuid.uuid4().hex[:8]}"
    submit_student_registration(driver, names=names, surnames="", dni="73000041")

    if names in driver.find_element(By.ID, "registro-list").text:
        pytest.xfail("DEF-001: el registro acepta apellidos vacíos.")
    assert names not in driver.find_element(By.ID, "registro-list").text


@pytest.mark.local
def test_tc004_rechaza_documento_alfanumerico(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"Ana TC004-{uuid.uuid4().hex[:8]}"
    submit_student_registration(driver, names=names, surnames="Prueba", dni="ABC123")

    if names in driver.find_element(By.ID, "registro-list").text:
        pytest.xfail("DEF-002: el registro acepta un documento alfanumérico.")
    assert names not in driver.find_element(By.ID, "registro-list").text


@pytest.mark.mysql
def test_tc005_rechaza_documento_duplicado(driver, base_url, mysql_available):
    open_registration_page(driver, base_url)
    existing_dni = "74125896"
    initial_count = registration_count_for_dni(driver, existing_dni)
    assert initial_count > 0, "El DNI de referencia debe existir en la base demostrativa."
    names = f"Duplicado TC005-{uuid.uuid4().hex[:8]}"

    submit_student_registration(
        driver, names=names, surnames="Prueba", dni=existing_dni
    )

    final_count = registration_count_for_dni(driver, existing_dni)
    if final_count > initial_count:
        pytest.xfail("DEF-003: el sistema permite registrar un DNI duplicado.")
    assert final_count == initial_count


@pytest.mark.mysql
def test_tc006_jefe_academico_consulta_matriculas(driver, base_url, mysql_available):
    wait = login_as(driver, base_url, USERS[2])
    open_registration_module(driver, wait)

    message = _query_student_matriculas(driver, wait, "1")
    results = driver.find_element(By.ID, "matricula-consulta-resultados").text

    assert "se encontraron" in message.lower()
    assert "MAT-0001" in results
    assert "Valeria Castillo Rojas" in results


@pytest.mark.mysql
def test_tc007_registrador_consulta_matriculas(driver, base_url, mysql_available):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    message = _query_student_matriculas(driver, wait, "1")
    results = driver.find_element(By.ID, "matricula-consulta-resultados").text

    assert "se encontraron" in message.lower()
    assert "MAT-0001" in results
    assert "74125896" in results


@pytest.mark.local
def test_tc008_estudiante_no_consulta_matriculas(driver, base_url):
    login_as(driver, base_url, USERS[1])
    response = _unauthenticated_api_status(driver, "/api/matricula")

    assert response["status"] == 403
    assert "matriculas" not in response.get("body", "").lower()


@pytest.mark.local
def test_tc009_horario_no_disponible(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    pytest.skip(
        "Bloqueado: la pantalla actual no ofrece cursos ni horarios con estado disponible/no disponible."
    )


@pytest.mark.mysql
def test_tc010_rechaza_matricula_sin_datos_academicos(
    driver, base_url, mysql_available
):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    _select_existing_student(driver, wait)
    driver.find_element(
        By.CSS_SELECTOR, "#page-matricula .topbar button"
    ).click()

    alert = wait.until(EC.alert_is_present())
    message = alert.text
    alert.accept()

    assert "nivel" in message.lower()
    assert "grado" in message.lower()
    assert "sección" in message.lower()


@pytest.mark.mysql
def test_tc011_doble_confirmacion_no_crea_dos_matriculas(
    driver, base_url, mysql_available
):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    _select_existing_student(driver, wait)
    Select(driver.find_element(By.ID, "ci-mat-nivel")).select_by_value("Primaria")
    wait.until(
        lambda browser: not browser.find_element(By.ID, "ci-mat-grado").get_attribute("disabled")
    )
    Select(driver.find_element(By.ID, "ci-mat-grado")).select_by_value("1")
    Select(driver.find_element(By.ID, "ci-mat-seccion")).select_by_value("A")
    initial_count = driver.execute_script("return allMatriculas.length;")
    confirm = driver.find_element(By.CSS_SELECTOR, "#page-matricula .topbar button")
    confirm.click()
    wait.until(
        lambda browser: browser.execute_script("return allMatriculas.length;")
        == initial_count + 1
    )
    confirm.click()

    alert = wait.until(EC.alert_is_present())
    message = alert.text
    alert.accept()
    final_count = driver.execute_script("return allMatriculas.length;")

    assert final_count == initial_count + 1
    assert "seleccionar" in message.lower()


@pytest.mark.local
def test_tc012_error_controlado_no_deja_registro_parcial(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    pytest.skip(
        "Bloqueado: el entorno no tiene mecanismo de inyección de error controlado al guardar."
    )


@pytest.mark.mysql
def test_tc013_alumno_persiste_despues_de_actualizar(
    driver, base_url, mysql_available
):
    wait = open_registration_page(driver, base_url)
    names = f"Persistencia TC013-{uuid.uuid4().hex[:8]}"
    dni = "73000042"
    submit_student_registration(driver, names=names, surnames="Prueba", dni=dni)
    wait.until(EC.text_to_be_present_in_element((By.ID, "registro-list"), names))
    driver.refresh()
    login_as(driver, base_url, USERS[2])
    wait = open_registration_page(driver, base_url)
    wait.until(EC.visibility_of_element_located((By.ID, "registro-list")))

    persisted = names in driver.find_element(By.ID, "registro-list").text
    if not persisted:
        pytest.xfail("DEF-004: el registro no persiste después de actualizar.")
    assert persisted


@pytest.mark.local
def test_tc014_filtro_sin_matriculas_muestra_estado_vacio(driver, base_url):
    wait = login_as(driver, base_url, USERS[2])
    open_registration_module(driver, wait)
    search = driver.find_element(By.ID, "matricula-search")
    search.send_keys(f"sin-resultados-TC014-{uuid.uuid4().hex}")

    row = wait.until(
        EC.visibility_of_element_located((By.CSS_SELECTOR, "#matricula-tbody tr"))
    )
    assert "No hay matrículas que coincidan." in row.text


@pytest.mark.local
def test_tc015_consulta_coincide_con_matricula_creada(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    pytest.skip(
        "Bloqueado: el caso requiere curso/NRC y horario; la aplicación solo permite nivel, grado, sección y turno."
    )


@pytest.mark.local
def test_tc016_registro_conserva_tildes_y_enie(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"José TC016-{uuid.uuid4().hex[:8]}"
    full_name = f"{names} Peña Núñez"
    submit_student_registration(
        driver, names=names, surnames="Peña Núñez", dni="73000043"
    )

    assert full_name in driver.find_element(By.ID, "dt-registro-detalle").text
    assert full_name in driver.find_element(By.ID, "registro-list").text


@pytest.mark.local
def test_tc017_consulta_api_requiere_sesion(driver, base_url):
    open_login(driver, base_url)
    response = _unauthenticated_api_status(driver, "/api/dashboard")

    assert response["status"] in (401, 403)
    assert "login-screen" in driver.page_source
    assert "active" not in driver.find_element(By.ID, "portal-screen").get_attribute("class").split()


@pytest.mark.local
def test_tc018_flujo_completo_con_curso_y_horario(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    pytest.skip(
        "Bloqueado: el flujo exige NRC/curso y horario disponible, campos que no existen en la interfaz actual."
    )


@pytest.mark.mysql
def test_tc019_registrador_consulta_matricula_demo(
    driver, base_url, mysql_available
):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    message = _query_student_matriculas(driver, wait, "1")
    results = driver.find_element(By.ID, "matricula-consulta-resultados").text

    assert "se encontraron" in message.lower()
    assert "MAT-0001" in results
    assert "Valeria Castillo Rojas" in results
    assert "74125896" in results


@pytest.mark.local
def test_tc020_estudiante_no_accede_al_modulo_ni_a_la_api(driver, base_url):
    login_as(driver, base_url, USERS[1])
    assert not driver.find_element(By.ID, "nav-matricula").is_displayed()

    driver.execute_script("showPage('matricula')")
    matricula_page = driver.find_element(By.ID, "page-matricula")
    assert "active" not in matricula_page.get_attribute("class").split()

    response = _unauthenticated_api_status(driver, "/api/matricula")
    assert response["status"] == 403
    assert "matriculas" not in response.get("body", "").lower()
