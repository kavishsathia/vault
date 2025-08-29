from fastapi import APIRouter
from app.routers.auth import router as auth_router
from app.routers.preferences import router as preferences_router
from app.routers.apps import router as apps_router
from app.routers.permissions import router as permissions_router
from app.routers.categories import router as categories_router
from app.routers.oauth import router as oauth_router

router = APIRouter(prefix="/api")

router.include_router(auth_router)
router.include_router(preferences_router)
router.include_router(apps_router)  
router.include_router(permissions_router)
router.include_router(categories_router)

# OAuth router - no /api prefix since it follows OAuth spec exactly
main_router = APIRouter()
main_router.include_router(router)
main_router.include_router(oauth_router)