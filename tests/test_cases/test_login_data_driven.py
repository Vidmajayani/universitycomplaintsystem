import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.alert import Alert

from tests.base_pages.login_page import LoginPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker
from tests.utilities import excel_utils


class TestLoginDataDriven:

    login_page_url = ReadConfig.get_login_page_url()
    logger = LogMaker.log_gen()

    import os

    # Get absolute path dynamically
    # assumes file is in tests/test_cases/test_login_data_driven.py
    # we want tests/test_data/admin_login_data.xlsx
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, "test_data", "admin_login_data.xlsx")

    # valid admin login
    # def test_valid_login_data_driven(self, setup):
    #     self.logger.info("********** Valid Data Driven Login Test Started **********")
    #     # launch the chrome browser
    #     driver = setup
    #     driver.implicitly_wait(10)
    #     # open the login page
    #     # object for LoginPage class
    #     self.login_page = LoginPage(driver)

    #     self.rows = excel_utils.get_row_count(self.path, "Sheet1")

    #     status_list = []

    #     # fetch the data using iteration and store it in a variable
    #     for row_index in range(2, self.rows + 1):
    #         driver.get(self.login_page_url)
    #         time.sleep(3)
    #         self.login_page = LoginPage(driver)
    #         time.sleep(2)
            
    #         self.email = excel_utils.read_data(self.path, "Sheet1", row_index, 1)
    #         self.password = excel_utils.read_data(self.path, "Sheet1", row_index, 2)
    #         self.expected_login = excel_utils.read_data(self.path, "Sheet1", row_index, 3)

    #         # pass the email
    #         self.login_page.enter_email(self.email)
    #         time.sleep(1)
    #         # pass the password
    #         self.login_page.enter_password(self.password)
    #         # perform click action
    #         self.login_page.click_login()

    #         # wait for the admin dashboard page to load
    #         time.sleep(5)

    #         try:
    #             # Switch to alert
    #             alert = Alert(driver)
    #             # fetch the alert message
    #             actual_alert_message = alert.text
    #             expected_alert_message = "Login failed: Invalid login credentials"

    #             # check whether actual and expected message matches
    #             # check whether login was expected
    #             if actual_alert_message == expected_alert_message:
    #                 self.logger.info("********** Error Message Matched **********")
    #                 # accept the alert
    #                 alert.accept()
    #                 if self.expected_login == "No":
    #                     self.logger.info("********** Test Data Passed **********")
    #                     status_list.append("Pass")
    #                 else:
    #                     self.logger.info("********** Test Data Failed **********")
    #                     status_list.append("Fail")
    #                 continue

    #         except:
    #             pass

    #         # fetch the title
    #         actual_dashboard_title = driver.title
    #         expected_dashboard_title = "ComplaNet — Admin Dashboard"

    #         # check whether actual and expected title matches
    #         # check whether login was expected
    #         if actual_dashboard_title == expected_dashboard_title:
    #             if self.expected_login == "Yes":
    #                 self.logger.info("********** Test Data Passed **********")
    #                 status_list.append("Pass")
    #             elif self.expected_login == "No":
    #                 self.logger.info("********** Test Data Failed **********")
    #                 status_list.append("Fail")
    #         elif actual_dashboard_title != expected_dashboard_title:
    #             if self.expected_login == "Yes":
    #                 self.logger.info("********** Test Data Failed **********")
    #                 status_list.append("Fail")
    #             elif self.expected_login == "No":
    #                 self.logger.info("********** Test Data Passed **********")
    #                 status_list.append("Pass")

    #     if "Fail" in status_list:
    #         self.logger.info("********** Data Driven Login Test Failed **********")
    #         assert False
    #     else:
    #         self.logger.info("********** Data Driven Login Test Passed **********")
    #         assert True
    pass
