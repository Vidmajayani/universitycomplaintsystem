@echo off
REM Set PATH to include Scoop installations
set PATH=%USERPROFILE%\scoop\shims;%PATH%

REM Run allure with all arguments passed to this script
allure %*
