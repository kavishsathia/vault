#!/usr/bin/env python3
"""
Vault MCP Server - Universal Preference Bridge for AI Tools

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
from pathlib import Path
import ollama

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
import random
ollama_service = OllamaEmbeddingService()

class VaultAPIClient:
    """Client for interacting with Vault API using OAuth tokens"""
    
    def __init__(self):
        self.access_token = self._load_access_token()
        self.base_url = os.getenv("VAULT_API_URL", "http://localhost:8000/api")
        self.user_id = self._get_user_id_from_token()
        
        self.headers = {"Authorization": f"Bearer {self.access_token}"}
        self.timeout = 30.0
    
    def _load_access_token(self) -> str:
        """Load OAuth access token from config file or environment"""
        # Try environment variable first
        token = os.getenv("VAULT_ACCESS_TOKEN")
        if token:
            return token
            
        # Try config file
        config_path = Path.home() / ".vault" / "config.json"
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                    return config.get("access_token", "")
            except Exception as e:
                logger.error(f"Failed to load config: {e}")
                
        raise ValueError("No access token found. Please authenticate with Vault desktop app first.")
    
    def _get_user_id_from_token(self) -> str:
        """Extract user ID from JWT token"""
        try:
            # Decode JWT token to get user ID
            import base64
            # Split the JWT token and decode the payload (middle part)
            token_parts = self.access_token.split('.')
            if len(token_parts) == 3:
                # Add padding if needed for base64 decoding
                payload = token_parts[1]
                padding = '=' * (4 - len(payload) % 4)
                payload_bytes = base64.urlsafe_b64decode(payload + padding)
                payload_json = json.loads(payload_bytes.decode())
                return payload_json.get("sub", "")
        except Exception as e:
            logger.warning(f"Could not decode JWT token: {e}")
            
        # Fallback to config file
        config_path = Path.home() / ".vault" / "config.json"
        if config_path.exists():
            try:
                with open(config_path) as f:
                    config = json.load(f)
                    return config.get("user_id", "")
            except Exception:
                pass
        return ""
    
    def query_preferences(self, query_embedding: List[float], context: Optional[str] = None) -> Dict[str, Any]:
        """Query user preferences by similarity (legacy single embedding)"""
        try:
            response = requests.post(
                f"{self.base_url}/preferences/query",
                params={"user_id": self.user_id, "app_id": "3501c6fb-28ee-46f6-aadf-6ea14c35a569"},
                json={
                    "embedding": query_embedding,
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
            logger.info(f"Querying contexts with {len(query_embeddings)} embeddings")
            
            response = requests.post(
                f"{self.base_url}/preferences/query-contexts",
                params={"user_id": self.user_id, "app_id": "3501c6fb-28ee-46f6-aadf-6ea14c35a569"},
                json={
                    "embeddings": query_embeddings,
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
            # For now, we'll need to generate embeddings client-side
            # In production, this would use a proper embedding model
            embedding = [0.0] * 384  # Placeholder embedding (updated for Web LLM Arctic Embed)
            
            response = requests.post(
                f"{self.base_url}/preferences/add",
                params={"user_id": self.user_id},
                json={
                    "text": text,
                    "embedding": embedding,
                    "category_slug": category_slug,
                    "strength": strength
                },
                headers=self.headers,
                timeout=self.timeout
            )
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
            return response.json()
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
    logger.info("Vault MCP Server initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize Vault API client: {e}")
    sys.exit(1)

# MCP Tools
@mcp.tool()
def query_user_preferences(query_text: str, context: Optional[str] = None) -> dict:
    """
    Query user preferences by natural language text.
    
    Args:
        query_text: Natural language description of what you're looking for
        context: Optional context for the query (e.g., "food_recommendation", "ui_style")
    
    Returns:
        Similarity score and confidence level for the query
    """
    try:
        # For MVP, we'll use a simple text-based matching
        # In production, this would use proper embeddings
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
        category: Optional category slug (food, ui-ux, entertainment, etc.)
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

# MCP Resources
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
            return "No preferences found or error occurred."
            
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

# Server info
@mcp.resource("vault://info")
def get_server_info() -> str:
    """Get information about the Vault MCP server"""
    return """# Vault MCP Server

This server provides access to user preferences stored in Vault through the Model Context Protocol.

## Available Tools:
- `query_user_preferences`: Search preferences by natural language (single query)
- `query_preference_contexts`: Search multiple queries simultaneously, returns actual contexts
- `add_user_preference`: Add new preferences
- `get_user_preference_summary`: Get top preferences by category
- `get_preference_categories`: List all available categories

## Available Resources:
- `vault://preferences`: All user preferences
- `vault://categories`: All preference categories
- `vault://info`: This server information

## Usage Examples:
```
# Query preferences (single)
query_user_preferences("dark theme interfaces")

# Query multiple preferences with contexts
query_preference_contexts(["dark theme interfaces", "spicy food", "RPG games"])

# Add a preference  
add_user_preference("I prefer tabs over spaces", "work-productivity", 3.0)

# Get food preferences
get_user_preference_summary("food", 5)
```
"""

if __name__ == "__main__":
    logger.info("Starting Vault MCP Server...")
    mcp.run(transport="stdio")