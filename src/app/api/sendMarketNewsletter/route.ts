import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import { subDays } from 'date-fns';
import fs from 'fs';
import { readPublicFile } from '@/lib/path-utils';

// Check for SendGrid API key with better error handling
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  console.error('SENDGRID_API_KEY is not set in environment variables');
  // We'll continue and handle this in the request handler
}

// Only set the API key if it exists
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function POST(request: Request) {
  // First check if SendGrid API key is available
  if (!SENDGRID_API_KEY) {
    console.error('Cannot send emails: SENDGRID_API_KEY is not set');
    return NextResponse.json({
      success: false,
      error: 'Email service configuration error: API key missing'
    }, { status: 500 });
  }
  
  try {
    // Create a server-side client using environment variables directly
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }
    
    // Create the client directly without using the helper function
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all mailing list subscribers
    const { data: subscribers, error } = await supabase
      .from('mailing_list')
      .select('email, name');
    
    if (error) {
      console.error('Database error when fetching subscribers:', error);
      throw new Error(`Failed to fetch mailing list: ${error.message}`);
    }
    
    if (!subscribers || subscribers.length === 0) {
      console.warn('No subscribers found when trying to send newsletter');
      return NextResponse.json({
        success: false,
        error: 'No subscribers found'
      }, { status: 404 });
    }
    
    console.log(`Preparing to send newsletter to ${subscribers.length} subscribers`);
    
    // Get approved vendors for the newsletter
    const { data: vendors, error: vendorError } = await supabase
      .from('vendor_applications')
      .select('business_name, product_type')
      .eq('status', 'approved');
      
    if (vendorError) {
      console.warn('Error fetching vendors for newsletter:', vendorError);
      // Continue anyway, we'll just show a placeholder for vendors
    }
    
    // Create recipient list
    const recipients = subscribers.map(subscriber => ({ email: subscriber.email, name: subscriber.name }));
    
    // Format vendor list for the newsletter
    const vendorList = vendors && vendors.length > 0 
      ? vendors.map(v => `<li><strong>${v.business_name}</strong> - ${v.product_type}</li>`).join('')
      : '<li>Vendor lineup coming soon!</li>';
    
    // Configure the from address - make sure this email is verified in SendGrid
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';
    
    // Prepare email content
    const emailContent = `
    <!DOCTYPE html>
    <html lang="en-US">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>This Week at Flow Farmers Market</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F6EEDD; font-family: Arial, Helvetica, sans-serif; color: #4A4A4A; line-height: 1.6;">
      <!-- Preheader text (shows in email client previews) -->
      <span style="display: none; max-height: 0px; overflow: hidden;">
        Join us this weekend at Flow Farmers Market for fresh produce, crafts, and more!
      </span>
      
      <!-- Main container -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6EEDD;">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <!-- Email content container -->
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #F6EEDD; max-width: 600px; margin: 0 auto;">
              <!-- Header section with logo -->
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <!-- Flow logo image -->
                  <div style="max-width: 250px; margin: 0 auto;">
                    <img src="https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Flow-Header.png" alt="Flow Farmers Market" style="display: block; width: 100%; max-width: 250px; height: auto;">
                  </div>
                </td>
              </tr>
              
              <!-- Content section -->
              <tr>
                <td style="padding: 20px; background-color: #F6EEDD;">
                  <h1 style="color: #71725E; font-size: 24px; margin-bottom: 20px; font-weight: bold;">This Week at Flow Farmers Market</h1>
                  <p style="margin-bottom: 16px;">Hello {{name}},</p>
                  <p style="margin-bottom: 16px;">We hope you'll join us this weekend at the Flow Farmers Market!</p>
                  
                  <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Market Details</h2>
                  <ul style="padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;"><strong>When:</strong> Every Sunday, 10AM - 3PM</li>
                    <li style="margin-bottom: 8px;"><strong>Where:</strong> Flow Miami - Downtown Promenade</li>
                    <li style="margin-bottom: 8px;"><strong>Address:</strong> 698 NE 1st Avenue, Miami, FL 33132</li>
                    <li style="margin-bottom: 8px;"><strong>Parking:</strong> Free parking available in the main lot</li>
                  </ul>
                  
                  <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Featured Vendors This Week</h2>
                  <ul style="padding-left: 20px; margin-bottom: 20px;">
                    ${vendorList}
                  </ul>
                  
                  <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Special Activities</h2>
                  <ul style="padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;">Live music from local artists (10am-1pm)</li>
                    <li style="margin-bottom: 8px;">Kids craft table</li>
                    <li style="margin-bottom: 8px;">Cooking demonstration at 11am</li>
                  </ul>
                  
                  <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Market Tips</h2>
                  <ul style="padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;">Bring your reusable bags</li>
                    <li style="margin-bottom: 8px;">Most vendors accept credit cards, but cash is always appreciated</li>
                    <li style="margin-bottom: 8px;">Come early for the best selection!</li>
                  </ul>
                  
                  <p style="margin-bottom: 16px;">Follow us on social media for the latest updates and photos from the market.</p>
                  
                  <div style="margin-top: 30px; border-top: 1px solid #DDD; padding-top: 15px;">
                    <p style="margin-bottom: 8px;">We can't wait to see you this weekend!</p>
                    <p style="margin-bottom: 8px;">Flow Farmers Market Team</p>
                  </div>
                </td>
              </tr>
              
              <!-- Footer section -->
              <tr>
                <td style="padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #DDD;">
                  <!-- Footer image -->
                  <div style="max-width: 150px; margin: 0 auto 15px auto;">
                    <img src="https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Oneness_-_light_1.png" alt="Flow Farmers Market Footer" style="display: block; width: 100%; max-width: 150px; height: auto;">
                  </div>
                  <p style="margin-bottom: 8px;">If you wish to unsubscribe, please reply with "unsubscribe" in the subject line.</p>
                  <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
                  <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
    
    console.log(`Sending ${recipients.length} newsletters via SendGrid`);
    
    // For testing or development - just log the email content instead of actually sending
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EMAIL_SENDING === 'true') {
      console.log('Email sending disabled in development. Would have sent emails to:', recipients.map(r => r.email).join(', '));
      return NextResponse.json({
        success: true,
        message: `Email sending simulated for ${recipients.length} subscribers`,
        recipients: recipients.map(r => r.email)
      });
    }
    
    // Send emails
    const messages = recipients.map(recipient => ({
      to: recipient.email,
      from: {
        email: fromEmail,
        name: 'Flow Farmers Market'
      },
      subject: 'This Week at Flow Farmers Market',
      html: emailContent.replace('{{name}}', recipient.name || 'Market Friend'),
      text: emailContent.replace(/<[^>]*>/g, '').replace('{{name}}', recipient.name || 'Market Friend'),
      trackingSettings: {
        clickTracking: {
          enable: true
        },
        openTracking: {
          enable: true
        }
      }
    }));
    
    // Always send just one test email in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      // In development, just send to the first recipient to avoid spamming
      const testEmail = messages[0];
      console.log(`Development mode: sending only to first recipient: ${testEmail.to}`);
      
      try {
        const result = await sgMail.send(testEmail);
        console.log('SendGrid response for test email:', result[0]?.statusCode);
      } catch (sendError: any) {
        console.error('SendGrid error details:', {
          message: sendError.message,
          response: sendError.response?.body,
          code: sendError.code,
          statusCode: sendError.code || sendError.statusCode
        });
        
        // Check for common SendGrid errors
        if (sendError.code === 401) {
          return NextResponse.json({
            success: false,
            error: 'Invalid SendGrid API key. Please check your credentials.',
          }, { status: 500 });
        } else if (sendError.code === 403) {
          return NextResponse.json({
            success: false,
            error: 'Sender identity not verified. Please verify your sender email in SendGrid.',
          }, { status: 500 });
        } else {
          return NextResponse.json({
            success: false,
            error: `SendGrid error: ${sendError.message}`,
            details: sendError.response?.body || 'No additional details'
          }, { status: 500 });
        }
      }
    } else {
      // In production, send to all recipients
      try {
        // SendGrid allows up to 1000 recipients in a single API call
        // For simplicity, we're sending individual emails
        const emailPromises = messages.map(message => sgMail.send(message));
        await Promise.all(emailPromises);
      } catch (sendError: any) {
        console.error('SendGrid error details:', {
          message: sendError.message,
          response: sendError.response?.body || 'No response body',
          code: sendError.code,
          statusCode: sendError.code
        });
        
        // Check for common SendGrid errors
        if (sendError.code === 401) {
          return NextResponse.json({
            success: false,
            error: 'Invalid SendGrid API key. Please check your credentials.',
          }, { status: 500 });
        } else if (sendError.code === 403) {
          return NextResponse.json({
            success: false,
            error: 'Sender identity not verified. Please verify your sender email in SendGrid.',
          }, { status: 500 });
        } else {
          throw sendError;
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Newsletter sent to ${process.env.NODE_ENV !== 'production' ? 1 : recipients.length} subscribers`,
      recipients: process.env.NODE_ENV !== 'production' ? [recipients[0]?.email] : recipients.map(r => r.email)
    });
    
  } catch (error: any) {
    console.error('Error sending market newsletter:', error);
    
    // Return a more detailed error message
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send market newsletter',
      details: error.response?.body || error.code || 'Unknown error'
    }, { status: 500 });
  }
} 