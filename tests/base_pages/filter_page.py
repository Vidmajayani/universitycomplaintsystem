from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class FilterPage:
    # locators
    status_filter_dropdown_id = "filterStatus"
    category_filter_dropdown_id = "filterCategory"
    date_from_input_id = "filterDateFrom"
    date_to_input_id = "filterDateTo"
    complaints_table_body_id = "complaintsTableBody"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: check if status filter is clickable

    def is_status_filter_clickable(self):
        # wait for status filter to be clickable
        wait = WebDriverWait(self.driver, 10)
        try:
            filter_element = wait.until(
                EC.element_to_be_clickable((By.ID, self.status_filter_dropdown_id))
            )
            return filter_element.is_enabled()
        except:
            return False

    # 2: click status filter

    def click_status_filter(self):
        # identify the status filter
        self.driver.find_element(By.ID, self.status_filter_dropdown_id).click()

    # 3: get status filter options

    def get_status_filter_options(self):
        # identify the status filter dropdown
        dropdown = Select(self.driver.find_element(By.ID, self.status_filter_dropdown_id))
        # get all options
        options = dropdown.options
        # return list of option texts
        return [option.text for option in options]

    # 4: select status filter option

    def select_status_filter(self, status):
        # wait for complaints table to load first
        wait = WebDriverWait(self.driver, 20)
        # wait for table body to not be empty and not show loading message
        wait.until(
            lambda driver: len(
                driver.find_elements(By.CSS_SELECTOR, f"#{self.complaints_table_body_id} tr")
            )
            > 0
        )
        wait.until(
            lambda driver: "Loading complaints"
            not in driver.find_element(By.ID, self.complaints_table_body_id).text
        )

        # wait a bit more for filters to be ready
        time.sleep(2)

        # identify the status filter dropdown
        status_filter = self.driver.find_element(By.ID, self.status_filter_dropdown_id)

        # scroll to the filter
        self.driver.execute_script("arguments[0].scrollIntoView(true);", status_filter)
        time.sleep(1)

        # use JavaScript to select the option for better reliability
        self.driver.execute_script(
            f"""
            var select = document.getElementById('{self.status_filter_dropdown_id}');
            for(var i = 0; i < select.options.length; i++) {{
                if(select.options[i].text === '{status}') {{
                    select.selectedIndex = i;
                    select.dispatchEvent(new Event('change'));
                    break;
                }}
            }}
        """
        )

        # wait for filter to apply
        time.sleep(2)

    # 5: set date from

    def set_date_from(self, date):
        # use JavaScript to set date value and trigger change event
        self.driver.execute_script(
            f"""
            var dateInput = document.getElementById('{self.date_from_input_id}');
            dateInput.value = '{date}';
            dateInput.dispatchEvent(new Event('change'));
            dateInput.dispatchEvent(new Event('input'));
        """
        )
        # wait for filter to apply
        time.sleep(1)

    # 6: set date to

    def set_date_to(self, date):
        # use JavaScript to set date value and trigger change event
        self.driver.execute_script(
            f"""
            var dateInput = document.getElementById('{self.date_to_input_id}');
            dateInput.value = '{date}';
            dateInput.dispatchEvent(new Event('change'));
            dateInput.dispatchEvent(new Event('input'));
        """
        )
        # wait for filter to apply
        time.sleep(1)

    # 7: clear date from

    def clear_date_from(self):
        # use JavaScript to clear date value and trigger change event
        self.driver.execute_script(
            f"""
            var dateInput = document.getElementById('{self.date_from_input_id}');
            dateInput.value = '';
            dateInput.dispatchEvent(new Event('change'));
            dateInput.dispatchEvent(new Event('input'));
        """
        )
        # wait for filter to apply
        time.sleep(1)

    # 8: clear date to

    def clear_date_to(self):
        # use JavaScript to clear date value and trigger change event
        self.driver.execute_script(
            f"""
            var dateInput = document.getElementById('{self.date_to_input_id}');
            dateInput.value = '';
            dateInput.dispatchEvent(new Event('change'));
            dateInput.dispatchEvent(new Event('input'));
        """
        )
        # wait for filter to apply
        time.sleep(1)

    # 9: get results count

    def get_results_count(self):
        import time

        # identify the table body
        table_body = self.driver.find_element(By.ID, self.complaints_table_body_id)

        # wait a bit for JavaScript to render
        time.sleep(1)

        # find all rows in the table body
        rows = table_body.find_elements(By.TAG_NAME, "tr")

        # check if the only row is the "No complaints found" message
        if len(rows) == 1:
            row_text = rows[0].text.strip()
            # check for empty state messages or empty text
            if (
                not row_text
                or "No complaints found" in row_text
                or "Loading complaints" in row_text
            ):
                return 0

        # return the count of actual complaint rows
        return len(rows)

    # 10: check if results contain status

    def results_contain_status(self, status):
        # wait for results to load
        time.sleep(2)
        # identify the table body
        table_body = self.driver.find_element(By.ID, self.complaints_table_body_id)
        # get all status badges
        status_badges = table_body.find_elements(By.CLASS_NAME, "col-status")

        # if no badges found, return False
        if len(status_badges) == 0:
            return False

        # check if all badges match the status
        for badge in status_badges:
            if badge.text.strip() != status:
                return False

        return True
