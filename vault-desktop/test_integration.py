#!/usr/bin/env python3
"""
Integration Test for Vault Desktop App + MCP Server

Tests the complete OAuth + MCP integration flow.
"""
import sys
import time
import subprocess
import requests
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import config

def test_backend_running():
    """Test that Vault backend is running"""
    print("🌐 Testing Vault backend connection...")
    
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Vault backend is running")
            return True
        else:
            print(f"❌ Vault backend returned {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to Vault backend: {e}")
        print("   Make sure to run: cd ../backend && python main.py")
        return False

def test_oauth_client_registered():
    """Test that OAuth client is registered"""
    print("🔐 Testing OAuth client registration...")
    
    try:
        # Try to get client info from the OAuth authorize endpoint
        params = {
            'response_type': 'code',
            'client_id': 'vault-desktop-app',
            'redirect_uri': 'http://localhost:8080/callback',
            'scope': 'read:preferences'
        }
        
        response = requests.get("http://localhost:8000/oauth/authorize", params=params, timeout=5)
        
        # We expect redirect to consent page or 403 (need auth), not 404 (client not found)
        if response.status_code in [302, 403]:
            print("✅ OAuth client is registered")
            return True
        elif response.status_code == 400:
            # Check error message
            if "Invalid client" in response.text:
                print("❌ OAuth client not registered")
                print("   Run: python register_oauth_client.py")
                return False
            else:
                print("✅ OAuth client is registered (400 expected for missing auth)")
                return True
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot test OAuth client: {e}")
        return False

def test_mcp_server_startup():
    """Test MCP server can start up"""
    print("🤖 Testing MCP server startup...")
    
    try:
        mcp_server_path = Path(__file__).parent / "src" / "vault_mcp_server.py"
        
        # Start MCP server process
        process = subprocess.Popen([
            sys.executable, str(mcp_server_path)
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Give it a moment to initialize
        time.sleep(2)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ MCP server started successfully")
            process.terminate()
            process.wait(timeout=5)
            return True
        else:
            stdout, stderr = process.communicate()
            print(f"❌ MCP server failed to start")
            print(f"   stdout: {stdout}")
            print(f"   stderr: {stderr}")
            return False
            
    except Exception as e:
        print(f"❌ MCP server startup test failed: {e}")
        return False

def test_oauth_endpoints():
    """Test OAuth endpoints are working"""
    print("🔗 Testing OAuth endpoints...")
    
    endpoints_to_test = [
        ("/oauth/authorize", "GET"),
        ("/oauth/token", "POST"),
    ]
    
    all_working = True
    
    for endpoint, method in endpoints_to_test:
        try:
            url = f"http://localhost:8000{endpoint}"
            
            if method == "GET":
                # Test with minimal required params to avoid 400
                params = {
                    'response_type': 'code',
                    'client_id': 'vault-desktop-app',
                    'redirect_uri': 'http://localhost:8080/callback',
                    'scope': 'read:preferences'
                }
                response = requests.get(url, params=params, timeout=5)
            else:  # POST
                response = requests.post(url, timeout=5)
            
            # We expect 403 (auth required) or 400 (missing params), not 404 (not found)
            if response.status_code in [400, 403, 422]:
                print(f"   ✅ {endpoint} is responding")
            else:
                print(f"   ❌ {endpoint} returned unexpected {response.status_code}")
                all_working = False
                
        except Exception as e:
            print(f"   ❌ {endpoint} failed: {e}")
            all_working = False
    
    if all_working:
        print("✅ All OAuth endpoints are working")
    else:
        print("❌ Some OAuth endpoints are not working")
    
    return all_working

def test_config_management():
    """Test configuration management"""
    print("⚙️  Testing configuration management...")
    
    try:
        # Test default config
        default_config = config.get_default_config()
        if "oauth_client_id" in default_config:
            print("   ✅ Default config loaded")
        else:
            print("   ❌ Default config missing required keys")
            return False
        
        # Test config save/load
        test_value = f"test_{int(time.time())}"
        config.set("test_key", test_value)
        
        if config.get("test_key") == test_value:
            print("   ✅ Config save/load working")
        else:
            print("   ❌ Config save/load not working")
            return False
        
        # Test OAuth config
        oauth_config = config.get_oauth_config()
        if oauth_config["client_id"] == "vault-desktop-app":
            print("   ✅ OAuth config working")
        else:
            print("   ❌ OAuth config not working")
            return False
        
        print("✅ Configuration management working")
        return True
        
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")
        return False

def show_integration_instructions():
    """Show instructions for manual integration testing"""
    print("\n" + "="*60)
    print("🎯 MANUAL INTEGRATION TEST INSTRUCTIONS")
    print("="*60)
    
    print("\n1. 🚀 Start the Desktop App:")
    print("   python run_desktop_app.py")
    print("   (Should show system tray icon)")
    
    print("\n2. 🔐 Test OAuth Flow:")
    print("   - Right-click tray icon → 'Login to Vault'")
    print("   - Browser should open to Vault OAuth page")
    print("   - Login with your credentials")
    print("   - Should redirect back with success message")
    print("   - Tray icon should show ✅ Authenticated")
    
    print("\n3. 🤖 Test MCP Server:")
    print("   - Tray icon should show 🟢 MCP Server Running")
    print("   - Test with: echo '{\"method\": \"initialize\"}' | python src/vault_mcp_server.py")
    
    print("\n4. 🧠 Test Claude Desktop Integration:")
    print("   - Add MCP config to Claude Desktop settings")
    print("   - Restart Claude Desktop")
    print("   - Ask Claude: 'What tools do you have access to?'")
    print("   - Should mention Vault preference tools")
    
    print("\n5. 🎉 Test End-to-End:")
    print("   - Ask Claude: 'Query my food preferences'")
    print("   - Ask Claude: 'Add preference: I love dark themes'")
    print("   - Should work with your actual Vault data!")
    
    print("\n" + "="*60)

def main():
    """Run integration test suite"""
    print("🧪 Vault Desktop + MCP Integration Test Suite")
    print("=" * 60)
    
    tests = [
        test_backend_running,
        test_oauth_client_registered,
        test_oauth_endpoints,
        test_config_management,
        test_mcp_server_startup,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            result = test()
            if result:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            failed += 1
        print()
    
    print("=" * 60)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n🎉 ALL INTEGRATION TESTS PASSED!")
        print("\nThe Vault Desktop App + MCP Server is ready for use!")
        print("You can now:")
        print("  • Run the desktop app for OAuth authentication")
        print("  • Connect Claude Desktop to your preferences")
        print("  • Build the universal AI preference layer!")
        
        show_integration_instructions()
    else:
        print(f"\n❌ {failed} tests failed. Please fix issues before proceeding.")
        
        if failed == 1 and not test_backend_running():
            print("\n💡 Quick fix: Start the Vault backend server")
            print("   cd ../backend && python main.py")

if __name__ == "__main__":
    main()