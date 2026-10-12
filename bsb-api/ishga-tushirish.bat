@echo off
rem BSB/ChSB backendini shu kompyuterda ishga tushiradi (port 4000).
cd /d "%~dp0"
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\nodejs"
if not exist node_modules call npm install
call npm run dev
pause
