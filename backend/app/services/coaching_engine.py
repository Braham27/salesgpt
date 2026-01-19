"""
AI Coaching Engine
Real-time suggestions, objection handling, and conversation guidance
"""

import asyncio
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
from openai import AsyncOpenAI
import json

from app.core.config import get_settings
from app.services.vector_store import VectorStore
from app.services.speech_service import Speaker, TranscriptSegment

logger = logging.getLogger(__name__)
settings = get_settings()


class SuggestionType(str, Enum):
    RESPONSE = "response"
    QUESTION = "question"
    OBJECTION_HANDLER = "objection_handler"
    PRODUCT_PITCH = "product_pitch"
    CLOSING = "closing"
    RAPPORT = "rapport"
    CLARIFICATION = "clarification"
    NEXT_STEP = "next_step"


@dataclass
class CoachingSuggestion:
    """AI-generated coaching suggestion"""
    type: SuggestionType
    content: str
    context: str
    confidence: float
    priority: int = 1  # 1 = highest priority
    alternative: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type.value,
            "content": self.content,
            "context": self.context,
            "confidence": self.confidence,
            "priority": self.priority,
            "alternative": self.alternative
        }


@dataclass
class ConversationContext:
    """Context for the current conversation"""
    prospect_name: Optional[str] = None
    prospect_company: Optional[str] = None
    prospect_pain_points: List[str] = None
    products_discussed: List[str] = None
    objections_raised: List[str] = None
    current_stage: str = "opening"  # opening, discovery, pitch, objection, closing
    sentiment: str = "neutral"
    call_objective: Optional[str] = None
    
    def __post_init__(self):
        self.prospect_pain_points = self.prospect_pain_points or []
        self.products_discussed = self.products_discussed or []
        self.objections_raised = self.objections_raised or []


