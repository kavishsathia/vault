#!/usr/bin/env python3
"""
Register Vault Desktop App as OAuth Client

Run this script to register the desktop app with the Vault OAuth system.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to Python path to import backend models
sys.path.append(str(Path(__file__).parent.parent / "backend"))

from tortoise import Tortoise
from app.models.oauth_client import OAuthClient
from app.models.app import App
import secrets
import os
from dotenv import load_dotenv

async def register_desktop_oauth_client():
    """Register desktop app as OAuth client"""
    
    # Load environment variables
    load_dotenv(Path(__file__).parent.parent / "backend" / ".env")
    
    # Initialize database connection
    await Tortoise.init(
        db_url=os.getenv("DATABASE_URL", "postgresql://vault:vault@localhost:5432/vault"),
        modules={"models": [
            "app.models.user", "app.models.app", "app.models.preference_category",
            "app.models.user_preference", "app.models.preference_source",
            "app.models.user_app_permission", "app.models.query_log",
            "app.models.oauth_client", "app.models.oauth_authorization_code",
            "app.models.oauth_access_token", "app.models.oauth_refresh_token"
        ]}
    )
    
    try:
        # Check if desktop app OAuth client already exists
        existing_client = await OAuthClient.get_or_none(client_id="vault-desktop-app")
        if existing_client:
            print(f"✅ Desktop OAuth client already exists:")
            print(f"   Client ID: {existing_client.client_id}")
            print(f"   Name: {existing_client.name}")
            print(f"   Public Client: {existing_client.is_public}")
            return existing_client
        
        # Create App record first (optional, for unified app management)
        app = await App.create(
            name="Vault Desktop App",
            description="Official Vault desktop application with MCP server integration",
            api_key=f"desktop_{secrets.token_urlsafe(16)}",
            is_active=True
        )
        
        # Create OAuth client
        oauth_client = await OAuthClient.create(
            name="Vault Desktop App",
            client_id="vault-desktop-app",
            client_secret=secrets.token_urlsafe(32),  # Not used for public clients, but required
            redirect_uris=[
                "http://localhost:8080/callback",
                "http://127.0.0.1:8080/callback"
            ],
            allowed_scopes=[
                "read:preferences",
                "write:preferences", 
                "query:preferences",
                "read:preferences:food",
                "read:preferences:entertainment",
                "read:preferences:gaming",
                "read:preferences:ui-ux",
                "read:preferences:work-productivity",
                "read:preferences:social",
                "read:preferences:shopping",
                "read:preferences:health-fitness",
                "read:preferences:travel",
                "read:preferences:learning",
                "write:preferences:food",
                "write:preferences:entertainment",
                "write:preferences:gaming",
                "write:preferences:ui-ux",
                "write:preferences:work-productivity",
                "write:preferences:social",
                "write:preferences:shopping",
                "write:preferences:health-fitness",
                "write:preferences:travel",
                "write:preferences:learning"
            ],
            is_public=True,  # PKCE public client
            app=app
        )
        
        print("✅ Successfully registered Vault Desktop App as OAuth client!")
        print(f"   Client ID: {oauth_client.client_id}")
        print(f"   App ID: {app.id}")
        print(f"   Redirect URIs: {oauth_client.redirect_uris}")
        print(f"   Allowed Scopes: {len(oauth_client.allowed_scopes)} scopes")
        print(f"   Public Client (PKCE): {oauth_client.is_public}")
        
        return oauth_client
        
    except Exception as e:
        print(f"❌ Error registering OAuth client: {e}")
        raise
    finally:
        await Tortoise.close_connections()

if __name__ == "__main__":
    asyncio.run(register_desktop_oauth_client())