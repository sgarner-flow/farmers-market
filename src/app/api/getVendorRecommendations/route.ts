import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { location } = body;

    if (!location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    // Call the actual chatbot API for vendor recommendations
    const chatbotUrl = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:5001';
    const response = await fetch(`${chatbotUrl}/api/vendor-recommendations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ location }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Chatbot API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to get recommendations from chatbot' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      response: data.response || data.message || '',
      aiProcessing: "Vendor recommendations provided by the market's AI chatbot. Please upload a file with vendor email addresses to send invitations."
    });
  } catch (error) {
    console.error('Error in getVendorRecommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 