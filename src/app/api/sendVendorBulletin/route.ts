import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import { subDays, format, addDays } from 'date-fns';
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

// Get next Saturday date
const getNextSaturday = () => {
  const today = new Date();
  const day = today.getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilNextSaturday = day === 6 ? 7 : 6 - day;
  return addDays(today, daysUntilNextSaturday);
};

const nextSaturday = getNextSaturday();

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
    
    // Get all approved vendors
    const { data: vendors, error } = await supabase
      .from('vendor_applications')
      .select('email, business_name, created_at')
      .eq('status', 'approved');
    
    if (error) {
      console.error('Database error when fetching vendors:', error);
      throw new Error(`Failed to fetch vendors: ${error.message}`);
    }
    
    // Also fetch vendors approved in the last 7 days
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    const { data: newVendorsData, error: newVendorsError } = await supabase
      .from('vendor_applications')
      .select('business_name, created_at')
      .eq('status', 'approved')
      .gt('created_at', sevenDaysAgo);  // Using created_at instead of updated_at

    if (newVendorsError) {
      console.error('Error fetching new vendors:', newVendorsError);
      // Continue anyway, we'll just show empty new vendors list
    }

    // Ensure newVendors is always an array
    const newVendors = newVendorsData || [];

    console.log(`Found ${newVendors.length} new vendors in the last 7 days`);
    if (newVendors.length > 0) {
      console.log('New vendors:', newVendors.map(v => ({ name: v.business_name, created: v.created_at })));
    }
    
    if (!vendors || vendors.length === 0) {
      console.warn('No approved vendors found when trying to send bulletin');
      return NextResponse.json({
        success: false,
        error: 'No approved vendors found'
      }, { status: 404 });
    }
    
    console.log(`Preparing to send bulletin to ${vendors.length} vendors`);
    
    // Create recipient list
    const recipients = vendors.map(vendor => ({ email: vendor.email, name: vendor.business_name }));
    
    // Prepare the new vendors section
    const newVendorsList = newVendors.length > 0
      ? newVendors.map(v => `<li style="margin-bottom: 8px;">${v.business_name}</li>`).join('')
      : '';

    const newVendorsSection = newVendors.length > 0 
      ? `
        <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Welcome New Vendors!</h2>
        <div style="background-color: #F0F7ED; padding: 15px; border-radius: 5px; border: 1px solid #E0ECD8; margin-bottom: 20px;">
          <p style="margin-top: 0; margin-bottom: 10px;">We're excited to welcome these new vendors to our market:</p>
          <ul style="padding-left: 20px; margin-bottom: 15px;">
            ${newVendorsList}
          </ul>
          <p style="margin-bottom: 0; font-style: italic;">Please take a moment to introduce yourself to our new vendors! Building connections within our vendor community creates a more welcoming atmosphere for everyone.</p>
        </div>
      ` 
      : '';
    
    // Prepare email content
    const emailContent = `
    <!DOCTYPE html>
    <html lang="en-US">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Flow Farmers Market - Vendor Bulletin</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F6EEDD; font-family: Arial, Helvetica, sans-serif; color: #4A4A4A; line-height: 1.6;">
      <!-- Preheader text (shows in email client previews) -->
      <span style="display: none; max-height: 0px; overflow: hidden;">
        Important information for vendors at this weekend's Flow Farmers Market
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
                    <img src="https://flowfarmersmarket.vercel.app/flow-logo.svg" alt="Flow Farmers Market" style="display: block; width: 100%; max-width: 250px; height: auto;">
                  </div>
                </td>
              </tr>
              
              <!-- Content section -->
              <tr>
                <td style="padding: 20px; background-color: #F6EEDD;">
                  <h1 style="color: #71725E; font-size: 24px; margin-bottom: 20px; font-weight: bold;">Flow Farmers Market - Vendor Bulletin</h1>
                  <p style="margin-bottom: 16px;">Hello valued vendor,</p>
                  <p style="margin-bottom: 16px;">We're excited to have you at our upcoming market. Here are some important reminders:</p>
                  
                  <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Setup Information</h2>
                  <ul style="padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;">Setup begins at 7:00 AM</li>
                    <li style="margin-bottom: 8px;">Please have your booth ready by 8:30 AM</li>
                    <li style="margin-bottom: 8px;">Market hours are 10:00 AM to 3:00 PM</li>
                  </ul>
                  
                  ${newVendorsSection}
                  
                  <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Vendor Rules & Guidelines</h2>
                  <ul style="padding-left: 20px; margin-bottom: 20px;">
                    <li style="margin-bottom: 8px;">Display your business name prominently</li>
                    <li style="margin-bottom: 8px;">Price all items clearly</li>
                    <li style="margin-bottom: 8px;">Bring your own tables, chairs, and canopy</li>
                    <li style="margin-bottom: 8px;">Weights for your canopy are mandatory (min. 25lbs per leg)</li>
                    <li style="margin-bottom: 8px;">Clean up your area at the end of the market</li>
                  </ul>
                  
                  <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Parking</h2>
                  <p style="margin-bottom: 16px;">After unloading, please park in the designated vendor parking area to leave the closest spots for customers.</p>
                  
                  <p style="margin-bottom: 16px;">If you have any questions, please contact the market manager at <a href="mailto:sgarns@gmail.com" style="color: #4A8233; text-decoration: underline;">sgarns@gmail.com</a> or call (305) 555-1234.</p>
                  
                  <div style="margin-top: 30px; border-top: 1px solid #DDD; padding-top: 15px;">
                    <p style="margin-bottom: 8px;">Thank you for being part of our market community!</p>
                    <p style="margin-bottom: 8px;">Flow Farmers Market Team</p>
                  </div>
                  
                  <!-- No divider image -->
                </td>
              </tr>
              
              <!-- Footer section -->
              <tr>
                <td style="padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #DDD;">
                  <!-- Footer image -->
                  <div style="max-width: 150px; margin: 0 auto 15px auto;">
                    <img src="https://flowfarmersmarket.vercel.app/flow-footer.svg" alt="Flow Farmers Market Footer" style="display: block; width: 100%; max-width: 150px; height: auto;">
                  </div>
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
    
    // Configure the from address - make sure this email is verified in SendGrid
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';
    
    // Send emails
    const messages = recipients.map(recipient => {
      // Check if this vendor is a new vendor (approved in the last 7 days)
      const isNewVendor = (vendor: { created_at?: string }) => {
        if (!vendor.created_at) return false;
        const createdDate = new Date(vendor.created_at);
        const sevenDaysAgo = subDays(new Date(), 7);
        return createdDate >= sevenDaysAgo;
      };
      
      const vendor = vendors.find(v => v.business_name === recipient.name);
      const isNew = vendor ? isNewVendor(vendor) : false;
      
      // Add a personalized message for new vendors
      let personalizedContent = emailContent;
      if (isNew) {
        const newVendorMessage = `
        <div style="margin-bottom: 20px; border-left: 4px solid #71725E; padding-left: 15px;">
          <p style="margin-top: 0; font-weight: bold; color: #71725E;">👋 Special Welcome to New Vendors!</p>
          <p style="margin-bottom: 5px;">Since this is your first market with us, here are a few extra tips:</p>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li style="margin-bottom: 5px;">Arrive 15 minutes earlier than the regular setup time for a brief orientation</li>
            <li style="margin-bottom: 5px;">Don't hesitate to ask neighboring vendors for advice - our vendor community is friendly and supportive</li>
            <li style="margin-bottom: 5px;">Consider bringing business cards to share with other vendors for future collaborations</li>
            <li style="margin-bottom: 5px;">Take photos of your first setup to celebrate this milestone!</li>
          </ul>
        </div>
        `;
        
        // Insert after the greeting paragraph
        personalizedContent = personalizedContent.replace(
          '<p style="margin-bottom: 16px;">We\'re excited to have you at our upcoming market. Here are some important reminders:</p>',
          '<p style="margin-bottom: 16px;">We\'re excited to have you at our upcoming market. Here are some important reminders:</p>' + newVendorMessage
        );
      }
      
      return {
        to: recipient.email,
        from: {
          email: fromEmail,
          name: 'Flow Farmers Market'
        },
        subject: 'Flow Farmers Market - Vendor Bulletin',
        html: personalizedContent,
        text: personalizedContent.replace(/<[^>]*>/g, ''),
        trackingSettings: {
          clickTracking: {
            enable: true
          },
          openTracking: {
            enable: true
          }
        }
      };
    });
    
    console.log(`Sending ${messages.length} emails via SendGrid`);
    
    // For testing or development - just log the email content instead of actually sending
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EMAIL_SENDING === 'true') {
      console.log('Email sending disabled in development. Would have sent emails to:', recipients.map(r => r.email).join(', '));
      return NextResponse.json({
        success: true,
        message: `Email sending simulated for ${recipients.length} vendors`,
        recipients: recipients.map(r => r.email)
      });
    }
    
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
      message: `Bulletin sent to ${process.env.NODE_ENV !== 'production' ? 1 : recipients.length} vendors`,
      recipients: process.env.NODE_ENV !== 'production' ? [recipients[0]?.email] : recipients.map(r => r.email)
    });
    
  } catch (error: any) {
    console.error('Error sending vendor bulletin:', error);
    
    // Return a more detailed error message
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send vendor bulletin',
      details: error.response?.body || error.code || 'Unknown error'
    }, { status: 500 });
  }
} 