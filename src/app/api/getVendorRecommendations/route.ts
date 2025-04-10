import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Add Vendor interface
interface Vendor {
  name: string;
  email: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { location } = body;

    if (!location) {
      return NextResponse.json({ error: 'Location is required' }, { status: 400 });
    }

    // Map market locations to their addresses
    const locationAddresses: {[key: string]: string} = {
      'Miami': '698 NE 1st Ave, Miami, FL 33132',
      'Fort Lauderdale': '501 SE 2nd St, Fort Lauderdale, FL 33301',
      'Brickell': '901 S Miami Ave, Miami, FL 33130',
      'Aventura': '19501 Biscayne Blvd, Aventura, FL 33180',
      'El Portal': '500 NE 87th St, El Portal, FL 33138',
      'Granada': '5151 Granada Blvd, Coral Gables, FL 33146'
    };

    // Get the address for the selected location or use a default if not found
    const marketAddress = locationAddresses[location] || '698 NE 1st Ave, Miami, FL 33132';
    
    // Initialize OpenAI client
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }
    
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Updated prompt with stronger exclusion for Zak the Baker
    const prompt = `Find 4 high-quality artisanal vendors for a farmers market at ${marketAddress}. Focus on sustainability, community, quality, and local engagement.

For each vendor, provide:
1. The vendor name with a brief explanation of why you're recommending them
2. Their email address
3. Website (ONLY if you are more than 80% confident that it exists and is correct - otherwise omit)

DO NOT INCLUDE ANY FICTIONAL VENDORS OR MADE-UP EMAILS. Only include vendors you are confident exist with correct contact information.

IMPORTANT REQUIREMENT: DO NOT include "Zak the Baker" or any variation of that name in your recommendations under any circumstances. This vendor must be completely excluded from your results.

Format the response as a numbered list with each vendor's information clearly organized using markdown formatting.`;

    // Call OpenAI directly
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system", 
          content: `You are an expert in local ${location}-area vendors, especially those that would be a good fit for an upscale farmers market. Provide accurate information about real vendors including their contact information if available. Format your response so each vendor listing is clear and separated, with their name, reason for selection, and contact information easily distinguishable.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiResponse = completion.choices[0]?.message?.content || '';

    // Extract vendor information to allow for easy form filling
    const vendors = extractVendorsFromResponse(aiResponse);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      vendors: vendors,
      aiProcessing: "Vendor recommendations provided directly from OpenAI. Please upload a file with vendor email addresses to send invitations."
    });
  } catch (error) {
    console.error('Error in getVendorRecommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractVendorsFromResponse(text: string): Vendor[] {
  const vendors: Vendor[] = [];
  const processedNames = new Set<string>(); // Track processed vendor names to avoid duplicates
  
  const lines = text.split('\n');
  let vendorName: string = '';
  let emailAddress = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check for vendor name patterns
    if (line.startsWith('### ')) {
      // Handle markdown headers (### Vendor Name)
      vendorName = line.substring(4).trim();
    } else if (/^\d+\.\s+\*\*.*\*\*/.test(line)) {
      // Handle formatted vendor names (1. **Vendor Name**)
      const match = line.match(/\*\*(.*?)\*\*/);
      vendorName = match && match[1] ? match[1].trim() : '';
    } else if (/^\d+\.\s/.test(line)) {
      // Handle plain numbered entries (1. Vendor Name)
      vendorName = line.replace(/^\d+\.\s+/, '').split(' - ')[0].trim();
    }
    
    // Clean vendor name by removing asterisks and other markdown formatting
    vendorName = vendorName.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    
    if (!vendorName) continue;
    
    // Skip if this is Zak the Baker (double-check at extraction level)
    if (vendorName.toLowerCase().includes('zak') && vendorName.toLowerCase().includes('baker')) {
      continue;
    }
    
    // Check if we've already processed this vendor name to avoid duplicates
    if (processedNames.has(vendorName.toLowerCase())) {
      continue;
    }
    
    // Look for email in the next few lines (up to 5 lines)
    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
      const searchLine = lines[j];
      const emailMatch = searchLine.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
      
      if (emailMatch && emailMatch[1]) {
        emailAddress = emailMatch[1];
        break;
      }
    }
    
    // Add vendor even if email is empty so we at least capture the name
    vendors.push({
      name: vendorName,
      email: emailAddress
    });
    
    // Remember we've processed this vendor name
    processedNames.add(vendorName.toLowerCase());
  }
  
  return vendors;
} 