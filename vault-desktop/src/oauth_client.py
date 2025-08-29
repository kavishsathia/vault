"""
OAuth PKCE Client for Vault Desktop App

Handles OAuth 2.0 Authorization Code flow with PKCE for secure authentication
without requiring client secrets (suitable for desktop apps).
"""
import hashlib
import base64
import secrets
import webbrowser
import time
from typing import Optional, Dict, Any
from urllib.parse import urlencode, parse_qs, urlparse
import requests
from requests_oauthlib import OAuth2Session
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
from config import config

logger = logging.getLogger(__name__)

class CallbackHandler(BaseHTTPRequestHandler):
    """HTTP handler for OAuth callback"""
    
    def do_GET(self):
        """Handle GET request to callback URL"""
        # Parse authorization code from callback
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)
        
        if 'code' in query_params:
            self.server.auth_code = query_params['code'][0]
            self.server.state = query_params.get('state', [''])[0]
            
            # Send success response
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            success_html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Vault - Authentication Success</title>
                <style>
                    body { font-family: -apple-system, system-ui; text-align: center; margin-top: 100px; }
                    .success { color: #28a745; font-size: 24px; margin-bottom: 20px; }
                    .message { color: #666; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="success">✅ Authentication Successful!</div>
                <div class="message">You can now close this browser tab and return to the Vault desktop app.</div>
            </body>
            </html>
            """
            self.wfile.write(success_html.encode())
        else:
            # Handle error
            error = query_params.get('error', ['unknown_error'])[0]
            error_description = query_params.get('error_description', [''])[0]
            
            self.send_response(400)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            
            error_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Vault - Authentication Error</title>
                <style>
                    body {{ font-family: -apple-system, system-ui; text-align: center; margin-top: 100px; }}
                    .error {{ color: #dc3545; font-size: 24px; margin-bottom: 20px; }}
                    .message {{ color: #666; font-size: 16px; }}
                </style>
            </head>
            <body>
                <div class="error">❌ Authentication Failed</div>
                <div class="message">Error: {error}<br>{error_description}</div>
            </body>
            </html>
            """
            self.wfile.write(error_html.encode())
    
    def log_message(self, format, *args):
        """Suppress default HTTP server logging"""
        pass

class VaultOAuthClient:
    """OAuth client for Vault desktop app with PKCE support"""
    
    def __init__(self):
        oauth_config = config.get_oauth_config()
        self.client_id = oauth_config["client_id"]
        self.redirect_uri = oauth_config["redirect_uri"]
        self.scopes = oauth_config["scopes"]
        self.api_url = oauth_config["api_url"]
        
        self.authorization_base_url = f"{self.api_url}/oauth/authorize"
        self.token_url = f"{self.api_url}/oauth/token"
        
        # PKCE parameters
        self.code_verifier: Optional[str] = None
        self.code_challenge: Optional[str] = None
        self.state: Optional[str] = None
        
    def generate_pkce_challenge(self) -> tuple[str, str]:
        """Generate PKCE code verifier and challenge"""
        # Generate code verifier (43-128 characters)
        code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode('utf-8').rstrip('=')
        
        # Generate code challenge (SHA256 hash of verifier)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode('utf-8').rstrip('=')
        
        return code_verifier, code_challenge
    
    def start_authorization_flow(self) -> bool:
        """Start OAuth authorization flow with PKCE"""
        try:
            # Generate PKCE parameters
            self.code_verifier, self.code_challenge = self.generate_pkce_challenge()
            self.state = secrets.token_urlsafe(16)
            
            # Build authorization URL
            params = {
                'response_type': 'code',
                'client_id': self.client_id,
                'redirect_uri': self.redirect_uri,
                'scope': ' '.join(self.scopes),
                'state': self.state,
                'code_challenge': self.code_challenge,
                'code_challenge_method': 'S256'
            }
            
            auth_url = f"{self.authorization_base_url}?{urlencode(params)}"
            logger.info(f"Starting OAuth flow: {auth_url}")
            
            # Start local HTTP server for callback
            callback_server = self.start_callback_server()
            if not callback_server:
                return False
            
            # Open browser to authorization URL
            webbrowser.open(auth_url)
            
            # Wait for authorization code
            auth_code = self.wait_for_callback(callback_server)
            if not auth_code:
                return False
            
            # Exchange code for tokens
            return self.exchange_code_for_tokens(auth_code)
            
        except Exception as e:
            logger.error(f"OAuth authorization flow failed: {e}")
            return False
    
    def start_callback_server(self) -> Optional[HTTPServer]:
        """Start local HTTP server to receive OAuth callback"""
        try:
            # Parse callback port from redirect URI
            callback_port = int(urlparse(self.redirect_uri).port or 8080)
            
            server = HTTPServer(('localhost', callback_port), CallbackHandler)
            server.auth_code = None
            server.state = None
            
            # Start server in background thread
            server_thread = threading.Thread(target=server.serve_forever)
            server_thread.daemon = True
            server_thread.start()
            
            logger.info(f"Callback server started on port {callback_port}")
            return server
            
        except Exception as e:
            logger.error(f"Failed to start callback server: {e}")
            return None
    
    def wait_for_callback(self, server: HTTPServer, timeout: int = 300) -> Optional[str]:
        """Wait for OAuth callback with authorization code"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if hasattr(server, 'auth_code') and server.auth_code:
                # Verify state parameter
                if hasattr(server, 'state') and server.state != self.state:
                    logger.error("State parameter mismatch - possible CSRF attack")
                    server.shutdown()
                    return None
                
                auth_code = server.auth_code
                server.shutdown()
                logger.info("Received authorization code")
                return auth_code
            
            time.sleep(0.5)
        
        logger.error("Timeout waiting for OAuth callback")
        server.shutdown()
        return None
    
    def exchange_code_for_tokens(self, auth_code: str) -> bool:
        """Exchange authorization code for access and refresh tokens"""
        try:
            token_data = {
                'grant_type': 'authorization_code',
                'client_id': self.client_id,
                'code': auth_code,
                'redirect_uri': self.redirect_uri,
                'code_verifier': self.code_verifier
            }
            
            logger.info("Exchanging authorization code for tokens")
            response = requests.post(
                self.token_url,
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            if response.status_code == 200:
                tokens = response.json()
                
                # Extract token information
                access_token = tokens['access_token']
                refresh_token = tokens.get('refresh_token', '')
                expires_in = tokens.get('expires_in', 3600)
                expires_at = int(time.time() + expires_in)
                
                # Get user ID from token (simplified - in production, decode JWT properly)
                user_id = self.get_user_id_from_token(access_token)
                
                # Save tokens to config
                config.save_oauth_tokens(access_token, refresh_token, expires_at, user_id)
                
                logger.info("OAuth tokens saved successfully")
                return True
            else:
                logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Token exchange error: {e}")
            return False
    
    def get_user_id_from_token(self, access_token: str) -> str:
        """Extract user ID from JWT access token"""
        try:
            # For MVP, make a simple API call to get user info
            # In production, properly decode JWT token
            headers = {'Authorization': f'Bearer {access_token}'}
            response = requests.get(f"{self.api_url}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                user_info = response.json()
                return user_info.get('id', '')
            else:
                logger.warning("Could not get user ID from token")
                return 'unknown'
                
        except Exception as e:
            logger.warning(f"Error getting user ID: {e}")
            return 'unknown'
    
    def refresh_access_token(self) -> bool:
        """Refresh access token using refresh token"""
        try:
            current_config = config.load_config()
            refresh_token = current_config.get('refresh_token', '')
            
            if not refresh_token:
                logger.error("No refresh token available")
                return False
            
            token_data = {
                'grant_type': 'refresh_token',
                'client_id': self.client_id,
                'refresh_token': refresh_token
            }
            
            logger.info("Refreshing access token")
            response = requests.post(
                self.token_url,
                data=token_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            
            if response.status_code == 200:
                tokens = response.json()
                
                access_token = tokens['access_token']
                new_refresh_token = tokens.get('refresh_token', refresh_token)
                expires_in = tokens.get('expires_in', 3600)
                expires_at = int(time.time() + expires_in)
                user_id = current_config.get('user_id', '')
                
                config.save_oauth_tokens(access_token, new_refresh_token, expires_at, user_id)
                
                logger.info("Access token refreshed successfully")
                return True
            else:
                logger.error(f"Token refresh failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return False
    
    def is_authenticated(self) -> bool:
        """Check if user is currently authenticated"""
        return config.is_authenticated()
    
    def logout(self):
        """Clear authentication tokens (logout)"""
        config.clear_oauth_tokens()
        logger.info("User logged out")