from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class LoginPage:
    # locators
    email_input_id = "email"
    password_input_id = "password"
    login_button_xpath = "//button[@type='submit']"

    # constructor
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, 20)

    # action methods

    # 1: enter email
    def enter_email(self, email):
        element = self.wait.until(
            EC.presence_of_element_located((By.ID, self.email_input_id))
        )
        element.clear()
        element.send_keys(email)

    # 2: enter password
    def enter_password(self, password):
        element = self.wait.until(
            EC.presence_of_element_located((By.ID, self.password_input_id))
        )
        element.clear()
        element.send_keys(password)

    # 3: click login
    def click_login(self):
        element = self.wait.until(
            EC.element_to_be_clickable((By.XPATH, self.login_button_xpath))
        )
        element.click()
