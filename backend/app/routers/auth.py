from fastapi import APIRouter, HTTPException, status, Depends
from tortoise.exceptions import IntegrityError
from app.schema.auth import UserSignup, UserSignin, TokenResponse, UserResponse
from app.models.user import User
from app.utils.auth import get_password_hash, authenticate_user, create_access_token, get_current_user
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    """Register a new user."""
    try:
        # Hash the password
        password_hash = get_password_hash(user_data.password)
        
        # Create the user
        user = await User.create(
            email=user_data.email,
            name=user_data.name,
            password_hash=password_hash,
            is_active=True
        )
        
        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        # Return token and user data
        user_response = UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            is_active=user.is_active,
            created_at=user.created_at,
            last_seen_at=user.last_seen_at
        )
        
        return TokenResponse(
            access_token=access_token,
            user=user_response
        )
        
    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/signin", response_model=TokenResponse)
async def signin(user_data: UserSignin):
    """Authenticate user and return JWT token."""
    user = await authenticate_user(user_data.email, user_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # Return token and user data
    user_response = UserResponse(
        id=str(user.id),
        email=user.email,
        name=user.name,
        is_active=user.is_active,
        created_at=user.created_at,
        last_seen_at=user.last_seen_at
    )
    
    return TokenResponse(
        access_token=access_token,
        user=user_response
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile."""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        name=current_user.name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        last_seen_at=current_user.last_seen_at
    )