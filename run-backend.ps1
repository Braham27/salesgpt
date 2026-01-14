# SalesGPT Backend Runner
# Run this script to start the backend server

Set-Location "C:\wamp64\www\SalesGPT\backend"
& "C:\wamp64\www\SalesGPT\.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
