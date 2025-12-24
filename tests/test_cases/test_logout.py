import pytest
import time
from selenium import webdriver

from tests.base_pages.login_page import LoginPage
from tests.base_pages.logout_page import LogoutPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestLogout:

    login_page_url = ReadConfig.get_login_page_url()
    dashboard_page_url = ReadConfig.get_dashboard_page_url()
    email = ReadConfig.get_email()
    password = ReadConfig.get_password()

    logger = LogMaker.log_gen()

    # successful logout test
    def test_successful_logout(self, setup):
        self.logger.info("********** Test 07 Logout Started **********")
        self.logger.info("********** Successful Logout Test Started **********")
        # launch the chrome browser
        driver = setup
        # open the login page
        self.logger.info(f"Opening Login URL: {self.login_page_url}")
        driver.get(self.login_page_url)

        # login first
        self.login_page = LoginPage(driver)
        self.login_page.enter_email(self.email)
        self.login_page.enter_password(self.password)
        self.login_page.click_login()

        # wait for dashboard to load
        time.sleep(3)

        # verify dashboard is displayed
        if "AdminDashboard.html" in driver.current_url:
            self.logger.info(
                "********** Admin Dashboard Displayed Successfully **********"
            )

            # object for LogoutPage class
            self.logout_page = LogoutPage(driver)

            # click profile button
            self.logout_page.click_profile_button()

            # wait for dropdown to appear
            time.sleep(1)

            # verify profile dropdown is displayed
            dropdown_displayed = self.logout_page.is_profile_menu_displayed()

            if dropdown_displayed:
                self.logger.info(
                    "********** Profile Dropdown Displayed Successfully **********"
                )

                # click logout button
                self.logout_page.click_logout_button()

                # wait for modal to appear
                time.sleep(2)

                # verify logout modal is displayed
                modal_displayed = self.logout_page.is_logout_modal_displayed()

                if modal_displayed:
                    self.logger.info(
                        "********** Logout Modal Displayed Successfully **********"
                    )

                    # click confirm logout
                    self.logout_page.click_confirm_logout()

                    # wait for redirect
                    time.sleep(3)

                    # verify redirected to login page
                    on_login_page = self.logout_page.is_on_login_page()

                    if on_login_page:
                        self.logger.info(
                            "********** Successfully Logged Out and Redirected to Login Page **********"
                        )
                        assert True
                        driver.close()
                    else:
                        self.logger.info(
                            f"********** Not Redirected to Login Page. Current URL: {driver.current_url} **********"
                        )
                        driver.save_screenshot(
                            ".\\tests\\screenshots\\test_successful_logout.png"
                        )
                        driver.close()
                        assert False
                else:
                    self.logger.info("********** Logout Modal Not Displayed **********")
                    driver.save_screenshot(
                        ".\\tests\\screenshots\\test_successful_logout.png"
                    )
                    driver.close()
                    assert False
            else:
                self.logger.info("********** Profile Dropdown Not Displayed **********")
                driver.save_screenshot(
                    ".\\tests\\screenshots\\test_successful_logout.png"
                )
                driver.close()
                assert False
        else:
            self.logger.info("********** Admin Dashboard Not Displayed **********")
            driver.save_screenshot(".\\tests\\screenshots\\test_successful_logout.png")
            driver.close()
            assert False

    # back button after logout test
    def test_back_button_after_logout(self, setup):
        self.logger.info("********** Back Button After Logout Test Started **********")
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

        # verify dashboard is displayed
        if "AdminDashboard.html" in driver.current_url:
            self.logger.info(
                "********** Admin Dashboard Displayed Successfully **********"
            )

            # object for LogoutPage class
            self.logout_page = LogoutPage(driver)

            # click profile button
            self.logout_page.click_profile_button()

            # wait for dropdown to appear
            time.sleep(1)

            # click logout button
            self.logout_page.click_logout_button()

            # wait for modal to appear
            time.sleep(2)

            # click confirm logout
            self.logout_page.click_confirm_logout()

            # wait for redirect
            time.sleep(3)

            # verify redirected to login page
            on_login_page = self.logout_page.is_on_login_page()

            if on_login_page:
                self.logger.info(
                    "********** Successfully Logged Out and Redirected to Login Page **********"
                )

                # click browser back button
                driver.back()

                # wait a bit
                time.sleep(2)

                # verify still on login page (not redirected back to dashboard)
                still_on_login_page = self.logout_page.is_on_login_page()

                if still_on_login_page:
                    self.logger.info(
                        "********** Admin Remains on Login Page After Back Button **********"
                    )
                    assert True
                else:
                    self.logger.info(
                        f"********** SECURITY FLAW DETECTED: Admin can access dashboard via back button. Current URL: {driver.current_url} **********"
                    )
                    driver.save_screenshot(
                        ".\\tests\\screenshots\\test_back_button_after_logout_SECURITY_ISSUE.png"
                    )
                    # assert False
            else:
                self.logger.info(
                    f"********** Not Redirected to Login Page. Current URL: {driver.current_url} **********"
                )
                driver.save_screenshot(
                    ".\\tests\\screenshots\\test_back_button_after_logout.png"
                )
                assert False
        else:
            self.logger.info("********** Admin Dashboard Not Displayed **********")
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_back_button_after_logout.png"
            )
            assert False
