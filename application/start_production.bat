@echo off
echo 🚀 Starting WebRTC Robot in PRODUCTION mode
echo ==========================================

REM Set environment to production
set ENVIRONMENT=production

REM Check if virtual environment exists
if exist "venv" (
    echo 📦 Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo ⚠️  No virtual environment found. Creating one...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
)

echo 🌐 Environment: PRODUCTION
echo 📡 Will connect to deployed signaling server

echo 🎥 Testing camera...
python test_camera.py --quick 2>nul || (
    echo ⚠️  Camera test failed, but continuing anyway...
)

echo 🚀 Starting robot application in production mode...
python robot.py

pause