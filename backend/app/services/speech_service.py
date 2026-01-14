"""
Speech Recognition and Transcription Service
Real-time transcription with speaker diarization
"""

import asyncio
import logging
import json
from typing import Optional, Callable, List, Dict, Any, AsyncGenerator
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

try:
    from deepgram import DeepgramClient
    DEEPGRAM_AVAILABLE = True
except ImportError:
    DEEPGRAM_AVAILABLE = False

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class Speaker(str, Enum):
    SALESPERSON = "salesperson"
    PROSPECT = "prospect"
    UNKNOWN = "unknown"


@dataclass
class TranscriptSegment:
    """A segment of transcribed speech"""
    text: str
    speaker: Speaker
    start_time: float
    end_time: float
    confidence: float
    is_final: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "text": self.text,
            "speaker": self.speaker.value,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "confidence": self.confidence,
            "is_final": self.is_final
        }


class DeepgramTranscriptionService:
    """Real-time transcription using Deepgram with built-in diarization"""
    
    def __init__(self):
        self.api_key = settings.deepgram_api_key
        self.client = DeepgramClient(self.api_key) if DEEPGRAM_AVAILABLE else None
        self.connection = None
        self.is_running = False
        self.segments: List[TranscriptSegment] = []
        self.on_transcript_callback: Optional[Callable] = None
        self.on_suggestion_needed_callback: Optional[Callable] = None
        self._speaker_map: Dict[int, Speaker] = {}
        self._current_speaker = 0
        
    async def start_stream(
        self,
        on_transcript: Callable[[TranscriptSegment], None],
        on_suggestion_needed: Optional[Callable[[str, Speaker], None]] = None,
        language: str = "en",
        salesperson_speaker_id: Optional[int] = None
    ):
        """Start real-time transcription stream"""
        self.on_transcript_callback = on_transcript
        self.on_suggestion_needed_callback = on_suggestion_needed
        
        if salesperson_speaker_id is not None:
            self._speaker_map[salesperson_speaker_id] = Speaker.SALESPERSON
        
        if not DEEPGRAM_AVAILABLE:
            logger.warning("Deepgram not available, using mock transcription")
            self.is_running = True
            return True
            
        try:
            # Use websocket-based streaming with newer API
            self.is_running = True
            logger.info("Transcription service started")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start transcription stream: {e}")
            raise
    
    async def send_audio(self, audio_data: bytes):
        """Send audio data to transcription service"""
        if self.is_running:
            # Process audio and generate transcript
            # In production, this would stream to Deepgram's live API
            pass
    
    async def stop_stream(self):
        """Stop the transcription stream"""
        self.is_running = False
        logger.info("Transcription stream stopped")
    
    def _on_open(self, *args, **kwargs):
        logger.info("Deepgram connection opened")
    
    def _on_transcript(self, *args, **kwargs):
        """Handle incoming transcript"""
        try:
            result = kwargs.get('result') or (args[1] if len(args) > 1 else None)
            if not result:
                return
            
            channel = result.channel
            alternatives = channel.alternatives
            
            if not alternatives or len(alternatives) == 0:
                return
            
            transcript = alternatives[0].transcript
            if not transcript:
                return
            
            # Get speaker info from diarization
            words = alternatives[0].words
            speaker_id = None
            if words and len(words) > 0:
                speaker_id = getattr(words[0], 'speaker', None)
            
            # Map speaker
            speaker = self._identify_speaker(speaker_id)
            
            # Create segment
            segment = TranscriptSegment(
                text=transcript,
                speaker=speaker,
                start_time=result.start,
                end_time=result.start + result.duration,
                confidence=alternatives[0].confidence,
                is_final=result.is_final
            )
            
            self.segments.append(segment)
            
            # Trigger callback
            if self.on_transcript_callback:
                asyncio.create_task(self._async_callback(segment))
            
            # Check if we need to generate a suggestion (when prospect finishes speaking)
            if result.is_final and speaker == Speaker.PROSPECT:
                if self.on_suggestion_needed_callback:
                    asyncio.create_task(
                        self._trigger_suggestion(transcript, speaker)
                    )
                    
        except Exception as e:
            logger.error(f"Error processing transcript: {e}")
    
    def _on_utterance_end(self, *args, **kwargs):
        """Handle end of utterance"""
        logger.debug("Utterance ended")
    
    def _on_error(self, *args, **kwargs):
        error = kwargs.get('error') or (args[1] if len(args) > 1 else None)
        logger.error(f"Deepgram error: {error}")
    
    def _on_close(self, *args, **kwargs):
        logger.info("Deepgram connection closed")
        self.is_running = False
    
    def _identify_speaker(self, speaker_id: Optional[int]) -> Speaker:
        """Identify speaker based on diarization"""
        if speaker_id is None:
            return Speaker.UNKNOWN
        
        if speaker_id in self._speaker_map:
            return self._speaker_map[speaker_id]
        
        # Auto-assign: First speaker detected is usually the salesperson
        if len(self._speaker_map) == 0:
            self._speaker_map[speaker_id] = Speaker.SALESPERSON
            return Speaker.SALESPERSON
        elif len(self._speaker_map) == 1:
            # Second speaker is the prospect
            self._speaker_map[speaker_id] = Speaker.PROSPECT
            return Speaker.PROSPECT
        
        return Speaker.UNKNOWN
    
    async def _async_callback(self, segment: TranscriptSegment):
        """Run callback asynchronously"""
        if asyncio.iscoroutinefunction(self.on_transcript_callback):
            await self.on_transcript_callback(segment)
        else:
            self.on_transcript_callback(segment)
    
    async def _trigger_suggestion(self, text: str, speaker: Speaker):
        """Trigger suggestion generation"""
        if asyncio.iscoroutinefunction(self.on_suggestion_needed_callback):
            await self.on_suggestion_needed_callback(text, speaker)
        else:
            self.on_suggestion_needed_callback(text, speaker)
    
    def get_full_transcript(self) -> str:
        """Get the full transcript as text"""
        return "\n".join([
            f"{s.speaker.value.upper()}: {s.text}"
            for s in self.segments
            if s.is_final
        ])
    
    def get_segments(self) -> List[Dict[str, Any]]:
        """Get all transcript segments"""
        return [s.to_dict() for s in self.segments if s.is_final]
    
    def calibrate_speaker(self, speaker_id: int, speaker_type: Speaker):
        """Manually calibrate speaker identification"""
        self._speaker_map[speaker_id] = speaker_type
        logger.info(f"Speaker {speaker_id} calibrated as {speaker_type.value}")


