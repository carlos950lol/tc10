from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

from tc10_pruebas.selenium_helpers import USERS, login_as


def open_registration_page(driver, base_url):
    wait = login_as(driver, base_url, USERS[2])
    wait.until(EC.element_to_be_clickable((By.ID, "nav-registro"))).click()
    wait.until(
        lambda browser: "active"
        in browser.find_element(By.ID, "page-registro").get_attribute("class").split()
    )
    return wait


def submit_student_registration(
    driver,
    *,
    names,
    surnames,
    dni,
):
    driver.find_element(By.ID, "ci-reg-tipo").send_keys("alumno")
    driver.find_element(By.ID, "ci-reg-nombres").send_keys(names)
    driver.find_element(By.ID, "ci-reg-apellidos").send_keys(surnames)
    driver.find_element(By.ID, "ci-reg-dni").send_keys(dni)
    driver.find_element(
        By.CSS_SELECTOR, "#page-registro button[onclick='submitRegistroForm()']"
    ).click()


def registration_count_for_dni(driver, dni):
    return driver.execute_script(
        "return allRegistros.filter(registro => String(registro.dni || '').trim() === arguments[0]).length;",
        dni,
    )
