"""
Products API Endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import json

from app.db.database import get_db
from app.db.models import Product, User
from app.api.endpoints.auth import get_current_user
from app.services.vector_store import VectorStore

router = APIRouter()


# Pydantic Models
class ProductCreate(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"
    pricing_model: Optional[str] = None
    key_features: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    target_audience: Optional[str] = None
    objection_handlers: Optional[Dict[str, str]] = None
    comparison_points: Optional[Dict[str, str]] = None
    faqs: Optional[List[Dict[str, str]]] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    key_features: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
    target_audience: Optional[str] = None
    objection_handlers: Optional[Dict[str, str]] = None
    faqs: Optional[List[Dict[str, str]]] = None
    is_active: Optional[bool] = None


class ProductResponse(BaseModel):
    id: str
    name: str
    sku: Optional[str]
    category: Optional[str]
    description: Optional[str]
    price: Optional[float]
    currency: str
    pricing_model: Optional[str]
    key_features: Optional[List[str]]
    benefits: Optional[List[str]]
    target_audience: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProductDetailResponse(ProductResponse):
    objection_handlers: Optional[Dict[str, str]]
    comparison_points: Optional[Dict[str, str]]
    faqs: Optional[List[Dict[str, str]]]


class ProductSearchQuery(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 5


class ProductSearchResult(BaseModel):
    id: str
    name: str
    content: str
    relevance_score: float


# Endpoints
@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new product"""
    product = Product(
        created_by_id=current_user.id,
        name=product_data.name,
        sku=product_data.sku,
        category=product_data.category,
        description=product_data.description,
        price=product_data.price,
        currency=product_data.currency,
        pricing_model=product_data.pricing_model,
        key_features=product_data.key_features or [],
        benefits=product_data.benefits or [],
        target_audience=product_data.target_audience,
        objection_handlers=product_data.objection_handlers or {},
        comparison_points=product_data.comparison_points or {},
        faqs=product_data.faqs or []
    )
    
    db.add(product)
    await db.commit()
    await db.refresh(product)
    
    # Add to vector store for semantic search
    vector_store = VectorStore()
    await vector_store.add_product(
        product_id=str(product.id),
        name=product.name,
        description=product.description or "",
        features=product.key_features or [],
        benefits=product.benefits or [],
        faqs=product.faqs or [],
        metadata={
            "category": product.category,
            "price": product.price,
            "currency": product.currency
        }
    )
    
    # Add objection handlers to vector store
    if product.objection_handlers:
        for objection, response in product.objection_handlers.items():
            await vector_store.add_objection_handler(
                objection_id=f"{product.id}_{objection[:20]}",
                objection=objection,
                response=response,
                category=product.category or "general",
                product_id=str(product.id)
            )
    
    return ProductResponse(
        id=str(product.id),
        name=product.name,
        sku=product.sku,
        category=product.category,
        description=product.description,
        price=product.price,
        currency=product.currency,
        pricing_model=product.pricing_model,
        key_features=product.key_features,
        benefits=product.benefits,
        target_audience=product.target_audience,
        is_active=product.is_active,
        created_at=product.created_at
    )


