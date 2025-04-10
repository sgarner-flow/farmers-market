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
      maxRetries: 2, // Limit retries to avoid hanging too long
      timeout: 55000, // 55 second timeout in ms
    });

    // Updated prompt with stronger exclusion for Zak the Baker and better formatting guidelines
    const prompt = `Find 4 high-quality artisanal vendors for a farmers market at ${marketAddress}. Focus on sustainability, community, quality, and local engagement.

For each vendor, provide:
1. The vendor name with a brief explanation of why you're recommending them.
2. Their website as a proper markdown link like [Vendor Name](https://website.com).
3. Email address ONLY if you are more than 80% confident it is correct. Prioritize official sources such as:
   - The vendor's contact page on their official website.
   - Email addresses listed on their official social media profiles.
   - Verified business directories with official listings.

#### Important Guidelines:
- Double-check the vendor's website and social media for contact information, especially on the **Contact**, **About**, or **Support** pages.
- Do NOT include "Zak the Baker" or any variation of that name in your recommendations under any circumstances. This vendor must be completely excluded.
- If an email address cannot be confidently verified as correct, omit it.
- For emails: DO NOT guess or fabricate. Include only those verified from reliable sources.
- For websites: Always present them as clickable markdown links.

Format the response as a numbered list with each vendor's information clearly organized using markdown formatting.

#### Example:
1. **Vendor Name**: A brief description of why they are recommended.
   - **Website**: [Vendor Name](https://website.com)
   - **Email**: example@vendor.com`;

    try {
      // Call OpenAI with optimized parameters
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // Use GPT-4o which is generally faster than turbo-preview
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
        temperature: 0.5, // Lower temperature for faster, more deterministic responses
        max_tokens: 2000,
      });

      const aiResponse = completion.choices[0]?.message?.content || '';

      // Extract vendor information to allow for easy form filling
      const vendors = extractVendorsFromResponse(aiResponse);

      return NextResponse.json({
        success: true,
        response: aiResponse,
        vendors: vendors,
        aiProcessingInfo: "Vendor recommendations provided directly from OpenAI. Only highly confident email addresses are included. For vendors without emails, please upload a file with accurate email addresses to send invitations."
      });
    } catch (error: any) {
      console.error('Error calling OpenAI in getVendorRecommendations:', error);
      
      // Handle different types of OpenAI errors
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'OpenAI rate limit exceeded. Please try again in a few moments.' },
          { status: 429 }
        );
      } else if (error.type === 'timeout') {
        return NextResponse.json(
          { error: 'Request to OpenAI timed out. The service might be experiencing high demand.' },
          { status: 408 }
        );
      } else if (error.type === 'server_error') {
        return NextResponse.json(
          { error: 'OpenAI server error. Please try again later.' },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: 'Error processing vendor recommendations: ' + (error.message || 'Unknown error') },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in getVendorRecommendations:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error.message || 'Unknown error') },
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
  let hasExplicitEmailSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check for vendor name patterns
    if (line.startsWith('### ')) {
      // Handle markdown headers (### Vendor Name)
      vendorName = line.substring(4).trim();
      // Reset email for new vendor
      emailAddress = '';
      hasExplicitEmailSection = false;
    } else if (/^\d+\.\s+\*\*.*\*\*/.test(line)) {
      // Handle formatted vendor names (1. **Vendor Name**)
      const match = line.match(/\*\*(.*?)\*\*/);
      vendorName = match && match[1] ? match[1].trim() : '';
      // Reset email for new vendor
      emailAddress = '';
      hasExplicitEmailSection = false;
    } else if (/^\d+\.\s/.test(line)) {
      // Handle plain numbered entries (1. Vendor Name)
      vendorName = line.replace(/^\d+\.\s+/, '').split(' - ')[0].trim();
      // Reset email for new vendor
      emailAddress = '';
      hasExplicitEmailSection = false;
    }
    
    // Clean vendor name by removing asterisks and other markdown formatting
    vendorName = vendorName.replace(/\*\*/g, '').replace(/\*/g, '').trim();
    
    // Check if this line explicitly mentions email
    if (line.toLowerCase().includes('email') || line.toLowerCase().includes('contact')) {
      hasExplicitEmailSection = true;
    }
    
    // Only extract email if we haven't found one yet for this vendor
    if (vendorName && !emailAddress) {
      const emailMatch = line.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
      if (emailMatch && emailMatch[1]) {
        // Only use the email if it's in a line that mentions email or follows an email section marker
        if (hasExplicitEmailSection || line.toLowerCase().includes('email')) {
          emailAddress = emailMatch[1];
        }
      }
    }
    
    // If we find a clear section break or another vendor, add the current vendor and reset
    if ((vendorName && line.startsWith('---')) || 
        (vendorName && i > 0 && (line.startsWith('#') || /^\d+\./.test(line))) || 
        (i === lines.length - 1)) {
      
      // Check if we've already processed this vendor name to avoid duplicates
      if (!processedNames.has(vendorName.toLowerCase())) {
        // Skip if this is Zak the Baker (double-check at extraction level)
        if (!(vendorName.toLowerCase().includes('zak') && vendorName.toLowerCase().includes('baker'))) {
          // Add vendor even if email is empty so we at least capture the name
          vendors.push({
            name: vendorName,
            email: emailAddress // This will be empty if no valid email was found
          });
          
          // Remember we've processed this vendor name
          processedNames.add(vendorName.toLowerCase());
        }
      }
      
      // Reset for next vendor
      if (line.startsWith('#') || /^\d+\./.test(line)) {
        vendorName = '';
        emailAddress = '';
        hasExplicitEmailSection = false;
      }
    }
  }
  
  // Handle any remaining vendor that wasn't added in the loop
  if (vendorName && !processedNames.has(vendorName.toLowerCase())) {
    // Skip if this is Zak the Baker
    if (!(vendorName.toLowerCase().includes('zak') && vendorName.toLowerCase().includes('baker'))) {
      vendors.push({
        name: vendorName,
        email: emailAddress
      });
    }
  }
  
  return vendors;
} 