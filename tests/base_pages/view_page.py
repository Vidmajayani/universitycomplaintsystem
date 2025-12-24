from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class ViewPage:
    # locators
    preview_button_css = "button.btn-preview"
    back_arrow_link_xpath = "//a[@href='AllComplaints.html']"
    complaint_title_text_id = "complaintTitle"
    complaint_description_text_id = "complaintDescription"
    complaint_id_text_id = "complaintId"
    attachments_container_id = "attachmentsContainer"
    attachment_link_css = "a.attachment-link"
    complaints_table_body_id = "complaintsTableBody"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: click preview button (first one in table)

    def click_preview_button(self):
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
        # find the first preview button
        preview_buttons = self.driver.find_elements(
            By.CSS_SELECTOR, self.preview_button_css
        )
        if len(preview_buttons) > 0:
            preview_button = preview_buttons[0]
            # scroll to the button
            self.driver.execute_script(
                "arguments[0].scrollIntoView(true);", preview_button
            )
            time.sleep(1)
            # use JavaScript click for better reliability
            self.driver.execute_script("arguments[0].click();", preview_button)
        else:
            raise Exception("No preview buttons found on the page")

    # 2: check if on complaint details page

    def is_on_complaint_details_page(self):
        # wait a bit for navigation
        time.sleep(2)
        # check if current URL contains AdminComplaintDetails.html
        return "AdminComplaintDetails.html" in self.driver.current_url

    # 3: get complaint title

    def get_complaint_title(self):
        # wait for title to load
        wait = WebDriverWait(self.driver, 10)
        title_element = wait.until(
            EC.presence_of_element_located((By.ID, self.complaint_title_text_id))
        )
        # wait for title to not be "Loading..."
        wait.until(lambda driver: "Loading" not in title_element.text)
        # return the title
        return title_element.text

    # 4: get complaint description

    def get_complaint_description(self):
        # identify description element
        description = self.driver.find_element(
            By.ID, self.complaint_description_text_id
        )
        # return the description
        return description.text

    # 5: check if complaint details are displayed

    def are_complaint_details_displayed(self):
        # check if title and description are not empty or loading
        title = self.get_complaint_title()
        description = self.get_complaint_description()

        return (
            title
            and "Loading" not in title
            and description
            and "Loading" not in description
        )

    # 6: click back arrow

    def click_back_arrow(self):
        # identify back arrow link
        back_arrow = self.driver.find_element(By.XPATH, self.back_arrow_link_xpath)
        # click the link
        back_arrow.click()

    # 7: check if returned to all complaints page

    def is_on_all_complaints_page(self):
        # wait a bit for navigation
        time.sleep(2)
        # check if current URL contains AllComplaints.html
        return "AllComplaints.html" in self.driver.current_url

    # 8: check if attachments exist

    def has_attachments(self):
        # identify attachments container
        attachments_container = self.driver.find_element(
            By.ID, self.attachments_container_id
        )
        # check if there are attachment links
        attachment_links = attachments_container.find_elements(
            By.CSS_SELECTOR, self.attachment_link_css
        )
        return len(attachment_links) > 0

    # 9: click first attachment

    def click_first_attachment(self):
        # identify attachments container
        attachments_container = self.driver.find_element(
            By.ID, self.attachments_container_id
        )
        # find attachment links
        attachment_links = attachments_container.find_elements(
            By.CSS_SELECTOR, self.attachment_link_css
        )
        if len(attachment_links) > 0:
            # get the href before clicking
            attachment_url = attachment_links[0].get_attribute("href")
            # click the first attachment
            attachment_links[0].click()
            return attachment_url
        else:
            return None

    # 10: check if attachment opened in new tab

    def is_attachment_opened_in_new_tab(self):
        # wait a bit for new tab to open
        time.sleep(2)
        # check if there are multiple window handles
        return len(self.driver.window_handles) > 1
