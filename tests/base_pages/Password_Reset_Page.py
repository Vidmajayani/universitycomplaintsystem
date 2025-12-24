from selenium.webdriver.common.by import By


class PasswordResetPage:
    # locators
    email_input_id = "email"
    reset_password_button_xpath = "//button[@type='submit']"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: enter email

    def enter_email(self, email):
        # identify the email input field
        self.driver.find_element(By.ID, self.email_input_id).clear()
        # send the email
        self.driver.find_element(By.ID, self.email_input_id).send_keys(email)

    # 2: click send reset link

    def click_reset(self):
        # identify the reset button
        # perform click action
        self.driver.find_element(By.XPATH, self.reset_password_button_xpath).click()
