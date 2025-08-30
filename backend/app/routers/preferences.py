from fastapi import APIRouter, Query, Path, HTTPException
from typing import Optional
from app.schema.preferences import (
    TopPreferencesResponse, 
    AddPreferenceRequest, 
    AddPreferenceResponse,
    PreferenceDetailResponse,
    QueryRequest,
    QueryResponse,
    QueryContextsRequest,
    QueryContextsResponse,
    ContextItem
)
from app.models.user_preference import UserPreference
from app.models.preference_category import PreferenceCategory
from app.models.preference_source import PreferenceSource
from app.models.query_log import QueryLog
from app.models.app import App
import math
from datetime import datetime, timedelta, timezone
import numpy as np
import random

router = APIRouter(prefix="/preferences", tags=["preferences"])

# Configuration for game theory mechanics
NOISE_CONFIG = {
    "base_noise": 0.1,
    "query_multiplier": 0.01,
    "contribution_divisor": 1.0,
    "max_noise": 0.5
}

SIMILARITY_CONFIG = {
    "merge_threshold": 0.85,
    "strength_boost": 0.2,
    "max_strength": 10.0
}

DECAY_CONFIG = {
    "half_life_days": 14
}


def calculate_cosine_similarity(embedding1, embedding2):
    """Calculate cosine similarity between two embeddings"""
    # Handle None embeddings (from migration)
    if embedding1 is None or embedding2 is None:
        return 0
    
    # Convert to numpy arrays
    try:
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
    except (ValueError, TypeError):
        return 0
    
    # Check for empty arrays
    if vec1.size == 0 or vec2.size == 0:
        return 0
    
    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)
    
    if norm1 == 0 or norm2 == 0:
        return 0
    
    return dot_product / (norm1 * norm2)


def apply_temporal_decay(strength: float, days_since_update: float) -> float:
    """Apply temporal decay using half-life"""
    decay_factor = math.pow(0.5, days_since_update / DECAY_CONFIG["half_life_days"])
    return strength * decay_factor


def calculate_noise(queries_made: int, validated_contributions: int) -> float:
    """Calculate noise level based on query/contribution ratio"""
    # For demo purposes, return 0 noise
    return 0.0
    
    noise = min(
        NOISE_CONFIG["base_noise"] + (queries_made * NOISE_CONFIG["query_multiplier"]),
        NOISE_CONFIG["max_noise"]
    ) / max(1, validated_contributions * NOISE_CONFIG["contribution_divisor"])
    
    return max(0, min(1, noise))


@router.get("/top", response_model=TopPreferencesResponse)
async def get_top_preferences(
    user_id: str = Query(..., description="User ID"),
    limit: int = Query(20, ge=1, le=100, description="Number of preferences to return"),
    category: Optional[str] = Query(None, description="Filter by category slug"),
    min_strength: Optional[float] = Query(None, ge=0.0, description="Minimum strength threshold")
):
    """Get user's top preferences with temporal decay applied"""
    
    query = UserPreference.filter(user_id=user_id)
    
    # Handle category filtering - default to health-fitness if null or "null"
    filter_category = category
    if not category or category == "null":
        filter_category = "health-fitness"
    
    if filter_category:
        category_obj = await PreferenceCategory.get_or_none(slug=filter_category)
        if not category_obj:
            raise HTTPException(status_code=404, detail="Category not found")
        query = query.filter(category_id=category_obj.id)
    
    preferences = await query.select_related('category').prefetch_related('sources__app').all()
    
    # Apply temporal decay and filter
    now = datetime.now(timezone.utc)
    decayed_preferences = []
    
    for pref in preferences:
        days_since_update = (now - pref.last_updated).total_seconds() / (24 * 3600)
        decayed_strength = apply_temporal_decay(pref.strength, days_since_update)
        
        if min_strength is None or decayed_strength >= min_strength:
            pref.strength = decayed_strength  # Update for response
            decayed_preferences.append(pref)
    
    # Sort by strength (descending) and limit
    decayed_preferences.sort(key=lambda x: x.strength, reverse=True)
    top_preferences = decayed_preferences[:limit]
    
    # Build response
    preferences_data = []
    for pref in top_preferences:
        sources_data = [
            {
                "app_name": source.app.name if source.app else "User",
                "added_at": source.added_at,
                "strength": source.strength
            }
            for source in pref.sources
        ]
        
        preferences_data.append({
            "id": str(pref.id),
            "text": pref.text,
            "strength": pref.strength,
            "category_name": pref.category.name if pref.category else None,
            "sources": sources_data,
            "last_updated": pref.last_updated,
            "created_at": pref.created_at
        })
    
    return TopPreferencesResponse(
        preferences=preferences_data,
        total_count=len(decayed_preferences)
    )


