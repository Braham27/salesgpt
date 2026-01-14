-- SalesGPT Database Schema for Neon PostgreSQL
-- Run this after creating a new Neon project

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    role VARCHAR(50) DEFAULT 'salesperson',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    voice_profile_id VARCHAR(255),
    notification_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Prospects table
CREATE TABLE IF NOT EXISTS prospects (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    job_title VARCHAR(255),
    location VARCHAR(255),
    timezone VARCHAR(50),
    notes TEXT,
    pain_points JSONB DEFAULT '[]',
    interests JSONB DEFAULT '[]',
    previous_interactions JSONB DEFAULT '[]',
    lead_status VARCHAR(50) DEFAULT 'new',
    lead_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(36) PRIMARY KEY,
    created_by_id VARCHAR(36) REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    category VARCHAR(100),
    description TEXT,
    price FLOAT,
    currency VARCHAR(3) DEFAULT 'USD',
    pricing_model VARCHAR(50),
    key_features JSONB DEFAULT '[]',
    benefits JSONB DEFAULT '[]',
    target_audience TEXT,
    objection_handlers JSONB DEFAULT '{}',
    comparison_points JSONB DEFAULT '{}',
    faqs JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    prospect_id VARCHAR(36) REFERENCES prospects(id),
    call_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'scheduled',
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration_seconds INTEGER,
    context TEXT,
    objectives JSONB DEFAULT '[]',
    suggested_products JSONB DEFAULT '[]',
    consent_status VARCHAR(20) DEFAULT 'pending',
    consent_timestamp TIMESTAMP,
    consent_method VARCHAR(50),
    recording_url VARCHAR(500),
    recording_size_bytes INTEGER,
    outcome VARCHAR(100),
    outcome_notes TEXT,
    next_steps JSONB DEFAULT '[]',
    follow_up_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) NOT NULL REFERENCES calls(id),
    full_text TEXT,
    segments JSONB DEFAULT '[]',
    detected_language VARCHAR(10),
    is_final BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) NOT NULL REFERENCES calls(id),
    suggestion_type VARCHAR(50),
    content TEXT NOT NULL,
    context TEXT,
    confidence_score FLOAT,
    was_used BOOLEAN DEFAULT FALSE,
    user_feedback VARCHAR(20),
    feedback_notes TEXT,
    trigger_phrase TEXT,
    product_id VARCHAR(36) REFERENCES products(id),
    timestamp_in_call FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call Summaries table
CREATE TABLE IF NOT EXISTS call_summaries (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) NOT NULL REFERENCES calls(id),
    executive_summary TEXT,
    key_points JSONB DEFAULT '[]',
    action_items JSONB DEFAULT '[]',
    objections_raised JSONB DEFAULT '[]',
    products_discussed JSONB DEFAULT '[]',
    next_steps_recommended JSONB DEFAULT '[]',
    overall_sentiment VARCHAR(20),
    deal_probability FLOAT,
    improvement_suggestions JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Call Analytics table
CREATE TABLE IF NOT EXISTS call_analytics (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) NOT NULL REFERENCES calls(id),
    talk_ratio_salesperson FLOAT,
    talk_ratio_prospect FLOAT,
    average_speaking_pace_wpm FLOAT,
    longest_monologue_seconds FLOAT,
    question_count INTEGER,
    filler_word_count INTEGER,
    sentiment_timeline JSONB DEFAULT '[]',
    engagement_score FLOAT,
    clarity_score FLOAT,
    empathy_score FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Training Data table
CREATE TABLE IF NOT EXISTS training_data (
    id VARCHAR(36) PRIMARY KEY,
    call_id VARCHAR(36) REFERENCES calls(id),
    suggestion_id VARCHAR(36) REFERENCES suggestions(id),
    input_context TEXT,
    expected_output TEXT,
    actual_output TEXT,
    was_successful BOOLEAN,
    feedback_score INTEGER,
    data_type VARCHAR(50),
    is_validated BOOLEAN DEFAULT FALSE,
    validated_by VARCHAR(36) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_user_id ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_phone ON prospects(phone);
CREATE INDEX IF NOT EXISTS idx_calls_user_id ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_prospect_id ON calls(prospect_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_call_id ON suggestions(call_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_call_id ON transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
