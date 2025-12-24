from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class DeletePage:
    # locators
    delete_button_css = "button.btn-delete"
    delete_modal_id = "deleteModal"
    deletion_reason_textarea_id = "modalDeleteReason"
    confirm_delete_button_id = "confirmDeleteBtn"
    cancel_delete_button_id = "cancelDeleteBtn"
    complaints_table_body_id = "complaintsTableBody"
    search_input_id = "searchInput"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: search for specific complaint and click delete

    def search_and_delete_complaint(self, search_keyword):
        # wait for search input to be available
        wait = WebDriverWait(self.driver, 10)
        search_input = wait.until(
            EC.presence_of_element_located((By.ID, self.search_input_id))
        )

        # clear and enter search keyword
        search_input.clear()
        search_input.send_keys(search_keyword)

        # wait for search results to load
        time.sleep(3)

        # wait for table body to have content
        wait.until(
            lambda driver: len(
                driver.find_elements(By.CSS_SELECTOR, f"#{self.complaints_table_body_id} tr")
            )
            > 0
        )

        # find the first delete button in search results
        delete_buttons = self.driver.find_elements(
            By.CSS_SELECTOR, self.delete_button_css
        )
        if len(delete_buttons) > 0:
            delete_button = delete_buttons[0]
            # scroll to the button
            self.driver.execute_script(
                "arguments[0].scrollIntoView(true);", delete_button
            )
            time.sleep(1)
            # use JavaScript click for better reliability
            self.driver.execute_script("arguments[0].click();", delete_button)
        else:
            raise Exception(f"No delete buttons found for complaint: {search_keyword}")

    # 2: click delete button (first one in table)

    def click_delete_button(self):
        # wait for the table body to have content (complaints loaded)
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
        # wait a bit more for JavaScript to attach event handlers
        time.sleep(3)
        # find the first delete button
        delete_buttons = self.driver.find_elements(
            By.CSS_SELECTOR, self.delete_button_css
        )
        if len(delete_buttons) > 0:
            delete_button = delete_buttons[0]
            # scroll to the button
            self.driver.execute_script(
                "arguments[0].scrollIntoView(true);", delete_button
            )
            time.sleep(1)
            # use JavaScript click for better reliability
            self.driver.execute_script("arguments[0].click();", delete_button)
        else:
            raise Exception("No delete buttons found on the page")

    # 2: enter deletion reason

    def enter_reason(self, reason):
        # identify the reason textarea
        self.driver.find_element(By.ID, self.deletion_reason_textarea_id).clear()
        # send the reason
        self.driver.find_element(By.ID, self.deletion_reason_textarea_id).send_keys(reason)

    # 3: click confirm delete button

    def click_confirm_delete(self):
        wait = WebDriverWait(self.driver, 10)
        button = wait.until(
            EC.element_to_be_clickable((By.ID, self.confirm_delete_button_id))
        )
        button.click()

    # 4: click cancel button

    def click_cancel_button(self):
        # identify the cancel button
        # perform click action
        self.driver.find_element(By.ID, self.cancel_delete_button_id).click()

    # 5: check if modal is displayed

    def is_modal_displayed(self):
        # identify the modal
        modal = self.driver.find_element(By.ID, self.delete_modal_id)
        # check if modal is displayed
        return "hidden" not in modal.get_attribute("class")

    # 6: check if modal is closed

    def is_modal_closed(self):
        # identify the modal
        modal = self.driver.find_element(By.ID, self.delete_modal_id)
        # check if modal is closed
        return "hidden" in modal.get_attribute("class")
