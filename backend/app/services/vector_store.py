"""
Vector Store for Product Knowledge Base
Uses ChromaDB for semantic search
"""

try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False
    chromadb = None
    
import logging
from typing import List, Dict, Any, Optional
import os

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Global client instance
chroma_client = None
product_collection = None
objection_collection = None


async def init_vector_store():
    """Initialize ChromaDB collections - optional, graceful failure"""
    global chroma_client, product_collection, objection_collection
    
    if not CHROMADB_AVAILABLE:
        logger.warning("ChromaDB not available, vector search disabled")
        return
    
    if not settings.openai_api_key:
        logger.warning("OpenAI API key not set, vector search disabled")
        return
    
    try:
        # Use in-memory client for simpler deployment
        chroma_client = chromadb.Client()
        
        # OpenAI embeddings function
        openai_ef = embedding_functions.OpenAIEmbeddingFunction(
            api_key=settings.openai_api_key,
            model_name="text-embedding-3-small"
        )
        
        # Product knowledge collection
        product_collection = chroma_client.get_or_create_collection(
            name="products",
            embedding_function=openai_ef,
            metadata={"description": "Product catalog with features, benefits, and FAQs"}
        )
        
        # Objection handling collection
        objection_collection = chroma_client.get_or_create_collection(
            name="objections",
            embedding_function=openai_ef,
            metadata={"description": "Common objections and proven responses"}
        )
        
        logger.info("Vector store initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize vector store: {e}")
        logger.warning("Vector search will be disabled")


class VectorStore:
    """Vector store operations for product and objection handling"""
    
    @staticmethod
    async def add_product(
        product_id: str,
        name: str,
        description: str,
        features: List[str],
        benefits: List[str],
        faqs: List[Dict[str, str]],
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Add a product to the vector store"""
        global product_collection
        
        if product_collection is None:
            logger.warning("Vector store not initialized, skipping add_product")
            return
        
        # Create comprehensive document for embedding
        doc_content = f"""
        Product: {name}
        
        Description: {description}
        
        Key Features:
        {chr(10).join(f'- {f}' for f in features)}
        
        Benefits:
        {chr(10).join(f'- {b}' for b in benefits)}
        
        FAQs:
        {chr(10).join(f'Q: {faq.get("question", "")} A: {faq.get("answer", "")}' for faq in faqs)}
        """
        
        meta = {
            "product_id": product_id,
            "name": name,
            "type": "product"
        }
        if metadata:
            meta.update(metadata)
        
        product_collection.upsert(
            ids=[product_id],
            documents=[doc_content],
            metadatas=[meta]
        )
        
        logger.info(f"Added product to vector store: {name}")
    
    @staticmethod
    async def add_objection_handler(
        objection_id: str,
        objection: str,
        response: str,
        category: str,
        product_id: Optional[str] = None
    ) -> None:
        """Add an objection handler to the vector store"""
        global objection_collection
        
        if objection_collection is None:
            logger.warning("Vector store not initialized, skipping add_objection_handler")
            return
        
        doc_content = f"""
        Objection: {objection}
        
        Recommended Response: {response}
        
        Category: {category}
        """
        
        metadata = {
            "objection_id": objection_id,
            "category": category,
            "type": "objection"
        }
        if product_id:
            metadata["product_id"] = product_id
        
        objection_collection.upsert(
            ids=[objection_id],
            documents=[doc_content],
            metadatas=[metadata]
        )
    
    @staticmethod
    async def search_products(
        query: str,
        n_results: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Search products by semantic similarity"""
        global product_collection
        
        if product_collection is None:
            logger.warning("Vector store not initialized, returning empty results")
            return []
        
        results = product_collection.query(
            query_texts=[query],
            n_results=n_results,
            where=filter_metadata
        )
        
        products = []
        for i in range(len(results['ids'][0])):
            products.append({
                "id": results['ids'][0][i],
                "content": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "distance": results['distances'][0][i] if 'distances' in results else None
            })
        
        return products
    
    @staticmethod
    async def search_objection_handlers(
        objection_text: str,
        n_results: int = 3,
        category: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for relevant objection handlers"""
        global objection_collection
        
        if objection_collection is None:
            logger.warning("Vector store not initialized, returning empty results")
            return []
        
        filter_metadata = {"category": category} if category else None
        
        results = objection_collection.query(
            query_texts=[objection_text],
            n_results=n_results,
            where=filter_metadata
        )
        
        handlers = []
        for i in range(len(results['ids'][0])):
            handlers.append({
                "id": results['ids'][0][i],
                "content": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "distance": results['distances'][0][i] if 'distances' in results else None
            })
        
        return handlers
    
    @staticmethod
    async def find_matching_product(
        prospect_needs: str,
        pain_points: List[str],
        budget_range: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Find best matching products based on prospect needs"""
        global product_collection
        
        # Construct search query from needs and pain points
        query = f"""
        Customer needs: {prospect_needs}
        Pain points: {', '.join(pain_points)}
        {f'Budget: {budget_range}' if budget_range else ''}
        """
        
        results = product_collection.query(
            query_texts=[query],
            n_results=3
        )
        
        products = []
        for i in range(len(results['ids'][0])):
            products.append({
                "id": results['ids'][0][i],
                "content": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "relevance_score": 1 - (results['distances'][0][i] if 'distances' in results else 0)
            })
        
        return products