@router.get("", response_model=List[ProductResponse])
async def list_products(
    category: Optional[str] = None,
    is_active: bool = True,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List products"""
    query = select(Product).where(Product.is_active == is_active)
    
    if category:
        query = query.where(Product.category == category)
    
    query = query.order_by(Product.name).limit(limit).offset(offset)
    
    result = await db.execute(query)
    products = result.scalars().all()
    
    return [
        ProductResponse(
            id=str(p.id),
            name=p.name,
            sku=p.sku,
            category=p.category,
            description=p.description,
            price=p.price,
            currency=p.currency,
            pricing_model=p.pricing_model,
            key_features=p.key_features,
            benefits=p.benefits,
            target_audience=p.target_audience,
            is_active=p.is_active,
            created_at=p.created_at
        )
        for p in products
    ]


@router.get("/{product_id}", response_model=ProductDetailResponse)
async def get_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get product details"""
    result = await db.execute(
        select(Product).where(Product.id == uuid.UUID(product_id))
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return ProductDetailResponse(
        id=str(product.id),
        name=product.name,
        sku=product.sku,
        category=product.category,
        description=product.description,
        price=product.price,
        currency=product.currency,
        pricing_model=product.pricing_model,
        key_features=product.key_features,
        benefits=product.benefits,
        target_audience=product.target_audience,
        is_active=product.is_active,
        created_at=product.created_at,
        objection_handlers=product.objection_handlers,
        comparison_points=product.comparison_points,
        faqs=product.faqs
    )


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update product"""
    result = await db.execute(
        select(Product).where(Product.id == uuid.UUID(product_id))
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)
    
    await db.commit()
    await db.refresh(product)
    
    # Update vector store
    vector_store = VectorStore()
    await vector_store.add_product(
        product_id=str(product.id),
        name=product.name,
        description=product.description or "",
        features=product.key_features or [],
        benefits=product.benefits or [],
        faqs=product.faqs or [],
        metadata={
            "category": product.category,
            "price": product.price,
            "currency": product.currency
        }
    )
    
    return ProductResponse(
        id=str(product.id),
        name=product.name,
        sku=product.sku,
        category=product.category,
        description=product.description,
        price=product.price,
        currency=product.currency,
        pricing_model=product.pricing_model,
        key_features=product.key_features,
        benefits=product.benefits,
        target_audience=product.target_audience,
        is_active=product.is_active,
        created_at=product.created_at
    )


@router.post("/search", response_model=List[ProductSearchResult])
async def search_products(
    search_query: ProductSearchQuery,
    current_user: User = Depends(get_current_user)
):
    """Search products using semantic search"""
    vector_store = VectorStore()
    
    filter_metadata = {"category": search_query.category} if search_query.category else None
    
    results = await vector_store.search_products(
        query=search_query.query,
        n_results=search_query.limit,
        filter_metadata=filter_metadata
    )
    
    return [
        ProductSearchResult(
            id=r["id"],
            name=r["metadata"].get("name", "Unknown"),
            content=r["content"][:500],
            relevance_score=1 - (r.get("distance") or 0)
        )
        for r in results
    ]


@router.post("/import")
async def import_products(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Import products from JSON file"""
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are supported")
    
    content = await file.read()
    
    try:
        products_data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    
    if not isinstance(products_data, list):
        products_data = [products_data]
    
    imported_count = 0
    vector_store = VectorStore()
    
    for p_data in products_data:
        product = Product(
            created_by_id=current_user.id,
            name=p_data.get("name", "Unknown Product"),
            sku=p_data.get("sku"),
            category=p_data.get("category"),
            description=p_data.get("description"),
            price=p_data.get("price"),
            currency=p_data.get("currency", "USD"),
            pricing_model=p_data.get("pricing_model"),
            key_features=p_data.get("key_features", []),
            benefits=p_data.get("benefits", []),
            target_audience=p_data.get("target_audience"),
            objection_handlers=p_data.get("objection_handlers", {}),
            comparison_points=p_data.get("comparison_points", {}),
            faqs=p_data.get("faqs", [])
        )
        
        db.add(product)
        await db.flush()
        
        # Add to vector store
        await vector_store.add_product(
            product_id=str(product.id),
            name=product.name,
            description=product.description or "",
            features=product.key_features or [],
            benefits=product.benefits or [],
            faqs=product.faqs or [],
            metadata={
                "category": product.category,
                "price": product.price
            }
        )
        
        imported_count += 1
    
    await db.commit()
    
    return {
        "status": "success",
        "imported_count": imported_count
    }


@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a product"""
    result = await db.execute(
        select(Product).where(Product.id == uuid.UUID(product_id))
    )
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await db.delete(product)
    await db.commit()
    
    return {"status": "deleted"}
