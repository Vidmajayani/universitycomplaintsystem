@echo off
REM ========================================
REM Run ALL Tests
REM ========================================
echo.
echo ========================================
echo Running ALL ComplaNet Tests
echo ========================================
echo.

REM Switch to project root regardless of where script is run
cd /d "%~dp0"
cd ../..

if exist "tests\reports\allure-results\*" del /q "tests\reports\allure-results\*"
pytest -c tests/pytest.ini tests/test_cases/ -v -s --browser=chrome --html=tests/reports/temp_report.html --self-contained-html

REM Generate Premium Report (Overwrites report.html)
python tests/utilities/generate_dashboard.py


echo.
echo ========================================
echo Test Execution Complete!
echo ========================================
echo.
pause
