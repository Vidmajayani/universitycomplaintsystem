@echo off
REM ========================================
REM Run REGRESSION Tests (All Tests)
REM ========================================
echo.
echo ========================================
echo Running REGRESSION Tests
echo ========================================
echo.

pytest tests/test_cases/ -m regression -v -s

echo.
echo ========================================
echo Regression Tests Complete!
echo ========================================
echo.
pause
