import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import sgMail from '@sendgrid/mail';
import { getNextSaturday, subDays } from '@/lib/date-utils';
import { createVendorBulletinEmail } from '@/lib/email-templates/vendor-bulletin';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

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
    
    // Prepare the new vendors for the template
    const newVendorsList = newVendors.length > 0
      ? newVendors.map(v => v.business_name)
      : [];
    
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
      
      // Create email content using our template
      const emailContent = createVendorBulletinEmail({
        newVendors: newVendorsList,
        isNewVendor: isNew
      });
      
      return {
        to: recipient.email,
        from: {
          email: fromEmail,
          name: 'Flow Farmers Market'
        },
        subject: 'Flow Farmers Market - Vendor Bulletin',
        html: emailContent,
        text: emailContent.replace(/<[^>]*>/g, ''),
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
        await sgMail.send(testEmail);
      } catch (sendError: any) {
        console.error('SendGrid error details:', {
          message: sendError.message,
          response: sendError.response?.body || 'No response body',
          code: sendError.code,
          statusCode: sendError.code
        });
        throw sendError;
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