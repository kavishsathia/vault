from fastapi import APIRouter, Query, HTTPException
from app.schema.permissions import (
    UserPermissionsResponse,
    UpdatePermissionRequest,
    UpdatePermissionResponse,
    PermissionMatrixResponse
)
from app.models.user_app_permission import UserAppPermission
from app.models.app import App
from app.models.preference_category import PreferenceCategory

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.get("/user", response_model=UserPermissionsResponse)
async def get_user_permissions(
    user_id: str = Query(..., description="User ID")
):
    """Get all app permissions for a user organized by app and category"""
    
    # Get all permissions for this user
    permissions = await UserAppPermission.filter(
        user_id=user_id
    ).select_related('app', 'category').order_by('app__name').all()
    
    # Group by app
    apps_permissions = {}
    
    for perm in permissions:
        app = perm.app
        if not app.is_active:
            continue
            
        if app.id not in apps_permissions:
            apps_permissions[app.id] = {
                "app_id": str(app.id),
                "app_name": app.name,
                "permissions": []
            }
        
        # Add category permission
        category_info = {
            "category_id": str(perm.category.id) if perm.category else "all",
            "category_name": perm.category.name if perm.category else "All Categories",
            "can_read": perm.can_read,
            "can_write": perm.can_write
        }
        
        apps_permissions[app.id]["permissions"].append(category_info)
    
    return UserPermissionsResponse(
        apps=list(apps_permissions.values())
    )


@router.post("/update", response_model=UpdatePermissionResponse)
async def update_permission(
    user_id: str = Query(..., description="User ID"),
    request: UpdatePermissionRequest = ...
):
    """Update permissions for a specific app and category combination"""
    
    # Verify app exists
    app = await App.get_or_none(id=request.app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Handle category
    category_id = None
    if request.category_id != "all":
        category = await PreferenceCategory.get_or_none(id=request.category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        category_id = category.id
    
    # Update or create permission
    permission, created = await UserAppPermission.get_or_create(
        user_id=user_id,
        app_id=request.app_id,
        category_id=category_id,
        defaults={
            "can_read": request.can_read,
            "can_write": request.can_write
        }
    )
    
    if not created:
        permission.can_read = request.can_read
        permission.can_write = request.can_write
        await permission.save()
    
    action = "created" if created else "updated"
    category_name = "all categories" if category_id is None else f"category {request.category_id}"
    
    return UpdatePermissionResponse(
        success=True,
        message=f"Permission {action} for app {app.name} on {category_name}"
    )


@router.get("/matrix", response_model=PermissionMatrixResponse)
async def get_permission_matrix(
    user_id: str = Query(..., description="User ID")
):
    """Get permission matrix for dashboard display - shows all apps vs all categories"""
    
    # Get all active apps that have permissions for this user
    apps_with_permissions = await App.filter(
        permissions__user_id=user_id,
        is_active=True
    ).distinct().all()
    
    # Get all categories
    categories = await PreferenceCategory.all().order_by('name')
    
    # Get all permissions for this user
    permissions = await UserAppPermission.filter(
        user_id=user_id
    ).select_related('app', 'category').all()
    
    # Build permission matrix
    permission_dict = {}
    
    for perm in permissions:
        if not perm.app.is_active:
            continue
            
        app_id = str(perm.app.id)
        category_key = str(perm.category.id) if perm.category else "all"
        
        if app_id not in permission_dict:
            permission_dict[app_id] = {}
        
        permission_dict[app_id][category_key] = {
            "can_read": perm.can_read,
            "can_write": perm.can_write
        }
    
    # Build app names list
    app_names = [app.name for app in apps_with_permissions]
    
    # Build category names list (include "All Categories" option)
    category_names = ["All Categories"] + [cat.name for cat in categories]
    
    return PermissionMatrixResponse(
        apps=app_names,
        categories=category_names,
        permissions=permission_dict
    )


@router.delete("/revoke")
async def revoke_app_access(
    user_id: str = Query(..., description="User ID"),
    app_id: str = Query(..., description="App ID to revoke access for")
):
    """Revoke all permissions for an app"""
    
    # Verify app exists
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Delete all permissions for this user-app combination
    deleted_count = await UserAppPermission.filter(
        user_id=user_id,
        app_id=app_id
    ).delete()
    
    return {
        "success": True,
        "message": f"Revoked all permissions for {app.name}",
        "permissions_removed": deleted_count
    }


@router.post("/grant-default")
async def grant_default_permissions(
    user_id: str = Query(..., description="User ID"),
    app_id: str = Query(..., description="App ID to grant permissions to")
):
    """Grant default read permissions to an app for all categories"""
    
    # Verify app exists
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Create default permission (read access to all categories)
    permission, created = await UserAppPermission.get_or_create(
        user_id=user_id,
        app_id=app_id,
        category_id=None,  # All categories
        defaults={
            "can_read": True,
            "can_write": False
        }
    )
    
    if not created:
        permission.can_read = True
        await permission.save()
    
    return {
        "success": True,
        "message": f"Granted default read permissions to {app.name}",
        "permission_created": created
    }