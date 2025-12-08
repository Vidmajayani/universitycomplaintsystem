from selenium.webdriver.common.by import By

class Login_Page:
    #locators
    inputfield_email_id = "email"
    inputfield_password_id = "password"
    button_login_xpath = "//button[@type='submit']"
    # todo: uncomment after development
    #logout_link_text = "Log Out"

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

    # 2: enter password

    def enter_password(self, password):
        # identify the password input field
        self.driver.find_element(By.ID, self.inputfield_password_id).clear()
        # send the password
        self.driver.find_element(By.ID, self.inputfield_password_id).send_keys(password)

    # 3: click login

    def click_login(self):
        # identify the login button
        # perform click action
        self.driver.find_element(By.XPATH, self.button_login_xpath).click()

   # todo: uncomment after development
    # def click_logout(self):
    #     self.driver.find_element(By.LINK_TEXT, self.logout_link_text).click()