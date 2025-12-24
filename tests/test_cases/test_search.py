import pytest
import time
from tests.base_pages.search_page import SearchPage
from tests.base_pages.login_page import LoginPage
from tests.utilities.read_properties import ReadConfig
from tests.utilities.custom_logger import LogMaker


class TestSearch:

    logger = LogMaker.log_gen()
    login_page_url = ReadConfig.get_login_page_url()
    search_page_url = ReadConfig.get_search_page_url()
    email = ReadConfig.get_email()
    password = ReadConfig.get_password()

    # Fixture to handle login and navigation for each test
    @pytest.fixture
    def setup_search(self, setup):
        # launch browser
        driver = setup
        driver.get(self.login_page_url)

        # login
        login = LoginPage(driver)
        login.enter_email(self.email)
        login.enter_password(self.password)
        login.click_login()

        # wait for login to complete
        time.sleep(3)

        # navigate to search page
        driver.get(self.search_page_url)

        return driver

    def test_search_page_title_verification(self, setup_search):
        self.logger.info("********** Search Page Title Verification Started **********")
        driver = setup_search

        actual_title = driver.title
        expected_title = "All Complaints — ComplaNet Admin"

        if actual_title == expected_title:
            self.logger.info("********** Title Matched **********")
            assert True
        else:
            self.logger.info("********** Title Not Matched **********")
            driver.save_screenshot(
                ".\\tests\\screenshots\\test_search_page_title_parametrized.png"
            )
            assert False

    @pytest.mark.parametrize(
        "test_case_name, config_method, expectation",
        [
            ("Single Keyword", "get_single_keyword", "found"),
            ("Multiple Keywords", "get_multiple_keywords", "found"),
            ("Exact Match", "get_exact_match", "found"),
            ("Partial Keyword", "get_partial_keyword", "found"),
            ("Complainant Name", "get_complainant_name", "found"),
            ("Description", "get_description_keyword", "found"),
            ("Title", "get_title_keyword", "found"),
            ("Special Characters", "get_special_characters", "empty"),
        ],
    )
    def test_search_functionality(
        self, setup_search, test_case_name, config_method, expectation
    ):
        self.logger.info(f"********** {test_case_name} Search Test Started **********")
        driver = setup_search

        # Get search term from config using reflection
        search_term = getattr(ReadConfig, config_method)()

        self.logger.info(f"Searching for: {search_term}")

        # Perform search
        search = SearchPage(driver)
        
        # Dynamically override search_term if it's a 'found' test to ensure record exists
        if expectation == "found" and test_case_name != "Special Characters":
            try:
                complaint_data = search.get_first_complaint_data()
                if test_case_name == "Single Keyword":
                    # Single: one word
                    search_term = complaint_data["title"].split()[0]
                elif test_case_name == "Multiple Keywords":
                    # Multiple: 3 words
                    words = complaint_data["description"].split()
                    if len(words) >= 3:
                        search_term = " ".join(words[:3])
                    else:
                        words = (complaint_data["title"] + " " + complaint_data["description"]).split()
                        search_term = " ".join(words[:3]) if len(words) >= 3 else " ".join(words)
                elif test_case_name == "Exact Match":
                    search_term = complaint_data["title"]
                elif test_case_name == "Partial Keyword":
                    # Partial: half of one word
                    word = complaint_data["title"].split()[0]
                    if len(word) > 1:
                        search_term = word[:len(word)//2]
                    else:
                        search_term = word
                elif test_case_name == "Description":
                    # Description: full description
                    search_term = complaint_data["description"]
                elif test_case_name == "Title":
                     search_term = complaint_data["title"]
                elif test_case_name == "Complainant Name":
                    search_term = complaint_data["lodged_by"].split("(")[0].strip().split()[0]
            except Exception as e:
                self.logger.info(f"No complaints in database, using config value: {str(e)}")
                # Keep the original search_term from config

        self.logger.info(f"Using search term: {search_term}")
        search.enter_search_term(search_term)
        time.sleep(3)  # Wait for search/filtering

        # Verification
        results_count = search.get_results_count()
        self.logger.info(f"Results found: {results_count}")

        if expectation == "found":
            if results_count > 0:
                self.logger.info(
                    f"********** {test_case_name} Search Passed **********"
                )
                assert True
            else:
                self.logger.info(
                    f"********** {test_case_name} Search Failed - No Results **********"
                )
                driver.save_screenshot(
                    f".\\tests\\screenshots\\test_search_{test_case_name.replace(' ', '_')}.png"
                )
                assert False
        elif expectation == "empty":
            if results_count == 0:
                self.logger.info(
                    f"********** {test_case_name} Search Passed (No Results as Expected) **********"
                )
                assert True
            else:
                self.logger.info(
                    f"********** {test_case_name} Search Failed - Unexpected Results **********"
                )
                driver.save_screenshot(
                    f".\\tests\\screenshots\\test_search_{test_case_name.replace(' ', '_')}.png"
                )
                assert False
