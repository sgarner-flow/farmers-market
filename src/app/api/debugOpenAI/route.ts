import { NextResponse } from 'next/server';
import OpenAI from 'openai';

interface OpenAITestResult {
  status: 'pending' | 'success' | 'error' | 'skipped';
  error: any | null;
  response: any | null;
}

export async function GET() {
  // Collect diagnostic information
  const diagnostics = {
    environmentInfo: {
      nodeEnv: process.env.NODE_ENV,
      hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
      openAIKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      // Include a masked version of the key for verification (first 4 chars)
      openAIKeyPrefix: process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 4)}...` : 'not-set',
    },
    openaiTest: {
      status: 'pending',
      error: null,
      response: null
    } as OpenAITestResult
  };

  // Test OpenAI connection if key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      console.log('Testing OpenAI connection...');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Say 'OpenAI is working!'" }],
        max_tokens: 10
      });

      diagnostics.openaiTest.status = 'success';
      diagnostics.openaiTest.response = {
        model: completion.model,
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage
      };
    } catch (error: any) {
      console.error('OpenAI diagnostic error:', error);
      diagnostics.openaiTest.status = 'error';
      diagnostics.openaiTest.error = {
        message: error.message,
        type: error.type,
        code: error.code,
        param: error.param,
        statusCode: error.status
      };
    }
  } else {
    diagnostics.openaiTest.status = 'skipped';
    diagnostics.openaiTest.error = 'No API key provided';
  }

  return NextResponse.json(diagnostics);
} 