@echo off
setlocal
cd /d C:\Users\eman\Documents\GitHub\MSP-DeskHub\deskhub-backend
start "" http://localhost:4051/login.html
node server.js
pause
