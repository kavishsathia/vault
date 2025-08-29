"""
Configuration management for Vault Desktop App
"""
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)

class VaultConfig:
    """Manages configuration for Vault desktop app and MCP server"""
    
    def __init__(self):
        self.config_dir = Path.home() / ".vault"
        self.config_file = self.config_dir / "config.json"
        self.ensure_config_dir()
        
    def ensure_config_dir(self):
        """Ensure config directory exists"""
        self.config_dir.mkdir(exist_ok=True)
        
    def load_config(self) -> Dict[str, Any]:
        """Load configuration from file"""
        if not self.config_file.exists():
            return self.get_default_config()
            
        try:
            with open(self.config_file) as f:
                config = json.load(f)
                # Merge with defaults to ensure all keys exist
                default_config = self.get_default_config()
                default_config.update(config)
                return default_config
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return self.get_default_config()
    
    def save_config(self, config: Dict[str, Any]):
        """Save configuration to file"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(config, f, indent=2)
            logger.info("Configuration saved successfully")
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
    
    def get_default_config(self) -> Dict[str, Any]:
        """Get default configuration"""
        return {
            # API settings
            "api_url": "http://localhost:8000",
            "api_timeout": 30,
            
            # OAuth settings  
            "oauth_client_id": "vault-desktop-app",
            "oauth_redirect_uri": "http://localhost:8080/callback",
            "oauth_scopes": ["read:preferences", "write:preferences", "query:preferences"],
            
            # Python environment
            "python_path": "/Users/kavishsathia/Documents/Side Projects/vault/.venv/bin/python",
            
            # Authentication
            "access_token": "",
            "refresh_token": "", 
            "user_id": "",
            "expires_at": 0,
            
            # MCP Server settings
            "mcp_server_enabled": True,
            "mcp_server_host": "127.0.0.1",
            "mcp_server_port": 3001,
            
            # Desktop app settings
            "auto_start": False,
            "minimize_to_tray": True,
            "debug_mode": False,
            
            # Preference settings
            "default_strength": 1.0,
            "auto_categorize": True
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get configuration value"""
        config = self.load_config()
        return config.get(key, default)
    
    def set(self, key: str, value: Any):
        """Set configuration value"""
        config = self.load_config()
        config[key] = value
        self.save_config(config)
    
    def get_oauth_config(self) -> Dict[str, str]:
        """Get OAuth configuration"""
        config = self.load_config()
        return {
            "client_id": config["oauth_client_id"],
            "redirect_uri": config["oauth_redirect_uri"],
            "scopes": config["oauth_scopes"],
            "api_url": config["api_url"]
        }
    
    def save_oauth_tokens(self, access_token: str, refresh_token: str, expires_at: int, user_id: str):
        """Save OAuth tokens"""
        config = self.load_config()
        config.update({
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
            "user_id": user_id
        })
        self.save_config(config)
        logger.info("OAuth tokens saved")
    
    def clear_oauth_tokens(self):
        """Clear OAuth tokens (logout)"""
        config = self.load_config()
        config.update({
            "access_token": "",
            "refresh_token": "",
            "expires_at": 0,
            "user_id": ""
        })
        self.save_config(config)
        logger.info("OAuth tokens cleared")
    
    def is_authenticated(self) -> bool:
        """Check if user is authenticated"""
        config = self.load_config()
        return bool(config.get("access_token") and config.get("user_id"))
    
    def needs_token_refresh(self) -> bool:
        """Check if tokens need to be refreshed"""
        config = self.load_config()
        import time
        expires_at = config.get("expires_at", 0)
        # Refresh if expiring in next 5 minutes
        return time.time() > (expires_at - 300)

# Global config instance
config = VaultConfig()