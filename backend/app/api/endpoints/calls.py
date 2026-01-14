"""
Calls API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import Call, CallStatus, ConsentStatus, Transcript, CallSummary, CallAnalytics, Suggestion
from app.api.endpoints.auth import get_current_user
from app.db.models import User

router = APIRouter()


# Pydantic Models
class CallCreate(BaseModel):
    prospect_id: Optional[str] = None
    call_type: str = "outbound"
    scheduled_at: Optional[datetime] = None
    context: Optional[str] = None
    objectives: Optional[List[str]] = None


class CallUpdate(BaseModel):
    outcome: Optional[str] = None
    outcome_notes: Optional[str] = None
    next_steps: Optional[List[str]] = None
    follow_up_date: Optional[datetime] = None


class CallResponse(BaseModel):
    id: str
    prospect_id: Optional[str]
    call_type: str
    status: str
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: Optional[int]
    consent_status: str
    outcome: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CallDetailResponse(CallResponse):
    context: Optional[str]
    objectives: Optional[List[str]]
    outcome_notes: Optional[str]
    next_steps: Optional[List[str]]
    follow_up_date: Optional[datetime]
    transcript: Optional[dict] = None
    summary: Optional[dict] = None
    analytics: Optional[dict] = None


class SuggestionResponse(BaseModel):
    id: str
    suggestion_type: str
    content: str
    context: Optional[str]
    timestamp_seconds: Optional[float]
    was_used: Optional[bool]
    was_helpful: Optional[bool]
    created_at: datetime

    class Config:
        from_attributes = True


# Endpoints
@router.post("", response_model=CallResponse, status_code=status.HTTP_201_CREATED)
async def create_call(
    call_data: CallCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new call"""
    call = Call(
        user_id=current_user.id,
        prospect_id=uuid.UUID(call_data.prospect_id) if call_data.prospect_id else None,
        call_type=call_data.call_type,
        scheduled_at=call_data.scheduled_at,
        context=call_data.context,
        objectives=call_data.objectives
    )
    
    db.add(call)
    await db.commit()
    await db.refresh(call)
    
    return CallResponse(
        id=str(call.id),
        prospect_id=str(call.prospect_id) if call.prospect_id else None,
        call_type=call.call_type,
        status=call.status.value,
        scheduled_at=call.scheduled_at,
        started_at=call.started_at,
        ended_at=call.ended_at,
        duration_seconds=call.duration_seconds,
        consent_status=call.consent_status.value,
        outcome=call.outcome,
        created_at=call.created_at
    )


