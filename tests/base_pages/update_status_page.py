from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class UpdateStatusPage:
    # locators
    edit_status_button_css = "button.btn-status"
    status_modal_id = "statusModal"
    status_dropdown_id = "modalStatusSelect"
    status_update_reason_textarea_id = "modalStatusReason"
    confirm_update_button_id = "confirmStatusBtn"
    cancel_update_button_id = "cancelStatusBtn"
    complaints_table_body_id = "complaintsTableBody"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: click edit button

    def click_edit_button(self):
        # wait for the table body to have content (complaints loaded)
        wait = WebDriverWait(self.driver, 20)
        # wait for table body to not be empty and not show loading message
        wait.until(
            lambda driver: len(
                driver.find_elements(By.CSS_SELECTOR, f"#{self.complaints_table_body_id} tr")
            )
            > 0
        )
        # wait for the loading message to disappear
        wait.until(
            lambda driver: "Loading complaints"
            not in driver.find_element(By.ID, self.complaints_table_body_id).text
        )
        # wait a bit more for JavaScript to attach event handlers
        time.sleep(3)
        # find the first edit button
        edit_buttons = self.driver.find_elements(By.CSS_SELECTOR, self.edit_status_button_css)
        if len(edit_buttons) > 0:
            edit_button = edit_buttons[0]
            # scroll to the button
            self.driver.execute_script(
                "arguments[0].scrollIntoView(true);", edit_button
            )
            time.sleep(1)
            # use JavaScript click for better reliability
            self.driver.execute_script("arguments[0].click();", edit_button)
        else:
            raise Exception("No edit buttons found on the page")

    # 2: select status

    def select_status(self, status):
        # wait for dropdown to be present
        wait = WebDriverWait(self.driver, 10)
        select_element = wait.until(EC.presence_of_element_located((By.ID, self.status_dropdown_id)))
        
        # Scroll into view just in case
        self.driver.execute_script("arguments[0].scrollIntoView(true);", select_element)

        # Make it visible if hidden (often needed for frameworks hiding the real select)
        self.driver.execute_script("arguments[0].style.display = 'block';", select_element)
        time.sleep(0.5) 

        dropdown = Select(select_element)
        dropdown.select_by_visible_text(status)

    # 3: enter reason

    def enter_reason(self, reason):
        # identify the reason textarea
        self.driver.find_element(By.ID, self.status_update_reason_textarea_id).clear()
        # send the reason
        self.driver.find_element(By.ID, self.status_update_reason_textarea_id).send_keys(reason)

    # 4: click update button

    def click_update_button(self):
        # identify the update button
        # perform click action
        try:
            wait = WebDriverWait(self.driver, 10)
            button = wait.until(EC.element_to_be_clickable((By.ID, self.confirm_update_button_id)))
            button.click()
        except:
             button = self.driver.find_element(By.ID, self.confirm_update_button_id)
             self.driver.execute_script("arguments[0].click();", button)

    # 5: click cancel button

    def click_cancel_button(self):
        # identify the cancel button
        # perform click action
        try:
            wait = WebDriverWait(self.driver, 10)
            button = wait.until(EC.element_to_be_clickable((By.ID, self.cancel_update_button_id)))
            button.click()
        except:
            button = self.driver.find_element(By.ID, self.cancel_update_button_id)
            self.driver.execute_script("arguments[0].click();", button)

    # 6: check if modal is displayed
    def is_modal_displayed(self):
        # identify the modal
        modal = self.driver.find_element(By.ID, self.status_modal_id)
        # check if modal is displayed
        return "hidden" not in modal.get_attribute("class")

    # 7: check if modal is closed
    def is_modal_closed(self):
        # identify the modal
        modal = self.driver.find_element(By.ID, self.status_modal_id)
        # check if modal is closed
        return "hidden" in modal.get_attribute("class")
