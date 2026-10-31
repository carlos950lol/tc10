from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


USERS = [
    ("teacher", "prof@acadecam.edu.pe", "decam2024"),
    ("student", "alumno@acadecam.edu.pe", "alumno2024"),
    ("jefe", "jefe@acadecam.edu.pe", "jefe2024"),
    ("registrador", "registrador@acadecam.edu.pe", "reg2024"),
]


def open_login(driver, base_url):
    driver.get(base_url)
    wait = WebDriverWait(driver, 15)
    wait.until(lambda browser: browser.execute_script("return document.readyState") == "complete")
    wait.until(EC.visibility_of_element_located((By.ID, "login-screen")))
    return wait


def login(driver, wait, role, email, password):
    wait.until(EC.element_to_be_clickable((By.ID, f"tab-{role}"))).click()
    driver.find_element(By.ID, "login-email").send_keys(email)
    driver.find_element(By.ID, "login-pass").send_keys(password)
    driver.find_element(By.CSS_SELECTOR, "button.login-btn").click()
    wait.until(EC.visibility_of_element_located((By.ID, "portal-screen")))
    wait.until(EC.visibility_of_element_located((By.ID, "page-dashboard")))


def login_as(driver, base_url, credentials):
    wait = open_login(driver, base_url)
    login(driver, wait, *credentials)
    return wait


def open_registration_module(driver, wait):
    nav = wait.until(EC.visibility_of_element_located((By.ID, "nav-matricula")))
    nav.click()
    wait.until(
        lambda browser: "active"
        in browser.find_element(By.ID, "page-matricula").get_attribute("class").split()
    )
    wait.until(EC.visibility_of_element_located((By.ID, "ci-mat-buscar-alumno")))