@router.get("", response_model=List[CallResponse])
async def list_calls(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user's calls"""
    query = select(Call).where(Call.user_id == current_user.id)
    
    if status:
        query = query.where(Call.status == CallStatus(status))
    
    query = query.order_by(Call.created_at.desc()).limit(limit).offset(offset)
    
    result = await db.execute(query)
    calls = result.scalars().all()
    
    return [
        CallResponse(
            id=str(call.id),
            prospect_id=str(call.prospect_id) if call.prospect_id else None,
            call_type=call.call_type,
            status=call.status.value,
            scheduled_at=call.scheduled_at,
            started_at=call.started_at,
            ended_at=call.ended_at,
            duration_seconds=call.duration_seconds,
            consent_status=call.consent_status.value,
            outcome=call.outcome,
            created_at=call.created_at
        )
        for call in calls
    ]


@router.get("/{call_id}", response_model=CallDetailResponse)
async def get_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get call details"""
    result = await db.execute(
        select(Call).where(
            and_(
                Call.id == uuid.UUID(call_id),
                Call.user_id == current_user.id
            )
        )
    )
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Get transcript
    transcript_result = await db.execute(
        select(Transcript).where(Transcript.call_id == call.id)
    )
    transcript = transcript_result.scalar_one_or_none()
    
    # Get summary
    summary_result = await db.execute(
        select(CallSummary).where(CallSummary.call_id == call.id)
    )
    summary = summary_result.scalar_one_or_none()
    
    # Get analytics
    analytics_result = await db.execute(
        select(CallAnalytics).where(CallAnalytics.call_id == call.id)
    )
    analytics = analytics_result.scalar_one_or_none()
    
    return CallDetailResponse(
        id=str(call.id),
        prospect_id=str(call.prospect_id) if call.prospect_id else None,
        call_type=call.call_type,
        status=call.status.value,
        scheduled_at=call.scheduled_at,
        started_at=call.started_at,
        ended_at=call.ended_at,
        duration_seconds=call.duration_seconds,
        consent_status=call.consent_status.value,
        outcome=call.outcome,
        created_at=call.created_at,
        context=call.context,
        objectives=call.objectives,
        outcome_notes=call.outcome_notes,
        next_steps=call.next_steps,
        follow_up_date=call.follow_up_date,
        transcript={
            "full_text": transcript.full_text,
            "segments": transcript.segments
        } if transcript else None,
        summary={
            "executive_summary": summary.executive_summary,
            "key_points": summary.key_points,
            "action_items": summary.action_items,
            "prospect_interests": summary.prospect_interests,
            "objections_raised": summary.objections_raised,
            "overall_sentiment": summary.overall_sentiment,
            "follow_up_recommendations": summary.follow_up_recommendations
        } if summary else None,
        analytics={
            "talk_ratio": analytics.talk_ratio,
            "avg_response_time": analytics.avg_response_time,
            "words_per_minute": analytics.words_per_minute,
            "question_count": analytics.question_count,
            "engagement_score": analytics.engagement_score,
            "suggestions_shown": analytics.suggestions_shown,
            "suggestions_used": analytics.suggestions_used
        } if analytics else None
    )


@router.patch("/{call_id}", response_model=CallResponse)
async def update_call(
    call_id: str,
    call_data: CallUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update call details"""
    result = await db.execute(
        select(Call).where(
            and_(
                Call.id == uuid.UUID(call_id),
                Call.user_id == current_user.id
            )
        )
    )
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    update_data = call_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(call, field, value)
    
    await db.commit()
    await db.refresh(call)
    
    return CallResponse(
        id=str(call.id),
        prospect_id=str(call.prospect_id) if call.prospect_id else None,
        call_type=call.call_type,
        status=call.status.value,
        scheduled_at=call.scheduled_at,
        started_at=call.started_at,
        ended_at=call.ended_at,
        duration_seconds=call.duration_seconds,
        consent_status=call.consent_status.value,
        outcome=call.outcome,
        created_at=call.created_at
    )


@router.get("/{call_id}/suggestions", response_model=List[SuggestionResponse])
async def get_call_suggestions(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get suggestions from a call"""
    # Verify call belongs to user
    result = await db.execute(
        select(Call).where(
            and_(
                Call.id == uuid.UUID(call_id),
                Call.user_id == current_user.id
            )
        )
    )
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # Get suggestions
    result = await db.execute(
        select(Suggestion)
        .where(Suggestion.call_id == call.id)
        .order_by(Suggestion.timestamp_seconds)
    )
    suggestions = result.scalars().all()
    
    return [
        SuggestionResponse(
            id=str(s.id),
            suggestion_type=s.suggestion_type,
            content=s.content,
            context=s.context,
            timestamp_seconds=s.timestamp_seconds,
            was_used=s.was_used,
            was_helpful=s.was_helpful,
            created_at=s.created_at
        )
        for s in suggestions
    ]


@router.post("/{call_id}/suggestions/{suggestion_id}/feedback")
async def update_suggestion_feedback(
    call_id: str,
    suggestion_id: str,
    was_used: Optional[bool] = None,
    was_helpful: Optional[bool] = None,
    feedback: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update feedback for a suggestion"""
    result = await db.execute(
        select(Suggestion).where(
            and_(
                Suggestion.id == uuid.UUID(suggestion_id),
                Suggestion.call_id == uuid.UUID(call_id)
            )
        )
    )
    suggestion = result.scalar_one_or_none()
    
    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    
    if was_used is not None:
        suggestion.was_used = was_used
    if was_helpful is not None:
        suggestion.was_helpful = was_helpful
    if feedback:
        suggestion.user_feedback = feedback
    
    await db.commit()
    
    return {"status": "updated"}


@router.delete("/{call_id}")
async def delete_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a call and its data"""
    result = await db.execute(
        select(Call).where(
            and_(
                Call.id == uuid.UUID(call_id),
                Call.user_id == current_user.id
            )
        )
    )
    call = result.scalar_one_or_none()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    await db.delete(call)
    await db.commit()
    
    return {"status": "deleted"}
