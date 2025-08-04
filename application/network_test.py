#!/usr/bin/env python3
"""
Network diagnostic script to test connectivity for WebRTC cross-network deployment
"""

import asyncio
import socketio
import requests
import socket
from config import SIGNALING_SERVER_URL

async def test_signaling_server():
    """Test connection to signaling server"""
    print("🌐 Testing Signaling Server Connection")
    print("=" * 50)
    
    try:
        # Test HTTP connection first
        response = requests.get(SIGNALING_SERVER_URL.replace('ws://', 'http://').replace('wss://', 'https://'), timeout=10)
        print(f"✅ HTTP connection successful: {response.status_code}")
    except Exception as e:
        print(f"❌ HTTP connection failed: {e}")
        return False
    
    # Test Socket.IO connection
    try:
        sio = socketio.AsyncClient()
        
        @sio.event
        async def connect():
            print("✅ Socket.IO connection successful")
            await sio.emit("test-connection")
            
        @sio.event
        async def disconnect():
            print("📡 Socket.IO disconnected")
            
        print(f"🔗 Connecting to: {SIGNALING_SERVER_URL}")
        await sio.connect(SIGNALING_SERVER_URL)
        await asyncio.sleep(2)  # Wait for connection
        await sio.disconnect()
        return True
        
    except Exception as e:
        print(f"❌ Socket.IO connection failed: {e}")
        return False

def test_stun_servers():
    """Test STUN server connectivity"""
    print("\n🎯 Testing STUN Server Connectivity")
    print("=" * 50)
    
    stun_servers = [
        ("stun.l.google.com", 19302),
        ("stun1.l.google.com", 19302),
        ("stun.stunprotocol.org", 3478),
        ("bn-turn1.xirsys.com", 3478)
    ]
    
    for server, port in stun_servers:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(5)
            result = sock.connect_ex((server, port))
            sock.close()
            
            if result == 0:
                print(f"✅ {server}:{port} - Reachable")
            else:
                print(f"⚠️  {server}:{port} - May be filtered")
                
        except Exception as e:
            print(f"❌ {server}:{port} - Error: {e}")

def get_network_info():
    """Get local network information"""
    print("\n🖥️  Local Network Information")
    print("=" * 50)
    
    try:
        # Get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        print(f"📍 Local IP Address: {local_ip}")
        
        # Get public IP
        try:
            public_ip = requests.get('https://api.ipify.org', timeout=10).text
            print(f"🌍 Public IP Address: {public_ip}")
        except:
            print("❌ Could not determine public IP")
            
        # Check if behind NAT
        if local_ip.startswith(('192.168.', '10.', '172.')):
            print("🏠 Behind NAT/Router - TURN servers required for cross-network")
        else:
            print("🌐 Direct internet connection")
            
    except Exception as e:
        print(f"❌ Network info error: {e}")

def check_firewall_ports():
    """Check if required ports are accessible"""
    print("\n🔥 Firewall/Port Check")
    print("=" * 50)
    
    # Check if we can bind to common WebRTC ports
    test_ports = [3478, 5349, 49152, 65535]  # Common STUN/TURN and RTP ports
    
    for port in test_ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.bind(('', port))
            sock.close()
            print(f"✅ Port {port} (UDP) - Available")
        except:
            print(f"⚠️  Port {port} (UDP) - In use or blocked")

async def main():
    print("🔍 WebRTC Cross-Network Diagnostic Tool")
    print("=" * 60)
    print(f"📡 Signaling Server: {SIGNALING_SERVER_URL}")
    print()
    
    # Run all tests
    get_network_info()
    test_stun_servers()
    check_firewall_ports()
    
    # Test signaling server
    signaling_ok = await test_signaling_server()
    
    print("\n📋 Summary")
    print("=" * 50)
    
    if signaling_ok:
        print("✅ Signaling server connection: OK")
    else:
        print("❌ Signaling server connection: FAILED")
        print("   - Check if your signaling server is deployed and running")
        print("   - Verify the URL in config.py")
    
    print("\n💡 Recommendations for Cross-Network:")
    print("   1. Ensure signaling server is deployed (not localhost)")
    print("   2. Use TURN servers for NAT traversal")
    print("   3. Check firewall settings on both ends")
    print("   4. Test with different networks/devices")
    print("   5. Monitor browser console for WebRTC errors")

if __name__ == "__main__":
    asyncio.run(main())