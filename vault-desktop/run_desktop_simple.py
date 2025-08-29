#!/usr/bin/env python3
"""
Simplified Desktop App Runner - Debug Version

Runs with more logging to help debug system tray issues.
"""
import sys
import os
from pathlib import Path

# Add src directory to Python path
src_dir = Path(__file__).parent / "src"
sys.path.insert(0, str(src_dir))

def check_tray_support():
    """Check if system tray is supported"""
    try:
        import pystray
        print("✅ pystray imported successfully")
        
        # Try to create a simple icon to test
        from PIL import Image, ImageDraw
        
        # Create a simple test image
        image = Image.new('RGBA', (64, 64), (138, 92, 246, 255))  # Purple
        print("✅ PIL image created successfully")
        
        return True
    except Exception as e:
        print(f"❌ System tray support check failed: {e}")
        return False

def main():
    """Run simplified desktop app"""
    print("🔍 Vault Desktop App - Debug Mode")
    print("=" * 50)
    
    # Check system requirements
    print("Checking system requirements...")
    
    if not check_tray_support():
        print("❌ System tray not supported. Try running with GUI support.")
        return
    
    print("\n🚀 Starting desktop app with debugging...")
    
    # Set debug environment
    os.environ["VAULT_DEBUG"] = "1"
    os.environ.setdefault("VAULT_API_URL", "http://localhost:8000/api")
    
    try:
        print("Importing desktop app...")
        from desktop_app import VaultDesktopApp
        
        print("Creating app instance...")
        app = VaultDesktopApp()
        
        print("Checking authentication status...")
        print(f"  Authenticated: {app.authenticated}")
        
        print("Starting app...")
        print("  Note: Look for Vault icon in menu bar")
        print("  If you don't see it, try checking 'Control Center' or system preferences")
        print("  Press Ctrl+C to quit")
        print("\n" + "="*50)
        
        app.run()
        
    except KeyboardInterrupt:
        print("\n✅ App stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()