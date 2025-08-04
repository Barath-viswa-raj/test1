@echo off
echo 🎥 Starting WebRTC Video Streaming Robot
echo ========================================

REM Check if virtual environment exists
if exist "venv" (
    echo 📦 Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo ⚠️  No virtual environment found. Consider creating one:
    echo    python -m venv venv
    echo    venv\Scripts\activate.bat
    echo    pip install -r requirements.txt
    echo.
)

REM Check if dependencies are installed
echo 🔍 Checking dependencies...
python -c "import cv2, aiortc, socketio; print('✅ All dependencies available')" 2>nul || (
    echo ❌ Missing dependencies. Installing...
    pip install -r requirements.txt
)

REM Test camera before starting
echo 🎥 Testing camera...
python test_camera.py --quick 2>nul || (
    echo ⚠️  Camera test failed, but continuing anyway...
)

echo 🚀 Starting robot application...
python robot.py

pause