"""
Users API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.db.models import User
from app.api.endpoints.auth import get_current_user, get_password_hash

router = APIRouter()


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    preferred_language: Optional[str] = None
    notification_settings: Optional[dict] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: Optional[str]
    company: Optional[str]
    role: str
    is_active: bool
    preferred_language: str
    notification_settings: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/profile", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user's profile"""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        company=current_user.company,
        role=current_user.role,
        is_active=current_user.is_active,
        preferred_language=current_user.preferred_language,
        notification_settings=current_user.notification_settings,
        created_at=current_user.created_at
    )


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user's profile"""
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        phone=current_user.phone,
        company=current_user.company,
        role=current_user.role,
        is_active=current_user.is_active,
        preferred_language=current_user.preferred_language,
        notification_settings=current_user.notification_settings,
        created_at=current_user.created_at
    )


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user's password"""
    from app.api.endpoints.auth import verify_password
    
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    await db.commit()
    
    return {"status": "password_changed"}
