@echo off
cd /d "%~dp0"
cd ../..

echo Checking configuration...

REM Check existing JAVA_HOME
if defined JAVA_HOME goto check_java_valid

REM Auto-detect Java (Try 25 then 21)
if exist "C:\Program Files\Java\jdk-25" set "JAVA_HOME=C:\Program Files\Java\jdk-25" & goto java_found
if exist "C:\Program Files\Java\jdk-21" set "JAVA_HOME=C:\Program Files\Java\jdk-21" & goto java_found
goto java_check_done

:check_java_valid
if not exist "%JAVA_HOME%\bin\java.exe" set "JAVA_HOME=" & goto java_check_done

:java_found
echo Auto-detected Java: %JAVA_HOME%
set "PATH=%JAVA_HOME%\bin;%PATH%"

:java_check_done

REM Add Scoop to Path (Common install location for Allure)
set "PATH=%USERPROFILE%\scoop\shims;%PATH%"

REM Check Allure command
where allure >nul 2>nul
if %ERRORLEVEL% EQU 0 goto run_allure

echo.
echo ERROR: 'allure' command not found!
echo Please install: npm install -g allure-commandline
echo.
echo Press any key to use HTML report...
pause
goto fallback_allure

:run_allure

echo Generating Allure Report...
call allure serve tests/reports/allure-results
if %ERRORLEVEL% EQU 0 goto end

echo Allure failed (Java issue?). Switching to HTML report.

:fallback_allure
echo Opening standard HTML report (Themed)...

:html_report
if exist "tests\reports\report.html" (
    start tests\reports\report.html
) else (
    echo No reports found. Run tests first.
)

:end
pause
