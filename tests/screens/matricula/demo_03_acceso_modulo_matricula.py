import pytest
from selenium.webdriver.common.by import By

from tests.selenium_helpers import USERS, login_as, open_registration_module


@pytest.mark.local
@pytest.mark.parametrize("role", ["jefe", "registrador"])
def test_acceso_modulo_matricula_por_rol_autorizado(driver, base_url, role):
    credentials = next(user for user in USERS if user[0] == role)
    wait = login_as(driver, base_url, credentials)
    open_registration_module(driver, wait)

    assert driver.find_element(By.ID, "matricula-table").is_displayed()
    assert driver.find_element(By.ID, "ci-mat-alumno-registrado").is_displayed()
