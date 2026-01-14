"""
Database Models for SalesGPT
"""

from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.database import Base


class CallStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ConsentStatus(str, enum.Enum):
    PENDING = "pending"
    GRANTED = "granted"
    DENIED = "denied"
    REVOKED = "revoked"


class User(Base):
    """Salesperson/User model"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    company = Column(String(255))
    role = Column(String(50), default="salesperson")
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Preferences
    preferred_language = Column(String(10), default="en")
    voice_profile_id = Column(String(255))  # For speaker identification
    notification_settings = Column(JSON, default=dict)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    calls = relationship("Call", back_populates="user")
    products = relationship("Product", back_populates="created_by")


class Prospect(Base):
    """Prospect/Lead model"""
    __tablename__ = "prospects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    
    # Basic Info
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255))
    phone = Column(String(50), index=True)
    company = Column(String(255))
    job_title = Column(String(255))
    
    # Demographics
    location = Column(String(255))
    timezone = Column(String(50))
    
    # Context & Notes
    notes = Column(Text)
    pain_points = Column(JSON, default=list)  # List of strings
    interests = Column(JSON, default=list)  # List of strings
    previous_interactions = Column(JSON, default=list)
    
    # Status
    lead_status = Column(String(50), default="new")
    lead_score = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    calls = relationship("Call", back_populates="prospect")


class Product(Base):
    """Product/Service catalog"""
    __tablename__ = "products"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    created_by_id = Column(String(36), ForeignKey("users.id"))
    
    # Product Info
    name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True)
    category = Column(String(100))
    description = Column(Text)
    
    # Pricing
    price = Column(Float)
    currency = Column(String(3), default="USD")
    pricing_model = Column(String(50))  # one-time, subscription, etc.
    
    # Sales Content
    key_features = Column(JSON, default=list)  # List of strings
    benefits = Column(JSON, default=list)  # List of strings
    target_audience = Column(Text)
    objection_handlers = Column(JSON, default=dict)  # Common objections and responses
    comparison_points = Column(JSON, default=dict)  # vs competitors
    
    # FAQs
    faqs = Column(JSON, default=list)
    
    # Status
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", back_populates="products")


class Call(Base):
    """Call session model"""
    __tablename__ = "calls"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    prospect_id = Column(String(36), ForeignKey("prospects.id"))
    
    # Call Info
    call_type = Column(String(50))  # outbound, inbound, scheduled
    status = Column(SQLEnum(CallStatus), default=CallStatus.SCHEDULED)
    scheduled_at = Column(DateTime)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)
    duration_seconds = Column(Integer)
    
    # Pre-call Context
    context = Column(Text)
    objectives = Column(JSON, default=list)  # List of strings
    suggested_products = Column(JSON, default=list)  # List of product IDs
    
    # Consent
    consent_status = Column(SQLEnum(ConsentStatus), default=ConsentStatus.PENDING)
    consent_timestamp = Column(DateTime)
    consent_method = Column(String(50))  # verbal, written
    
    # Recording
    recording_url = Column(String(500))
    recording_size_bytes = Column(Integer)
    
    # Outcome
    outcome = Column(String(100))  # sale_closed, follow_up, no_interest, etc.
    outcome_notes = Column(Text)
    next_steps = Column(JSON, default=list)  # List of strings
    follow_up_date = Column(DateTime)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="calls")
    prospect = relationship("Prospect", back_populates="calls")
    transcript = relationship("Transcript", back_populates="call", uselist=False)
    suggestions = relationship("Suggestion", back_populates="call")
    summary = relationship("CallSummary", back_populates="call", uselist=False)
    analytics = relationship("CallAnalytics", back_populates="call", uselist=False)


class Transcript(Base):
    """Call transcript with diarization"""
    __tablename__ = "transcripts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False)
    
    # Full transcript
    full_text = Column(Text)
    segments = Column(JSON, default=list)  # List of {speaker, text, start_time, end_time, confidence}
    
    # Language
    detected_language = Column(String(10))
    
    # Processing Status
    is_final = Column(Boolean, default=False)
    processing_status = Column(String(50), default="pending")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    call = relationship("Call", back_populates="transcript")


class Suggestion(Base):
    """AI-generated suggestions during calls"""
    __tablename__ = "suggestions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False)
    
    # Suggestion Content
    suggestion_type = Column(String(50))  # response, question, objection_handler, product_pitch, etc.
    content = Column(Text, nullable=False)
    context = Column(Text)  # What triggered this suggestion
    
    # Timing
    timestamp_seconds = Column(Float)  # When in the call this was generated
    
    # User Feedback
    was_used = Column(Boolean)
    was_helpful = Column(Boolean)
    user_feedback = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call = relationship("Call", back_populates="suggestions")


class CallSummary(Base):
    """AI-generated call summary"""
    __tablename__ = "call_summaries"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False)
    
    # Summary Content
    executive_summary = Column(Text)
    key_points = Column(JSON, default=list)  # List of strings
    action_items = Column(JSON, default=list)  # List of strings
    prospect_interests = Column(JSON, default=list)  # List of strings
    objections_raised = Column(JSON, default=list)  # List of strings
    products_discussed = Column(JSON, default=list)  # List of strings
    
    # Sentiment Analysis
    overall_sentiment = Column(String(50))  # positive, neutral, negative
    sentiment_timeline = Column(JSON, default=list)  # [{time, sentiment, score}]
    
    # Recommended Follow-up
    follow_up_recommendations = Column(Text)
    suggested_email_draft = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call = relationship("Call", back_populates="summary")


class CallAnalytics(Base):
    """Call performance analytics"""
    __tablename__ = "call_analytics"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    call_id = Column(String(36), ForeignKey("calls.id"), nullable=False)
    
    # Talk Metrics
    talk_ratio = Column(Float)  # Salesperson talk time percentage
    avg_response_time = Column(Float)  # Average time to respond
    interruption_count = Column(Integer, default=0)
    
    # Speech Metrics
    words_per_minute = Column(Float)
    filler_word_count = Column(Integer, default=0)
    question_count = Column(Integer, default=0)
    
    # Engagement Metrics
    engagement_score = Column(Float)
    clarity_score = Column(Float)
    
    # Suggestion Metrics
    suggestions_shown = Column(Integer, default=0)
    suggestions_used = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    call = relationship("Call", back_populates="analytics")


class TrainingData(Base):
    """Data for ML model training"""
    __tablename__ = "training_data"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Context
    conversation_context = Column(Text)
    prospect_statement = Column(Text)
    
    # Suggestion
    suggested_response = Column(Text)
    
    # Outcome
    was_successful = Column(Boolean)
    outcome_type = Column(String(50))
    
    # Metadata
    call_id = Column(String(36), ForeignKey("calls.id"))
    product_category = Column(String(100))
    
    # Training Status
    is_validated = Column(Boolean, default=False)
    is_used_in_training = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
