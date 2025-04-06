'use server';

import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export async function GET() {
  try {
    // Check if API key is set
    if (!SENDGRID_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'SENDGRID_API_KEY is not set'
      }, { status: 500 });
    }

    // Get from email from environment or use default
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';
    
    // Create a simple test message
    const msg = {
      to: 'sgarns@gmail.com', // Send to yourself for testing
      from: {
        email: fromEmail,
        name: 'Flow Farmers Market Test'
      },
      subject: 'SendGrid Test Email',
      text: 'This is a test email from your Flow Farmers Market app.',
      html: '<p>This is a test email from your <strong>Flow Farmers Market</strong> app.</p>'
    };

    // Log the message we're sending
    console.log('Sending test email with the following configuration:');
    console.log(JSON.stringify({
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    }, null, 2));

    // Try to send the email
    const response = await sgMail.send(msg);
    
    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      statusCode: response[0]?.statusCode,
      fromEmail
    });
    
  } catch (error: any) {
    console.error('SendGrid test failed:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.body || {},
      code: error.code
    }, { status: 500 });
  }
} 