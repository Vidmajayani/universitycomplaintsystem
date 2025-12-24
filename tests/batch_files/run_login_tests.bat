@echo off
REM ========================================
REM Run LOGIN Tests Only
REM ========================================
echo.
echo ========================================
echo Running LOGIN Tests
echo ========================================
echo.

pytest tests/test_cases/test_login.py -v -s

echo.
echo ========================================
echo Login Tests Complete!
echo ========================================
echo.
pause
