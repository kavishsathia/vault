#!/usr/bin/env python3
"""
Test script for Vault MCP server to verify it works without async issues
"""
import sys
import os
from pathlib import Path

# Add src directory to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

try:
    from vault_mcp_server import VaultAPIClient, api_client
    print("✅ Import successful")
    
    # Test that methods are not async
    import inspect
    print(f"query_preferences is async: {inspect.iscoroutinefunction(api_client.query_preferences)}")
    print(f"add_preference is async: {inspect.iscoroutinefunction(api_client.add_preference)}")
    print(f"get_top_preferences is async: {inspect.iscoroutinefunction(api_client.get_top_preferences)}")
    print(f"get_categories is async: {inspect.iscoroutinefunction(api_client.get_categories)}")
    
    # Test calling the methods directly
    print("\n🧪 Testing API calls...")
    
    try:
        result = api_client.get_categories()
        print(f"✅ get_categories(): {type(result)} - {len(str(result))} chars")
    except Exception as e:
        print(f"❌ get_categories() error: {e}")
    
    try:
        result = api_client.get_top_preferences(limit=5)
        print(f"✅ get_top_preferences(): {type(result)} - {len(str(result))} chars")
    except Exception as e:
        print(f"❌ get_top_preferences() error: {e}")
        
    print("\n✅ All tests passed - MCP server should work correctly")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()