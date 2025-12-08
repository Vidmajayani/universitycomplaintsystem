import pytest
from selenium import webdriver
from pytest_metadata.plugin import metadata_key

# add option method
def pytest_addoption(parser):
    parser.addoption("--browser", action="store", default="chrome", help="Specify the browser: chrome or firefox or edge")

# return the value of the browser
@pytest.fixture()
def browser(request):
    return request.config.getoption("--browser")

# avoids code repetition
@pytest.fixture()
# handles multiple browser test execution
# depending on the command line input
# test case is executed on the specified browser
def setup(browser):
    global driver
    if browser == "chrome":
        driver = webdriver.Chrome()
    elif browser == "firefox":
        driver = webdriver.Firefox()
    elif browser == "edge":
        driver = webdriver.Edge()
    else:
        raise ValueError("Unsupported browser")
    return driver

# for pytest html reports
# hook for adding environment information in the html report
def pytest_configure(config):
    # add custom environment information
    config.stash[metadata_key] ['Project Name'] = 'University Concern Management System, ComplaNet'
    config.stash[metadata_key] ['Test Module Name'] = 'Admin Login Tests'
    config.stash[metadata_key] ['Quality Assurance Analyst Name'] = 'Fathima Salma Muzammil'

# hook to delete or modify environment information in the html report
@pytest.mark.optionalhook
def pytest_metadata(metadata):
    # remove values from the report
    metadata.pop('Plugins', None)


