import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { createServerClient } from '@/lib/supabase';
import { subDays } from '@/lib/date-utils';
import { createWeeklyBulletinEmail } from '@/lib/email-templates/weekly-bulletin';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

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
    const newVendorsList = newVendors?.map((v: { business_name: string }) => v.business_name) || [];

    // Get the from email from environment variables
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';

    // Generate email content using the template
    const emailHtml = createWeeklyBulletinEmail(newVendorsList);

    // Send emails to all approved vendors
    const emailPromises = approvedVendors?.map(async (vendor: any) => {
      try {
        const msg = {
          to: vendor.email,
          from: {
            email: fromEmail,
            name: 'Flow Farmers Market'
          },
          subject: 'Flow Farmers Market Weekly Bulletin',
          html: emailHtml,
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
    const successCount = results.filter((r: PromiseSettledResult<any>) => r.status === 'fulfilled').length;
    const failureCount = results.filter((r: PromiseSettledResult<any>) => r.status === 'rejected').length;

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