import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface SuggestionRequest {
  transcript: string;
  prospect_name?: string;
  company_name?: string;
  suggestion_type?: 'discovery' | 'product' | 'closing' | 'general';
  context?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestionRequest = await request.json();
    const { transcript, prospect_name, company_name, suggestion_type, context } = body;

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    // Build the system prompt based on suggestion type
    let systemPrompt = `You are an expert sales coach providing real-time guidance during a sales call. 
Your suggestions should be:
- Concise (2-3 sentences max)
- Actionable and specific
- Natural sounding (not robotic)
- Focused on building rapport and advancing the sale

`;

    if (suggestion_type === 'discovery') {
      systemPrompt += `Focus on discovery questions that uncover pain points, needs, and decision-making processes.`;
    } else if (suggestion_type === 'product') {
      systemPrompt += `Focus on matching products/solutions to the prospect's stated needs.`;
    } else if (suggestion_type === 'closing') {
      systemPrompt += `Focus on trial closes, handling objections, and moving toward commitment.`;
    } else {
      systemPrompt += `Provide the most relevant coaching based on the conversation flow.`;
    }

    const userPrompt = `
${prospect_name ? `Prospect: ${prospect_name}` : ''}
${company_name ? `Company: ${company_name}` : ''}
${context ? `Context: ${context}` : ''}

Current conversation transcript:
"${transcript}"

Provide a helpful sales coaching suggestion for what the salesperson should say or do next.`;

    // Check if OpenAI API key is available
    if (!OPENAI_API_KEY) {
      // Return a demo response
      const demoSuggestions: Record<string, string> = {
        discovery: `Ask: "What's the biggest challenge you're facing with your current solution?" This helps uncover pain points.`,
        product: `Based on their needs, highlight how your solution specifically addresses their main concern. Focus on value, not features.`,
        closing: `Try a trial close: "Based on what we've discussed, it sounds like this could really help with [specific problem]. What would be the next step on your end?"`,
        general: `Listen actively and acknowledge their point. Then ask a follow-up question to dig deeper into their specific situation.`
      };
      
      return NextResponse.json({
        suggestion: demoSuggestions[suggestion_type || 'general'],
        type: suggestion_type || 'general',
        demo_mode: true,
        message: 'Demo mode - OpenAI API key not configured'
      });
    }

    // Call OpenAI API
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Use cost-effective model for suggestions
        messages,
        max_tokens: 150,
        temperature: 0.7
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      
      // Return fallback on API error
      return NextResponse.json({
        suggestion: `Focus on understanding their needs better. Ask about their current challenges and what success looks like for them.`,
        type: suggestion_type || 'general',
        fallback: true,
        error: 'OpenAI API unavailable'
      });
    }

    const data = await openaiResponse.json();
    const suggestion = data.choices?.[0]?.message?.content || 'Continue building rapport and asking open-ended questions.';

    return NextResponse.json({
      suggestion,
      type: suggestion_type || 'general',
      model: 'gpt-4o-mini'
    });

  } catch (error) {
    console.error('AI Suggestion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate suggestion',
        suggestion: 'Take a moment to listen and acknowledge their concerns before responding.',
        fallback: true
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'AI Suggestion API',
    openai_configured: !!OPENAI_API_KEY
  });
}
