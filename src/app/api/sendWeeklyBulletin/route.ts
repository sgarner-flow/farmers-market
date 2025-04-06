import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import sgMail from '@sendgrid/mail';
import { subDays } from 'date-fns';
import fs from 'fs';
import { readPublicFile } from '@/lib/path-utils';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailTemplate = (newVendors: string[]) => `
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Flow Farmers Market Weekly Bulletin</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6EEDD; font-family: Arial, Helvetica, sans-serif; color: #4A4A4A; line-height: 1.6;">
  <!-- Preheader text (shows in email client previews) -->
  <span style="display: none; max-height: 0px; overflow: hidden;">
    Weekly Bulletin for Flow Farmers Market vendors.
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
              <div style="margin-bottom: 25px;">
                <h2 style="color: #71725E; font-size: 18px; margin-top: 5px; margin-bottom: 10px; font-weight: bold;">This Week's Arrival Instructions</h2>
                <p style="margin-bottom: 10px;">Please arrive at the market by 7:00 AM to set up your booth. Remember to:</p>
                <ul style="padding-left: 20px; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;">Bring your vendor badge</li>
                  <li style="margin-bottom: 8px;">Set up your booth according to the market layout</li>
                  <li style="margin-bottom: 8px;">Ensure all products are properly labeled</li>
                  <li style="margin-bottom: 8px;">Have your payment processing system ready</li>
                </ul>
              </div>

              ${newVendors && newVendors.length > 0 ? `
              <div style="margin-bottom: 25px;">
                <h2 style="color: #71725E; font-size: 18px; margin-top: 20px; margin-bottom: 10px; font-weight: bold;">Welcome New Vendors!</h2>
                <div style="background-color: #F0F7ED; padding: 15px; border-radius: 5px; border: 1px solid #E0ECD8;">
                  <p style="margin-top: 0; margin-bottom: 10px;">We're excited to welcome these new vendors to our market this week:</p>
                  <ul style="padding-left: 20px; margin-bottom: 15px;">
                    ${newVendors.map(vendor => `<li style="margin-bottom: 8px;">${vendor}</li>`).join('')}
                  </ul>
                  <p style="margin-bottom: 0; font-weight: bold;">Community Building:</p>
                  <p style="margin-bottom: 0;">Please take a moment to introduce yourself to our new vendors on market day! Strong vendor relationships help create a welcoming atmosphere that shoppers can feel. Consider exchanging contact information and sharing your experience with them.</p>
                </div>
              </div>
              ` : ''}

              <div style="margin-bottom: 25px;">
                <h2 style="color: #71725E; font-size: 18px; margin-top: 20px; margin-bottom: 10px; font-weight: bold;">Important Reminders</h2>
                <ul style="padding-left: 20px; margin-bottom: 0;">
                  <li style="margin-bottom: 8px;">Please ensure all products are properly labeled with prices</li>
                  <li style="margin-bottom: 8px;">Keep your booth area clean and organized</li>
                  <li style="margin-bottom: 8px;">Follow all food safety guidelines</li>
                  <li style="margin-bottom: 8px;">Report any issues to market management</li>
                </ul>
              </div>
              
              <hr style="border: 0; height: 1px; background-color: #DDD; margin: 20px 0;">
              
              <!-- Footer -->
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #DDD; text-align: center; color: #666666; font-size: 12px;">
                <!-- Footer image -->
                <div style="max-width: 150px; margin: 0 auto 15px auto;">
                  <img src="https://flowfarmersmarket.vercel.app/flow-footer.svg" alt="Flow Farmers Market Footer" style="display: block; width: 100%; max-width: 150px; height: auto;">
                </div>
                <p style="margin-bottom: 8px;">If you have any questions, please contact us at sgarns@gmail.com</p>
                <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
                <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
    console.log(`Looking for vendors approved since: ${sevenDaysAgo}`);
    
    const { data: newVendors, error: newVendorsError } = await supabase
      .from('vendor_applications')
      .select('business_name, created_at')
      .eq('status', 'approved')
      .gt('created_at', sevenDaysAgo);  // Using created_at instead of updated_at

    if (newVendorsError) throw newVendorsError;

    console.log(`Found ${newVendors?.length || 0} new vendors in the last 7 days`);
    if (newVendors?.length > 0) {
      console.log('New vendors:', newVendors.map(v => ({ name: v.business_name, created: v.created_at })));
    }

    // Prepare new vendors list
    const newVendorsList = newVendors?.map(v => v.business_name) || [];

    // Get the from email from environment variables
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';

    // Send emails to all approved vendors
    const emailPromises = approvedVendors?.map(async (vendor) => {
      try {
        const msg = {
          to: vendor.email,
          from: {
            email: fromEmail,
            name: 'Flow Farmers Market'
          },
          subject: 'Flow Farmers Market Weekly Bulletin',
          html: emailTemplate(newVendorsList),
          trackingSettings: {
            clickTracking: {
              enable: true
            },
            openTracking: {
              enable: true
            }
          }
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