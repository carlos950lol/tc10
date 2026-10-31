import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests.selenium_helpers import USERS, login_as, open_registration_module


@pytest.mark.mysql
def test_datos_matricula_coinciden_con_registro_demo(driver, base_url, mysql_available):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)
    driver.find_element(By.ID, "matricula-codigo-alumno").send_keys("1")
    driver.find_element(By.ID, "matricula-buscar-codigo").click()

    results = wait.until(
        EC.visibility_of_element_located((By.ID, "matricula-consulta-resultados"))
    )
    wait.until(EC.text_to_be_present_in_element((By.ID, "matricula-consulta-resultados"), "2026-II"))
    assert "Código del alumno: 1" in results.text
    assert "N° Matrícula: MAT-0001" in results.text
    assert "Alumno: Valeria Castillo Rojas" in results.text
    assert "DNI: 74125896" in results.text
    assert "Sección: A" in results.text
    assert "Estado: activa" in results.text
