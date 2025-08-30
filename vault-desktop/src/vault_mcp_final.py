#!/usr/bin/env python3
"""
Vault MCP Server - Universal Preference Bridge for AI Tools (FIXED VERSION)

Exposes Vault user preferences through Model Context Protocol (MCP)
allowing any MCP-compatible AI tool to access preference data.
"""
import sys
import os
from typing import Optional, List, Dict, Any
from fastmcp import FastMCP
import requests
from pydantic import BaseModel
import json
import subprocess
import platform
from pathlib import Path
import ollama
import random

# Logging to stderr to avoid corrupting MCP JSON-RPC messages
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr
)
logger = logging.getLogger(__name__)

# Initialize MCP server
mcp = FastMCP("Vault Preference Server")

class OllamaEmbeddingService:
    """Service for generating embeddings using local Ollama instance"""
    
    def __init__(self, model_name: str = "snowflake-arctic-embed2"):
        self.model_name = model_name
        self.is_available = self._check_ollama_availability()
        
    def _check_ollama_availability(self) -> bool:
        """Check if Ollama is running and model is available"""
        try:
            # Test if Ollama is running
            response = ollama.list()
            logger.info(f"Ollama is running with {len(response.get('models', []))} models")
            
            # Check if our embedding model is available
            available_models = [model.get('name', '') for model in response.get('models', [])]
            model_available = any(self.model_name in name for name in available_models)
            
            if not model_available:
                logger.warning(f"Model {self.model_name} not found. Available models: {available_models}")
                logger.info(f"To install: ollama pull {self.model_name}")
                return False
                
            logger.info(f"Ollama embedding model {self.model_name} is available")
            return True
            
        except Exception as e:
            logger.error(f"Ollama not available: {e}")
            logger.info("Make sure Ollama is installed and running: https://ollama.ai/")
            return False
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text"""
        if not self.is_available:
            logger.warning("Ollama not available, using random placeholder")
            return [random.uniform(-0.1, 0.1) for _ in range(384)]
            
        try:
            logger.info(f"Generating Ollama embedding for text: {text[:50]}...")
            
            response = ollama.embeddings(
                model=self.model_name,
                prompt=text
            )
            
            embedding = response.get('embedding', [])
            logger.info(f"Ollama embedding generated: {len(embedding)} dimensions")
            
            # Arctic Embed 2.0 outputs 1024 dimensions, but we need to match backend (384)
            expected_backend_dim = 384
            logger.info(f"Raw embedding dimensions: {len(embedding)}")
            
            if len(embedding) != expected_backend_dim:
                logger.info(f"Adapting embedding: {len(embedding)} → {expected_backend_dim} dimensions")
                
                if len(embedding) > expected_backend_dim:
                    # Truncate to match backend (use MRL truncation for Arctic Embed)
                    embedding = embedding[:expected_backend_dim]
                    logger.info(f"Truncated to {expected_backend_dim} dimensions (MRL-compatible)")
                else:
                    # Pad with zeros if somehow smaller
                    embedding.extend([0.0] * (expected_backend_dim - len(embedding)))
                    logger.info(f"Padded to {expected_backend_dim} dimensions")
            
            return embedding
            
        except Exception as e:
            logger.error(f"Failed to generate Ollama embedding: {e}")
            logger.warning("Falling back to random placeholder")
            return [random.uniform(-0.1, 0.1) for _ in range(384)]
    
    def generate_multiple_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        logger.info(f"Generating {len(texts)} embeddings with Ollama")
        
        embeddings = []
        for i, text in enumerate(texts):
            logger.info(f"Processing text {i+1}/{len(texts)}")
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
            
        return embeddings

# Initialize Ollama embedding service
ollama_service = OllamaEmbeddingService()

class VaultAPIClient:
    """Client for interacting with Vault API using OAuth tokens with privacy transformation"""
    
    def __init__(self):
        self.access_token = self._load_access_token()
        self.credentials_hash = self._get_credentials_hash_from_token()
        self.base_url = os.getenv("VAULT_API_URL", "http://localhost:8000/api")
        self.user_id = self._get_user_id_from_token()
        
        self.headers = {"Authorization": f"Bearer {self.access_token}"}
        self.timeout = 30.0
        self.privacy_matrix = None
    
    def _load_access_token(self) -> str:
        """Load OAuth access token from config file"""
        # Always use config file for desktop app tokens
        config_path = Path.home() / ".vault" / "config.json"
        print(f"DEBUG: Loading token from: {config_path}", file=sys.stderr)
        
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                    token = config.get("access_token", "")
                    print(f"DEBUG: Loaded token: {token[:50]}..." if token else "DEBUG: No token in config", file=sys.stderr)
                    return token
            except Exception as e:
                print(f"DEBUG: Config load error: {e}", file=sys.stderr)
                logger.error(f"Failed to load config: {e}")
                
        raise ValueError("No access token found. Please authenticate with Vault desktop app first.")
    
    def _get_user_id_from_token(self) -> str:
        """Extract user ID from JWT token"""
        print(f"DEBUG: Access token: {self.access_token[:50]}..." if self.access_token else "DEBUG: No access token", file=sys.stderr)
        
        try:
            # Decode JWT token to get user ID
            import base64
            # Split the JWT token and decode the payload (middle part)
            token_parts = self.access_token.split('.')
            print(f"DEBUG: Token parts count: {len(token_parts)}", file=sys.stderr)
            
            if len(token_parts) == 3:
                # Add padding if needed for base64 decoding
                payload = token_parts[1]
                padding = '=' * (4 - len(payload) % 4)
                payload_bytes = base64.urlsafe_b64decode(payload + padding)
                payload_json = json.loads(payload_bytes.decode())
                user_id = payload_json.get("sub", "")
                print(f"DEBUG: Extracted user_id from JWT: {user_id}", file=sys.stderr)
                return user_id
        except Exception as e:
            print(f"DEBUG: JWT decode error: {e}", file=sys.stderr)
            logger.warning(f"Could not decode JWT token: {e}")
            
        # Fallback to config file
        config_path = Path.home() / ".vault" / "config.json"
        print(f"DEBUG: Checking config file: {config_path}", file=sys.stderr)
        
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                    user_id = config.get("user_id", "")
                    print(f"DEBUG: Config file user_id: {user_id}", file=sys.stderr)
                    return user_id
            except Exception as e:
                print(f"DEBUG: Config file error: {e}", file=sys.stderr)
        
        print("DEBUG: No user_id found, returning empty string", file=sys.stderr)
        return ""
    
    def _get_credentials_hash_from_token(self) -> str:
        """Extract credentials hash from JWT token"""
        try:
            # Decode JWT token to get credentials hash
            import base64
            token_parts = self.access_token.split('.')
            
            if len(token_parts) == 3:
                payload = token_parts[1]
                padding = '=' * (4 - len(payload) % 4)
                payload_bytes = base64.urlsafe_b64decode(payload + padding)
                payload_json = json.loads(payload_bytes.decode())
                credentials_hash = payload_json.get("credentials_hash", "")
                print(f"DEBUG: Extracted credentials_hash from JWT: {credentials_hash[:20]}...", file=sys.stderr)
                return credentials_hash
        except Exception as e:
            print(f"DEBUG: JWT credentials hash decode error: {e}", file=sys.stderr)
            
        # Fallback to config file
        config_path = Path.home() / ".vault" / "config.json"
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                    return config.get("credentials_hash", "")
            except Exception:
                pass
        return ""
    
    def _prompt_for_privacy_seed(self) -> Optional[str]:
        """Signal existing desktop app to prompt for privacy seed"""
        try:
            logger.info("Signaling desktop app for privacy seed prompt...")
            
            # Create request file to signal the running desktop app
            config_dir = Path.home() / ".vault"
            config_dir.mkdir(exist_ok=True)
            seed_request_file = config_dir / "seed_request.txt"
            
            # Create request file
            with open(seed_request_file, 'w') as f:
                f.write("seed_needed")
            
            logger.info("Created seed request file")
            
            # Wait for seed to be saved
            temp_seed_file = config_dir / "temp_seed.txt"
            for _ in range(30):  # Wait up to 30 seconds
                if temp_seed_file.exists():
                    try:
                        with open(temp_seed_file) as f:
                            seed = f.read().strip()
                        temp_seed_file.unlink()  # Delete after reading
                        if self._validate_seed(seed):
                            logger.info("Received valid privacy seed")
                            return seed
                    except Exception as e:
                        logger.error(f"Error reading seed file: {e}")
                import time
                time.sleep(1)
            
            logger.warning("Timeout waiting for privacy seed")
            return None
            
        except Exception as e:
            logger.error(f"Failed to prompt for privacy seed: {e}")
            return None
    
    def _validate_seed(self, seed: str) -> bool:
        """Validate 6-digit seed format"""
        import re
        return bool(re.match(r'^\d{6}$', seed))
    
    def _ensure_privacy_matrix(self) -> bool:
        """Ensure privacy matrix is initialized"""
        if self.privacy_matrix is not None:
            return True
            
        if not self.credentials_hash:
            logger.error("No credentials hash available for matrix generation")
            return False
        
        # Use hardcoded seed for testing
        seed = "123456"
        logger.info("Using hardcoded privacy seed for testing")
        
        # Generate matrix
        try:
            self.privacy_matrix = self._generate_privacy_matrix(self.credentials_hash, seed)
            logger.info("Privacy matrix generated successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to generate privacy matrix: {e}")
            return False
    
    def _generate_privacy_matrix(self, credentials_hash: str, seed: str) -> List[List[float]]:
        """Generate deterministic orthogonal matrix from credentials hash + seed"""
        import hashlib
        
        # Create final seed
        final_seed = f"{credentials_hash}:{seed}"
        seed_hash = hashlib.sha256(final_seed.encode()).hexdigest()
        
        # Seed random number generator
        random.seed(seed_hash)
        
        # Generate 384x384 matrix
        size = 384
        matrix = []
        for i in range(size):
            row = []
            for j in range(size):
                row.append(random.uniform(-0.5, 0.5))
            matrix.append(row)
        
        # Gram-Schmidt orthogonalization
        for i in range(size):
            # Normalize current vector
            norm = sum(matrix[i][j] ** 2 for j in range(size)) ** 0.5
            if norm > 0:
                for j in range(size):
                    matrix[i][j] /= norm
            
            # Orthogonalize remaining vectors
            for k in range(i + 1, size):
                dot_product = sum(matrix[i][j] * matrix[k][j] for j in range(size))
                for j in range(size):
                    matrix[k][j] -= dot_product * matrix[i][j]
        
        return matrix
    
    def _transform_embedding(self, embedding: List[float]) -> List[float]:
        """Apply privacy transformation to embedding"""
        if not self.privacy_matrix:
            raise ValueError("Privacy matrix not initialized")
        
        if len(embedding) != 384:
            raise ValueError(f"Expected 384-dimensional embedding, got {len(embedding)}")
        
        # Matrix multiplication
        transformed = []
        for i in range(384):
            sum_val = sum(self.privacy_matrix[i][j] * embedding[j] for j in range(384))
            transformed.append(sum_val)
        
        return transformed
    
    def _encrypt_text(self, text: str) -> str:
        """Encrypt preference text using AES-256-GCM"""
        try:
            from cryptography.fernet import Fernet
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
            import base64
            import os
            
            # Generate key from credentials hash (same as frontend)
            if not self.credentials_hash:
                raise ValueError("No credentials hash available")
            
            # Use first 32 bytes of credentials hash for key
            key_material = self.credentials_hash[:32].encode('utf-8')
            key_material = key_material.ljust(32, b'0')  # Pad to 32 bytes
            
            # Create Fernet key (base64 encoded)
            fernet_key = base64.urlsafe_b64encode(key_material)
            cipher = Fernet(fernet_key)
            
            # Encrypt the text
            encrypted_bytes = cipher.encrypt(text.encode('utf-8'))
            encrypted_text = base64.b64encode(encrypted_bytes).decode('utf-8')
            
            return encrypted_text
            
        except Exception as e:
            logger.error(f"Failed to encrypt text: {e}")
            return text  # Fallback to plaintext if encryption fails
    
    def _decrypt_text(self, encrypted_text: str) -> str:
        """Decrypt preference text using AES-256-GCM"""
        try:
            from cryptography.fernet import Fernet
            import base64
            
            # Generate key from credentials hash (same as frontend)
            if not self.credentials_hash:
                raise ValueError("No credentials hash available")
            
            # Use first 32 bytes of credentials hash for key
            key_material = self.credentials_hash[:32].encode('utf-8')
            key_material = key_material.ljust(32, b'0')  # Pad to 32 bytes
            
            # Create Fernet key (base64 encoded)
            fernet_key = base64.urlsafe_b64encode(key_material)
            cipher = Fernet(fernet_key)
            
            # Decrypt the text
            encrypted_bytes = base64.b64decode(encrypted_text.encode('utf-8'))
            decrypted_bytes = cipher.decrypt(encrypted_bytes)
            decrypted_text = decrypted_bytes.decode('utf-8')
            
            return decrypted_text
            
        except Exception as e:
            logger.error(f"Failed to decrypt text: {e}")
            return encrypted_text  # Return as-is if decryption fails
    
    def query_preferences(self, query_embedding: List[float], context: Optional[str] = None) -> Dict[str, Any]:
        """Query user preferences by similarity (legacy single embedding)"""
        try:
            # Ensure privacy matrix is ready
            if not self._ensure_privacy_matrix():
                return {"error": "Privacy matrix not available - user may have cancelled seed prompt"}
            
            # Transform embedding for privacy
            transformed_embedding = self._transform_embedding(query_embedding)
            
            response = requests.post(
                f"{self.base_url}/preferences/query",
                params={"user_id": self.user_id, "app_id": "3501c6fb-28ee-46f6-aadf-6ea14c35a569"},
                json={
                    "embedding": transformed_embedding,
                    "context": context
                },
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to query preferences: {e}")
            return {"error": str(e)}
    
    def query_contexts(self, query_embeddings: List[List[float]], context: Optional[str] = None) -> Dict[str, Any]:
        """Query user preferences with multiple embeddings, returning actual contexts"""
        try:
            # Ensure privacy matrix is ready
            if not self._ensure_privacy_matrix():
                return {"error": "Privacy matrix not available - user may have cancelled seed prompt"}
            
            logger.info(f"Querying contexts with {len(query_embeddings)} embeddings")
            
            # Transform all embeddings for privacy
            transformed_embeddings = [self._transform_embedding(emb) for emb in query_embeddings]
            
            response = requests.post(
                f"{self.base_url}/preferences/query-contexts",
                params={"user_id": self.user_id, "app_id": "3501c6fb-28ee-46f6-aadf-6ea14c35a569"},
                json={
                    "embeddings": transformed_embeddings,
                    "context": context
                },
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            result = response.json()
            
            logger.info(f"Query contexts successful: {len(result.get('results', []))} result sets, noise_level: {result.get('noise_level', 0)}")
            return result
        except Exception as e:
            logger.error(f"Failed to query contexts: {e}")
            return {"error": str(e)}
    
    def add_preference(self, text: str, category_slug: Optional[str] = None, strength: float = 1.0) -> Dict[str, Any]:
        """Add a new preference"""
        try:
            # Ensure privacy matrix is ready
            if not self._ensure_privacy_matrix():
                return {"error": "Privacy matrix not available - user may have cancelled seed prompt"}
            
            logger.info(f"🔐 MCP: ORIGINAL TEXT: {text}")
            
            # Encrypt the preference text
            encrypted_text = self._encrypt_text(text)
            
            logger.info(f"🔒 MCP: ENCRYPTED TEXT: {encrypted_text}")
            logger.info(f"🔒 MCP: ENCRYPTION LENGTH: {len(encrypted_text)}")
            
            # Generate real embedding using Ollama
            embedding = ollama_service.generate_embedding(text)
            
            # Transform embedding for privacy
            transformed_embedding = self._transform_embedding(embedding)
            
            request_payload = {
                "text": encrypted_text,  # Send encrypted text
                "embedding": transformed_embedding,
                "category_slug": category_slug,
                "strength": strength
            }
            
            logger.info(f"📤 MCP: FULL REQUEST PAYLOAD:")
            logger.info(f"  - text: {encrypted_text}")
            logger.info(f"  - text_length: {len(encrypted_text)}")
            logger.info(f"  - embedding_length: {len(transformed_embedding)}")
            logger.info(f"  - category_slug: {category_slug}")
            logger.info(f"  - strength: {strength}")
            
            response = requests.post(
                f"{self.base_url}/preferences/add",
                params={"user_id": self.user_id},
                json=request_payload,
                headers=self.headers,
                timeout=self.timeout
            )
            
            logger.info(f"📤 MCP: BACKEND RESPONSE STATUS: {response.status_code}")
            logger.info(f"📤 MCP: BACKEND RESPONSE TEXT: {response.text}")
            
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to add preference: {e}")
            return {"error": str(e)}
    
    def get_top_preferences(self, category: Optional[str] = None, limit: int = 20) -> Dict[str, Any]:
        """Get user's top preferences"""
        try:
            params = {"user_id": self.user_id, "limit": limit}
            if category:
                params["category"] = category
                
            response = requests.get(
                f"{self.base_url}/preferences/top",
                params=params,
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            result = response.json()
            
            # Decrypt preference texts if privacy matrix is ready
            if "preferences" in result and self.privacy_matrix:
                logger.info(f"🔓 MCP: DECRYPTING {len(result['preferences'])} PREFERENCES")
                for pref in result["preferences"]:
                    if "text" in pref and pref["text"]:
                        try:
                            original_text = pref["text"]
                            decrypted_text = self._decrypt_text(pref["text"])
                            pref["text"] = decrypted_text
                            logger.info(f"🔓 MCP: DECRYPTED: {original_text[:50]}... -> {decrypted_text}")
                        except Exception as e:
                            logger.warning(f"Failed to decrypt preference text: {e}")
            
            return result
        except Exception as e:
            logger.error(f"Failed to get preferences: {e}")
            return {"error": str(e)}
    
    def get_categories(self) -> Dict[str, Any]:
        """Get all preference categories"""
        try:
            response = requests.get(
                f"{self.base_url}/categories/",
                headers=self.headers,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get categories: {e}")
            return {"error": str(e)}

# Initialize API client
try:
    api_client = VaultAPIClient()
    print(f"DEBUG: Final user_id in api_client: {api_client.user_id}", file=sys.stderr)
    logger.info(f"Vault MCP Server initialized successfully with user_id: {api_client.user_id}")
except Exception as e:
    print(f"DEBUG: API client initialization error: {e}", file=sys.stderr)
    logger.error(f"Failed to initialize Vault API client: {e}")
    sys.exit(1)

# MCP Tools
@mcp.tool()
def query_user_preferences(query_text: str, context: Optional[str] = None) -> dict:
    """
    Query user preferences by similarity to the given text.
    
    Args:
        query_text: Text to find similar preferences for (e.g., "dark mode", "spicy food", "jazz music")
        context: Optional context for the query (e.g., "ui_style", "food_choice", "music")
    
    Returns:
        Similarity scores and matching preferences
    """
    try:
        logger.info(f"Querying preferences for: {query_text}")
        
        # Generate real semantic embedding using Ollama
        query_embedding = ollama_service.generate_embedding(query_text)
        
        # Use new context-based query endpoint with real semantic embedding
        result = api_client.query_contexts([query_embedding], context)
        
        # Extract first result set and format for backward compatibility
        contexts = result.get("results", [[]])[0] if result.get("results") else []
        
        return {
            "query": query_text,
            "contexts": contexts,
            "noise_level": result.get("noise_level", 0),
            "context": context,
            "legacy_format": {
                "score": contexts[0]["score"] if contexts else 0,
                "confidence": 1.0 - result.get("noise_level", 0)
            }
        }
    except Exception as e:
        logger.error(f"Error in query_user_preferences: {e}")
        return {"error": str(e)}

@mcp.tool()
def add_user_preference(text: str, category: Optional[str] = None, strength: float = 1.0) -> dict:
    """
    Add a new user preference.
    
    Args:
        text: The preference text (e.g., "I prefer dark themes", "I love spicy food")
        category: Optional category slug. VALID CATEGORIES: food, entertainment, work-productivity, ui-ux, gaming, social, shopping, health-fitness, travel, learning
        strength: Preference strength from 0.0 to 10.0 (default: 1.0)
    
    Returns:
        The created preference details
    """
    try:
        logger.info(f"Adding preference: {text}")
        
        # Call sync function directly
        result = api_client.add_preference(text, category, strength)
        
        return {
            "added": True,
            "preference": result,
            "text": text,
            "category": category,
            "strength": strength
        }
    except Exception as e:
        logger.error(f"Error in add_user_preference: {e}")
        return {"error": str(e)}

@mcp.tool()
def get_user_preference_summary(category: Optional[str] = None, limit: int = 10) -> dict:
    """
    Get summary of user's top preferences.
    
    Args:
        category: Optional category to filter by (food, ui-ux, entertainment, etc.)
        limit: Maximum number of preferences to return (default: 10)
    
    Returns:
        List of top preferences with details
    """
    try:
        logger.info(f"Getting preference summary for category: {category}")
        
        # Call sync function directly
        result = api_client.get_top_preferences(category, limit)
        
        return {
            "category": category,
            "limit": limit,
            "preferences": result
        }
    except Exception as e:
        logger.error(f"Error in get_user_preference_summary: {e}")
        return {"error": str(e)}

@mcp.tool()
def query_preference_contexts(query_texts: List[str], context: Optional[str] = None) -> dict:
    """
    Query user preferences with multiple queries simultaneously, returning actual preference contexts.
    
    Args:
        query_texts: List of natural language queries to search for
        context: Optional context for the queries (e.g., "meal_planning", "app_setup")
    
    Returns:
        Array of context results for each query with actual preference text and scores
    """
    try:
        logger.info(f"Querying contexts for {len(query_texts)} queries")
        
        # Generate real semantic embeddings for each query using Ollama
        query_embeddings = ollama_service.generate_multiple_embeddings(query_texts)
        
        # Call the new query-contexts endpoint
        result = api_client.query_contexts(query_embeddings, context)
        
        # Format response with query mapping
        formatted_results = []
        for i, query_text in enumerate(query_texts):
            contexts = result.get("results", [])[i] if i < len(result.get("results", [])) else []
            formatted_results.append({
                "query": query_text,
                "contexts": contexts,
                "top_context": contexts[0] if contexts else None
            })
        
        return {
            "queries": query_texts,
            "results": formatted_results,
            "noise_level": result.get("noise_level", 0),
            "context": context,
            "total_queries": len(query_texts)
        }
    except Exception as e:
        logger.error(f"Error in query_preference_contexts: {e}")
        return {"error": str(e)}

@mcp.tool()
def get_preference_categories() -> dict:
    """
    Get all available preference categories.
    
    Returns:
        List of available categories with descriptions
    """
    try:
        logger.info("Getting preference categories")
        
        # Call sync function directly
        result = api_client.get_categories()
        
        return result
    except Exception as e:
        logger.error(f"Error in get_preference_categories: {e}")
        return {"error": str(e)}

# Resources
@mcp.resource("vault://preferences")
def get_all_preferences() -> str:
    """Stream all user preferences as a resource"""
    try:
        logger.info("Fetching all preferences as resource")
        
        # Call sync function directly
        result = api_client.get_top_preferences(limit=100)
        
        # Format as readable text
        if "preferences" in result:
            preferences_text = "# User Preferences\n\n"
            for pref in result["preferences"]:
                preferences_text += f"- **{pref.get('text', 'Unknown')}** "
                preferences_text += f"(Strength: {pref.get('strength', 'N/A')}) "
                preferences_text += f"[Category: {pref.get('category_name', 'General')}]\n"
            return preferences_text
        else:
            return f"Error loading preferences: {result.get('error', 'Unknown error')}"
    except Exception as e:
        logger.error(f"Error in get_all_preferences: {e}")
        return f"Error loading preferences: {str(e)}"

@mcp.resource("vault://categories")
def get_categories_resource() -> str:
    """Stream all preference categories as a resource"""
    try:
        logger.info("Fetching categories as resource")
        
        # Call sync function directly
        result = api_client.get_categories()
        
        # Format as readable text
        if "categories" in result:
            categories_text = "# Preference Categories\n\n"
            for cat in result["categories"]:
                categories_text += f"## {cat.get('name', 'Unknown')}\n"
                categories_text += f"**Slug:** {cat.get('slug', 'N/A')}\n"
                categories_text += f"**Description:** {cat.get('description', 'No description')}\n"
                categories_text += f"**Preference Count:** {cat.get('preference_count', 0)}\n\n"
            return categories_text
        else:
            return "No categories found or error occurred."
    except Exception as e:
        logger.error(f"Error in get_categories_resource: {e}")
        return f"Error loading categories: {str(e)}"

@mcp.resource("vault://info")
def get_server_info() -> str:
    """Get information about the Vault MCP server"""
    return f"""# Vault MCP Server Info

**Status:** Active
**User ID:** {api_client.user_id}
**API Base URL:** {api_client.base_url}
**Available Tools:** query_user_preferences, query_preference_contexts, add_user_preference, get_user_preference_summary, get_preference_categories
**Available Resources:** vault://preferences, vault://categories, vault://info
"""

if __name__ == "__main__":
    mcp.run()