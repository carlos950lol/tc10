import uuid

import pytest
from selenium.webdriver.common.by import By

from tests.screens.registro_alumno.helpers import (
    open_registration_page,
    submit_student_registration,
)


@pytest.mark.local
def test_tc016_conserva_tildes_y_enie_en_nombres(driver, base_url):
    open_registration_page(driver, base_url)
    names = f"José TC016-{uuid.uuid4().hex[:8]}"
    full_name = f"{names} Peña Núñez"

    submit_student_registration(
        driver,
        names=names,
        surnames="Peña Núñez",
        dni="73000033",
    )

    assert full_name in driver.find_element(By.ID, "dt-registro-detalle").text
    assert full_name in driver.find_element(By.ID, "registro-list").text
