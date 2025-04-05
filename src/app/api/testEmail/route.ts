import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function POST(request: Request) {
  try {
    const result = await sgMail.send({
      to: 'sgarns@gmail.com',
      from: 'sgarns@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email to verify SendGrid configuration'
    });

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      result
    });
  } catch (error) {
    console.error('SendGrid test failed:', {
      error,
      message: error.message,
      response: error.response?.body
    });
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.response?.body
    }, { status: 500 });
  }
} 