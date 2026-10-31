import pytest
from selenium.webdriver.common.by import By

from tests.selenium_helpers import USERS, login_as, open_registration_module


@pytest.mark.local
def test_navegacion_entre_panel_y_matricula(driver, base_url):
    wait = login_as(driver, base_url, USERS[3])
    open_registration_module(driver, wait)

    driver.find_element(
        By.CSS_SELECTOR, "#page-matricula button[onclick=\"showPage('dashboard')\"]"
    ).click()
    wait.until(
        lambda browser: "active"
        in browser.find_element(By.ID, "page-dashboard").get_attribute("class").split()
    )
    open_registration_module(driver, wait)

    assert "active" in driver.find_element(By.ID, "page-matricula").get_attribute("class").split()
