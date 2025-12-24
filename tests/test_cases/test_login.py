import pytest
import time
from selenium.webdriver.common.alert import Alert
from selenium.webdriver.common.by import By
from tests.base_pages.login_page import LoginPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestLogin:

    logger = LogMaker.log_gen()
    login_page_url = ReadConfig.get_login_page_url()
    email = ReadConfig.get_email()
    password = ReadConfig.get_password()
    invalid_email = ReadConfig.get_invalid_email()
    invalid_email_format = ReadConfig.get_invalid_email_format()
    invalid_password = ReadConfig.get_invalid_password()

    def test_title_verification(self, setup):
        self.logger.info("********** Login Page Title Verification Started **********")
        driver = setup
        driver.get(self.login_page_url)

        if driver.title == "ComplaNet — Login":
            self.logger.info("********** Title Matched **********")
            assert True
        else:
            self.logger.info(
                f"********** Title Not Matched. Got: {driver.title} **********"
            )
            driver.save_screenshot(".\\tests\\screenshots\\test_title_verification.png")
            assert False

    def test_valid_login(self, setup):
        self.logger.info("********** Valid Login Test Started **********")
        driver = setup
        driver.get(self.login_page_url)

        login_page = LoginPage(driver)
        login_page.enter_email(self.email)
        login_page.enter_password(self.password)
        login_page.click_login()
        time.sleep(3)

        if driver.title == "ComplaNet — Admin Dashboard":
            self.logger.info("********** Valid Login Passed **********")
            assert True
        else:
            self.logger.info("********** Valid Login Failed **********")
            driver.save_screenshot(".\\tests\\screenshots\\test_valid_login.png")
            assert False

    @pytest.mark.parametrize(
        "scenario, email, password, expected_msg",
        [
            (
                "Invalid Email",
                "salma@gmail.com",
                "LauraPass#123",
                "Login failed: Invalid login credentials",
            ),
            (
                "Invalid Password",
                "laura.reed@admin.university.edu",
                "salma123",
                "Login failed: Invalid login credentials",
            ),
        ],
    )
    def test_invalid_login_alert(self, setup, scenario, email, password, expected_msg):
        self.logger.info(f"********** {scenario} Test Started **********")
        driver = setup
        driver.get(self.login_page_url)

        login_page = LoginPage(driver)
        login_page.enter_email(email)
        login_page.enter_password(password)
        login_page.click_login()

        # Check Alert
        time.sleep(2)
        try:
            alert = Alert(driver)
            actual_msg = alert.text
            alert.accept()

            if actual_msg == expected_msg:
                self.logger.info(
                    f"********** {scenario} Passed - Alert Matched **********"
                )
                assert True
            else:
                self.logger.info(
                    f"********** {scenario} Failed. Exp: '{expected_msg}', Got: '{actual_msg}' **********"
                )
                assert False
        except:
            self.logger.info(
                f"********** {scenario} Failed - No Alert Found **********"
            )
            driver.save_screenshot(
                f".\\tests\\screenshots\\test_{scenario.replace(' ','_')}_no_alert.png"
            )
            assert False

    @pytest.mark.parametrize(
        "scenario, email, password, field_id, expected_msg",
        [
            ("Empty Fields", "", "", "email", "Please fill out this field."),
            (
                "Invalid Email Format",
                "sally",
                "LauraPass#123",
                "email",
                "Please include an '@' in the email address. 'sally' is missing an '@'.",
            ),
        ],
    )
    def test_login_validation_message(
        self, setup, scenario, email, password, field_id, expected_msg
    ):
        self.logger.info(f"********** {scenario} Test Started **********")
        driver = setup
        driver.get(self.login_page_url)

        login_page = LoginPage(driver)
        if email:
            login_page.enter_email(email)
        if password:
            login_page.enter_password(password)
        login_page.click_login()

        time.sleep(1)

        # Check validation message
        field = driver.find_element(By.ID, field_id)
        actual_msg = field.get_attribute("validationMessage")

        if actual_msg == expected_msg:
            self.logger.info(
                f"********** {scenario} Passed - Validation Matched **********"
            )
            assert True
        else:
            self.logger.info(
                f"********** {scenario} Failed. Exp: '{expected_msg}', Got: '{actual_msg}' **********"
            )
            # Note: Screenshots of validation messages are tricky as they are native browser UI
            driver.save_screenshot(
                f".\\tests\\screenshots\\test_{scenario.replace(' ','_')}_validation.png"
            )
            assert False
