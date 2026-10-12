@echo off
rem Saytni shu kompyuterda ishga tushiradi va brauzerda ochadi.
cd /d "%~dp0"
set "PATH=%PATH%;%LOCALAPPDATA%\Programs\nodejs"
if not exist node_modules call npm install
call npm run dev -- --open
pause
