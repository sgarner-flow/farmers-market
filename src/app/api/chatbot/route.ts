import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }
    
    // Get the chatbot API URL from environment variable
    const apiUrl = process.env.NEXT_PUBLIC_CHATBOT_API_URL || 'http://localhost:5001';
    
    // Forward the request to the Flask API
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: query }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Chatbot API error:', errorData);
      return NextResponse.json(
        { error: 'Error from chatbot service' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    return NextResponse.json({ response: data.response });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
} 