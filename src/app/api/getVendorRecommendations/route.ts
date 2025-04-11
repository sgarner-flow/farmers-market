import { NextResponse } from 'next/server';
import { createChatCompletion } from '@/lib/openai';

// Add Vendor interface
interface Vendor {
  name: string;
  email: string;
  description?: string; // Add description field to hold the reason for recommending the vendor
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
    
    // Validate OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Updated prompt with stronger exclusion for Zak the Baker and better formatting guidelines
    const prompt = `Find 4 high-quality artisanal vendors SPECIFICALLY for a farmers market at ${marketAddress} in ${location}, Florida. These must be REAL vendors actually located in or near ${location}, not generic examples.

Focus on vendors who exemplify:
- Strong connection to the ${location} area
- Sustainability and environmentally conscious practices
- High-quality artisanal production methods
- Community engagement and local sourcing

For each REAL ${location} area vendor, provide:
1. The vendor name with a SPECIFIC explanation of why you're recommending them and what makes them unique to ${location}.
2. Their website as a proper markdown link like [Vendor Name](https://website.com).
3. Email address ONLY if you are more than 80% confident it is correct. Prioritize official sources such as:
   - The vendor's contact page on their official website.
   - Email addresses listed on their official social media profiles.
   - Verified business directories with official listings.

#### IMPORTANT EXCLUSION RULE:
- CRITICAL: "Zak the Baker" or any variation of that name MUST NOT BE MENTIONED AT ALL in your response, even to note it's excluded. Do not list this vendor in any form. Simply provide 4 other vendors without any reference to Zak the Baker whatsoever.

#### Additional Guidelines:
- Provide ONLY real, verifiable businesses from the ${location} area - not hypothetical or generic examples
- Be detailed and specific about why each vendor would be a good fit for THIS market in ${location}
- Double-check the vendor's website and social media for contact information
- If an email address cannot be confidently verified as correct, omit it
- For websites: Always present them as clickable markdown links

Format the response as a numbered list with each vendor's information clearly organized using markdown formatting.

#### Example:
1. **Vendor Name**: A brief description of why they are recommended.
   - **Website**: [Vendor Name](https://website.com)
   - **Email**: example@vendor.com`;