@router.post("/add", response_model=AddPreferenceResponse)
async def add_preference(
    user_id: str = Query(..., description="User ID"),
    request: AddPreferenceRequest = ...
):
    """Add a new preference or strengthen existing similar preference"""
    
    # Get category if specified
    category_obj = None
    if request.category_slug:
        category_obj = await PreferenceCategory.get_or_none(slug=request.category_slug)
        if not category_obj:
            raise HTTPException(status_code=404, detail="Category not found")
    
    # Check for similar existing preferences
    existing_preferences = await UserPreference.filter(
        user_id=user_id,
        category_id=category_obj.id if category_obj else None
    ).all()
    
    # Find most similar preference
    best_match = None
    best_similarity = 0
    
    for existing in existing_preferences:
        similarity = calculate_cosine_similarity(request.embedding, existing.embedding)
        if similarity > best_similarity and similarity > SIMILARITY_CONFIG["merge_threshold"]:
            best_similarity = similarity
            best_match = existing
    
    if best_match:
        # Strengthen existing preference
        best_match.strength = min(
            best_match.strength + SIMILARITY_CONFIG["strength_boost"] * request.strength,
            SIMILARITY_CONFIG["max_strength"]
        )
        best_match.last_updated = datetime.now(timezone.utc)
        await best_match.save()
        
        # Add source entry (user-added)
        await PreferenceSource.create(
            preference_id=best_match.id,
            app_id=None,  # User-added
            user_id=user_id,
            strength=request.strength
        )
        
        return AddPreferenceResponse(
            id=str(best_match.id),
            text=best_match.text,
            strength=best_match.strength,
            category_name=category_obj.name if category_obj else None,
            created_at=best_match.created_at
        )
    else:
        # Create new preference
        new_preference = await UserPreference.create(
            user_id=user_id,
            category_id=category_obj.id if category_obj else None,
            text=request.text,
            embedding=request.embedding,
            strength=request.strength
        )
        
        # Add source entry (user-added)
        await PreferenceSource.create(
            preference_id=new_preference.id,
            app_id=None,  # User-added
            user_id=user_id,
            strength=request.strength
        )
        
        return AddPreferenceResponse(
            id=str(new_preference.id),
            text=new_preference.text,
            strength=new_preference.strength,
            category_name=category_obj.name if category_obj else None,
            created_at=new_preference.created_at
        )


@router.get("/{preference_id}", response_model=PreferenceDetailResponse)
async def get_preference_detail(
    preference_id: str = Path(..., description="Preference ID"),
    user_id: str = Query(..., description="User ID")
):
    """Get detailed information about a specific preference"""
    
    preference = await UserPreference.get_or_none(
        id=preference_id, 
        user_id=user_id
    ).select_related('category').prefetch_related('sources__app')
    
    if not preference:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    # Calculate temporal decay info
    now = datetime.now(timezone.utc)
    days_since_update = (now - preference.last_updated).total_seconds() / (24 * 3600)
    current_strength = apply_temporal_decay(preference.strength, days_since_update)
    
    temporal_info = {
        "original_strength": preference.strength,
        "current_strength": current_strength,
        "days_since_update": round(days_since_update, 2),
        "half_life_days": DECAY_CONFIG["half_life_days"],
        "decay_factor": round(current_strength / preference.strength, 4)
    }
    
    # Build sources data
    sources_data = [
        {
            "app_name": source.app.name if source.app else "User",
            "added_at": source.added_at,
            "strength": source.strength
        }
        for source in preference.sources
    ]
    
    return PreferenceDetailResponse(
        id=str(preference.id),
        text=preference.text,
        strength=current_strength,
        category_name=preference.category.name if preference.category else None,
        sources=sources_data,
        last_updated=preference.last_updated,
        created_at=preference.created_at,
        temporal_decay_info=temporal_info
    )


