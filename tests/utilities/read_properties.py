import configparser

config = configparser.RawConfigParser()
# read config.ini
config.read(".\\tests\\configurations\\config.ini")

class Read_Config:
    # fetch the variables
    @staticmethod
    def get_login_page_url():
        # section name + key
        url = config.get('admin login information', 'login_page_url')
        return url

    @staticmethod
    def get_email():
        email = config.get('admin login information', 'email')
        return email

    @staticmethod
    def get_password():
        password = config.get('admin login information', 'password')
        return password
     
    @staticmethod
    def get_invalid_email():
        invalid_email = config.get('admin login information', 'invalid_email')
        return invalid_email
    

