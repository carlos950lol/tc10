import pytest
from selenium.webdriver.common.by import By

from tests.selenium_helpers import open_login


@pytest.mark.local
def test_ruta_dashboard_sin_sesion_muestra_login(driver, base_url):
    open_login(driver, f"{base_url}/dashboard.html")

    assert driver.find_element(By.ID, "login-screen").is_displayed()
    assert "active" not in driver.find_element(By.ID, "portal-screen").get_attribute("class").split()


@pytest.mark.local
def test_api_dashboard_requiere_autenticacion(driver, base_url):
    open_login(driver, base_url)
    status_code = driver.execute_async_script(
        """
        const done = arguments[0];
        fetch('/api/dashboard')
          .then(response => done(response.status))
          .catch(error => done(String(error)));
        """
    )

    assert status_code in (401, 403), (
        f"Se esperaba 401/403 sin sesión, pero /api/dashboard respondió {status_code}."
    )
