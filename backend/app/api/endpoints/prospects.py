"""
Prospects API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import Prospect, User
from app.api.endpoints.auth import get_current_user

router = APIRouter()


# Pydantic Models
class ProspectCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    location: Optional[str] = None
    timezone: Optional[str] = None
    notes: Optional[str] = None
    pain_points: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    lead_status: str = "new"


class ProspectUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    notes: Optional[str] = None
    pain_points: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    lead_status: Optional[str] = None
    lead_score: Optional[int] = None


class ProspectResponse(BaseModel):
    id: str
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
    location: Optional[str]
    lead_status: str
    lead_score: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProspectDetailResponse(ProspectResponse):
    timezone: Optional[str]
    notes: Optional[str]
    pain_points: Optional[List[str]]
    interests: Optional[List[str]]
    previous_interactions: Optional[List[dict]]


# Endpoints
@router.post("", response_model=ProspectResponse, status_code=status.HTTP_201_CREATED)
async def create_prospect(
    prospect_data: ProspectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new prospect"""
    prospect = Prospect(
        user_id=current_user.id,
        first_name=prospect_data.first_name,
        last_name=prospect_data.last_name,
        email=prospect_data.email,
        phone=prospect_data.phone,
        company=prospect_data.company,
        job_title=prospect_data.job_title,
        location=prospect_data.location,
        timezone=prospect_data.timezone,
        notes=prospect_data.notes,
        pain_points=prospect_data.pain_points or [],
        interests=prospect_data.interests or [],
        lead_status=prospect_data.lead_status
    )
    
    db.add(prospect)
    await db.commit()
    await db.refresh(prospect)
    
    return ProspectResponse(
        id=str(prospect.id),
        first_name=prospect.first_name,
        last_name=prospect.last_name,
        email=prospect.email,
        phone=prospect.phone,
        company=prospect.company,
        job_title=prospect.job_title,
        location=prospect.location,
        lead_status=prospect.lead_status,
        lead_score=prospect.lead_score,
        created_at=prospect.created_at
    )


@router.get("", response_model=List[ProspectResponse])
async def list_prospects(
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's prospects"""
    query = select(Prospect).where(Prospect.user_id == current_user.id)
    
    if status:
        query = query.where(Prospect.lead_status == status)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (Prospect.first_name.ilike(search_pattern)) |
            (Prospect.last_name.ilike(search_pattern)) |
            (Prospect.email.ilike(search_pattern)) |
            (Prospect.company.ilike(search_pattern))
        )
    
    query = query.order_by(Prospect.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    prospects = result.scalars().all()
    
    return [
        ProspectResponse(
            id=str(p.id),
            first_name=p.first_name,
            last_name=p.last_name,
            email=p.email,
            phone=p.phone,
            company=p.company,
            job_title=p.job_title,
            location=p.location,
            lead_status=p.lead_status,
            lead_score=p.lead_score,
            created_at=p.created_at
        )
        for p in prospects
    ]


@router.get("/{prospect_id}", response_model=ProspectDetailResponse)
async def get_prospect(
    prospect_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get prospect details"""
    result = await db.execute(
        select(Prospect).where(
            and_(
                Prospect.id == uuid.UUID(prospect_id),
                Prospect.user_id == current_user.id
            )
        )
    )
    prospect = result.scalar_one_or_none()
    
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    return ProspectDetailResponse(
        id=str(prospect.id),
        first_name=prospect.first_name,
        last_name=prospect.last_name,
        email=prospect.email,
        phone=prospect.phone,
        company=prospect.company,
        job_title=prospect.job_title,
        location=prospect.location,
        lead_status=prospect.lead_status,
        lead_score=prospect.lead_score,
        created_at=prospect.created_at,
        timezone=prospect.timezone,
        notes=prospect.notes,
        pain_points=prospect.pain_points,
        interests=prospect.interests,
        previous_interactions=prospect.previous_interactions
    )


@router.patch("/{prospect_id}", response_model=ProspectResponse)
async def update_prospect(
    prospect_id: str,
    prospect_data: ProspectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update prospect"""
    result = await db.execute(
        select(Prospect).where(
            and_(
                Prospect.id == uuid.UUID(prospect_id),
                Prospect.user_id == current_user.id
            )
        )
    )
    prospect = result.scalar_one_or_none()
    
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    update_data = prospect_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prospect, field, value)
    
    await db.commit()
    await db.refresh(prospect)
    
    return ProspectResponse(
        id=str(prospect.id),
        first_name=prospect.first_name,
        last_name=prospect.last_name,
        email=prospect.email,
        phone=prospect.phone,
        company=prospect.company,
        job_title=prospect.job_title,
        location=prospect.location,
        lead_status=prospect.lead_status,
        lead_score=prospect.lead_score,
        created_at=prospect.created_at
    )


@router.delete("/{prospect_id}")
async def delete_prospect(
    prospect_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a prospect"""
    result = await db.execute(
        select(Prospect).where(
            and_(
                Prospect.id == uuid.UUID(prospect_id),
                Prospect.user_id == current_user.id
            )
        )
    )
    prospect = result.scalar_one_or_none()
    
    if not prospect:
        raise HTTPException(status_code=404, detail="Prospect not found")
    
    await db.delete(prospect)
    await db.commit()
    
    return {"status": "deleted"}
