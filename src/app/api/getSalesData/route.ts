import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Path to the sales.csv file
    const filePath = path.join(process.cwd(), 'src', 'sales.csv');
    
    // Read the file
    const fileContents = await fs.readFile(filePath, 'utf8');
    
    // Return the contents as plain text with appropriate headers
    return new Response(fileContents, {
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error reading sales data:', error);
    return NextResponse.json(
      { error: 'Failed to read sales data' },
      { status: 500 }
    );
  }
} 