import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.alert import Alert

from tests.base_pages.Login_Page import Login_Page
from tests.utilities.read_properties import Read_Config
from tests.utilities.custom_logger import Log_Maker

class Test_01_Login:

    login_page_url = Read_Config.get_login_page_url()
    email = Read_Config.get_email()
    password = Read_Config.get_password()
    invalid_email = Read_Config.get_invalid_email()

    logger = Log_Maker.log_gen()

    # verify title of the login page
    def test_title_verification(self, setup):
        self.logger.info("********** Test 01 Login Started **********")
        self.logger.info("********** Login Page Title Verification Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page 
        driver.get(self.login_page_url)
        # fetch the title
        actual_login_title = driver.title
        expected_login_title = "ComplaNet — Login"

        # compare the actual and expected title
        # if actual and expected title matches, the test passes

        if actual_login_title == expected_login_title:
            self.logger.info("********** Login Page Title Matched  **********")
            assert True
            # close the browser
            driver.close()
        
        # however, if the title does not match, the test fails
        else:
            # capture the screenshot
            # store the screenshot in the screenshots folder
            driver.save_screenshot(".\\tests\\screenshots\\test_title_verification.png")
            self.logger.info("********** Login Page Title Not Matched **********")
            driver.close()
            assert False

    # valid admin login
    def test_valid_login(self, setup):
        self.logger.info("********** Valid Login Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page 
        driver.get(self.login_page_url)
        # object for Login_Page class
        # pass the driver
        self.login_page = Login_Page(driver)
        # pass the email
        self.login_page.enter_email(self.email)
        # pass the password
        self.login_page.enter_password(self.password)
        # perform click action
        self.login_page.click_login()

        # wait for the admin dashboard page to load
        time.sleep(3)

        # fetch the title
        actual_dashboard_title = driver.title
        expected_dashboard_title = "ComplaNet — Admin Dashboard"

        # compare the actual and expected title
        # if actual and expected title matches, the test passes

        if actual_dashboard_title == expected_dashboard_title:
            self.logger.info("********** Admin Dashboard Title Matched **********")
            assert True
            # close the browser
            driver.close()
        
        # however, if the title does not match, the test fails
        else:
            # capture the screenshot
            # store the screenshot in the screenshots folder
            driver.save_screenshot(".\\tests\\screenshots\\test_valid_login.png") 
            self.logger.info("********** Admin Dashboard Title Not Matched **********")
            driver.close()
            assert False

    # invalid admin login 
    def test_invalid_login(self, setup):
        self.logger.info("********** Invalid Login Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page 
        driver.get(self.login_page_url)
        # object for Login_Page class
        # pass the driver
        self.login_page = Login_Page(driver)
        # pass the email
        self.login_page.enter_email(self.invalid_email)
        # pass the password
        self.login_page.enter_password(self.password)
        # perform click action
        self.login_page.click_login()

        # wait for the alert to appear
        time.sleep(3)

        # switch to alert
        alert = Alert(driver)

        # fetch the alert message

        actual_alert_message = alert.text
        expected_alert_message = "Login failed: Invalid login credentials"

        # compare the actual and the expected alert message
        # if actual and expected message matches, the test passes

        if actual_alert_message == expected_alert_message:
            self.logger.info("********** Error Message Matched **********")
            assert True
            # accept the alert
            alert.accept()
            # close the browser
            driver.close()
        
        # however, if the message does not match, the test fails
        else:
            self.logger.info("********** Error Message Not Matched **********")
            # accept the alert
            alert.accept()
            # capture the screenshot
            # save the screenshot in the screenshots folder
            driver.save_screenshot(".\\tests\\screenshots\\test_invalid_login.png")
            # close the browser
            driver.close()
            assert False

