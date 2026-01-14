@echo off
echo Installing SalesGPT dependencies...
echo.

echo [1/3] Setting up Python virtual environment...
cd /d C:\wamp64\www\SalesGPT
if not exist .venv (
    python -m venv .venv
)

echo [2/3] Installing backend dependencies...
cd /d C:\wamp64\www\SalesGPT\backend
call C:\wamp64\www\SalesGPT\.venv\Scripts\pip.exe install -r requirements.txt

echo [3/3] Installing frontend dependencies...
cd /d C:\wamp64\www\SalesGPT\frontend
call npm install

echo.
echo ========================================
echo Installation complete!
echo.
echo To start the application, run: start.bat
echo ========================================
pause
