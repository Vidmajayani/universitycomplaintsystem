import pytest
import time
import os
from selenium import webdriver

from tests.base_pages.login_page import LoginPage
from tests.base_pages.analytics_page import AnalyticsPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestAnalytics:

    login_page_url = ReadConfig.get_login_page_url()
    analytics_page_url = ReadConfig.get_analytics_page_url()
    email = ReadConfig.get_email()
    password = ReadConfig.get_password()

    logger = LogMaker.log_gen()

    # download report test
    def test_download_report(self, setup):
        self.logger.info("********** Test 08 Analytics Started **********")
        self.logger.info("********** Download Report Test Started **********")
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

        # navigate to analytics page
        driver.get(self.analytics_page_url)

        # wait for page to load
        time.sleep(3)

        # verify analytics page is displayed
        if "Analytics.html" in driver.current_url:
            self.logger.info(
                "********** Analytics Page Displayed Successfully **********"
            )

            # object for AnalyticsPage class
            self.analytics_page = AnalyticsPage(driver)

            # get project downloads folder
            download_dir = os.path.join(os.getcwd(), "tests", "downloads")

            # get list of files before download
            files_before = (
                set(os.listdir(download_dir)) if os.path.exists(download_dir) else set()
            )

            # click download report button
            self.analytics_page.click_download_report()

            # wait for download to complete
            time.sleep(5)

            # get list of files after download
            files_after = (
                set(os.listdir(download_dir)) if os.path.exists(download_dir) else set()
            )

            # check if new file was downloaded
            new_files = files_after - files_before

            if new_files:
                # check if any new file is a PDF
                pdf_downloaded = any(file.endswith(".pdf") for file in new_files)

                if pdf_downloaded:
                    self.logger.info(
                        f"********** Report Downloaded Successfully: {new_files} **********"
                    )
                    assert True
                    driver.close()
                else:
                    self.logger.info(
                        f"********** File Downloaded But Not PDF: {new_files} **********"
                    )
                    driver.save_screenshot(
                        ".\\tests\\screenshots\\test_download_report.png"
                    )
                    driver.close()
                    assert False
            else:
                self.logger.info("********** No File Downloaded **********")
                driver.save_screenshot(
                    ".\\tests\\screenshots\\test_download_report.png"
                )
                driver.close()
                assert False
        else:
            self.logger.info("********** Analytics Page Not Displayed **********")
            driver.save_screenshot(".\\tests\\screenshots\\test_download_report.png")
            driver.close()
            assert False

    # reset filter test
    def test_reset_filter(self, setup):
        self.logger.info("********** Reset Filter Test Started **********")
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

        # navigate to analytics page
        driver.get(self.analytics_page_url)

        # wait for page to load
        time.sleep(3)

        # verify analytics page is displayed
        if "Analytics.html" in driver.current_url:
            self.logger.info(
                "********** Analytics Page Displayed Successfully **********"
            )

            # object for AnalyticsPage class
            self.analytics_page = AnalyticsPage(driver)

            # click month filter to apply a filter
            self.analytics_page.click_month_filter()

            # wait for filter to apply
            time.sleep(2)

            # get filter text after applying month filter
            filter_text_after_apply = self.analytics_page.get_current_filter_text()
            self.logger.info(
                f"********** Filter Text After Applying Month: {filter_text_after_apply} **********"
            )

            # click reset button
            self.analytics_page.click_reset_button()

            # wait for reset to apply
            time.sleep(2)

            # check if filters are cleared
            filters_cleared = self.analytics_page.are_filters_cleared()

            if filters_cleared:
                self.logger.info(
                    "********** Filters Cleared Successfully - Showing All Time **********"
                )
                assert True
                driver.close()
            else:
                filter_text_after_reset = self.analytics_page.get_current_filter_text()
                self.logger.info(
                    f"********** Filters Not Cleared. Current Filter: {filter_text_after_reset} **********"
                )
                driver.save_screenshot(".\\tests\\screenshots\\test_reset_filter.png")
                driver.close()
                assert False
        else:
            self.logger.info("********** Analytics Page Not Displayed **********")
            driver.save_screenshot(".\\tests\\screenshots\\test_reset_filter.png")
            driver.close()
            assert False
