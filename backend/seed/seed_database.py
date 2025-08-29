#!/usr/bin/env python3
"""
Database seeding script for Vault backend
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from uuid import uuid4

# Add the parent directory to the path so we can import our models
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from tortoise import Tortoise
from app.models.preference_category import PreferenceCategory
from app.models.app import App
from app.models.user import User
from app.models.user_preference import UserPreference
from app.models.user_app_permission import UserAppPermission
from app.models.preference_source import PreferenceSource
import numpy as np
import random

load_dotenv()

TORTOISE_ORM = {
    "connections": {
        "default": os.getenv("DATABASE_URL")
    },
    "apps": {
        "models": {
            "models": [
                "app.models.user",
                "app.models.app", 
                "app.models.preference_category",
                "app.models.user_preference",
                "app.models.preference_source", 
                "app.models.user_app_permission",
                "app.models.query_log",
            ],
            "default_connection": "default",
        }
    }
}


async def seed_categories():
    """Seed preference categories"""
    print("🗂️  Seeding preference categories...")
    
    # Load categories data
    with open("seed/data/categories.json", "r") as f:
        categories_data = json.load(f)
    
    created_count = 0
    for category_data in categories_data:
        # Check if category already exists
        existing = await PreferenceCategory.filter(slug=category_data["slug"]).first()
        if existing:
            print(f"   ↪ Category '{category_data['name']}' already exists, skipping...")
            continue
        
        # Create new category
        category = await PreferenceCategory.create(
            id=uuid4(),
            name=category_data["name"],
            slug=category_data["slug"],
            description=category_data["description"]
        )
        print(f"   ✅ Created category: {category.name}")
        created_count += 1
    
    print(f"📊 Created {created_count} new categories")
    return created_count


async def seed_apps():
    """Seed sample apps"""
    print("📱 Seeding sample apps...")
    
    # Load apps data
    with open("seed/data/apps.json", "r") as f:
        apps_data = json.load(f)
    
    created_count = 0
    for app_data in apps_data:
        # Check if app already exists
        existing = await App.filter(name=app_data["name"]).first()
        if existing:
            print(f"   ↪ App '{app_data['name']}' already exists, skipping...")
            continue
        
        # Create new app
        app = await App.create(
            id=uuid4(),
            name=app_data["name"],
            description=app_data["description"],
            api_key=app_data["api_key"],
            is_active=True
        )
        print(f"   ✅ Created app: {app.name} (API Key: {app.api_key})")
        created_count += 1
    
    print(f"📊 Created {created_count} new apps")
    return created_count


def generate_mock_embedding():
    """Generate a mock 1536-dimensional embedding vector"""
    return np.random.normal(0, 1, 1536).tolist()


async def seed_demo_user_and_preferences():
    """Create demo user and sample preferences"""
    print("👤 Creating demo user and sample preferences...")
    
    # Use the specific user ID provided
    user_id = "fbed8e21-f47c-4ad7-9748-72eda644c8ae"
    
    # Create or get demo user with specific ID
    demo_user, created = await User.get_or_create(
        id=user_id,
        defaults={
            "email": "demo@vault.example.com",
            "name": "Demo User"
        }
    )
    
    if created:
        print(f"   ✅ Created demo user: {demo_user.email}")
    else:
        print(f"   ↪ Demo user already exists: {demo_user.email}")
    
    # Load sample preferences
    with open("seed/data/sample_preferences.json", "r") as f:
        preferences_data = json.load(f)
    
    created_count = 0
    
    # Get all categories for mapping
    categories = {cat.slug: cat for cat in await PreferenceCategory.all()}
    
    for category_slug, prefs in preferences_data.items():
        if category_slug not in categories:
            print(f"   ⚠️  Warning: Category '{category_slug}' not found, skipping...")
            continue
            
        category = categories[category_slug]
        
        for pref_data in prefs:
            # Check if preference already exists for this user
            existing = await UserPreference.filter(
                user=demo_user,
                text=pref_data["text"]
            ).first()
            
            if existing:
                continue
            
            # Create new preference with mock embedding
            await UserPreference.create(
                id=uuid4(),
                user=demo_user,
                category=category,
                text=pref_data["text"],
                embedding=generate_mock_embedding(),
                strength=pref_data["strength"]
            )
            created_count += 1
    
    print(f"📊 Created {created_count} new preferences for demo user")
    return created_count


async def seed_app_integrations_for_user(user_id: str):
    """Create app permissions and preference sources for a specific user"""
    print("🔗 Setting up app integrations for user...")
    
    # Get the user and all apps/categories
    user = await User.get(id=user_id)
    apps = await App.all()
    categories = await PreferenceCategory.all()
    user_preferences = await UserPreference.filter(user=user).all()
    
    permissions_created = 0
    sources_created = 0
    
    # Create realistic app permissions for each app
    app_permissions = {
        "FoodieApp": ["food", "health-fitness"],
        "SpotifyAI": ["entertainment"],
        "WorkFlow": ["work-productivity", "ui-ux"],
        "GameRecommender": ["gaming", "entertainment"],
        "TravelBuddy": ["travel", "food"]
    }
    
    for app in apps:
        if app.name in app_permissions:
            # Grant permissions for specific categories
            for category_slug in app_permissions[app.name]:
                category = next((c for c in categories if c.slug == category_slug), None)
                if category:
                    # Check if permission already exists
                    existing = await UserAppPermission.filter(
                        user=user, app=app, category=category
                    ).first()
                    
                    if not existing:
                        await UserAppPermission.create(
                            id=uuid4(),
                            user=user,
                            app=app,
                            category=category,
                            can_read=True,
                            can_write=True if random.random() > 0.3 else False  # 70% get write access
                        )
                        permissions_created += 1
            
            # Create some preference sources (simulate apps contributing preferences)
            # Load categories with relations
            relevant_prefs = []
            for pref in user_preferences:
                if pref.category_id:
                    pref_category = await PreferenceCategory.get(id=pref.category_id)
                    if pref_category.slug in app_permissions[app.name]:
                        relevant_prefs.append(pref)
            
            # Randomly assign some preferences as contributed by this app
            for pref in random.sample(relevant_prefs, min(2, len(relevant_prefs))):
                existing_source = await PreferenceSource.filter(
                    preference=pref, app=app, user=user
                ).first()
                
                if not existing_source:
                    await PreferenceSource.create(
                        id=uuid4(),
                        preference=pref,
                        app=app,
                        user=user,
                        strength=round(random.uniform(0.5, 2.0), 1)
                    )
                    sources_created += 1
    
    print(f"📊 Created {permissions_created} app permissions")
    print(f"📊 Created {sources_created} preference sources")
    return permissions_created, sources_created


async def main():
    """Main seeding function"""
    print("🔐 Vault Database Seeding Script")
    print("=" * 40)
    
    # Initialize Tortoise
    print("🔌 Connecting to database...")
    await Tortoise.init(config=TORTOISE_ORM)
    
    try:
        # Seed categories
        categories_created = await seed_categories()
        print()
        
        # Seed apps  
        apps_created = await seed_apps()
        print()
        
        # Seed demo user and preferences
        preferences_created = await seed_demo_user_and_preferences()
        print()
        
        # Seed app integrations
        user_id = "fbed8e21-f47c-4ad7-9748-72eda644c8ae"
        permissions_created, sources_created = await seed_app_integrations_for_user(user_id)
        print()
        
        # Summary
        print("🎉 Seeding Complete!")
        print(f"   Categories created: {categories_created}")
        print(f"   Apps created: {apps_created}")
        print(f"   Preferences created: {preferences_created}")
        print(f"   App permissions created: {permissions_created}")
        print(f"   Preference sources created: {sources_created}")
        print()
        
        if categories_created > 0 or apps_created > 0 or preferences_created > 0 or permissions_created > 0 or sources_created > 0:
            print("✨ Your Vault database is now ready for use!")
        else:
            print("💡 Database was already seeded. All data is up to date!")
            
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        sys.exit(1)
    finally:
        # Close connections
        await Tortoise.close_connections()


if __name__ == "__main__":
    asyncio.run(main())