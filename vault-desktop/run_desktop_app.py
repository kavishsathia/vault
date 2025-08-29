#!/usr/bin/env python3
"""
Launcher for Vault Desktop App

This script properly sets up the environment and runs the desktop app.
"""
import sys
import os
from pathlib import Path

def main():
    """Launch Vault Desktop App"""
    
    # Add src directory to Python path
    src_dir = Path(__file__).parent / "src"
    sys.path.insert(0, str(src_dir))
    
    # Set up environment
    os.environ.setdefault("VAULT_API_URL", "http://localhost:8000/api")
    
    print("🚀 Starting Vault Desktop App...")
    print("   - System tray integration enabled")
    print("   - OAuth PKCE flow ready")
    print("   - MCP server integration ready")
    print()
    
    try:
        from desktop_app import main
        main()
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure all dependencies are installed:")
        print("   pip install -r requirements.txt")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error starting desktop app: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()