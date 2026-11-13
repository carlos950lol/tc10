from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

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
    local_only=False,
):
    if local_only:
        driver.execute_script(
            """
            window.__tc10OriginalFetch = window.fetch.bind(window);
            window.fetch = (input, init) => String(input).endsWith('/api/alumno')
              ? Promise.resolve(new Response(
                  JSON.stringify({error: 'MySQL no disponible.'}),
                  {status: 503, headers: {'Content-Type': 'application/json'}}
                ))
              : window.__tc10OriginalFetch(input, init);
            """
        )
    driver.find_element(By.ID, "ci-reg-tipo").send_keys("alumno")
    driver.find_element(By.ID, "ci-reg-nombres").send_keys(names)
    driver.find_element(By.ID, "ci-reg-apellidos").send_keys(surnames)
    driver.find_element(By.ID, "ci-reg-dni").send_keys(dni)
    driver.find_element(
        By.CSS_SELECTOR, "#page-registro button[onclick='submitRegistroForm()']"
    ).click()


def registration_error(driver):
    return WebDriverWait(driver, 10).until(
        lambda browser: browser.find_element(By.ID, "ci-reg-error").text.strip()
    )


def register_student_via_api(driver, *, names, surnames, dni):
    return driver.execute_async_script(
        """
        const done = arguments[arguments.length - 1];
        window.__tc10OriginalFetch('/api/alumno', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            nombre: arguments[0],
            apellido: arguments[1],
            dni: arguments[2]
          })
        }).then(async response => done({
          status: response.status,
          body: await response.json()
        })).catch(error => done({error: String(error)}));
        """,
        names,
        surnames,
        dni,
    )


def registration_count_for_dni(driver, dni):
    return driver.execute_script(
        "return allRegistros.filter(registro => String(registro.dni || '').trim() === arguments[0]).length;",
        dni,
    )
