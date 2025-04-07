import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { vendors } = body;

    if (!vendors || !Array.isArray(vendors) || vendors.length === 0) {
      return NextResponse.json({ error: 'Valid vendors array is required' }, { status: 400 });
    }

    // In a real application, this would connect to an email service
    // For demo purposes, we'll just simulate sending emails
    console.log(`Sending invitation emails to ${vendors.length} vendors`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Log the vendor information that would be used for emails
    vendors.forEach((vendor, index) => {
      console.log(`${index + 1}. Would send email to: ${vendor.name} <${vendor.email}>`);
    });

    return NextResponse.json({
      success: true,
      message: `Invitations sent to ${vendors.length} vendors`
    });
  } catch (error) {
    console.error('Error in sendInvitations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 