from selenium.webdriver.common.by import By

class Password_Reset_Page:
    #locators
    inputfield_email_id = "email"
    button_reset_xpath = "//button[@type='submit']"

    # constructor
    def __init__(self, driver):
        self.driver = driver
    
    # action methods

    # 1: enter email

    def enter_email(self, email):
        # identify the email input field
        self.driver.find_element(By.ID, self.inputfield_email_id).clear()
        # send the email 
        self.driver.find_element(By.ID, self.inputfield_email_id).send_keys(email)

    # 2: click send reset link

    def click_reset(self):
        # identify the reset button
        # perform click action
        self.driver.find_element(By.XPATH, self.button_reset_xpath).click()

