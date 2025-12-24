from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os


class AnalyticsPage:
    # locators
    download_pdf_button_id = "downloadPdfBtn"
    month_filter_button_xpath = "//button[@onclick=\"setQuickFilter('month')\"]"
    reset_filters_button_xpath = "//button[@onclick='resetFilter()']"
    start_date_input_id = "startDate"
    end_date_input_id = "endDate"
    current_filter_text_id = "currentFilterText"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: click download report button

    def click_download_report(self):
        # wait for button to be clickable
        wait = WebDriverWait(self.driver, 10)
        download_btn = wait.until(
            EC.element_to_be_clickable((By.ID, self.download_pdf_button_id))
        )
        # click the button
        download_btn.click()

    # 2: check if file is downloaded

    def is_file_downloaded(self, download_dir, filename_pattern="ComplaNet"):
        # wait a bit for download to complete
        time.sleep(3)
        # check if any file matching pattern exists in download directory
        if os.path.exists(download_dir):
            files = os.listdir(download_dir)
            for file in files:
                if filename_pattern in file and file.endswith(".pdf"):
                    return True
        return False

    # 3: click month filter

    def click_month_filter(self):
        # wait for button to be clickable
        wait = WebDriverWait(self.driver, 10)
        month_btn = wait.until(
            EC.element_to_be_clickable((By.XPATH, self.month_filter_button_xpath))
        )
        # click the button
        month_btn.click()
        # wait for filter to apply
        time.sleep(2)

    # 4: click reset button

    def click_reset_button(self):
        # identify reset button
        reset_btn = self.driver.find_element(By.XPATH, self.reset_filters_button_xpath)
        # click the button
        reset_btn.click()
        # wait for reset to apply
        time.sleep(2)

    # 5: get current filter text

    def get_current_filter_text(self):
        # identify the filter text element
        filter_text = self.driver.find_element(By.ID, self.current_filter_text_id)
        # return the text
        return filter_text.text

    # 6: check if filters are cleared

    def are_filters_cleared(self):
        # get current filter text
        filter_text = self.get_current_filter_text()
        # check if it shows "All Time" (default state)
        return "All Time" in filter_text

    # 7: get start date value

    def get_start_date_value(self):
        # identify start date input
        start_date = self.driver.find_element(By.ID, self.start_date_input_id)
        # return the value
        return start_date.get_attribute("value")

    # 8: get end date value

    def get_end_date_value(self):
        # identify end date input
        end_date = self.driver.find_element(By.ID, self.end_date_input_id)
        # return the value
        return end_date.get_attribute("value")
