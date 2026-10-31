import pytest
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tests.selenium_helpers import open_login


@pytest.mark.local
def test_inicio_sesion_rechaza_credenciales_incorrectas(driver, base_url):
    wait = open_login(driver, base_url)
    driver.find_element(By.ID, "login-email").send_keys("no-existe@example.test")
    driver.find_element(By.ID, "login-pass").send_keys("incorrecta")
    driver.find_element(By.CSS_SELECTOR, "button.login-btn").click()

    error = wait.until(EC.visibility_of_element_located((By.ID, "login-error")))
    assert "incorrectos" in error.text.lower()
    assert "active" not in driver.find_element(By.ID, "portal-screen").get_attribute("class").split()
