import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.alert import Alert

from tests.base_pages.Login_Page import Login_Page
from tests.utilities.read_properties import Read_Config
from tests.utilities.custom_logger import Log_Maker
from tests.utilities import excel_utils


class Test_02_Login_Data_Driven:

    login_page_url = Read_Config.get_login_page_url()
    logger = Log_Maker.log_gen()
    path = "C:/Users/hp/OneDrive/Desktop/university-complaint-system/tests/test_data/admin_login_data.xlsx"

    # valid admin login
    def test_valid_login_data_driven(self, setup):
        self.logger.info("********** Valid Data Driven Login Test Started **********")
        # launch the chrome browser
        driver = setup
        driver.implicitly_wait(10)
        # open the login page 
        driver.get(self.login_page_url)
        # object for Login_Page class
        # pass the driver
        self.login_page = Login_Page(driver)

        self.rows = excel_utils.get_row_count(self.path, 'Sheet1')
        print("number of rows ", self.rows)

        status_list = []

        # fetch the data using iteration and store it in a variable
        for r in range(2, self.rows+1):
            self.email = excel_utils.read_data(self.path, 'Sheet1', r, 1)
            self.password = excel_utils.read_data(self.path, 'Sheet1', r, 2)
            self.expected_login =  excel_utils.read_data(self.path, 'Sheet1', r, 3)
            
            # pass the email
            self.login_page.enter_email(self.email)
            # pass the password
            self.login_page.enter_password(self.password)
            # perform click action
            self.login_page.click_login()

            # wait for the admin dashboard page to load
            time.sleep(5)

            try:
                # Switch to alert 
                alert = Alert(driver)
                # fetch the alert message
                actual_alert_message = alert.text
                expected_alert_message = "Login failed: Invalid login credentials"

                # check whether actual and expected message matches
                # check whether login was expected
                if actual_alert_message == expected_alert_message:
                    self.logger.info("********** Error Message Matched **********")
                    # accept the alert
                    alert.accept()  
                    if self.expected_login == "No":
                        self.logger.info("********** Test Data Passed **********")
                        status_list.append("Pass")
                    else:
                        self.logger.info("********** Test Data Failed **********")
                        status_list.append("Fail")
                    continue  

            except:
                pass

            # fetch the title
            actual_dashboard_title = driver.title
            expected_dashboard_title = "ComplaNet — Admin Dashboard"

            # check whether actual and expected title matches
            # check whether login was expected
            if actual_dashboard_title == expected_dashboard_title:
                if self.expected_login == "Yes":
                    self.logger.info("********** Test Data Passed **********")
                    status_list.append("Pass")
                    # todo: uncomment after development
                    #self.login_page.click_logout()
                    # todo: remove after logout is developed
                    driver.get(self.login_page_url)
                elif self.expected_login == "No":
                    self.logger.info("********** Test Data Failed **********")
                    status_list.append("Fail")
                    # todo: uncomment after development
                    #self.login_page.click_logout()
                    # todo: remove after logout is developed
                    driver.get(self.login_page_url)
            elif actual_dashboard_title != expected_dashboard_title:
                if self.expected_login == "Yes":
                    self.logger.info("********** Test Data Failed **********")
                    status_list.append("Fail")
                elif self.expected_login == "No":
                    self.logger.info("********** Test Data Passed **********")
                    status_list.append("Pass")
        
        print("Status List: ", status_list)

        if "Fail" in status_list:
            self.logger.info("********** Data Driven Login Test Failed **********")
            assert False
        else:
            self.logger.info("********** Data Driven Login Test Passed **********")
            assert True




          
