@echo off
REM ========================================
REM Run SMOKE Tests (Quick Tests)
REM ========================================
echo.
echo ========================================
echo Running SMOKE Tests
echo ========================================
echo.

pytest -c tests/pytest.ini tests/test_cases/ -m smoke -v -s

echo.
echo ========================================
echo Smoke Tests Complete!
echo ========================================
echo.
pause