@router.post("/query", response_model=QueryResponse)
async def query_preferences(
    user_id: str = Query(..., description="User ID"),
    app_id: str = Query(..., description="App ID for noise calculation"),
    request: QueryRequest = ...
):
    """Query user preferences with similarity search and noise injection"""
    
    # Get app for noise calculation
    app = await App.get_or_none(id=app_id)
    if not app:
        raise HTTPException(status_code=404, detail="App not found")
    
    # Calculate noise level
    queries_made = await QueryLog.filter(app_id=app_id, user_id=user_id).count()
    contributions = await PreferenceSource.filter(app_id=app_id, user_id=user_id).count()
    noise_level = calculate_noise(queries_made, contributions)
    
    # Get user preferences
    preferences = await UserPreference.filter(user_id=user_id).all()
    
    if not preferences:
        # Log query
        await QueryLog.create(
            app_id=app_id,
            user_id=user_id,
            embedding=request.embedding,
            result=0.0,
            context=request.context,
            noise_level=noise_level
        )
        
        return QueryResponse(
            score=0.0,
            confidence=0.0,
            noise_level=noise_level
        )
    
    # Find best matching preference
    best_score = 0
    best_preference = None
    
    now = datetime.now(timezone.utc)
    
    for pref in preferences:
        # Calculate similarity
        similarity = calculate_cosine_similarity(request.embedding, pref.embedding)
        
        # Apply temporal decay
        days_since_update = (now - pref.last_updated).total_seconds() / (24 * 3600)
        decayed_strength = apply_temporal_decay(pref.strength, days_since_update)
        
        # Combined score
        score = similarity * min(decayed_strength, 1.0)  # Cap at 1.0 for scoring
        
        if score > best_score:
            best_score = score
            best_preference = pref
    
    # Add noise
    noise_amount = np.random.normal(0, noise_level)
    noisy_score = max(0, min(1, best_score + noise_amount))
    
    # Confidence based on how many preferences we have and best similarity
    confidence = min(1.0, len(preferences) / 10.0) * (1 - noise_level)
    
    # Log query
    await QueryLog.create(
        app_id=app_id,
        user_id=user_id,
        embedding=request.embedding,
        result=noisy_score,
        context=request.context,
        noise_level=noise_level
    )
    
    return QueryResponse(
        score=noisy_score,
        confidence=confidence,
        noise_level=noise_level
    )


@router.post("/query-contexts", response_model=QueryContextsResponse)
async def query_contexts(
    request: QueryContextsRequest,
    user_id: str = Query(..., description="User ID"),
    app_id: str = Query(..., description="App ID for noise calculation")
):
    """Query user preferences with multiple embeddings, returning top 3 contexts per embedding"""
    
    # Calculate noise level
    queries_made = await QueryLog.filter(app_id=app_id, user_id=user_id).count()
    contributions = await PreferenceSource.filter(app_id=app_id, user_id=user_id).count()
    noise_level = calculate_noise(queries_made, contributions)
    
    # Get all user preferences
    preferences = await UserPreference.filter(user_id=user_id).select_related('category').all()
    
    if not preferences:
        return QueryContextsResponse(
            results=[[] for _ in request.embeddings],
            noise_level=noise_level
        )
    
    # Apply noise filtering - randomly exclude preferences based on noise level
    filtered_preferences = []
    for pref in preferences:
        if random.random() > noise_level:  # Include if random roll beats noise
            filtered_preferences.append(pref)
    
    # Process each embedding
    results = []
    now = datetime.now(timezone.utc)
    
    for query_embedding in request.embeddings:
        # Calculate similarities for all filtered preferences
        similarities = []
        
        for pref in filtered_preferences:
            # Skip preferences with null embeddings (from migration)
            if pref.embedding is None:
                continue
                
            # Calculate cosine similarity
            similarity = calculate_cosine_similarity(query_embedding, pref.embedding)
            
            # Apply temporal decay to strength
            days_since_update = (now - pref.last_updated).total_seconds() / (24 * 3600)
            decayed_strength = apply_temporal_decay(pref.strength, days_since_update)
            
            # Final score combines similarity and decayed strength
            final_score = similarity * min(decayed_strength / 10.0, 1.0)  # Normalize strength
            
            similarities.append({
                'preference': pref,
                'score': final_score,
                'similarity': similarity
            })
        
        # Sort by score and take top 3
        similarities.sort(key=lambda x: x['score'], reverse=True)
        top_3 = similarities[:3]
        
        # Build context items
        contexts = []
        for item in top_3:
            contexts.append(ContextItem(
                text=item['preference'].text,
                category=item['preference'].category.name if item['preference'].category else None,
                score=item['similarity']  # Return raw similarity score, not combined score
            ))
        
        results.append(contexts)
    
    # Log queries
    for embedding in request.embeddings:
        await QueryLog.create(
            app_id=app_id,
            user_id=user_id,
            embedding=embedding,
            result=len(filtered_preferences),  # Log how many prefs were available after filtering
            context=request.context,
            noise_level=noise_level
        )
    
    return QueryContextsResponse(
        results=results,
        noise_level=noise_level
    )