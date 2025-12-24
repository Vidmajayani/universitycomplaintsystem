import configparser
import os

config = configparser.RawConfigParser()
# read config.ini dynamically
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
config_path = os.path.join(base_dir, "tests", "configurations", "config.ini")
config.read(config_path)


class ReadConfig:
    # fetch the variables
    @staticmethod
    def get_login_page_url():
        # section name + key
        url = config.get("admin login information", "login_page_url")
        return url

    @staticmethod
    def get_dashboard_page_url():
        url = config.get("admin login information", "dashboard_page_url")
        return url

    @staticmethod
    def get_analytics_page_url():
        url = config.get("admin login information", "analytics_page_url")
        return url

    @staticmethod
    def get_email():
        email = config.get("admin login information", "email")
        return email

    @staticmethod
    def get_password():
        password = config.get("admin login information", "password")
        return password

    @staticmethod
    def get_invalid_email():
        invalid_email = config.get("admin login information", "invalid_email")
        return invalid_email

    @staticmethod
    def get_invalid_email_format():
        invalid_email_format = config.get(
            "admin login information", "invalid_email_format"
        )
        return invalid_email_format

    @staticmethod
    def get_invalid_password():
        invalid_password = config.get("admin login information", "invalid_password")
        return invalid_password

    @staticmethod
    def get_search_page_url():
        url = config.get("search information", "search_page_url")
        return url

    @staticmethod
    def get_single_keyword():
        keyword = config.get("search information", "single_keyword")
        return keyword

    @staticmethod
    def get_multiple_keywords():
        keyword = config.get("search information", "multiple_keywords")
        return keyword

    @staticmethod
    def get_exact_match():
        keyword = config.get("search information", "exact_match")
        return keyword

    @staticmethod
    def get_numeric_keyword():
        keyword = config.get("search information", "numeric_keyword")
        return keyword

    @staticmethod
    def get_partial_keyword():
        keyword = config.get("search information", "partial_keyword")
        return keyword

    @staticmethod
    def get_category_keyword():
        keyword = config.get("search information", "category_keyword")
        return keyword

    @staticmethod
    def get_complainant_name():
        name = config.get("search information", "complainant_name")
        return name

    @staticmethod
    def get_status_keyword():
        keyword = config.get("search information", "status_keyword")
        return keyword

    @staticmethod
    def get_complaint_id():
        complaint_id = config.get("search information", "complaint_id")
        return complaint_id

    @staticmethod
    def get_description_keyword():
        keyword = config.get("search information", "description_keyword")
        return keyword

    @staticmethod
    def get_title_keyword():
        keyword = config.get("search information", "title_keyword")
        return keyword

    @staticmethod
    def get_special_characters():
        keyword = config.get("search information", "special_characters")
        return keyword

    @staticmethod
    def get_reset_password_page_url():
        url = config.get("password reset information", "reset_password_page_url")
        return url

    @staticmethod
    def get_change_password_page_url():
        url = config.get("password reset information", "change_password_page_url")
        return url

    @staticmethod
    def get_valid_reset_email():
        email = config.get("password reset information", "valid_reset_email")
        return email

    @staticmethod
    def get_invalid_reset_email():
        email = config.get("password reset information", "invalid_reset_email")
        return email

    @staticmethod
    def get_new_password():
        password = config.get("password reset information", "new_password")
        return password

    @staticmethod
    def get_all_complaints_page_url():
        url = config.get("update status information", "all_complaints_page_url")
        return url

    @staticmethod
    def get_status_update_reason():
        reason = config.get("update status information", "status_update_reason")
        return reason

    # filter information methods

    @staticmethod
    def get_filter_status():
        status = config.get("filter information", "filter_status")
        return status

    @staticmethod
    def get_filter_date_from():
        date_from = config.get("filter information", "filter_date_from")
        return date_from

    @staticmethod
    def get_filter_date_to():
        date_to = config.get("filter information", "filter_date_to")
        return date_to

    # delete complaint information methods

    @staticmethod
    def get_deletion_reason():
        reason = config.get("delete complaint information", "deletion_reason")
        return reason

    @staticmethod
    def get_delete_complaint_keyword():
        keyword = config.get("delete complaint information", "delete_complaint_keyword")
        return keyword
