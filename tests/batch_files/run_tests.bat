@echo off
REM ========================================
REM ComplaNet Test Suite - Main Menu
REM ========================================
:menu
cls
echo.
echo ========================================
echo   ComplaNet Test Automation Suite
echo ========================================
echo.
echo 1. Run ALL Tests
echo 2. Run Tests by Feature
echo 3. Run Tests by Priority
echo 4. Run Smoke Tests
echo 5. Run Regression Tests
echo 6. View Allure Report
echo 7. Exit
echo.
set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" call run_all_tests.bat
if "%choice%"=="2" call run_tests_by_feature.bat
if "%choice%"=="3" call run_tests_by_priority.bat
if "%choice%"=="4" call run_smoke_tests.bat
if "%choice%"=="5" call run_regression_tests.bat
if "%choice%"=="6" call view_allure_report.bat
if "%choice%"=="7" exit

goto menu