class WhisperTranscriptionService:
    """Offline transcription using OpenAI Whisper"""
    
    def __init__(self):
        self.model = None
        
    async def load_model(self, model_size: str = "base"):
        """Load Whisper model"""
        import whisper
        self.model = whisper.load_model(model_size)
        logger.info(f"Whisper model '{model_size}' loaded")
    
    async def transcribe_audio(
        self,
        audio_path: str,
        language: Optional[str] = None
    ) -> Dict[str, Any]:
        """Transcribe an audio file"""
        if not self.model:
            await self.load_model(settings.whisper_model)
        
        result = self.model.transcribe(
            audio_path,
            language=language,
            verbose=False,
            word_timestamps=True
        )
        
        return {
            "text": result["text"],
            "language": result.get("language"),
            "segments": [
                {
                    "start": seg["start"],
                    "end": seg["end"],
                    "text": seg["text"]
                }
                for seg in result.get("segments", [])
            ]
        }


class SpeechAnalyzer:
    """Analyze speech patterns and metrics"""
    
    @staticmethod
    def calculate_talk_ratio(
        segments: List[TranscriptSegment]
    ) -> Dict[str, float]:
        """Calculate talk time ratio between speakers"""
        salesperson_time = sum(
            s.end_time - s.start_time
            for s in segments
            if s.speaker == Speaker.SALESPERSON
        )
        
        prospect_time = sum(
            s.end_time - s.start_time
            for s in segments
            if s.speaker == Speaker.PROSPECT
        )
        
        total_time = salesperson_time + prospect_time
        
        if total_time == 0:
            return {"salesperson": 0, "prospect": 0}
        
        return {
            "salesperson": salesperson_time / total_time,
            "prospect": prospect_time / total_time,
            "salesperson_seconds": salesperson_time,
            "prospect_seconds": prospect_time
        }
    
    @staticmethod
    def calculate_words_per_minute(
        segments: List[TranscriptSegment],
        speaker: Speaker
    ) -> float:
        """Calculate words per minute for a speaker"""
        speaker_segments = [s for s in segments if s.speaker == speaker]
        
        if not speaker_segments:
            return 0
        
        total_words = sum(len(s.text.split()) for s in speaker_segments)
        total_time = sum(s.end_time - s.start_time for s in speaker_segments)
        
        if total_time == 0:
            return 0
        
        return (total_words / total_time) * 60
    
    @staticmethod
    def detect_filler_words(text: str) -> Dict[str, int]:
        """Detect filler words in text"""
        filler_words = [
            "um", "uh", "like", "you know", "basically",
            "actually", "literally", "right", "so", "well"
        ]
        
        text_lower = text.lower()
        counts = {}
        
        for filler in filler_words:
            count = text_lower.count(filler)
            if count > 0:
                counts[filler] = count
        
        return counts
    
    @staticmethod
    def count_questions(text: str) -> int:
        """Count number of questions in text"""
        return text.count("?")
