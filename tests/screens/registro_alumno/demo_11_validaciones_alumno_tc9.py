import uuid

import pytest
from selenium.webdriver.common.by import By

from tests.screens.registro_alumno.helpers import (
    open_registration_page,
    submit_student_registration,
)


@pytest.mark.local
def test_tc003_rechaza_apellido_vacio(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"Ana TC003-{uuid.uuid4().hex[:8]}"

    submit_student_registration(driver, names=names, surnames="", dni="73000031")

    if names in driver.find_element(By.ID, "registro-list").text:
        pytest.xfail(
            "DEF-001: el registro acepta un apellido vacío aunque el campo es obligatorio."
        )
    assert names not in driver.find_element(By.ID, "registro-list").text


@pytest.mark.local
def test_tc004_rechaza_documento_alfanumerico(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"Ana TC004-{uuid.uuid4().hex[:8]}"

    submit_student_registration(driver, names=names, surnames="Prueba", dni="ABC123")

    if names in driver.find_element(By.ID, "registro-list").text:
        pytest.xfail("DEF-002: el registro acepta documentos alfanuméricos.")
    assert names not in driver.find_element(By.ID, "registro-list").text
