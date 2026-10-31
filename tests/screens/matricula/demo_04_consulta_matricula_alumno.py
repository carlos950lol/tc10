import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests.selenium_helpers import USERS, login_as, open_registration_module


@pytest.mark.mysql
def test_consulta_matricula_por_codigo_alumno(driver, base_url, mysql_available):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    driver.find_element(By.ID, "matricula-codigo-alumno").send_keys("1")
    driver.find_element(By.ID, "matricula-buscar-codigo").click()

    message = wait.until(
        EC.visibility_of_element_located((By.ID, "matricula-consulta-mensaje"))
    )
    results = driver.find_element(By.ID, "matricula-consulta-resultados")
    wait.until(EC.text_to_be_present_in_element((By.ID, "matricula-consulta-resultados"), "MAT-0001"))
    assert "se encontraron" in message.text.lower()
    assert "Valeria Castillo Rojas" in results.text
    assert "74125896" in results.text
