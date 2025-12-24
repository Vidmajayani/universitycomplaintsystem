from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


class SearchPage:
    # locators
    search_input_id = "searchInput"
    results_table_body_id = "complaintsTableBody"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: enter search keyword

    def enter_search_term(self, search_term):
        import time
        # identify the search input field
        self.driver.find_element(By.ID, self.search_input_id).clear()
        # send the search keyword
        self.driver.find_element(By.ID, self.search_input_id).send_keys(search_term)
        # wait for the search to trigger
        time.sleep(1)

    # 2: get search results count

    def get_results_count(self):
        import time

        # identify the table body
        table_body = self.driver.find_element(By.ID, self.results_table_body_id)

        # wait a bit for JavaScript to render
        time.sleep(1)

        # find all rows in the table body
        rows = table_body.find_elements(By.TAG_NAME, "tr")

        # check if the only row is the "No complaints found" message
        if len(rows) == 1:
            row_text = rows[0].text.strip()

            # check for empty state messages or empty text (still loading)
            if (
                not row_text
                or "No complaints found" in row_text
                or "Loading complaints" in row_text
            ):

                return 0

        # return the count of actual complaint rows

        return len(rows)
    # 3: get data of the first complaint
    def get_first_complaint_data(self):
        # wait for table body to have content
        wait = WebDriverWait(self.driver, 20)
        wait.until(
            lambda driver: len(
                driver.find_elements(By.CSS_SELECTOR, f"#{self.results_table_body_id} tr")
            )
            > 0
        )
        
        # wait for loading to finish
        wait.until(
            lambda driver: "Loading complaints"
            not in driver.find_element(By.ID, self.results_table_body_id).text
        )
        
        first_row = self.driver.find_element(By.CSS_SELECTOR, f"#{self.results_table_body_id} tr")
        cells = first_row.find_elements(By.TAG_NAME, "td")
        
        # Check if there are no complaints
        if len(cells) < 6 or "No complaints" in first_row.text:
            raise Exception("No complaints available in the table")
        
        data = {
            "title": cells[0].text.strip(),
            "category": cells[1].text.strip(),
            "description": cells[2].text.strip(),
            "date": cells[3].text.strip(),
            "lodged_by": cells[4].text.strip(),
            "status": cells[5].text.strip() if len(cells) > 5 else ""
        }
        
        # Extract ID from 'Lodged By' cell
        import re
        lodged_text = data["lodged_by"]
        match = re.search(r"ID: ([a-f0-9-]+)", lodged_text)
        if match:
            data["id"] = match.group(1)
        else:
            data["id"] = ""
        return data
