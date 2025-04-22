import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { sendEmail } from '@/lib/email-utils';

export async function POST(request: Request) {
  try {
    console.log("📧 Test Email API called");
    
    // Parse request body
    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: "Email address is required" }, { status: 400 });
    }
    
    console.log(`📧 Attempting to send test email to: ${email}`);
    
    // Check if SendGrid API key is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.error("📧 SENDGRID_API_KEY is not set");
      return NextResponse.json({ 
        error: "SendGrid API key is not configured", 
        envVars: {
          hasKey: !!process.env.SENDGRID_API_KEY,
          fromEmail: process.env.SENDGRID_FROM_EMAIL || '(not set)',
          nodeEnv: process.env.NODE_ENV || '(not set)',
          disableSending: process.env.DISABLE_EMAIL_SENDING || '(not set)'
        }
      }, { status: 500 });
    }
    
    // Try direct SendGrid API call
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';
    
    try {
      if (!sgMail) {
        console.error("📧 sgMail is not defined");
        return NextResponse.json({ error: "SendGrid client is not initialized" }, { status: 500 });
      }
      
      // Set API key explicitly in this function
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const result = await sgMail.send({
        to: email,
        from: {
          email: fromEmail,
          name: "Flow Farmers Market"
        },
        subject: "Flow Farmers Market - Test Email",
        text: "This is a test email from Flow Farmers Market to verify email functionality.",
        html: "<p>This is a test email from Flow Farmers Market to verify email functionality.</p>"
      });
      
      console.log("📧 Direct SendGrid send result:", result[0]?.statusCode);
      
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${email}`,
        method: "direct",
        statusCode: result[0]?.statusCode
      });
    } catch (directError: unknown) {
      console.error("📧 Direct SendGrid send failed:", directError);
      
      // Try via our utility function as fallback
      try {
        console.log("📧 Trying to send via utility function");
        
        const utilityResult = await sendEmail({
          to: email,
          subject: "Flow Farmers Market - Test Email (Utility)",
          html: "<p>This is a test email from Flow Farmers Market to verify email functionality using the utility function.</p>"
        });
        
        console.log("📧 Utility send result:", utilityResult);
        
        return NextResponse.json({
          success: true,
          message: `Test email sent successfully to ${email} via utility`,
          method: "utility",
          result: utilityResult
        });
      } catch (utilityError: unknown) {
        const typedError = directError as { message?: string; code?: string; response?: { body?: unknown } };
        const typedUtilityError = utilityError as { message?: string };
        
        console.error("📧 Both email methods failed");
        
        return NextResponse.json({
          error: "Failed to send test email",
          directError: {
            message: typedError.message,
            code: typedError.code,
            response: typedError.response?.body
          },
          utilityError: {
            message: typedUtilityError.message
          }
        }, { status: 500 });
      }
    }
  } catch (error: unknown) {
    console.error("📧 Test email API error:", error);
    const typedError = error as { message?: string };
    
    return NextResponse.json({
      error: typedError.message || "Unknown error in test email API"
    }, { status: 500 });
  }
} 