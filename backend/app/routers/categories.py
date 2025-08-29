from fastapi import APIRouter, Query
from app.models.preference_category import PreferenceCategory
from app.models.user_preference import UserPreference
from typing import Optional

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/")
async def get_all_categories(user_id: Optional[str] = Query(None, description="User ID to get preference counts for")):
    """Get all available preference categories with optional preference counts for a user"""
    
    categories = await PreferenceCategory.all().order_by('name')
    
    # Build response with preference counts if user_id provided
    categories_response = []
    for cat in categories:
        category_data = {
            "id": str(cat.id),
            "name": cat.name,
            "slug": cat.slug,
            "description": cat.description,
            "preference_count": 0  # default
        }
        
        # If user_id provided, get actual preference count
        if user_id:
            pref_count = await UserPreference.filter(category_id=cat.id, user_id=user_id).count()
            category_data["preference_count"] = pref_count
        
        categories_response.append(category_data)
    
    return {
        "categories": categories_response
    }


@router.post("/seed")
async def seed_categories():
    """Seed the database with initial preference categories"""
    
    categories_data = [
        {
            "name": "Food", 
            "slug": "food",
            "description": "Dietary preferences, cuisine types, spice tolerance, meal preferences"
        },
        {
            "name": "Entertainment", 
            "slug": "entertainment",
            "description": "Movie genres, music styles, content preferences, streaming preferences"
        },
        {
            "name": "Work & Productivity", 
            "slug": "work-productivity",
            "description": "Workflow preferences, tool choices, communication styles, productivity methods"
        },
        {
            "name": "UI & UX", 
            "slug": "ui-ux",
            "description": "Dark mode, font sizes, layout preferences, accessibility needs, interface styles"
        },
        {
            "name": "Gaming", 
            "slug": "gaming",
            "description": "Difficulty levels, game genres, control schemes, graphics preferences"
        },
        {
            "name": "Social", 
            "slug": "social",
            "description": "Interaction preferences, privacy levels, communication frequency, social media habits"
        },
        {
            "name": "Shopping", 
            "slug": "shopping",
            "description": "Brand preferences, price sensitivity, product categories, shopping habits"
        },
        {
            "name": "Health & Fitness", 
            "slug": "health-fitness",
            "description": "Activity types, intensity levels, health goals, workout preferences"
        },
        {
            "name": "Travel", 
            "slug": "travel",
            "description": "Accommodation preferences, transportation choices, activity types, destination preferences"
        },
        {
            "name": "Learning", 
            "slug": "learning",
            "description": "Learning styles, content formats, difficulty progression, educational preferences"
        }
    ]
    
    created_categories = []
    
    for cat_data in categories_data:
        category, created = await PreferenceCategory.get_or_create(
            slug=cat_data["slug"],
            defaults={
                "name": cat_data["name"],
                "description": cat_data["description"]
            }
        )
        
        if created:
            created_categories.append(cat_data["name"])
    
    return {
        "success": True,
        "message": f"Categories seeded successfully",
        "created_categories": created_categories,
        "total_categories": len(categories_data)
    }