"""
WebSocket Endpoint for Real-Time Call Assistance
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, Dict, Any
import json
import asyncio
import logging
import base64
from datetime import datetime
import uuid

from app.db.database import get_db
from app.db.models import Call, Transcript, Suggestion, CallStatus, ConsentStatus
from app.services.speech_service import DeepgramTranscriptionService, TranscriptSegment, Speaker, SpeechAnalyzer
from app.services.coaching_engine import AICoachingEngine, SentimentAnalyzer, CoachingSuggestion
from app.core.config import get_settings

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_settings()


class CallSession:
    """Manages a single call session"""
    
    def __init__(
        self,
        websocket: WebSocket,
        call_id: str,
        user_id: str,
        db: AsyncSession
    ):
        self.websocket = websocket
        self.call_id = call_id
        self.user_id = user_id
        self.db = db
        
        self.transcription_service = DeepgramTranscriptionService()
        self.coaching_engine = AICoachingEngine()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.speech_analyzer = SpeechAnalyzer()
        
        self.is_active = False
        self.consent_granted = False
        self.segments: list[TranscriptSegment] = []
        self.suggestions: list[CoachingSuggestion] = []
        self.start_time: Optional[datetime] = None
    
    async def start(
        self,
        prospect_name: Optional[str] = None,
        prospect_company: Optional[str] = None,
        context: Optional[str] = None,
        objective: Optional[str] = None
    ):
        """Start the call session"""
        self.start_time = datetime.utcnow()
        self.is_active = True
        
        # Initialize coaching engine with context
        opening_suggestion = await self.coaching_engine.initialize_call(
            prospect_name=prospect_name,
            prospect_company=prospect_company,
            prospect_context=context,
            call_objective=objective
        )
        
        # Send opening suggestion
        await self.send_suggestion(opening_suggestion)
        
        # Start transcription
        await self.transcription_service.start_stream(
            on_transcript=self.on_transcript,
            on_suggestion_needed=self.on_suggestion_needed,
            language="en"
        )
        
        logger.info(f"Call session started: {self.call_id}")
    
    async def on_transcript(self, segment: TranscriptSegment):
        """Handle new transcript segment"""
        self.segments.append(segment)
        
        # Send transcript to client
        await self.websocket.send_json({
            "type": "transcript",
            "data": segment.to_dict()
        })
        
        # Analyze sentiment if from prospect
        if segment.speaker == Speaker.PROSPECT and segment.is_final:
            sentiment = await self.sentiment_analyzer.analyze_sentiment(
                segment.text,
                segment.start_time
            )
            await self.websocket.send_json({
                "type": "sentiment",
                "data": sentiment
            })
    
    async def on_suggestion_needed(self, text: str, speaker: Speaker):
        """Handle when a suggestion is needed"""
        full_transcript = self.transcription_service.get_full_transcript()
        
        # Get latest segment
        if not self.segments:
            return
        
        latest_segment = self.segments[-1]
        
        # Generate suggestion
        suggestion = await self.coaching_engine.process_transcript(
            latest_segment,
            full_transcript
        )
        
        if suggestion:
            await self.send_suggestion(suggestion)
    
    async def send_suggestion(self, suggestion: CoachingSuggestion):
        """Send a suggestion to the client"""
        self.suggestions.append(suggestion)
        
        await self.websocket.send_json({
            "type": "suggestion",
            "data": suggestion.to_dict()
        })
        
        # Save suggestion to database
        db_suggestion = Suggestion(
            call_id=uuid.UUID(self.call_id),
            suggestion_type=suggestion.type.value,
            content=suggestion.content,
            context=suggestion.context,
            timestamp_seconds=(datetime.utcnow() - self.start_time).total_seconds() if self.start_time else 0
        )
        self.db.add(db_suggestion)
    
    async def process_audio(self, audio_data: bytes):
        """Process incoming audio data"""
        if self.is_active and self.consent_granted:
            await self.transcription_service.send_audio(audio_data)
    
    async def grant_consent(self):
        """Grant consent for recording"""
        self.consent_granted = True
        
        # Update call in database
        from sqlalchemy import update
        await self.db.execute(
            update(Call)
            .where(Call.id == uuid.UUID(self.call_id))
            .values(
                consent_status=ConsentStatus.GRANTED,
                consent_timestamp=datetime.utcnow(),
                consent_method="verbal"
            )
        )
        
        await self.websocket.send_json({
            "type": "consent",
            "data": {"status": "granted"}
        })
    
    async def deny_consent(self):
        """Deny consent for recording"""
        self.consent_granted = False
        
        # Update call
        from sqlalchemy import update
        await self.db.execute(
            update(Call)
            .where(Call.id == uuid.UUID(self.call_id))
            .values(consent_status=ConsentStatus.DENIED)
        )
        
        await self.websocket.send_json({
            "type": "consent",
            "data": {"status": "denied", "message": "Recording disabled. AI assistance will be limited."}
        })
    
    async def request_product_suggestion(self, needs: str, pain_points: list[str]):
        """Request a product recommendation"""
        suggestion = await self.coaching_engine.get_product_recommendation(
            needs=needs,
            pain_points=pain_points
        )
        await self.send_suggestion(suggestion)
    
    async def request_objection_help(self, objection: str):
        """Request help handling an objection"""
        suggestion = await self.coaching_engine.handle_objection(objection)
        await self.send_suggestion(suggestion)
    
    async def request_closing_help(self):
        """Request closing suggestions"""
        transcript = self.transcription_service.get_full_transcript()
        suggestion = await self.coaching_engine.get_closing_suggestion(transcript)
        await self.send_suggestion(suggestion)
    
    async def get_discovery_questions(self):
        """Get discovery questions"""
        transcript = self.transcription_service.get_full_transcript()
        suggestions = await self.coaching_engine.get_discovery_questions(transcript)
        
        for suggestion in suggestions:
            await self.send_suggestion(suggestion)
    
    async def end_call(self) -> Dict[str, Any]:
        """End the call and generate summary"""
        self.is_active = False
        
        # Stop transcription
        await self.transcription_service.stop_stream()
        
        # Calculate duration
        duration = 0
        if self.start_time:
            duration = int((datetime.utcnow() - self.start_time).total_seconds())
        
        # Get full transcript
        full_transcript = self.transcription_service.get_full_transcript()
        segments = self.transcription_service.get_segments()
        
        # Generate summary
        summary = await self.coaching_engine.generate_call_summary(
            full_transcript=full_transcript,
            call_duration=duration
        )
        
        # Calculate analytics
        talk_ratio = self.speech_analyzer.calculate_talk_ratio(self.segments)
        
        # Save transcript to database
        transcript_record = Transcript(
            call_id=uuid.UUID(self.call_id),
            full_text=full_transcript,
            segments=segments,
            is_final=True,
            processing_status="completed"
        )
        self.db.add(transcript_record)
        
        # Update call record
        from sqlalchemy import update
        await self.db.execute(
            update(Call)
            .where(Call.id == uuid.UUID(self.call_id))
            .values(
                status=CallStatus.COMPLETED,
                ended_at=datetime.utcnow(),
                duration_seconds=duration
            )
        )
        
        await self.db.commit()
        
        result = {
            "call_id": self.call_id,
            "duration_seconds": duration,
            "summary": summary,
            "analytics": {
                "talk_ratio": talk_ratio,
                "sentiment_timeline": self.sentiment_analyzer.get_sentiment_timeline(),
                "average_sentiment": self.sentiment_analyzer.get_average_sentiment(),
                "suggestions_count": len(self.suggestions)
            }
        }
        
        await self.websocket.send_json({
            "type": "call_ended",
            "data": result
        })
        
        return result


# Active sessions storage
active_sessions: Dict[str, CallSession] = {}


@router.websocket("/call/{call_id}")
async def websocket_call(
    websocket: WebSocket,
    call_id: str,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time call assistance"""
    
    # TODO: Validate token and get user_id
    # For now, using a placeholder
    user_id = "placeholder"
    
    await websocket.accept()
    logger.info(f"WebSocket connected for call: {call_id}")
    
    # Create session
    session = CallSession(
        websocket=websocket,
        call_id=call_id,
        user_id=user_id,
        db=db
    )
    active_sessions[call_id] = session
    
    try:
        while True:
            # Receive message
            message = await websocket.receive()
            
            if "text" in message:
                # JSON message
                data = json.loads(message["text"])
                await handle_json_message(session, data)
            
            elif "bytes" in message:
                # Audio data
                await session.process_audio(message["bytes"])
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for call: {call_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Cleanup
        if call_id in active_sessions:
            if session.is_active:
                await session.end_call()
            del active_sessions[call_id]


async def handle_json_message(session: CallSession, data: Dict[str, Any]):
    """Handle JSON messages from client"""
    message_type = data.get("type")
    payload = data.get("data", {})
    
    if message_type == "start":
        await session.start(
            prospect_name=payload.get("prospect_name"),
            prospect_company=payload.get("prospect_company"),
            context=payload.get("context"),
            objective=payload.get("objective")
        )
    
    elif message_type == "consent_granted":
        await session.grant_consent()
    
    elif message_type == "consent_denied":
        await session.deny_consent()
    
    elif message_type == "request_product":
        await session.request_product_suggestion(
            needs=payload.get("needs", ""),
            pain_points=payload.get("pain_points", [])
        )
    
    elif message_type == "request_objection_help":
        await session.request_objection_help(
            objection=payload.get("objection", "")
        )
    
    elif message_type == "request_closing":
        await session.request_closing_help()
    
    elif message_type == "request_discovery":
        await session.get_discovery_questions()
    
    elif message_type == "suggestion_feedback":
        # Record feedback on a suggestion
        suggestion_id = payload.get("suggestion_id")
        was_helpful = payload.get("was_helpful")
        was_used = payload.get("was_used")
        # TODO: Update suggestion in database
        pass
    
    elif message_type == "audio_base64":
        # Handle base64 encoded audio
        audio_bytes = base64.b64decode(payload.get("audio", ""))
        await session.process_audio(audio_bytes)
    
    elif message_type == "end":
        await session.end_call()
    
    elif message_type == "ping":
        await session.websocket.send_json({"type": "pong"})