    try {
      // Use our enhanced createChatCompletion function with retries and better error handling
      const completion = await createChatCompletion(
        [
          {
            role: "system",
            content: `You are an expert in local food vendors and artisanal producers in the ${location}, Florida area.

Your task is to recommend authentic, high-quality vendors specifically located in or near ${location} that would be perfect for an upscale farmers market. 

Provide only real, verifiable vendors that actually exist in this specific location. Each recommendation must be:
1. A real business that operates in the ${location} area
2. Known for high-quality, artisanal, or sustainably-produced goods
3. Actually located in or near ${location}, not just a generic or national brand

Be specific about why each vendor would be a good fit for the market, mentioning their unique products, sustainable practices, or connection to the local community.

Format your response clearly, with vendor name, description of why they're recommended, website link, and email if confidently known.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        "gpt-3.5-turbo", // Using GPT-3.5-Turbo for faster responses
        {
          temperature: 0.7, // Increased for more variation and location-specific responses
          max_tokens: 2000,
          apiOptions: {
            // These options fine-tune our resilient OpenAI client
            maxRetries: 3,        // Exactly 3 retries
            timeoutMs: 60000,     // Full 60 second timeout
            initialRetryDelay: 1000,
            maxRetryDelay: 15000,
          }
        }
      );

      const aiResponse = completion.choices[0]?.message?.content || '';

      // Extract vendor information to allow for easy form filling
      const vendors = extractVendorsFromResponse(aiResponse);

      // Create appropriate processing info based on whether vendors were found
      let processingInfo = "";
      if (vendors.length === 0 || (vendors.length === 1 && vendors[0].name?.includes("unable to provide"))) {
        processingInfo = `Our AI system was unable to find specific vendors for ${location}. This could be due to limited data about this location. Try a different location or try again later.`;
      } else if (vendors.length < 4) {
        processingInfo = `Found ${vendors.length} local vendors for ${location}. For best results, you can upload a CSV file with additional vendors' email addresses.`;
      } else {
        processingInfo = `Found ${vendors.length} local vendors for ${location}. These recommendations are based on publicly available information about real businesses in this area. Only highly confident email addresses are included.`;
      }

      return NextResponse.json({
        success: true,
        response: aiResponse,
        vendors: vendors,
        aiProcessingInfo: processingInfo
      });
    } catch (error: any) {
      console.error('Error calling OpenAI in getVendorRecommendations:', error);
      
      // Enhanced error handling for different types of errors
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'OpenAI rate limit exceeded. Please try again in a few moments.' },
          { status: 429 }
        );
      } else if (error.name === 'AbortError' || error.type === 'timeout' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return NextResponse.json(
          { error: 'Request to OpenAI timed out even after multiple retries. The service might be experiencing high demand. Please try again in a few minutes.' },
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

  // First, check for any mention of Zak the Baker in the entire text and ignore the entire response if found
  if (text.toLowerCase().includes('zak') && text.toLowerCase().includes('baker')) {
    console.warn('Response contains mention of Zak the Baker despite explicit instructions to exclude it');
    // Skip the entire vendor and add a warning note for the UI
    vendors.push({
      name: 'Warning: Response includes excluded vendor',
      email: 'Please regenerate recommendations'
    });
    return vendors;
  }
  
  // Check if we got a response that's just a generic template without real vendors
  if (text.toLowerCase().includes('i cannot provide specific') || 
      text.toLowerCase().includes('i don\'t have access to') ||
      text.toLowerCase().includes('i cannot access current information')) {
    console.warn('Response indicates inability to provide location-specific vendors');
    vendors.push({
      name: 'Note: AI unable to provide location-specific vendors',
      email: 'Please try a different location or regenerate'
    });
    return vendors;
  }
  
  const lines = text.split('\n');
  let currentVendor: Partial<Vendor> = {};
  let inVendorSection = false;
  let descriptionLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Check for numbered vendor pattern to detect the start of a new vendor
    const vendorNumberPattern = /^\d+\.\s+(?:\*\*)?([^*:]+)(?:\*\*)?:?(.*)$/;
    const vendorTitlePattern = /^\d+\.\s+\*\*([^*:]+)\*\*(.*)$/;
    const vendorSimplePattern = /^\d+\.\s+([^:]+)$/;

    // Check if this is a new vendor section
    if (vendorNumberPattern.test(line) || vendorTitlePattern.test(line) || vendorSimplePattern.test(line)) {
      // Save previous vendor if we were processing one
      if (currentVendor.name && currentVendor.name.trim() !== '') {
        // Final check to ensure this isn't Zak the Baker in any form
        if (!(currentVendor.name.toLowerCase().includes('zak') || 
              currentVendor.name.toLowerCase().includes('baker') || 
              currentVendor.name.toLowerCase().includes('excluded'))) {
          
          // Assign the accumulated description
          if (descriptionLines.length > 0) {
            currentVendor.description = descriptionLines.join(' ').trim().replace(/^:\s*/, '');
          }
          
          // Add vendor with description and reset processed names to avoid duplicates
          if (!processedNames.has(currentVendor.name.toLowerCase())) {
            vendors.push(currentVendor as Vendor);
            processedNames.add(currentVendor.name.toLowerCase());
          }
        }
      }
      
      // Start processing a new vendor
      currentVendor = { email: '' };
      descriptionLines = [];
      inVendorSection = true;
      
      // Extract the vendor name based on which pattern matched
      let vendorName = '';
      let initialDescription = '';
      
      if (vendorTitlePattern.test(line)) {
        // Format: "1. **Vendor Name** rest of description"
        const matches = line.match(vendorTitlePattern);
        if (matches && matches.length > 1) {
          vendorName = matches[1].trim();
          initialDescription = matches[2].trim();
        }
      } else if (vendorNumberPattern.test(line)) {
        // Format: "1. Vendor Name: description"
        const matches = line.match(vendorNumberPattern);
        if (matches && matches.length > 2) {
          vendorName = matches[1].trim();
          initialDescription = matches[2].trim();
        }
      } else if (vendorSimplePattern.test(line)) {
        // Format: "1. Vendor Name"
        const matches = line.match(vendorSimplePattern);
        if (matches && matches.length > 1) {
          vendorName = matches[1].trim();
        }
      }
      
      // Clean vendor name and check exclusions
      vendorName = vendorName.replace(/\*\*/g, '').replace(/:/g, '').trim();
      
      // Skip this vendor if it's Zak the Baker
      if (vendorName.toLowerCase().includes('zak') || 
          vendorName.toLowerCase().includes('baker') || 
          vendorName.toLowerCase().includes('excluded')) {
        inVendorSection = false;
        currentVendor = {};
        continue;
      }
      
      currentVendor.name = vendorName;
      
      // If we have an initial description, add it (remove leading colon and space if present)
      if (initialDescription) {
        initialDescription = initialDescription.replace(/^:\s*/, '').trim();
        descriptionLines.push(initialDescription);
      }
      
      continue;
    }
    
    // If we're in a vendor section, capture additional info
    if (inVendorSection) {
      // Check for email pattern
      const emailMatch = line.match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
      if (emailMatch && (line.toLowerCase().includes('email') || line.toLowerCase().includes('contact'))) {
        currentVendor.email = emailMatch[1];
        continue;
      }
      
      // Check if this line starts a new vendor or is a metadata marker
      if (line.startsWith('###') || line.match(/^\d+\./)) {
        // This is a new vendor section, process the previous one
        if (currentVendor.name && currentVendor.name.trim() !== '') {
          // Final check to ensure this isn't Zak the Baker in any form
          if (!(currentVendor.name.toLowerCase().includes('zak') || 
                currentVendor.name.toLowerCase().includes('baker') || 
                currentVendor.name.toLowerCase().includes('excluded'))) {
            
            // Assign the accumulated description
            if (descriptionLines.length > 0) {
              currentVendor.description = descriptionLines.join(' ').trim().replace(/^:\s*/, '');
            }
            
            // Add vendor with description
            if (!processedNames.has(currentVendor.name.toLowerCase())) {
              vendors.push(currentVendor as Vendor);
              processedNames.add(currentVendor.name.toLowerCase());
            }
          }
        }
        
        // Reset for the next vendor
        currentVendor = { email: '' };
        descriptionLines = [];
        inVendorSection = false;
        i--; // Reprocess this line in the next iteration
        continue;
      }
      
      // Skip website or format markers but keep capturing descriptions
      if (line.toLowerCase().includes('website:') || 
          line.toLowerCase().includes('email:') || 
          line.startsWith('-') || line.startsWith('*')) {
        continue;
      }
      
      // If we get here, this line is likely part of the description
      if (line.trim() !== '' && 
          !line.toLowerCase().includes('website') && 
          !line.toLowerCase().includes('email') &&
          !line.match(/^\d+\./)) {
        descriptionLines.push(line);
      }
    }
  }
  
  // Add the final vendor if there is one being processed
  if (currentVendor.name && currentVendor.name.trim() !== '') {
    // Final check to ensure this isn't Zak the Baker in any form
    if (!(currentVendor.name.toLowerCase().includes('zak') || 
          currentVendor.name.toLowerCase().includes('baker') || 
          currentVendor.name.toLowerCase().includes('excluded'))) {
      
      // Assign the accumulated description
      if (descriptionLines.length > 0) {
        currentVendor.description = descriptionLines.join(' ').trim().replace(/^:\s*/, '');
      }
      
      // Add vendor with description if not already processed
      if (!processedNames.has(currentVendor.name.toLowerCase())) {
        vendors.push(currentVendor as Vendor);
      }
    }
  }
  
  return vendors;
} 