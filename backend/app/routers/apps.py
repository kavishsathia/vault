from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.schema.apps import (
    IntegratedAppsResponse,
    AppContributedPreferencesResponse,
    CreateAppRequest,
    CreateAppResponse
)
from app.models.app import App
from app.models.user_app_permission import UserAppPermission
from app.models.preference_source import PreferenceSource
from app.models.query_log import QueryLog
from app.models.user_preference import UserPreference
from app.models.preference_category import PreferenceCategory
import secrets
from datetime import datetime, timezone

router = APIRouter(prefix="/apps", tags=["apps"])


@router.get("/integrated", response_model=IntegratedAppsResponse)
async def get_integrated_apps(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of apps to return"),
    active_only: bool = Query(True, description="Only return active apps")
):
    """Get all apps integrated with the user and their permission/usage summary"""
    
    # Get apps that have permissions set for this user
    permissions_query = UserAppPermission.filter(user_id=user_id).select_related('app', 'category')
    
    if active_only:
        permissions_query = permissions_query.filter(app__is_active=True)
    
    permissions = await permissions_query.all()
    
    # Group permissions by app
    apps_data = {}
    
    for perm in permissions:
        app = perm.app
        if app.id not in apps_data:
            apps_data[app.id] = {
                "id": str(app.id),
                "name": app.name,
                "description": app.description,
                "is_active": app.is_active,
                "created_at": app.created_at,
                "permissions_summary": {},
                "permissions": [],  # Frontend expects this array format
                "preferences_contributed": 0,
                "queries_made": 0
            }
        
        # Build permissions summary (for compatibility)
        category_key = perm.category.slug if perm.category else "all"
        apps_data[app.id]["permissions_summary"][category_key] = {
            "can_read": perm.can_read,
            "can_write": perm.can_write
        }
        
        # Build permissions array for frontend
        apps_data[app.id]["permissions"].append({
            "category_id": str(perm.category.id) if perm.category else "all",
            "category_name": perm.category.name if perm.category else "All Categories",
            "can_read": perm.can_read,
            "can_write": perm.can_write
        })
    
    # Get usage statistics for each app
    for app_id, app_data in apps_data.items():
        # Count preferences contributed by this app
        contributed_count = await PreferenceSource.filter(
            app_id=app_id,
            user_id=user_id
        ).count()
        app_data["preferences_contributed"] = contributed_count
        
        # Count queries made by this app for this user
        queries_count = await QueryLog.filter(
            app_id=app_id,
            user_id=user_id
        ).count()
        app_data["queries_made"] = queries_count
    
    # Sort by most recently created and apply limit
    sorted_apps = sorted(
        apps_data.values(),
        key=lambda x: x["created_at"],
        reverse=True
    )[:limit]
    
    return IntegratedAppsResponse(
        apps=sorted_apps,
        total_count=len(apps_data)
    )


@router.get("/{app_id}/preferences", response_model=AppContributedPreferencesResponse)
async def get_app_contributed_preferences(
    app_id: str,
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of preferences to return"),
    category: Optional[str] = Query(None, description="Filter by category slug")
):
    """Get preferences contributed by a specific app for a user"""
    
    # Verify app exists
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Build query for preference sources
    query = PreferenceSource.filter(
        app_id=app_id,
        user_id=user_id
    ).select_related('preference__category').order_by('-added_at')
    
    # Apply category filter if specified
    if category:
        category_obj = await PreferenceCategory.get_or_none(slug=category)
        if not category_obj:
            raise HTTPException(status_code=404, detail="Category not found")
        query = query.filter(preference__category_id=category_obj.id)
    
    # Get sources with limit
    sources = await query.limit(limit).all()
    
    # Get total count for pagination
    total_query = PreferenceSource.filter(app_id=app_id, user_id=user_id)
    if category:
        total_query = total_query.filter(preference__category_id=category_obj.id)
    total_count = await total_query.count()
    
    # Build response
    preferences_data = []
    for source in sources:
        pref = source.preference
        preferences_data.append({
            "preference_id": str(pref.id),
            "text": pref.text,
            "strength": source.strength,
            "added_at": source.added_at,
            "category_name": pref.category.name if pref.category else None
        })
    
    return AppContributedPreferencesResponse(
        app_name=app.name,
        app_id=str(app.id),
        preferences=preferences_data,
        total_count=total_count
    )


@router.post("/create", response_model=CreateAppResponse)
async def create_app(
    request: CreateAppRequest
):
    """Create a new app integration (for development/testing purposes)"""
    
    # Generate secure API key
    api_key = f"vault_{secrets.token_urlsafe(32)}"
    
    # Create app
    app = await App.create(
        name=request.name,
        description=request.description,
        api_key=api_key
    )
    
    return CreateAppResponse(
        id=str(app.id),
        name=app.name,
        description=app.description,
        api_key=api_key,
        created_at=app.created_at
    )


@router.get("/{app_id}/stats")
async def get_app_statistics(
    app_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Get detailed statistics for an app's integration with a user"""
    
    # Verify app exists
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Get various statistics
    total_queries = await QueryLog.filter(app_id=app_id, user_id=user_id).count()
    total_contributions = await PreferenceSource.filter(app_id=app_id, user_id=user_id).count()
    
    # Get query statistics from the last 30 days
    from datetime import timedelta
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    recent_queries = await QueryLog.filter(
        app_id=app_id, 
        user_id=user_id,
        timestamp__gte=thirty_days_ago
    ).count()
    
    # Calculate noise level (current)
    from app.routers.preferences import calculate_noise
    current_noise = calculate_noise(total_queries, total_contributions)
    
    # Get permissions summary
    permissions = await UserAppPermission.filter(
        user_id=user_id,
        app_id=app_id
    ).select_related('category').all()
    
    permissions_summary = {}
    for perm in permissions:
        category_key = perm.category.slug if perm.category else "all"
        permissions_summary[category_key] = {
            "can_read": perm.can_read,
            "can_write": perm.can_write
        }
    
    return {
        "app_name": app.name,
        "app_id": str(app.id),
        "is_active": app.is_active,
        "statistics": {
            "total_queries": total_queries,
            "total_contributions": total_contributions,
            "recent_queries_30d": recent_queries,
            "current_noise_level": round(current_noise, 4),
            "permissions_summary": permissions_summary
        },
        "integration_date": app.created_at
    }