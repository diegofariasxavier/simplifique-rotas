@echo off
cd /d "%~dp0"
gradle :app:assembleRelease :app:lintRelease
if errorlevel 1 exit /b 1
explorer app\build\outputs\apk\release
