import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests.selenium_helpers import USERS, login_as, open_registration_module


@pytest.mark.local
def test_formulario_matricula_vacio_solicita_completar_datos(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    driver.find_element(By.ID, "matricula-buscar-codigo").click()

    message = wait.until(
        EC.visibility_of_element_located((By.ID, "matricula-consulta-mensaje"))
    )
    assert "ingresar el código del alumno" in message.text.lower()
