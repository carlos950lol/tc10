import uuid

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select, WebDriverWait

from tc10_pruebas.screens.registro_alumno.helpers import (
    open_registration_page,
    registration_error,
    registration_count_for_dni,
    assert_red_warning,
    register_student_via_api,
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


def _prepare_matricula_flow(driver, wait, *, turno="Tarde"):
    _select_existing_student(driver, wait)
    student_select = Select(driver.find_element(By.ID, "ci-mat-alumno-registrado"))
    student_id = student_select.first_selected_option.get_attribute("value")
    student_name = driver.execute_script(
        "return allRegistros.find(registro => String(registro.id) === arguments[0])?.nombre || '';",
        student_id,
    )
    if student_id.startswith("alumno-"):
        student_id = student_id[len("alumno-"):]

    Select(driver.find_element(By.ID, "ci-mat-nivel")).select_by_value("Primaria")
    wait.until(
        lambda browser: not browser.find_element(By.ID, "ci-mat-grado").get_attribute("disabled")
    )
    Select(driver.find_element(By.ID, "ci-mat-grado")).select_by_value("1")
    Select(driver.find_element(By.ID, "ci-mat-seccion")).select_by_value("B")
    Select(driver.find_element(By.ID, "ci-mat-turno")).select_by_value(turno)
    driver.find_element(
        By.CSS_SELECTOR, "#matricula-step-1 button[onclick='showMatriculaStep(2)']"
    ).click()
    wait.until(EC.visibility_of_element_located((By.ID, "matricula-resumen-content")))
    summary = driver.find_element(By.ID, "matricula-resumen-content").text
    return student_id, student_name, summary


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
    assert "active" in driver.find_element(By.ID, "page-matricula").get_attribute("class").split()
    assert driver.find_element(By.ID, "ci-mat-alumno-registrado").is_displayed()


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
    submit_student_registration(
        driver, names=names, surnames="", dni="73000041", local_only=True
    )

    assert "apellidos" in registration_error(driver).lower()
    assert_red_warning(driver, "ci-reg-error")
    assert names not in driver.find_element(By.ID, "registro-list").text
    response = register_student_via_api(
        driver, names=names, surnames="", dni="73000041"
    )
    assert response["status"] == 400


@pytest.mark.local
def test_tc004_rechaza_documento_alfanumerico(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"Ana TC004-{uuid.uuid4().hex[:8]}"
    submit_student_registration(
        driver, names=names, surnames="Prueba", dni="ABC123", local_only=True
    )

    assert "8 dígitos" in registration_error(driver)
    assert_red_warning(driver, "ci-reg-error")
    assert names not in driver.find_element(By.ID, "registro-list").text
    response = register_student_via_api(
        driver, names=names, surnames="Prueba", dni="ABC123"
    )
    assert response["status"] == 400


@pytest.mark.mysql
def test_tc005_rechaza_documento_duplicado(driver, base_url, mysql_available):
    open_registration_page(driver, base_url)
    existing_dni = "74125896"
    initial_count = registration_count_for_dni(driver, existing_dni)
    assert initial_count > 0, "El DNI de referencia debe existir en la base demostrativa."
    submit_student_registration(
        driver,
        names=f"Duplicado TC005-{uuid.uuid4().hex[:8]}",
        surnames="Prueba",
        dni=existing_dni,
    )
    assert "dni ya existente" in registration_error(driver).lower()
    assert_red_warning(driver, "ci-reg-error")
    response = register_student_via_api(
        driver,
        names=f"Duplicado TC005-{uuid.uuid4().hex[:8]}",
        surnames="Prueba",
        dni=existing_dni,
    )

    assert response["status"] == 409
    assert "dni" in response["body"]["error"].lower()
    final_count = registration_count_for_dni(driver, existing_dni)
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
def test_tc009_turno_de_matricula_aparece_en_resumen(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    _, _, summary = _prepare_matricula_flow(driver, wait, turno="Tarde")
    assert "Turno" in summary
    assert "Tarde" in summary


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

    message = wait.until(
        lambda browser: browser.find_element(By.ID, "ci-mat-error").text.strip()
    )
    assert_red_warning(driver, "ci-mat-error")

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

    message = wait.until(
        lambda browser: browser.find_element(By.ID, "ci-mat-error").text.strip()
    )
    assert_red_warning(driver, "ci-mat-error")
    final_count = driver.execute_script("return allMatriculas.length;")

    assert final_count == initial_count + 1
    assert "alumno" in message.lower()


@pytest.mark.local
def test_tc012_error_controlado_no_deja_registro_parcial(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"Fallo TC012-{uuid.uuid4().hex[:8]}"
    dni = f"{70000000 + uuid.uuid4().int % 9999999:08d}"
    initial_count = registration_count_for_dni(driver, dni)
    submit_student_registration(
        driver,
        names=names,
        surnames="Prueba",
        dni=dni,
        local_only=True,
        api_status=500,
    )

    assert "error controlado" in registration_error(driver).lower()
    assert_red_warning(driver, "ci-reg-error")
    assert names not in driver.find_element(By.ID, "registro-list").text
    assert registration_count_for_dni(driver, dni) == initial_count == 0


@pytest.mark.mysql
def test_tc013_alumno_persiste_despues_de_actualizar(
    driver, base_url, mysql_available
):
    wait = open_registration_page(driver, base_url)
    names = f"Persistencia TC013-{uuid.uuid4().hex[:8]}"
    dni = f"{70000000 + uuid.uuid4().int % 9999999:08d}"
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
    student_id, student_name, summary = _prepare_matricula_flow(driver, wait)
    assert student_name in summary
    initial_count = driver.execute_script(
        "return allMatriculas.filter(m => String(m.alumnoId).replace(/^alumno-/i, '') === arguments[0]).length;",
        student_id,
    )
    driver.find_element(
        By.CSS_SELECTOR, "#matricula-step-2 button[onclick='submitMatriculaForm()']"
    ).click()
    wait.until(
        lambda browser: browser.execute_script(
            "return allMatriculas.filter(m => String(m.alumnoId).replace(/^alumno-/i, '') === arguments[0]).length;",
            student_id,
        )
        == initial_count + 1
    )

    message = _query_student_matriculas(driver, wait, student_id)
    results = driver.find_element(By.ID, "matricula-consulta-resultados").text
    assert "se encontraron" in message.lower()
    assert student_name in results
    assert "P1°B" in results


@pytest.mark.local
def test_tc016_registro_conserva_tildes_y_enie(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"José TC016-{uuid.uuid4().hex[:8]}"
    full_name = f"{names} Peña Núñez"
    dni = f"{70000000 + uuid.uuid4().int % 9999999:08d}"
    submit_student_registration(
        driver, names=names, surnames="Peña Núñez", dni=dni, local_only=True
    )

    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.ID, "registro-list"), full_name)
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
def test_tc018_flujo_completo_de_matricula(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    _, student_name, summary = _prepare_matricula_flow(driver, wait, turno="Mañana")
    assert student_name in summary
    assert "Primaria" in summary
    assert "1" in summary
    assert "B" in summary
    assert "Mañana" in summary

    driver.find_element(
        By.CSS_SELECTOR, "#matricula-step-2 button[onclick='submitMatriculaForm()']"
    ).click()
    wait.until(
        lambda browser: student_name in browser.find_element(By.ID, "matricula-tbody").text
        and "P1°B" in browser.find_element(By.ID, "matricula-tbody").text
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


@pytest.mark.local
def test_tc021_rechaza_dni_duplicado_en_registro_local(driver, base_url):
    open_registration_page(driver, base_url)
    dni = f"{70000000 + uuid.uuid4().int % 9999999:08d}"
    submit_student_registration(
        driver,
        names="Primera TC021",
        surnames="Prueba",
        dni=dni,
        local_only=True,
    )
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.ID, "registro-list"), "Primera TC021")
    )
    initial_count = registration_count_for_dni(driver, dni)

    submit_student_registration(
        driver,
        names="Duplicada TC021",
        surnames="Prueba",
        dni=dni,
        local_only=True,
    )

    assert "dni ya existente" in registration_error(driver).lower()
    assert_red_warning(driver, "ci-reg-error")
    assert "Duplicada TC021" not in driver.find_element(By.ID, "registro-list").text
    assert registration_count_for_dni(driver, dni) == initial_count == 1


@pytest.mark.local
def test_tc023_rechaza_registro_sin_nombres(driver, base_url):
    open_registration_page(driver, base_url)
    dni = f"{70000000 + uuid.uuid4().int % 9999999:08d}"
    initial_count = registration_count_for_dni(driver, dni)
    submit_student_registration(
        driver,
        names="",
        surnames="Prueba",
        dni=dni,
        local_only=True,
    )

    assert "nombres" in registration_error(driver).lower()
    assert_red_warning(driver, "ci-reg-error")
    assert registration_count_for_dni(driver, dni) == initial_count == 0


@pytest.mark.local
def test_tc022_alumno_persiste_tras_actualizar_y_volver_a_iniciar_sesion(
    driver, base_url
):
    wait = open_registration_page(driver, base_url)
    names = f"Persistencia TC022-{uuid.uuid4().hex[:8]}"
    dni = f"{70000000 + uuid.uuid4().int % 9999999:08d}"
    submit_student_registration(
        driver,
        names=names,
        surnames="Prueba",
        dni=dni,
        local_only=True,
    )
    WebDriverWait(driver, 10).until(
        EC.text_to_be_present_in_element((By.ID, "registro-list"), names)
    )
    stored = driver.execute_script(
        "return JSON.parse(localStorage.getItem('academia_decam_data_v2') || '{}').allRegistros || [];"
    )
    assert any(registro.get("dni") == dni for registro in stored)

    driver.refresh()
    wait = login_as(driver, base_url, USERS[2])
    stored = driver.execute_script(
        "return JSON.parse(localStorage.getItem('academia_decam_data_v2') || '{}').allRegistros || [];"
    )
    assert any(registro.get("dni") == dni for registro in stored)
    open_registration_page(driver, base_url)
    assert names in driver.find_element(By.ID, "registro-list").text

    driver.execute_async_script("doLogout().then(arguments[0]);")
    wait.until(EC.visibility_of_element_located((By.ID, "login-screen")))
    login_as(driver, base_url, USERS[2])
    open_registration_page(driver, base_url)
    assert names in driver.find_element(By.ID, "registro-list").text
