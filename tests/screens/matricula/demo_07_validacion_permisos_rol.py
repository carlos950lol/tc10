import pytest
from selenium.webdriver.common.by import By

from tests.selenium_helpers import USERS, login_as


@pytest.mark.local
def test_alumno_no_ve_enlace_matricula(driver, base_url):
    login_as(driver, base_url, USERS[1])

    assert not driver.find_element(By.ID, "nav-matricula").is_displayed()


@pytest.mark.local
def test_alumno_no_abre_matricula_por_navegacion_directa(driver, base_url):
    login_as(driver, base_url, USERS[1])
    driver.execute_script("showPage('matricula')")

    matricula_page = driver.find_element(By.ID, "page-matricula")
    assert "active" not in matricula_page.get_attribute("class").split(), (
        "El rol alumno pudo abrir Matrícula llamando a showPage('matricula')."
    )
    assert "active" in driver.find_element(By.ID, "page-dashboard").get_attribute("class").split()


@pytest.mark.local
def test_api_matricula_deniega_acceso_a_rol_alumno(driver, base_url):
    login_as(driver, base_url, USERS[1])
    status_code = driver.execute_async_script(
        """
        const done = arguments[0];
        fetch('/api/matricula')
          .then(response => done(response.status))
          .catch(error => done(String(error)));
        """
    )

    assert status_code == 403, (
        f"Se esperaba 403 para el rol alumno, pero /api/matricula respondió {status_code}."
    )
