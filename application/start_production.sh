#!/bin/bash

echo "🚀 Starting WebRTC Robot in PRODUCTION mode"
echo "=========================================="

# Set environment to production
export ENVIRONMENT=production

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
else
    echo "⚠️  No virtual environment found. Creating one..."
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

echo "🌐 Environment: PRODUCTION"
echo "📡 Will connect to deployed signaling server"

# Test camera before starting
echo "🎥 Testing camera..."
python test_camera.py --quick 2>/dev/null || {
    echo "⚠️  Camera test failed, but continuing anyway..."
}

echo "🚀 Starting robot application in production mode..."
python robot.py