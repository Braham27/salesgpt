"""
API Routes Index
"""

from fastapi import APIRouter

from app.api.endpoints import auth, users, calls, products, prospects, websocket

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(calls.router, prefix="/calls", tags=["Calls"])
api_router.include_router(products.router, prefix="/products", tags=["Products"])
api_router.include_router(prospects.router, prefix="/prospects", tags=["Prospects"])
api_router.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
