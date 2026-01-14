# Smart Salesperson Assistant System

An AI-powered real-time sales coaching platform that provides intelligent suggestions during live calls, manages product knowledge, and helps sales teams close more deals.

## Features

- 🎙️ **Real-time Transcription** - Live speech-to-text with speaker diarization
- 🤖 **AI Coaching** - GPT-4 powered suggestions during calls
- 📚 **Product Knowledge Base** - Semantic search for products and objection handling
- 📞 **Call Management** - Pre-call context, live coaching, post-call summaries
- ✅ **Consent Management** - Florida all-party consent law compliance
- 📊 **Analytics** - Call metrics, sentiment analysis, performance tracking
- 🌐 **Cross-Platform** - Web and mobile applications

## Tech Stack

### Backend
- **Framework**: Python FastAPI
- **Database**: PostgreSQL + SQLAlchemy (async)
- **Vector Store**: ChromaDB for semantic search
- **AI/ML**: OpenAI GPT-4, Deepgram (real-time transcription), Whisper
- **Auth**: JWT with access/refresh tokens

### Frontend Web
- **Framework**: Next.js 14 + React 18
- **Styling**: TailwindCSS + Framer Motion
- **State**: Zustand + React Query
- **Real-time**: WebSockets

### Mobile
- **Framework**: React Native + Expo
- **Navigation**: React Navigation
- **State**: Zustand + React Query
- **Audio**: Expo AV

## Project Structure

```
SalesGPT/
├── backend/                 # Python FastAPI server
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Configuration
│   │   ├── db/             # Database models
│   │   └── services/       # Business logic
│   └── requirements.txt
├── frontend/               # Next.js web application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   └── lib/            # Utilities & stores
│   └── package.json
├── mobile/                 # React Native mobile app
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── store/          # Zustand stores
│   │   └── services/       # API client
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- OpenAI API Key
- Deepgram API Key

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your configuration
```

#### Environment Variables

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/salesgpt

# Security
SECRET_KEY=your-super-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Deepgram
DEEPGRAM_API_KEY=your-deepgram-api-key

# Environment
ENVIRONMENT=development
DEBUG=true
```

#### Run Backend

```bash
# Run database migrations (tables are auto-created on startup)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

### 2. Frontend Web Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit with your API URL
```

#### Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

#### Run Frontend

```bash
npm run dev
```

The web app will be available at `http://localhost:3000`

### 3. Mobile App Setup

```bash
cd mobile

# Install dependencies
npm install

# For iOS (macOS only)
cd ios && pod install && cd ..
```

#### Environment Configuration

Update the API URL in `src/services/api.ts`:

```typescript
const API_URL = 'http://YOUR_LOCAL_IP:8000'; // Use your machine's IP for mobile
```

#### Run Mobile App

```bash
# Start Expo development server
npm start

# Or run directly on platform
npm run ios     # iOS simulator
npm run android # Android emulator
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get tokens
- `POST /api/auth/refresh` - Refresh access token

### Calls
- `GET /api/calls` - List calls
- `POST /api/calls` - Create new call
- `GET /api/calls/{id}` - Get call details
- `PUT /api/calls/{id}/end` - End call
- `GET /api/calls/{id}/suggestions` - Get AI suggestions
- `GET /api/calls/{id}/summary` - Get call summary

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `GET /api/products/search?q=` - Semantic search
- `POST /api/products/import` - Bulk import

### Prospects
- `GET /api/prospects` - List prospects
- `POST /api/prospects` - Create prospect
- `GET /api/prospects/{id}` - Get prospect details

### WebSocket
- `WS /api/ws/call/{call_id}` - Real-time call audio streaming

## Usage Flow

1. **Register/Login** - Create account or sign in
2. **Add Products** - Populate product knowledge base
3. **Add Prospects** - Create prospect records
4. **Start Call** - Select prospect, add context
5. **Grant Consent** - Confirm recording consent
6. **Live Call** - Receive real-time AI suggestions
7. **End Call** - Review summary and action items

## Development

### Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test

# Mobile
cd mobile
npm test
```

### Code Quality

```bash
# Backend linting
cd backend
ruff check .
black .

# Frontend linting
cd frontend
npm run lint

# Mobile linting
cd mobile
npm run lint
```

## Deployment

### Backend (Docker)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend (Vercel)

```bash
# Deploy to Vercel
vercel --prod
```

### Mobile (EAS)

```bash
# Build for production
eas build --platform all
```

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens with short expiry and refresh mechanism
- CORS configured for allowed origins
- Call recording requires explicit consent
- Florida all-party consent law compliance built-in

## License

MIT License - see LICENSE file for details

## Support

For issues and feature requests, please open a GitHub issue.
