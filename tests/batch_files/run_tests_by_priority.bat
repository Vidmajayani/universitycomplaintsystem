@echo off
REM ========================================
REM Run Tests by Priority
REM ========================================
echo.
echo ========================================
echo Select Test Priority Level
echo ========================================
echo.
echo 1. Critical Tests
echo 2. High Priority Tests
echo 3. Medium Priority Tests
echo 4. Low Priority Tests
echo 5. All Tests
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Running CRITICAL tests...
    pytest tests/test_cases/ -m critical -v -s
)
if "%choice%"=="2" (
    echo Running HIGH priority tests...
    pytest tests/test_cases/ -m high -v -s
)
if "%choice%"=="3" (
    echo Running MEDIUM priority tests...
    pytest tests/test_cases/ -m medium -v -s
)
if "%choice%"=="4" (
    echo Running LOW priority tests...
    pytest tests/test_cases/ -m low -v -s
)
if "%choice%"=="5" (
    echo Running ALL tests...
    pytest tests/test_cases/ -v -s
)

echo.
echo ========================================
echo Test Execution Complete!
echo ========================================
echo.
pause
