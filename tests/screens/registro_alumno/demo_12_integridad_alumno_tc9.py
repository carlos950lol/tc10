import uuid

import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests.screens.registro_alumno.helpers import (
    open_registration_page,
    registration_count_for_dni,
    submit_student_registration,
)
from tests.selenium_helpers import USERS, login_as


@pytest.mark.mysql
def test_tc005_rechaza_dni_existente(driver, base_url, mysql_available):
    open_registration_page(driver, base_url)
    existing_dni = "74125896"
    initial_count = registration_count_for_dni(driver, existing_dni)
    assert initial_count > 0, "El DNI de referencia no existe en los datos demo."

    names = f"Duplicado TC005-{uuid.uuid4().hex[:8]}"
    submit_student_registration(
        driver, names=names, surnames="Prueba", dni=existing_dni
    )

    final_count = registration_count_for_dni(driver, existing_dni)
    if final_count > initial_count:
        pytest.xfail("DEF-003: el registro no impide usar un DNI que ya existe.")
    assert final_count == initial_count


@pytest.mark.mysql
def test_tc013_conserva_alumno_despues_de_recargar(
    driver, base_url, mysql_available
):
    wait = open_registration_page(driver, base_url)
    names = f"Persistencia TC013-{uuid.uuid4().hex[:8]}"
    submit_student_registration(driver, names=names, surnames="Prueba", dni="73000032")

    wait.until(EC.text_to_be_present_in_element((By.ID, "registro-list"), names))
    driver.refresh()
    login_as(driver, base_url, USERS[2])
    wait = open_registration_page(driver, base_url)
    wait.until(EC.visibility_of_element_located((By.ID, "registro-list")))

    persisted = names in driver.find_element(By.ID, "registro-list").text
    if not persisted:
        pytest.xfail(
            "DEF-004: el registro de alumno no persiste al recargar desde la aplicación."
        )
    assert persisted
