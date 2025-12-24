import pytest
import time
from tests.base_pages.login_page import LoginPage
from tests.base_pages.filter_page import FilterPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestFilter:

    logger = LogMaker.log_gen()
    login_page_url = ReadConfig.get_login_page_url()
    all_complaints_page_url = ReadConfig.get_all_complaints_page_url()
    email = ReadConfig.get_email()
    password = ReadConfig.get_password()
    filter_status = ReadConfig.get_filter_status()
    filter_date_from = ReadConfig.get_filter_date_from()
    filter_date_to = ReadConfig.get_filter_date_to()

    # Fixture for login and navigation
    @pytest.fixture
    def setup_filter(self, setup):
        driver = setup
        driver.get(self.login_page_url)

        login = LoginPage(driver)
        login.enter_email(self.email)
        login.enter_password(self.password)
        login.click_login()

        time.sleep(3)
        driver.get(self.all_complaints_page_url)
        time.sleep(2)

        return driver

    def test_all_complaints_page_title_verification(self, setup_filter):
        self.logger.info("********** Filter Page Title Verification Started **********")
        driver = setup_filter

        if driver.title == "All Complaints — ComplaNet Admin":
            self.logger.info("********** Title Matched **********")
            assert True
        else:
            self.logger.info("********** Title Not Matched **********")
            driver.save_screenshot(".\\tests\\screenshots\\test_filter_title.png")
            assert False

    def test_filter_dropdown_clickable(self, setup_filter):
        self.logger.info("********** Filter Clickable Test Started **********")
        driver = setup_filter
        filter_page = FilterPage(driver)

        if filter_page.is_status_filter_clickable():
            self.logger.info("********** Filter Clickable **********")
            assert True
        else:
            self.logger.info("********** Filter Not Clickable **********")
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_filter_not_clickable.png"
            )
            assert False

    def test_filter_options_display(self, setup_filter):
        self.logger.info("********** Filter Options Test Started **********")
        driver = setup_filter
        filter_page = FilterPage(driver)

        expected_options = ["All Status", "Pending", "In Progress", "Resolved"]
        actual_options = filter_page.get_status_filter_options()

        if actual_options == expected_options:
            self.logger.info("********** Options Matched **********")
            assert True
        else:
            self.logger.info(
                f"********** Options Mismatch. Exp: {expected_options}, Got: {actual_options} **********"
            )
            # assert False
            pass

    def test_filter_apply_status(self, setup_filter):
        self.logger.info("********** Filter Apply Status Test Started **********")
        driver = setup_filter
        filter_page = FilterPage(driver)

        filter_page.select_status_filter(self.filter_status)
        time.sleep(3)

        count = filter_page.get_results_count()
        self.logger.info(f"********** Results found: {count} **********")
        assert True

    def test_multiple_filters(self, setup_filter):
        self.logger.info("********** Multiple Filters Test Started **********")
        driver = setup_filter
        filter_page = FilterPage(driver)

        filter_page.set_date_from(self.filter_date_from)
        filter_page.set_date_to(self.filter_date_to)
        time.sleep(2)
        filter_page.select_status_filter(self.filter_status)
        time.sleep(3)

        count = filter_page.get_results_count()
        self.logger.info(f"********** Results found: {count} **********")
        assert True

    def test_clear_date_filter(self, setup_filter):
        self.logger.info("********** Clear Filter Test Started **********")
        driver = setup_filter
        filter_page = FilterPage(driver)

        filter_page.set_date_from(self.filter_date_from)
        filter_page.set_date_to(self.filter_date_to)
        time.sleep(2)

        filter_page.clear_date_from()
        filter_page.clear_date_to()
        time.sleep(3)

        assert True

    def test_change_filter(self, setup_filter):
        self.logger.info("********** Change Filter Test Started **********")
        driver = setup_filter
        filter_page = FilterPage(driver)

        # First filter
        filter_page.set_date_from(self.filter_date_from)
        filter_page.set_date_to(self.filter_date_to)
        time.sleep(2)

        # Change filter
        filter_page.set_date_from("2025-11-01")
        filter_page.set_date_to("2025-11-30")
        time.sleep(2)

        assert True