class AICoachingEngine:
    """Main AI coaching engine for real-time sales assistance"""
    
    SYSTEM_PROMPT = """You are an expert AI sales coach providing real-time guidance during a sales call.
Your role is to help the salesperson succeed by providing:
1. Smart responses to prospect questions
2. Effective objection handling techniques
3. Product recommendations based on prospect needs
4. Questions to ask to uncover needs
5. Closing techniques when appropriate

Guidelines:
- Keep suggestions concise (1-3 sentences max)
- Be natural and conversational
- Focus on building rapport and trust
- Listen for buying signals
- Never be pushy or aggressive
- Respect the prospect's time
- Provide alternatives when appropriate

Current call context will be provided. Generate helpful, actionable suggestions."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.conversation_history: List[Dict[str, str]] = []
        self.context = ConversationContext()
        self.vector_store = VectorStore()
        
    async def initialize_call(
        self,
        prospect_name: Optional[str] = None,
        prospect_company: Optional[str] = None,
        prospect_context: Optional[str] = None,
        call_objective: Optional[str] = None,
        product_focus: Optional[List[str]] = None
    ) -> CoachingSuggestion:
        """Initialize a new call with context and get opening suggestion"""
        self.context = ConversationContext(
            prospect_name=prospect_name,
            prospect_company=prospect_company,
            call_objective=call_objective
        )
        
        self.conversation_history = []
        
        # Generate opening suggestion
        opening_prompt = f"""
        New sales call starting.
        
        Prospect: {prospect_name or 'Unknown'}
        Company: {prospect_company or 'Unknown'}
        Additional Context: {prospect_context or 'None provided'}
        Call Objective: {call_objective or 'Introduce products and qualify prospect'}
        Products to Focus On: {', '.join(product_focus) if product_focus else 'Any relevant products'}
        
        Generate a warm, professional opening statement for the salesperson to use.
        The opening should:
        1. Be personalized if prospect info is available
        2. Briefly state the purpose
        3. Ask permission to continue
        """
        
        response = await self._generate_suggestion(
            opening_prompt,
            SuggestionType.RAPPORT
        )
        
        return response
    
    async def process_transcript(
        self,
        segment: TranscriptSegment,
        full_transcript: str
    ) -> Optional[CoachingSuggestion]:
        """Process a transcript segment and generate suggestion if needed"""
        
        # Add to conversation history
        self.conversation_history.append({
            "role": "prospect" if segment.speaker == Speaker.PROSPECT else "salesperson",
            "content": segment.text
        })
        
        # Only generate suggestions when prospect finishes speaking
        if segment.speaker != Speaker.PROSPECT or not segment.is_final:
            return None
        
        # Analyze the prospect's statement
        analysis = await self._analyze_statement(segment.text)
        
        # Update context based on analysis
        self._update_context(analysis)
        
        # Generate appropriate suggestion based on analysis
        suggestion = await self._generate_contextual_suggestion(
            segment.text,
            analysis,
            full_transcript
        )
        
        return suggestion
    
    async def get_product_recommendation(
        self,
        needs: str,
        pain_points: List[str]
    ) -> CoachingSuggestion:
        """Get product recommendation based on prospect needs"""
        
        # Search for matching products
        products = await self.vector_store.find_matching_product(
            prospect_needs=needs,
            pain_points=pain_points
        )
        
        if not products:
            return CoachingSuggestion(
                type=SuggestionType.QUESTION,
                content="Ask more questions to better understand their specific needs.",
                context="No matching products found",
                confidence=0.5
            )
        
        # Generate pitch suggestion
        prompt = f"""
        Based on the prospect's needs and our matching products, generate a product recommendation.
        
        Prospect Needs: {needs}
        Pain Points: {', '.join(pain_points)}
        
        Best Matching Products:
        {json.dumps([p['content'][:500] for p in products[:2]], indent=2)}
        
        Generate a brief, compelling pitch that:
        1. Acknowledges their specific needs
        2. Introduces the most relevant product
        3. Highlights 2-3 key benefits that address their pain points
        """
        
        return await self._generate_suggestion(prompt, SuggestionType.PRODUCT_PITCH)
    
    async def handle_objection(
        self,
        objection: str,
        product_context: Optional[str] = None
    ) -> CoachingSuggestion:
        """Generate response to handle a specific objection"""
        
        # Search for relevant objection handlers
        handlers = await self.vector_store.search_objection_handlers(
            objection_text=objection
        )
        
        prompt = f"""
        The prospect raised an objection. Generate an effective response.
        
        Objection: "{objection}"
        Product Context: {product_context or 'General sales conversation'}
        
        Similar objections and proven responses:
        {json.dumps([h['content'][:300] for h in handlers[:2]], indent=2) if handlers else 'No specific handlers found'}
        
        Generate a response that:
        1. Acknowledges their concern (don't dismiss it)
        2. Reframes the objection positively
        3. Provides specific value or evidence
        4. Ends with a question or next step
        
        Keep it natural and conversational.
        """
        
        return await self._generate_suggestion(prompt, SuggestionType.OBJECTION_HANDLER)
    
    async def get_closing_suggestion(
        self,
        conversation_summary: str
    ) -> CoachingSuggestion:
        """Generate a closing suggestion based on conversation"""
        
        prompt = f"""
        The conversation is at a point where closing might be appropriate.
        
        Conversation Summary:
        {conversation_summary}
        
        Products Discussed: {', '.join(self.context.products_discussed) or 'None specifically'}
        Objections Handled: {', '.join(self.context.objections_raised) or 'None'}
        
        Generate a natural closing attempt that:
        1. Summarizes key benefits discussed
        2. Addresses any lingering concerns
        3. Proposes a clear next step
        4. Includes a soft close option
        """
        
        return await self._generate_suggestion(prompt, SuggestionType.CLOSING)
    
    async def get_discovery_questions(
        self,
        current_knowledge: str
    ) -> List[CoachingSuggestion]:
        """Generate discovery questions to uncover needs"""
        
        prompt = f"""
        Generate 3 discovery questions to better understand the prospect's needs.
        
        What we know so far:
        {current_knowledge}
        
        Generate questions that:
        1. Are open-ended (not yes/no)
        2. Uncover pain points
        3. Help qualify the prospect
        4. Build rapport
        
        Return as a JSON array with format:
        [
            {{"question": "...", "purpose": "...", "priority": 1}},
            ...
        ]
        """
        
        response = await self.client.chat.completions.create(
            model="gpt-5.2",
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )
        
        try:
            questions = json.loads(response.choices[0].message.content)
            suggestions = []
            
            for i, q in enumerate(questions.get("questions", [])[:3]):
                suggestions.append(CoachingSuggestion(
                    type=SuggestionType.QUESTION,
                    content=q.get("question", ""),
                    context=q.get("purpose", "Discovery"),
                    confidence=0.8,
                    priority=q.get("priority", i + 1)
                ))
            
            return suggestions
            
        except json.JSONDecodeError:
            return [CoachingSuggestion(
                type=SuggestionType.QUESTION,
                content="What challenges are you currently facing in this area?",
                context="General discovery",
                confidence=0.6,
                priority=1
            )]
    
    async def _analyze_statement(self, text: str) -> Dict[str, Any]:
        """Analyze a prospect's statement"""
        
        prompt = f"""
        Analyze this prospect statement and return a JSON object:
        
        Statement: "{text}"
        
        Return:
        {{
            "intent": "question" | "objection" | "statement" | "interest" | "rejection",
            "sentiment": "positive" | "neutral" | "negative",
            "topics": ["topic1", "topic2"],
            "is_buying_signal": true | false,
            "urgency": "low" | "medium" | "high",
            "needs_response": true | false,
            "suggested_stage": "discovery" | "pitch" | "objection" | "closing"
        }}
        """
        
        response = await self.client.chat.completions.create(
            model="gpt-5.2",
            messages=[
                {"role": "system", "content": "You are a sales conversation analyzer. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return {
                "intent": "statement",
                "sentiment": "neutral",
                "topics": [],
                "is_buying_signal": False,
                "urgency": "medium",
                "needs_response": True,
                "suggested_stage": "discovery"
            }
    
    def _update_context(self, analysis: Dict[str, Any]):
        """Update conversation context based on analysis"""
        self.context.sentiment = analysis.get("sentiment", "neutral")
        self.context.current_stage = analysis.get("suggested_stage", self.context.current_stage)
        
        if analysis.get("intent") == "objection":
            objection_topics = analysis.get("topics", [])
            self.context.objections_raised.extend(objection_topics)
    
    async def _generate_contextual_suggestion(
        self,
        prospect_text: str,
        analysis: Dict[str, Any],
        full_transcript: str
    ) -> CoachingSuggestion:
        """Generate a contextual suggestion based on analysis"""
        
        intent = analysis.get("intent", "statement")
        
        # Route to appropriate handler
        if intent == "objection":
            return await self.handle_objection(prospect_text)
        elif intent == "question":
            return await self._answer_question(prospect_text, full_transcript)
        elif intent == "interest" or analysis.get("is_buying_signal"):
            return await self._capitalize_on_interest(prospect_text, full_transcript)
        elif intent == "rejection":
            return await self._handle_rejection(prospect_text)
        else:
            return await self._generate_continuation(prospect_text, full_transcript)
    
    async def _answer_question(
        self,
        question: str,
        full_transcript: str
    ) -> CoachingSuggestion:
        """Generate an answer to prospect's question"""
        
        # Search product knowledge for relevant info
        products = await self.vector_store.search_products(question)
        
        prompt = f"""
        The prospect asked a question. Generate a helpful answer.
        
        Question: "{question}"
        
        Conversation so far:
        {full_transcript[-2000:]}
        
        Relevant product information:
        {json.dumps([p['content'][:400] for p in products[:2]], indent=2) if products else 'No specific product info found'}
        
        Generate a clear, confident answer that:
        1. Directly addresses their question
        2. Uses specific details when available
        3. Ties back to value/benefits
        4. Optionally asks a follow-up question
        """
        
        return await self._generate_suggestion(prompt, SuggestionType.RESPONSE)
    
    async def _capitalize_on_interest(
        self,
        text: str,
        full_transcript: str
    ) -> CoachingSuggestion:
        """Capitalize on buying signals"""
        
        prompt = f"""
        The prospect showed interest. Generate a response to advance the sale.
        
        What they said: "{text}"
        
        Recent conversation:
        {full_transcript[-1500:]}
        
        Generate a response that:
        1. Acknowledges their interest positively
        2. Reinforces the value
        3. Moves toward next steps or closing
        """
        
        if self.context.current_stage == "closing":
            return await self.get_closing_suggestion(full_transcript[-2000:])
        
        return await self._generate_suggestion(prompt, SuggestionType.NEXT_STEP)
    
    async def _handle_rejection(self, text: str) -> CoachingSuggestion:
        """Handle rejection gracefully"""
        
        prompt = f"""
        The prospect seems to be declining or rejecting. Generate a graceful response.
        
        What they said: "{text}"
        
        Generate a response that:
        1. Respects their decision
        2. Leaves the door open for future
        3. Asks for feedback if appropriate
        4. Maintains professionalism
        """
        
        return await self._generate_suggestion(prompt, SuggestionType.RESPONSE)
    
    async def _generate_continuation(
        self,
        text: str,
        full_transcript: str
    ) -> CoachingSuggestion:
        """Generate a general continuation suggestion"""
        
        prompt = f"""
        Continue the sales conversation naturally.
        
        Prospect said: "{text}"
        
        Recent conversation:
        {full_transcript[-1500:]}
        
        Current stage: {self.context.current_stage}
        
        Generate an appropriate response or question to:
        1. Keep the conversation flowing
        2. Build rapport
        3. Advance toward the call objective
        """
        
        suggestion_type = SuggestionType.QUESTION if self.context.current_stage == "discovery" else SuggestionType.RESPONSE
        
        return await self._generate_suggestion(prompt, suggestion_type)
    
    async def _generate_suggestion(
        self,
        prompt: str,
        suggestion_type: SuggestionType
    ) -> CoachingSuggestion:
        """Generate a suggestion using GPT-5.2"""
        
        try:
            response = await self.client.chat.completions.create(
                model="gpt-5.2",
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_completion_tokens=300
            )
            
            content = response.choices[0].message.content.strip()
            
            return CoachingSuggestion(
                type=suggestion_type,
                content=content,
                context=prompt[:200],
                confidence=0.85
            )
            
        except Exception as e:
            logger.error(f"Error generating suggestion: {e}")
            return CoachingSuggestion(
                type=SuggestionType.RESPONSE,
                content="Continue listening and ask clarifying questions.",
                context="Error in generation",
                confidence=0.3
            )
    
    async def generate_call_summary(
        self,
        full_transcript: str,
        call_duration: int
    ) -> Dict[str, Any]:
        """Generate a comprehensive call summary"""
        
        prompt = f"""
        Generate a comprehensive summary of this sales call.
        
        Call Duration: {call_duration} seconds
        
        Full Transcript:
        {full_transcript}
        
        Return a JSON object with:
        {{
            "executive_summary": "2-3 sentence overview",
            "key_points": ["point1", "point2", ...],
            "action_items": ["action1", "action2", ...],
            "prospect_interests": ["interest1", "interest2", ...],
            "objections_raised": ["objection1", "objection2", ...],
            "products_discussed": ["product1", "product2", ...],
            "overall_sentiment": "positive" | "neutral" | "negative",
            "recommended_follow_up": "description of recommended next steps",
            "deal_probability": 0-100,
            "suggested_email_subject": "subject line for follow-up"
        }}
        """
        
        response = await self.client.chat.completions.create(
            model="gpt-5.2",
            messages=[
                {"role": "system", "content": "You are a sales call analyst. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )
        
        try:
            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError:
            return {
                "executive_summary": "Call summary unavailable",
                "key_points": [],
                "action_items": [],
                "prospect_interests": [],
                "objections_raised": [],
                "products_discussed": [],
                "overall_sentiment": "neutral",
                "recommended_follow_up": "Review call recording",
                "deal_probability": 50,
                "suggested_email_subject": "Following up on our conversation"
            }
    
    async def generate_follow_up_email(
        self,
        summary: Dict[str, Any],
        prospect_name: str,
        salesperson_name: str
    ) -> str:
        """Generate a follow-up email based on call summary"""
        
        prompt = f"""
        Generate a professional follow-up email after a sales call.
        
        Prospect Name: {prospect_name}
        Salesperson Name: {salesperson_name}
        
        Call Summary:
        {json.dumps(summary, indent=2)}
        
        The email should:
        1. Thank them for their time
        2. Recap key points discussed
        3. Address any outstanding questions
        4. Include clear next steps
        5. Be professional but warm
        6. Be concise (under 200 words)
        """
        
        response = await self.client.chat.completions.create(
            model="gpt-5.2",
            messages=[
                {"role": "system", "content": "You are a professional sales email writer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_completion_tokens=500
        )
        
        return response.choices[0].message.content.strip()


class SentimentAnalyzer:
    """Analyze sentiment throughout the call"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.sentiment_history: List[Dict[str, Any]] = []
    
    async def analyze_sentiment(
        self,
        text: str,
        timestamp: float
    ) -> Dict[str, Any]:
        """Analyze sentiment of a text segment"""
        
        prompt = f"""
        Analyze the sentiment of this statement from a sales call prospect.
        
        Statement: "{text}"
        
        Return JSON:
        {{
            "sentiment": "positive" | "neutral" | "negative",
            "score": -1.0 to 1.0,
            "emotions": ["emotion1", "emotion2"],
            "engagement_level": "high" | "medium" | "low"
        }}
        """
        
        response = await self.client.chat.completions.create(
            model="gpt-5.2",
            messages=[
                {"role": "system", "content": "You are a sentiment analyzer. Return only valid JSON."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )
        
        try:
            result = json.loads(response.choices[0].message.content)
            result["timestamp"] = timestamp
            self.sentiment_history.append(result)
            return result
        except json.JSONDecodeError:
            return {
                "sentiment": "neutral",
                "score": 0.0,
                "emotions": [],
                "engagement_level": "medium",
                "timestamp": timestamp
            }
    
    def get_sentiment_timeline(self) -> List[Dict[str, Any]]:
        """Get the sentiment timeline for the call"""
        return self.sentiment_history
    
    def get_average_sentiment(self) -> float:
        """Get average sentiment score"""
        if not self.sentiment_history:
            return 0.0
        return sum(s.get("score", 0) for s in self.sentiment_history) / len(self.sentiment_history)
