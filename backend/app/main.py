"""
SalesGPT Backend Application
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import get_settings
from app.api.routes import api_router
from app.db.database import init_db
from app.services.vector_store import init_vector_store

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting SalesGPT Backend...")
    await init_db()
    await init_vector_store()
    logger.info("SalesGPT Backend started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down SalesGPT Backend...")


app = FastAPI(
    title=settings.app_name,
    description="AI-Powered Smart Salesperson Assistant - Real-time coaching and guidance for sales calls",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS Configuration - Allow all origins in development, specific in production
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://*.vercel.app",  # Vercel preview deployments
]

# Add production domains
if settings.app_env == "production":
    allowed_origins.extend([
        "https://salesgpt.vercel.app",
        "https://www.salesgpt.com",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.debug else allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
