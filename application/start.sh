#!/bin/bash

echo "🎥 Starting WebRTC Video Streaming Robot"
echo "========================================"

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  No virtual environment found. Consider creating one:"
    echo "   python -m venv venv"
    echo "   source venv/bin/activate"
    echo "   pip install -r requirements.txt"
    echo ""
fi

# Check if dependencies are installed
echo "🔍 Checking dependencies..."
python -c "import cv2, aiortc, socketio; print('✅ All dependencies available')" 2>/dev/null || {
    echo "❌ Missing dependencies. Installing..."
    pip install -r requirements.txt
}

# Test camera before starting
echo "🎥 Testing camera..."
python test_camera.py --quick 2>/dev/null || {
    echo "⚠️  Camera test failed, but continuing anyway..."
}

echo "🚀 Starting robot application..."
python robot.py