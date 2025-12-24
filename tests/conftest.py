import pytest
import os
from selenium import webdriver
from pytest_metadata.plugin import metadata_key


# browser and headless mode options
def pytest_addoption(parser):
    parser.addoption(
        "--browser",
        action="store",
        default="chrome",
        help="Specify the browser: chrome or firefox or edge",
    )
    parser.addoption(
        "--headless",
        action="store_true",
        default=False,
        help="Run tests in headless mode",
    )


@pytest.fixture()
def browser(request):
    return request.config.getoption("--browser")


@pytest.fixture()
def headless(request):
    return request.config.getoption("--headless")


@pytest.fixture()
def setup(browser, headless):
    global driver

    if browser == "chrome":
        from selenium.webdriver.chrome.options import Options

        chrome_options = Options()

        if headless:
            chrome_options.add_argument("--headless=new")
            chrome_options.add_argument("--window-size=1920,1080")

        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-extensions")
        chrome_options.add_argument("--force-device-scale-factor=1")

        # download directory
        download_dir = os.path.join(os.getcwd(), "tests", "downloads")
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)

        prefs = {
            "download.default_directory": download_dir,
            "download.prompt_for_download": False,
            "download.directory_upgrade": True,
            "safebrowsing.enabled": True,
        }
        chrome_options.add_experimental_option("prefs", prefs)

        driver = webdriver.Chrome(options=chrome_options)

    elif browser == "firefox":
        from selenium.webdriver.firefox.options import Options

        firefox_options = Options()

        if headless:
            firefox_options.add_argument("--headless")
            firefox_options.add_argument("--width=1920")
            firefox_options.add_argument("--height=1080")

        driver = webdriver.Firefox(options=firefox_options)

    elif browser == "edge":
        from selenium.webdriver.edge.options import Options

        edge_options = Options()

        if headless:
            edge_options.add_argument("--headless=new")
            edge_options.add_argument("--window-size=1920,1080")

        driver = webdriver.Edge(options=edge_options)
    else:
        raise ValueError("Unsupported browser")

    if not headless:
        try:
            driver.maximize_window()
        except:
            pass

    driver.implicitly_wait(10)

    yield driver
    driver.quit()


# report metadata
def pytest_configure(config):
    config.stash[metadata_key]["Project Name"] = "ComplaNet"
    config.stash[metadata_key]["Test Module Name"] = "Automated Tests"
    config.stash[metadata_key]["Tester"] = "Admin"


# cleanup hooks
@pytest.mark.optionalhook
def pytest_metadata(metadata):
    metadata.pop("Plugins", None)
