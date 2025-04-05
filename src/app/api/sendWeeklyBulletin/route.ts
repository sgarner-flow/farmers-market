import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import sgMail from '@sendgrid/mail';
import { subDays } from 'date-fns';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailTemplate = (newVendors: string[]) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Farmers Market Weekly Bulletin</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #4CAF50;
      color: white;
      padding: 20px;
      text-align: center;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9f9f9;
      padding: 20px;
      border: 1px solid #ddd;
      border-top: none;
      border-radius: 0 0 5px 5px;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      color: #2E7D32;
      font-size: 1.2em;
      margin-bottom: 10px;
    }
    .new-vendors {
      background-color: #E8F5E9;
      padding: 15px;
      border-radius: 5px;
      margin-top: 10px;
    }
    .new-vendors ul {
      margin: 0;
      padding-left: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 0.9em;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Flow Farmers Market Weekly Bulletin</h1>
    <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </div>

  <div class="content">
    <div class="section">
      <h2 class="section-title">This Week's Arrival Instructions</h2>
      <p>Please arrive at the market by 7:00 AM to set up your booth. Remember to:</p>
      <ul>
        <li>Bring your vendor badge</li>
        <li>Set up your booth according to the market layout</li>
        <li>Ensure all products are properly labeled</li>
        <li>Have your payment processing system ready</li>
      </ul>
    </div>

    ${newVendors.length > 0 ? `
    <div class="section">
      <h2 class="section-title">Welcome New Vendors!</h2>
      <div class="new-vendors">
        <p>We're excited to welcome these new vendors to our market:</p>
        <ul>
          ${newVendors.map(vendor => `<li>${vendor}</li>`).join('')}
        </ul>
      </div>
    </div>
    ` : ''}

    <div class="section">
      <h2 class="section-title">Important Reminders</h2>
      <ul>
        <li>Please ensure all products are properly labeled with prices</li>
        <li>Keep your booth area clean and organized</li>
        <li>Follow all food safety guidelines</li>
        <li>Report any issues to market management</li>
      </ul>
    </div>
  </div>

  <div class="footer">
    <p>If you have any questions, please contact us at sgarns@gmail.com</p>
  </div>
</body>
</html>
`;

export async function POST(request: Request) {
  try {
    const supabase = createServerClient();

    // Fetch all approved vendors
    const { data: approvedVendors, error: approvedError } = await supabase
      .from('vendor_applications')
      .select('*')
      .eq('status', 'approved');

    if (approvedError) throw approvedError;

    // Fetch vendors approved in the last 7 days
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();
    const { data: newVendors, error: newVendorsError } = await supabase
      .from('vendor_applications')
      .select('business_name')
      .eq('status', 'approved')
      .gte('created_at', sevenDaysAgo);

    if (newVendorsError) throw newVendorsError;

    // Prepare new vendors list
    const newVendorsList = newVendors?.map(v => v.business_name) || [];

    // Send emails to all approved vendors
    const emailPromises = approvedVendors?.map(async (vendor) => {
      try {
        const msg = {
          to: vendor.email,
          from: 'sgarns@gmail.com',
          subject: 'Flow Farmers Market Weekly Bulletin',
          html: emailTemplate(newVendorsList),
        };

        await sgMail.send(msg);

        // Update last_emailed timestamp
        await supabase
          .from('vendor_applications')
          .update({ last_emailed: new Date().toISOString() })
          .eq('id', vendor.id);
      } catch (error) {
        console.error(`Failed to send email to ${vendor.email}:`, error);
        return { email: vendor.email, error };
      }
    }) || [];

    // Wait for all emails to be sent
    const results = await Promise.allSettled(emailPromises);

    // Count successes and failures
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      success: true,
      message: `Weekly bulletin sent to ${successCount} vendors${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
    });

  } catch (error) {
    console.error('Error in sendWeeklyBulletin route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 