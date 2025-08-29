#!/usr/bin/env python3
"""
Command Line OAuth Authentication for Vault

Use this if you can't see the system tray icon.
"""
import sys
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from oauth_client import VaultOAuthClient
from config import config

def main():
    """Command line OAuth flow"""
    print("🔐 Vault OAuth Authentication")
    print("=" * 40)
    
    oauth_client = VaultOAuthClient()
    
    # Check current status
    if oauth_client.is_authenticated():
        print("✅ Already authenticated!")
        current_config = config.load_config()
        print(f"   User ID: {current_config.get('user_id', 'unknown')}")
        print(f"   Token expires: {current_config.get('expires_at', 'unknown')}")
        
        choice = input("\n🤔 Re-authenticate? (y/N): ")
        if choice.lower() != 'y':
            print("✅ Keeping existing authentication")
            return
    else:
        print("❌ Not authenticated")
    
    print("\n🚀 Starting OAuth flow...")
    print("   1. Browser will open to Vault login page")
    print("   2. Login with your credentials")  
    print("   3. Approve permissions")
    print("   4. Return here when done")
    
    input("\nPress Enter to continue...")
    
    try:
        success = oauth_client.start_authorization_flow()
        
        if success:
            print("\n🎉 Authentication successful!")
            print("✅ You can now:")
            print("   - Use the MCP server with AI tools")
            print("   - Run: python src/vault_mcp_server.py")
            print("   - Connect Claude Desktop to your preferences")
        else:
            print("\n❌ Authentication failed")
            print("   Check that Vault backend is running at http://localhost:8000")
            
    except KeyboardInterrupt:
        print("\n⚠️  Authentication cancelled")
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    main()