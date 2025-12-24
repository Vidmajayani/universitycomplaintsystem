from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class LogoutPage:
    # locators
    profile_button_id = "profileButton"
    profile_menu_id = "profileMenu"
    header_logout_button_id = "headerLogoutBtn"
    logout_modal_id = "logoutModal"
    confirm_logout_button_id = "confirmLogoutBtn"
    cancel_logout_button_id = "cancelLogoutBtn"

    # constructor
    def __init__(self, driver):
        self.driver = driver

    # action methods

    # 1: click profile button

    def click_profile_button(self):
        # wait for profile button to be clickable
        wait = WebDriverWait(self.driver, 10)
        profile_button = wait.until(
            EC.element_to_be_clickable((By.ID, self.profile_button_id))
        )
        # click the profile button
        profile_button.click()

    # 2: check if profile menu is displayed

    def is_profile_menu_displayed(self):
        # wait for profile menu to be visible
        wait = WebDriverWait(self.driver, 10)
        try:
            menu = wait.until(
                EC.visibility_of_element_located((By.ID, self.profile_menu_id))
            )
            return "hidden" not in menu.get_attribute("class")
        except:
            return False

    # 3: click logout button in dropdown

    def click_logout_button(self):
        # identify the logout button
        # perform click action
        self.driver.find_element(By.ID, self.header_logout_button_id).click()

    # 4: check if logout modal is displayed

    def is_logout_modal_displayed(self):
        # wait for modal to be visible
        wait = WebDriverWait(self.driver, 10)
        try:
            modal = wait.until(
                EC.visibility_of_element_located((By.ID, self.logout_modal_id))
            )
            return "hidden" not in modal.get_attribute("class")
        except:
            return False

    # 5: click confirm logout button

    def click_confirm_logout(self):
        # identify the confirm logout button
        # perform click action
        self.driver.find_element(By.ID, self.confirm_logout_button_id).click()

    # 6: check if redirected to login page

    def is_on_login_page(self):
        # wait a bit for redirect
        time.sleep(2)
        # check if current URL contains Login.html
        return "Login.html" in self.driver.current_url
