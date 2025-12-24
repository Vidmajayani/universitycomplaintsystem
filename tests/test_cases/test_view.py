import pytest
import time
from selenium import webdriver

from tests.base_pages.login_page import LoginPage
from tests.base_pages.view_page import ViewPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestView:

    logger = LogMaker.log_gen()
    login_page_url = ReadConfig.get_login_page_url()
    all_complaints_page_url = ReadConfig.get_all_complaints_page_url()
    email = ReadConfig.get_email()
    password = ReadConfig.get_password()

    # view complaint details test
    def test_view_complaint_details(self, setup):
        self.logger.info("********** Test 09 View Complaint Started **********")
        self.logger.info("********** View Complaint Details Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)

        # login first
        self.login_page = LoginPage(driver)
        self.login_page.enter_email(self.email)
        self.login_page.enter_password(self.password)
        self.login_page.click_login()

        # wait for dashboard to load
        time.sleep(3)

        # navigate to all complaints page
        driver.get(self.all_complaints_page_url)

        # wait for page to load
        time.sleep(3)

        # object for ViewPage class
        self.view_page = ViewPage(driver)

        # click preview button
        self.view_page.click_preview_button()

        # wait for navigation
        time.sleep(3)

        # verify navigated to complaint details page
        on_details_page = self.view_page.is_on_complaint_details_page()

        if on_details_page:
            self.logger.info(
                "********** Navigated to Complaint Details Page Successfully **********"
            )

            # verify complaint details are displayed
            details_displayed = self.view_page.are_complaint_details_displayed()

            if details_displayed:
                complaint_title = self.view_page.get_complaint_title()
                self.logger.info(
                    f"********** Complaint Details Displayed: {complaint_title} **********"
                )
                assert True
                driver.close()
            else:
                self.logger.info(
                    "********** Complaint Details Not Displayed Properly **********"
                )
                driver.save_screenshot(
                    ".\\tests\\screenshots\\test_view_complaint_details.png"
                )
                driver.close()
                assert False
        else:
            self.logger.info(
                f"********** Not Navigated to Details Page. Current URL: {driver.current_url} **********"
            )
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_view_complaint_details.png"
            )
            driver.close()
            assert False

    # back arrow navigation test
    def test_back_arrow_navigation(self, setup):
        self.logger.info("********** Back Arrow Navigation Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)

        # login first
        self.login_page = LoginPage(driver)
        self.login_page.enter_email(self.email)
        self.login_page.enter_password(self.password)
        self.login_page.click_login()

        # wait for dashboard to load
        time.sleep(3)

        # navigate to all complaints page
        driver.get(self.all_complaints_page_url)

        # wait for page to load
        time.sleep(3)

        # object for ViewPage class
        self.view_page = ViewPage(driver)

        # click preview button
        self.view_page.click_preview_button()

        # wait for navigation
        time.sleep(3)

        # verify on complaint details page
        on_details_page = self.view_page.is_on_complaint_details_page()

        if on_details_page:
            self.logger.info("********** On Complaint Details Page **********")

            # click back arrow
            self.view_page.click_back_arrow()

            # wait for navigation
            time.sleep(3)

            # verify returned to all complaints page
            back_to_complaints = self.view_page.is_on_all_complaints_page()

            if back_to_complaints:
                self.logger.info(
                    "********** Successfully Returned to All Complaints Page **********"
                )
                assert True
                driver.close()
            else:
                self.logger.info(
                    f"********** Not Returned to All Complaints Page. Current URL: {driver.current_url} **********"
                )
                driver.save_screenshot(
                    ".\\tests\\screenshots\\test_back_arrow_navigation.png"
                )
                driver.close()
                assert False
        else:
            self.logger.info("********** Failed to Navigate to Details Page **********")
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_back_arrow_navigation.png"
            )
            driver.close()
            assert False

    # attachment view test
    def test_attachment_view(self, setup):
        self.logger.info("********** Attachment View Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page
        driver.get(self.login_page_url)

        # login first
        self.login_page = LoginPage(driver)
        self.login_page.enter_email(self.email)
        self.login_page.enter_password(self.password)
        self.login_page.click_login()

        # wait for dashboard to load
        time.sleep(3)

        # navigate to all complaints page
        driver.get(self.all_complaints_page_url)

        # wait for page to load
        time.sleep(3)

        # object for ViewPage class
        self.view_page = ViewPage(driver)

        # click preview button
        self.view_page.click_preview_button()

        # wait for navigation
        time.sleep(3)

        # verify on complaint details page
        on_details_page = self.view_page.is_on_complaint_details_page()

        if on_details_page:
            self.logger.info("********** On Complaint Details Page **********")

            # check if complaint has attachments
            has_attachments = self.view_page.has_attachments()

            if has_attachments:
                self.logger.info("********** Complaint Has Attachments **********")

                # store original window handle
                original_window = driver.current_window_handle

                # click first attachment
                attachment_url = self.view_page.click_first_attachment()

                # wait for new tab to open
                time.sleep(3)

                # check if attachment opened in new tab
                opened_in_new_tab = self.view_page.is_attachment_opened_in_new_tab()

                if opened_in_new_tab:
                    self.logger.info(
                        f"********** Attachment Opened in New Tab: {attachment_url} **********"
                    )
                    # switch to new tab
                    for window_handle in driver.window_handles:
                        if window_handle != original_window:
                            driver.switch_to.window(window_handle)
                            break
                    # close new tab
                    driver.close()
                    # switch back to original window
                    driver.switch_to.window(original_window)
                    assert True
                    driver.close()
                else:
                    self.logger.info(
                        "********** Attachment Did Not Open in New Tab **********"
                    )
                    driver.save_screenshot(
                        ".\\tests\\screenshots\\test_attachment_view.png"
                    )
                    driver.close()
                    assert False
            else:
                self.logger.info(
                    "********** No Attachments Found - Test Skipped **********"
                )
                # Test passes because no attachments is a valid state
                assert True
                driver.close()
        else:
            self.logger.info("********** Failed to Navigate to Details Page **********")
            driver.save_screenshot(".\\tests\\screenshots\\test_attachment_view.png")
            driver.close()
            assert False
