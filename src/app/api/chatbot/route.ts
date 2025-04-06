import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    // Path to the Python script
    const scriptPath = path.join(process.cwd(), 'chatbots/chatbots/financial_chatbot.py');
    
    // Escape the query to prevent command injection
    const escapedQuery = query.replace(/"/g, '\\"');
    
    // Run the Python script with the query as input
    // We need to create a temporary script that will import the financial_chatbot module
    // and call get_chat_response with our query
    const tempScriptPath = path.join(process.cwd(), 'chatbots/temp_query.py');
    
    // Create the temporary script content
    const scriptContent = `
import sys
sys.path.append('${path.join(process.cwd(), 'chatbots')}')
from chatbots.financial_chatbot import get_chat_response

# Get the query from command line arguments
query = """${escapedQuery}"""

# Call the chatbot function and print the response
response = get_chat_response(query)
print(response)
    `;
    
    // Write the temp script to a file
    const fs = require('fs');
    fs.writeFileSync(tempScriptPath, scriptContent);
    
    // Execute the temporary Python script
    const { stdout, stderr } = await execAsync(`python ${tempScriptPath}`);
    
    // Clean up the temporary script
    fs.unlinkSync(tempScriptPath);
    
    if (stderr) {
      console.error('Error from Python script:', stderr);
      return NextResponse.json(
        { error: 'Error processing query' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ response: stdout.trim() });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 