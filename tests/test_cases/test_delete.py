import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.alert import Alert

from tests.base_pages.login_page import LoginPage
from tests.base_pages.delete_page import DeletePage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestDelete:

    logger = LogMaker.log_gen()
    login_page_url = ReadConfig.get_login_page_url()
    all_complaints_page_url = ReadConfig.get_all_complaints_page_url()
    email = ReadConfig.get_email()
    password = ReadConfig.get_password()
    deletion_reason = ReadConfig.get_deletion_reason()
    delete_complaint_keyword = ReadConfig.get_delete_complaint_keyword()

    # verify title of the all complaints page
    def test_all_complaints_page_title_verification(self, setup):
        self.logger.info("********** Test 06 Delete Complaint Started **********")
        self.logger.info(
            "********** All Complaints Page Title Verification Test Started **********"
        )
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)
        # object for LoginPage class
        self.login_page = LoginPage(driver)
        # pass the email
        self.login_page.enter_email(self.email)
        # pass the password
        self.login_page.enter_password(self.password)
        # perform click action
        self.login_page.click_login()

        # wait for the admin dashboard page to load
        time.sleep(3)

        # open the all complaints page
        driver.get(self.all_complaints_page_url)

        # wait for the page to load
        time.sleep(2)

        # fetch the title
        actual_complaints_title = driver.title
        expected_complaints_title = "All Complaints — ComplaNet Admin"

        # compare the actual and expected title
        # if actual and expected title matches, the test passes

        if actual_complaints_title == expected_complaints_title:
            self.logger.info("********** All Complaints Page Title Matched  **********")
            assert True
            # close the browser
            driver.close()

        # however, if the title does not match, the test fails
        else:
            # capture the screenshot
            # store the screenshot in the screenshots folder
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_all_complaints_page_title_verification_delete.png"
            )
            self.logger.info(
                "********** All Complaints Page Title Not Matched **********"
            )
            driver.close()
            assert False

    # delete complaint with required fields
    # @pytest.mark.skip(reason="DISABLED: This test deletes real complaints from production database. Only run against test environment.")
    # def test_delete_complaint_with_required_fields(self, setup):
    #     self.logger.info(
    #         "********** Delete Complaint With Required Fields Test Started **********"
    #     )
    #     # launch the chrome browser
    #     driver = setup
    #     # open the login page
    #     driver.get(self.login_page_url)
    #     # object for LoginPage class
    #     self.login_page = LoginPage(driver)
    #     # pass the email
    #     self.login_page.enter_email(self.email)
    #     # pass the password
    #     self.login_page.enter_password(self.password)
    #     # perform click action
    #     self.login_page.click_login()
    # 
    #     # wait for the admin dashboard page to load
    #     time.sleep(3)
    # 
    #     # open the all complaints page
    #     driver.get(self.all_complaints_page_url)
    # 
    #     # wait for the page to load
    #     time.sleep(3)
    # 
    #     # object for DeletePage class
    #     self.delete_page = DeletePage(driver)
    #     
    #     # Dynamically get a complaint to delete
    #     from tests.base_pages.search_page import SearchPage
    #     search_helper = SearchPage(driver)
    #     complaint_data = search_helper.get_first_complaint_data()
    #     dynamic_keyword = complaint_data["title"]
    #     self.logger.info(f"Dynamically selected complaint to delete: {dynamic_keyword}")
    # 
    #     # search for specific complaint and click delete button
    #     self.delete_page.search_and_delete_complaint(dynamic_keyword)
    # 
    #     # wait for the modal to appear
    #     time.sleep(2)
    # 
    #     # verify that the modal is displayed
    #     modal_displayed = self.delete_page.is_modal_displayed()
    # 
    #     if modal_displayed:
    #         self.logger.info("********** Delete Complaint Modal Displayed **********")
    # 
    #         # enter the reason
    #         self.delete_page.enter_reason(self.deletion_reason)
    #         # click the confirm delete button
    #         self.delete_page.click_confirm_delete()
    # 
    #         # wait for the alert to appear
    #         time.sleep(3)
    # 
    #         # switch to alert
    #         alert = Alert(driver)
    # 
    #         # fetch the alert message
    #         actual_alert_message = alert.text
    #         expected_alert_message = "Complaint deleted and user notified."
    # 
    #         # compare the actual and the expected alert message
    #         # if actual and expected message matches, the test passes
    # 
    #         if actual_alert_message == expected_alert_message:
    #             self.logger.info("********** Complaint Deleted Successfully **********")
    #             assert True
    #             # accept the alert
    #             alert.accept()
    #             # close the browser
    #             driver.close()
    # 
    #         # however, if the message does not match, the test fails
    #         else:
    #             self.logger.info(
    #                 f"********** Complaint Deletion Failed. Expected: '{expected_alert_message}', Got: '{actual_alert_message}' **********"
    #             )
    #             # accept the alert
    #             alert.accept()
    #             # capture the screenshot
    #             # save the screenshot in the screenshots folder
    #             driver.save_screenshot(
    #                 ".\\tests\\screenshots\\test_delete_complaint_with_required_fields.png"
    #             )
    #             # close the browser
    #             driver.close()
    #             assert False
    #     else:
    #         self.logger.info(
    #             "********** Delete Complaint Modal Not Displayed **********"
    #         )
    #         # capture the screenshot
    #         driver.save_screenshot(
    #             ".\\tests\\screenshots\\test_delete_complaint_with_required_fields.png"
    #         )
    #         # close the browser
    #         driver.close()
    #         assert False

    # cancel button functionality
    def test_cancel_button_functionality(self, setup):
        self.logger.info(
            "********** Cancel Button Functionality Test Started **********"
        )
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)
        # object for LoginPage class
        self.login_page = LoginPage(driver)
        # pass the email
        self.login_page.enter_email(self.email)
        # pass the password
        self.login_page.enter_password(self.password)
        # perform click action
        self.login_page.click_login()

        # wait for the admin dashboard page to load
        time.sleep(3)

        # open the all complaints page
        driver.get(self.all_complaints_page_url)

        # wait for the page to load
        time.sleep(3)

        # object for DeletePage class
        self.delete_page = DeletePage(driver)
        # click the delete button
        self.delete_page.click_delete_button()

        # wait for the modal to appear
        time.sleep(2)

        # verify that the modal is displayed
        modal_displayed = self.delete_page.is_modal_displayed()

        if modal_displayed:
            self.logger.info("********** Delete Complaint Modal Displayed **********")

            # enter the reason
            self.delete_page.enter_reason(self.deletion_reason)
            # click the cancel button
            self.delete_page.click_cancel_button()

            # wait for the modal to close
            time.sleep(2)

            # verify that the modal is closed
            modal_closed = self.delete_page.is_modal_closed()

            # compare the modal status
            # if modal is closed, the test passes

            if modal_closed:
                self.logger.info(
                    "********** Delete Complaint Modal Closed Successfully **********"
                )
                assert True
                # close the browser
                driver.close()

            # however, if modal is still displayed, the test fails
            else:
                self.logger.info(
                    "********** Delete Complaint Modal Not Closed **********"
                )
                # capture the screenshot
                # save the screenshot in the screenshots folder
                driver.save_screenshot(
                    ".\\tests\\screenshots\\test_cancel_button_functionality_delete.png"
                )
                # close the browser
                driver.close()
                assert False
        else:
            self.logger.info(
                "********** Delete Complaint Modal Not Displayed **********"
            )
            # capture the screenshot
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_cancel_button_functionality_delete.png"
            )
            # close the browser
            driver.close()
            assert False

    # empty field handling
    def test_empty_field_handling(self, setup):
        self.logger.info("********** Empty Field Handling Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)
        # object for LoginPage class
        self.login_page = LoginPage(driver)
        # pass the email
        self.login_page.enter_email(self.email)
        # pass the password
        self.login_page.enter_password(self.password)
        # perform click action
        self.login_page.click_login()

        # wait for the admin dashboard page to load
        time.sleep(3)

        # open the all complaints page
        driver.get(self.all_complaints_page_url)

        # wait for the page to load
        time.sleep(3)

        # object for DeletePage class
        self.delete_page = DeletePage(driver)
        # click the delete button
        self.delete_page.click_delete_button()

        # wait for the modal to appear
        time.sleep(2)

        # verify that the modal is displayed
        modal_displayed = self.delete_page.is_modal_displayed()

        if modal_displayed:
            self.logger.info("********** Delete Complaint Modal Displayed **********")

            # click the confirm delete button without entering reason
            self.delete_page.click_confirm_delete()

            # wait for the alert to appear
            time.sleep(3)

            # switch to alert
            alert = Alert(driver)

            # fetch the alert message
            actual_alert_message = alert.text
            expected_alert_message = "Please provide a reason for deletion."

            # compare the actual and the expected alert message
            # if actual and expected message matches, the test passes

            if actual_alert_message == expected_alert_message:
                self.logger.info(
                    "********** Empty Field Error Message Matched **********"
                )
                assert True
                # accept the alert
                alert.accept()
                # close the browser
                driver.close()

            # however, if the message does not match, the test fails
            else:
                self.logger.info(
                    f"********** Empty Field Error Message Not Matched. Expected: '{expected_alert_message}', Got: '{actual_alert_message}' **********"
                )
                # accept the alert
                alert.accept()
                # capture the screenshot
                # save the screenshot in the screenshots folder
                driver.save_screenshot(
                    ".\\tests\\screenshots\\test_empty_field_handling_delete.png"
                )
                # close the browser
                driver.close()
                assert False
        else:
            self.logger.info(
                "********** Delete Complaint Modal Not Displayed **********"
            )
            # capture the screenshot
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_empty_field_handling_delete.png"
            )
            # close the browser
            driver.close()
            assert False
