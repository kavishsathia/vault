#!/usr/bin/env python3
"""
Vault Desktop App

System tray application that manages OAuth authentication and runs MCP server
for universal AI tool integration with Vault preferences.
"""
import sys
import os
import subprocess
import threading
import time
from pathlib import Path
from PIL import Image, ImageDraw
import pystray
from pystray import MenuItem as item
import logging
from oauth_client import VaultOAuthClient
from config import config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Path.home() / ".vault" / "app.log"),
        logging.StreamHandler(sys.stderr)
    ]
)
logger = logging.getLogger(__name__)

class VaultDesktopApp:
    """Main desktop application class"""
    
    def __init__(self):
        self.oauth_client = VaultOAuthClient()
        self.mcp_server_process = None
        self.icon = None
        self.running = True
        
        # Status tracking
        self.authenticated = False
        self.mcp_server_running = False
        
        logger.info("Vault Desktop App initialized")
    
    def create_icon_image(self, color: str = "purple") -> Image.Image:
        """Create system tray icon image"""
        # Create a 64x64 icon with Vault logo
        icon_size = 64
        image = Image.new('RGBA', (icon_size, icon_size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(image)
        
        # Color scheme
        colors = {
            "purple": "#8b5cf6",
            "green": "#10b981", 
            "red": "#ef4444",
            "gray": "#6b7280"
        }
        
        icon_color = colors.get(color, colors["purple"])
        
        # Draw vault icon (simplified lock shape)
        margin = 8
        lock_rect = [margin, margin + 8, icon_size - margin, icon_size - margin]
        
        # Lock body (rectangle)
        draw.rectangle(lock_rect, fill=icon_color)
        
        # Lock shackle (arc at top)
        shackle_rect = [margin + 12, margin, icon_size - margin - 12, margin + 24]
        draw.arc(shackle_rect, 0, 180, fill=icon_color, width=4)
        
        return image
    
    def create_menu(self):
        """Create system tray context menu"""
        # Dynamic menu based on authentication status
        if self.authenticated:
            auth_item = item('✅ Authenticated', None, enabled=False)
            auth_action = item('Logout', self.logout)
        else:
            auth_item = item('❌ Not Authenticated', None, enabled=False)
            auth_action = item('Login to Vault', self.login)
        
        # MCP Server status
        if self.mcp_server_running:
            mcp_item = item('🟢 MCP Server Running', None, enabled=False)
            mcp_action = item('Restart MCP Server', self.restart_mcp_server)
        else:
            mcp_item = item('🔴 MCP Server Stopped', None, enabled=False)
            mcp_action = item('Start MCP Server', self.start_mcp_server)
        
        return pystray.Menu(
            auth_item,
            auth_action,
            pystray.Menu.SEPARATOR,
            mcp_item,
            mcp_action,
            pystray.Menu.SEPARATOR,
            item('Open Vault Dashboard', self.open_dashboard),
            item('Settings', self.open_settings),
            pystray.Menu.SEPARATOR,
            item('About', self.show_about),
            item('Quit', self.quit_app)
        )
    
    def update_status(self):
        """Update authentication and MCP server status"""
        self.authenticated = self.oauth_client.is_authenticated()
        self.mcp_server_running = self.is_mcp_server_running()
        
        # Update icon color based on status
        if self.authenticated and self.mcp_server_running:
            icon_color = "green"  # Everything working
        elif self.authenticated:
            icon_color = "purple"  # Authenticated but MCP server not running
        else:
            icon_color = "red"  # Not authenticated
        
        # Update icon and menu
        if self.icon:
            self.icon.icon = self.create_icon_image(icon_color)
            self.icon.menu = self.create_menu()
    
    def login(self, icon=None, item=None):
        """Start OAuth login flow"""
        logger.info("Starting OAuth login flow")
        
        def login_thread():
            try:
                success = self.oauth_client.start_authorization_flow()
                if success:
                    logger.info("Login successful")
                    self.update_status()
                    # Auto-start MCP server after successful login
                    if config.get("mcp_server_enabled", True):
                        self.start_mcp_server()
                else:
                    logger.error("Login failed")
                    self.update_status()
            except Exception as e:
                logger.error(f"Login error: {e}")
                self.update_status()
        
        # Run login in background thread to avoid blocking UI
        thread = threading.Thread(target=login_thread)
        thread.daemon = True
        thread.start()
        
        # Start rapid polling for auth status during login flow
        def poll_auth_status():
            """Poll authentication status more frequently during login"""
            for _ in range(120):  # Poll for up to 2 minutes (120 * 1 second)
                if not self.running:
                    break
                
                # Check if authentication status changed
                current_auth = self.oauth_client.is_authenticated()
                if current_auth != self.authenticated:
                    logger.info(f"Authentication status changed: {current_auth}")
                    self.update_status()
                    if current_auth and config.get("mcp_server_enabled", True):
                        self.start_mcp_server()
                    break
                
                time.sleep(1)  # Check every second during login
        
        # Start polling thread
        poll_thread = threading.Thread(target=poll_auth_status)
        poll_thread.daemon = True
        poll_thread.start()
    
    def logout(self, icon=None, item=None):
        """Logout and clear tokens"""
        logger.info("Logging out")
        self.oauth_client.logout()
        self.stop_mcp_server()
        self.update_status()
    
    def start_mcp_server(self, icon=None, item=None):
        """Start MCP server process"""
        if self.mcp_server_running:
            logger.info("MCP server already running")
            return
        
        if not self.authenticated:
            logger.error("Cannot start MCP server - not authenticated")
            return
        
        try:
            # Path to MCP server script
            server_script = Path(__file__).parent / "vault_mcp_final.py"
            python_path = config.get("python_path", sys.executable)
            
            # Start MCP server process
            self.mcp_server_process = subprocess.Popen([
                python_path, str(server_script)
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            logger.info(f"MCP server started with PID {self.mcp_server_process.pid}")
            self.update_status()
            
        except Exception as e:
            logger.error(f"Failed to start MCP server: {e}")
    
    def stop_mcp_server(self, icon=None, item=None):
        """Stop MCP server process"""
        if self.mcp_server_process:
            try:
                self.mcp_server_process.terminate()
                self.mcp_server_process.wait(timeout=5)
                logger.info("MCP server stopped")
            except subprocess.TimeoutExpired:
                self.mcp_server_process.kill()
                logger.warning("MCP server force killed")
            except Exception as e:
                logger.error(f"Error stopping MCP server: {e}")
            finally:
                self.mcp_server_process = None
                self.update_status()
    
    def restart_mcp_server(self, icon=None, item=None):
        """Restart MCP server"""
        logger.info("Restarting MCP server")
        self.stop_mcp_server()
        time.sleep(1)  # Brief pause
        self.start_mcp_server()
    
    def is_mcp_server_running(self) -> bool:
        """Check if MCP server process is running"""
        if self.mcp_server_process is None:
            return False
        
        # Check if process is still alive
        poll = self.mcp_server_process.poll()
        return poll is None
    
    def open_dashboard(self, icon=None, item=None):
        """Open Vault web dashboard"""
        import webbrowser
        api_url = config.get("api_url", "http://localhost:8000")
        dashboard_url = api_url.replace("/api", "").replace(":8000", ":3000")
        webbrowser.open(dashboard_url)
        logger.info(f"Opened dashboard: {dashboard_url}")
    
    def open_settings(self, icon=None, item=None):
        """Open settings (placeholder)"""
        logger.info("Settings opened (placeholder)")
        # TODO: Implement settings dialog
    
    def show_about(self, icon=None, item=None):
        """Show about dialog"""
        logger.info("About dialog (placeholder)")
        # TODO: Implement about dialog
    
    def quit_app(self, icon=None, item=None):
        """Quit the application"""
        logger.info("Quitting Vault Desktop App")
        self.running = False
        self.stop_mcp_server()
        
        if self.icon:
            self.icon.stop()
    
    def status_monitor(self):
        """Background thread to monitor status and refresh tokens"""
        while self.running:
            try:
                # Check if tokens need refresh
                if self.authenticated and config.needs_token_refresh():
                    logger.info("Refreshing access tokens")
                    success = self.oauth_client.refresh_access_token()
                    if not success:
                        logger.warning("Token refresh failed - user needs to re-authenticate")
                        self.authenticated = False
                
                # Update status every 10 seconds
                self.update_status()
                
                # Check MCP server health
                if self.authenticated and config.get("mcp_server_enabled", True) and not self.mcp_server_running:
                    logger.info("Auto-starting MCP server")
                    self.start_mcp_server()
                
            except Exception as e:
                logger.error(f"Status monitor error: {e}")
            
            # Wait 10 seconds before next check (improved responsiveness)
            for _ in range(10):
                if not self.running:
                    break
                time.sleep(1)
    
    def run(self):
        """Run the desktop application"""
        logger.info("Starting Vault Desktop App")
        
        # Initialize status
        self.update_status()
        
        # Start status monitoring thread
        monitor_thread = threading.Thread(target=self.status_monitor)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        # Auto-start MCP server if authenticated
        if self.authenticated and config.get("mcp_server_enabled", True):
            self.start_mcp_server()
        
        # Create and run system tray icon
        self.icon = pystray.Icon(
            "vault",
            icon=self.create_icon_image("purple"),
            title="Vault - Universal Preference Manager",
            menu=self.create_menu()
        )
        
        logger.info("System tray icon created, running...")
        self.icon.run()

def main():
    """Main entry point"""
    try:
        app = VaultDesktopApp()
        app.run()
    except KeyboardInterrupt:
        logger.info("Application interrupted by user")
    except Exception as e:
        logger.error(f"Application error: {e}")
        raise

if __name__ == "__main__":
    main()