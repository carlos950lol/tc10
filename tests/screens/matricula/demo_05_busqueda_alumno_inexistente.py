import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests.selenium_helpers import USERS, login_as, open_registration_module


@pytest.mark.mysql
def test_busqueda_alumno_inexistente(driver, base_url, mysql_available):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    driver.find_element(By.ID, "matricula-codigo-alumno").send_keys("999999")
    driver.find_element(By.ID, "matricula-buscar-codigo").click()

    message = wait.until(
        EC.visibility_of_element_located((By.ID, "matricula-consulta-mensaje"))
    )
    assert "no se encontraron registros" in message.text.lower()


@pytest.mark.mysql
def test_filtro_matricula_sin_resultados(driver, base_url, mysql_available):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    driver.find_element(By.ID, "matricula-search").send_keys("Alumno que no existe")

    row = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "#matricula-tbody tr")))
    assert "No hay matrículas que coincidan." in row.text
