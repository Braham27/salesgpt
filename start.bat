@echo off
echo Starting SalesGPT Backend...
cd /d C:\wamp64\www\SalesGPT\backend
start "SalesGPT Backend" cmd /k "C:\wamp64\www\SalesGPT\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
echo Backend starting on http://localhost:8000
echo.
timeout /t 5 /nobreak > nul
echo Starting SalesGPT Frontend...
cd /d C:\wamp64\www\SalesGPT\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    call npm install
)
start "SalesGPT Frontend" cmd /k "npm run dev"
echo Frontend starting on http://localhost:3000
echo.
echo Both services are starting in separate windows.
echo Press any key to exit this window...
pause > nul
