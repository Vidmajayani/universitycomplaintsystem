import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.alert import Alert

from tests.base_pages.login_page import LoginPage
from tests.base_pages.password_reset_page import PasswordResetPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestPasswordReset:

    login_page_url = ReadConfig.get_login_page_url()
    reset_password_page_url = ReadConfig.get_reset_password_page_url()
    valid_reset_email = ReadConfig.get_valid_reset_email()
    invalid_reset_email = ReadConfig.get_invalid_reset_email()

    logger = LogMaker.log_gen()

    # verify title of the reset password page
    def test_reset_password_page_title_verification(self, setup):
        self.logger.info("********** Test 03 Password Reset Started **********")
        self.logger.info(
            "********** Reset Password Page Title Verification Test Started **********"
        )
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)

        # wait for the page to load
        time.sleep(2)

        # click the forgot password link
        driver.find_element(By.LINK_TEXT, "Forgot Password?").click()

        # wait for the reset password page to load
        time.sleep(2)

        # fetch the title
        actual_reset_title = driver.title
        expected_reset_title = "ComplaNet — Reset Password"

        # compare the actual and expected title
        # if actual and expected title matches, the test passes

        if actual_reset_title == expected_reset_title:
            self.logger.info("********** Reset Password Page Title Matched  **********")
            assert True
            # close the browser
            driver.close()

        # however, if the title does not match, the test fails
        else:
            # capture the screenshot
            # store the screenshot in the screenshots folder
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_reset_password_page_title_verification.png"
            )
            self.logger.info(
                "********** Reset Password Page Title Not Matched **********"
            )
            driver.close()
            assert False

    # valid email password reset
    def test_valid_email_password_reset(self, setup):
        self.logger.info(
            "********** Valid Email Password Reset Test Started **********"
        )
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)

        # wait for the page to load
        time.sleep(2)

        # click the forgot password link
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        wait = WebDriverWait(driver, 10)
        forgot_link = wait.until(
            EC.element_to_be_clickable((By.LINK_TEXT, "Forgot Password?"))
        )
        forgot_link.click()

        # wait for the reset password page to load
        time.sleep(2)

        # object for PasswordResetPage class
        self.reset_page = PasswordResetPage(driver)
        # pass the valid email
        self.reset_page.enter_email(self.valid_reset_email)
        # perform click action
        self.reset_page.click_reset()

        # wait for the alert to appear
        time.sleep(5)

        # switch to alert
        alert = Alert(driver)

        # fetch the alert message

        actual_alert_message = alert.text
        # exact message from resetPassword.js line 66
        expected_alert_message = "Password reset email sent! Please check your inbox."

        # compare the actual and the expected alert message
        # if actual and expected message matches, the test passes

        if actual_alert_message == expected_alert_message:
            self.logger.info(
                "********** Password Reset Email Sent Successfully **********"
            )
            assert True
            # accept the alert
            alert.accept()
            # close the browser
            driver.close()

        # however, if the message does not match, the test fails
        else:
            self.logger.info("********** Password Reset Email Not Sent **********")
            # accept the alert
            alert.accept()
            # capture the screenshot
            # save the screenshot in the screenshots folder
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_valid_email_password_reset.png"
            )
            # close the browser
            driver.close()
            assert False

    # invalid email password reset
    def test_invalid_email_password_reset(self, setup):
        self.logger.info(
            "********** Invalid Email Password Reset Test Started **********"
        )
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)

        # wait for the page to load
        time.sleep(2)

        # click the forgot password link
        driver.find_element(By.LINK_TEXT, "Forgot Password?").click()

        # wait for the reset password page to load
        time.sleep(2)

        # object for PasswordResetPage class
        self.reset_page = PasswordResetPage(driver)
        # pass the invalid email
        self.reset_page.enter_email(self.invalid_reset_email)
        # perform click action
        self.reset_page.click_reset()

        # wait for the alert to appear
        time.sleep(5)

        # switch to alert
        alert = Alert(driver)

        # fetch the alert message

        actual_alert_message = alert.text
        # the actual message from resetPassword.js line 49
        expected_alert_message = "This email is not registered in our system."

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
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_invalid_email_password_reset.png"
            )
            # close the browser
            driver.close()
            assert False


