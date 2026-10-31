import pytest
from selenium.webdriver.common.by import By

from tests.selenium_helpers import USERS, login_as


@pytest.mark.local
@pytest.mark.parametrize(
    ("role", "email", "password"),
    USERS,
    ids=["maestro", "alumno", "jefe_academico", "registrador"],
)
def test_inicio_sesion_valido(driver, base_url, role, email, password):
    login_as(driver, base_url, (role, email, password))

    assert "active" in driver.find_element(By.ID, "page-dashboard").get_attribute("class").split()
    assert "active" not in driver.find_element(By.ID, "login-screen").get_attribute("class").split()
