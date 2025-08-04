#!/usr/bin/env python3
"""
Simple webcam test script to verify camera functionality before running the main application.
"""

import cv2
import sys

def test_camera():
    """Test if the webcam is accessible and working."""
    print("Testing webcam access...")
    
    # Try to open the default camera
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Error: Could not open webcam (index 0)")
        print("Trying alternative camera indices...")
        
        # Try other camera indices
        for i in range(1, 5):
            cap = cv2.VideoCapture(i)
            if cap.isOpened():
                print(f"✅ Found camera at index {i}")
                break
        else:
            print("❌ No cameras found. Please check your webcam connection.")
            return False
    
    # Set camera properties
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    # Get actual camera properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    
    print(f"✅ Camera initialized successfully!")
    print(f"   Resolution: {width}x{height}")
    print(f"   FPS: {fps}")
    
    # Test frame capture
    print("Testing frame capture...")
    ret, frame = cap.read()
    
    if ret:
        print("✅ Frame captured successfully!")
        print(f"   Frame shape: {frame.shape}")
        print("   Press 'q' to quit the camera test window")
        
        # Show live preview (optional)
        while True:
            ret, frame = cap.read()
            if not ret:
                print("❌ Failed to capture frame")
                break
            
            # Display the frame
            cv2.imshow('Camera Test - Press Q to quit', frame)
            
            # Break on 'q' key press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cv2.destroyAllWindows()
        print("✅ Camera test completed successfully!")
        
    else:
        print("❌ Failed to capture frame from camera")
        cap.release()
        return False
    
    cap.release()
    return True

def check_dependencies():
    """Check if required dependencies are installed."""
    print("Checking dependencies...")
    
    try:
        import cv2
        print(f"✅ OpenCV version: {cv2.__version__}")
    except ImportError:
        print("❌ OpenCV not installed. Run: pip install opencv-python")
        return False
    
    try:
        import numpy
        print(f"✅ NumPy version: {numpy.__version__}")
    except ImportError:
        print("❌ NumPy not installed. Run: pip install numpy")
        return False
    
    try:
        import av
        print(f"✅ PyAV available")
    except ImportError:
        print("❌ PyAV not installed. Run: pip install av")
        return False
    
    return True

def quick_test():
    """Quick camera test without GUI."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        return False
    
    ret, frame = cap.read()
    cap.release()
    return ret

if __name__ == "__main__":
    # Check for quick mode
    if len(sys.argv) > 1 and sys.argv[1] == "--quick":
        if quick_test():
            sys.exit(0)
        else:
            sys.exit(1)
    
    print("🎥 WebRTC Camera Test Script")
    print("=" * 40)
    
    # Check dependencies first
    if not check_dependencies():
        print("\n❌ Dependency check failed. Please install missing packages.")
        sys.exit(1)
    
    print("\n" + "=" * 40)
    
    # Test camera
    if test_camera():
        print("\n✅ All tests passed! Your camera is ready for WebRTC streaming.")
        print("You can now run the main application: python robot.py")
    else:
        print("\n❌ Camera test failed. Please check your webcam connection.")
        sys.exit(1)