@echo off
REM ========================================
REM Run Tests by Feature
REM ========================================
echo.
echo ========================================
echo Select Test Feature
echo ========================================
echo.
echo 1. Login Tests
echo 2. Search Tests
echo 3. Filter Tests
echo 4. Delete Tests
echo 5. Logout Tests
echo 6. Analytics Tests
echo 7. View Tests
echo 8. Password Reset Tests
echo 9. Update Status Tests
echo 10. All Tests
echo.
set /p choice="Enter your choice (1-10): "

if "%choice%"=="1" (
    echo Running LOGIN tests...
    pytest tests/test_cases/test_login.py -v -s
)
if "%choice%"=="2" (
    echo Running SEARCH tests...
    pytest tests/test_cases/test_search.py -v -s
)
if "%choice%"=="3" (
    echo Running FILTER tests...
    pytest tests/test_cases/test_filter.py -v -s
)
if "%choice%"=="4" (
    echo Running DELETE tests...
    pytest tests/test_cases/test_delete.py -v -s
)
if "%choice%"=="5" (
    echo Running LOGOUT tests...
    pytest tests/test_cases/test_logout.py -v -s
)
if "%choice%"=="6" (
    echo Running ANALYTICS tests...
    pytest tests/test_cases/test_analytics.py -v -s
)
if "%choice%"=="7" (
    echo Running VIEW tests...
    pytest tests/test_cases/test_view.py -v -s
)
if "%choice%"=="8" (
    echo Running PASSWORD RESET tests...
    pytest tests/test_cases/test_password_reset.py -v -s
)
if "%choice%"=="9" (
    echo Running UPDATE STATUS tests...
    pytest tests/test_cases/test_update_status.py -v -s
)
if "%choice%"=="10" (
    echo Running ALL tests...
    pytest tests/test_cases/ -v -s
)

echo.
echo ========================================
echo Test Execution Complete!
echo ========================================
echo.
pause
