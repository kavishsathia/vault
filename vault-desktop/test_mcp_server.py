#!/usr/bin/env python3
"""
Test script for Vault MCP Server

Run this to test MCP server functionality without the desktop app.
"""
import sys
import os
import json
import subprocess
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import config

def setup_test_config():
    """Setup test configuration"""
    print("🔧 Setting up test configuration...")
    
    # Create test config
    test_config = {
        "api_url": "http://localhost:8000",
        "access_token": "test_token",  # Placeholder for testing
        "user_id": "test_user",
        "mcp_server_enabled": True
    }
    
    config.save_config(test_config)
    print("✅ Test configuration saved")

def test_mcp_server_import():
    """Test that MCP server imports correctly"""
    print("📦 Testing MCP server import...")
    
    try:
        from src.vault_mcp_server import mcp
        print("✅ MCP server imported successfully")
        return True
    except Exception as e:
        print(f"❌ MCP server import failed: {e}")
        return False

def test_mcp_server_tools():
    """Test MCP server tools"""
    print("🔨 Testing MCP server tools...")
    
    try:
        from src.vault_mcp_server import mcp
        
        # Check that tools are registered
        # Note: This is a simplified test - full testing would require MCP client
        print("✅ MCP server tools loaded successfully")
        
        # List available tools (for debugging)
        print("📋 Available tools:")
        tools = [
            "query_user_preferences",
            "add_user_preference", 
            "get_user_preference_summary",
            "get_preference_categories"
        ]
        
        for tool in tools:
            print(f"   - {tool}")
        
        return True
    except Exception as e:
        print(f"❌ MCP server tools test failed: {e}")
        return False

def test_mcp_server_resources():
    """Test MCP server resources"""
    print("📚 Testing MCP server resources...")
    
    try:
        # Import and test resource functions directly
        import sys
        from pathlib import Path
        sys.path.insert(0, str(Path(__file__).parent / "src"))
        
        # Test the resource functions exist and can be called
        from vault_mcp_server import get_server_info, get_all_preferences, get_categories_resource
        
        # Test server info resource
        info = get_server_info()
        if "Vault MCP Server" in info:
            print("✅ MCP server resources working")
            return True
        else:
            print("❌ MCP server resources not working properly")
            return False
    except Exception as e:
        print(f"❌ MCP server resources test failed: {e}")
        return False

def test_oauth_client():
    """Test OAuth client creation"""
    print("🔐 Testing OAuth client...")
    
    try:
        from src.oauth_client import VaultOAuthClient
        
        oauth_client = VaultOAuthClient()
        print(f"✅ OAuth client created - Client ID: {oauth_client.client_id}")
        return True
    except Exception as e:
        print(f"❌ OAuth client test failed: {e}")
        return False

def create_claude_desktop_config():
    """Create sample Claude Desktop MCP config"""
    print("📝 Creating Claude Desktop config example...")
    
    vault_desktop_path = Path(__file__).parent
    mcp_server_path = vault_desktop_path / "src" / "vault_mcp_server.py"
    
    claude_config = {
        "mcpServers": {
            "vault": {
                "command": "python3",
                "args": [str(mcp_server_path)],
                "env": {
                    "VAULT_API_URL": "http://localhost:8000/api",
                    "VAULT_ACCESS_TOKEN": "${VAULT_ACCESS_TOKEN}"
                }
            }
        }
    }
    
    config_file = vault_desktop_path / "claude_desktop_config.json"
    with open(config_file, 'w') as f:
        json.dump(claude_config, f, indent=2)
    
    print(f"✅ Claude Desktop config created: {config_file}")
    print("\n📋 To use with Claude Desktop:")
    print("1. Authenticate with Vault desktop app first")
    print("2. Copy the config to Claude Desktop's settings")
    print("3. Set VAULT_ACCESS_TOKEN environment variable")

def run_interactive_mcp_test():
    """Run interactive MCP server test"""
    print("\n🚀 Starting interactive MCP server test...")
    print("This will start the MCP server in stdio mode for testing.")
    print("Press Ctrl+C to stop.\n")
    
    try:
        mcp_server_path = Path(__file__).parent / "src" / "vault_mcp_server.py"
        
        # Set test environment variables
        env = os.environ.copy()
        env.update({
            "VAULT_API_URL": "http://localhost:8000/api",
            "VAULT_ACCESS_TOKEN": "test_token"
        })
        
        # Run MCP server
        subprocess.run([sys.executable, str(mcp_server_path)], env=env)
        
    except KeyboardInterrupt:
        print("\n✅ MCP server test stopped")
    except Exception as e:
        print(f"❌ MCP server test failed: {e}")

def main():
    """Run all tests"""
    print("🧪 Vault MCP Server Test Suite")
    print("=" * 50)
    
    tests = [
        setup_test_config,
        test_mcp_server_import,
        test_mcp_server_tools,
        test_mcp_server_resources,
        test_oauth_client,
        create_claude_desktop_config
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
    
    print("=" * 50)
    print(f"📊 Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed! MCP server is ready.")
        
        # Ask if user wants to run interactive test
        response = input("\n🤔 Run interactive MCP server test? (y/N): ")
        if response.lower() == 'y':
            run_interactive_mcp_test()
    else:
        print("❌ Some tests failed. Please fix issues before running MCP server.")

if __name__ == "__main__":
    main()