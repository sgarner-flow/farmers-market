import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import { createServerClient } from '@/lib/supabase';
import { sendEmail } from '@/lib/email-utils';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error('SENDGRID_API_KEY is not set');
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const emailTemplate = (vendorName: string, questions: string[] = []) => {
  // Convert questions array to HTML list items
  const questionsList = questions.length > 0 
    ? `
      <p style="margin-bottom: 16px;">We have a few questions for you to begin the process:</p>
      <ul style="padding-left: 20px; margin-bottom: 15px;">
        ${questions.map(q => `<li style="margin-bottom: 8px;">${q}</li>`).join('')}
      </ul>
    `
    : '';

  return `
<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Join Flow Farmers Market</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F6EEDD; font-family: Arial, Helvetica, sans-serif; color: #4A4A4A; line-height: 1.6;">
  <!-- Preheader text (shows in email client previews) -->
  <span style="display: none; max-height: 0px; overflow: hidden;">
    You're invited to become a vendor at Flow Farmers Market!
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
              <h1 style="color: #71725E; font-size: 24px; margin-bottom: 20px; font-weight: bold;">You're Invited to Join Flow Farmers Market</h1>
              <p style="margin-bottom: 16px;">Hello${vendorName ? ' ' + vendorName : ''},</p>
              <p style="margin-bottom: 16px;">We're reaching out because we believe your products would be a perfect fit for our farmers market community.</p>
              
              <div style="background-color: #FFFFFF; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h2 style="color: #71725E; font-size: 18px; margin-top: 5px; margin-bottom: 15px; font-weight: bold;">About Flow Farmers Market</h2>
                <p style="margin-bottom: 8px;">Flow Farmers Market is a vibrant community marketplace connecting local producers with conscious consumers. We offer:</p>
                <ul style="padding-left: 20px; margin-bottom: 15px;">
                  <li style="margin-bottom: 8px;">A prime downtown Miami location with high foot traffic</li>
                  <li style="margin-bottom: 8px;">A curated selection of high-quality vendors</li>
                  <li style="margin-bottom: 8px;">Marketing support and a loyal customer base</li>
                  <li style="margin-bottom: 8px;">Simple application process and reasonable booth fees</li>
                </ul>
              </div>
              
              <p style="margin-bottom: 16px;">We're looking for vendors who share our values of sustainability, quality, and community connection.</p>
              
              ${questionsList}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://flowfarmersmarket.vercel.app'}/#apply" style="display: inline-block; background-color: #71725E; color: white; padding: 14px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">Apply to Become a Vendor</a>
              </div>
              
              <p style="margin-bottom: 16px;">If you have any questions about the application process or our market, please don't hesitate to reach out to us at <a href="mailto:sgarns@gmail.com" style="color: #4A8233; text-decoration: underline;">sgarns@gmail.com</a>.</p>
              
              <p style="margin-bottom: 16px;">We hope to welcome you to our vendor community soon!</p>
              
              <p style="margin-bottom: 16px;">Warm regards,<br>Flow Farmers Market Team</p>
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
};

export async function POST(request: Request) {
  try {
    console.log("📧 Vendor invitation API called");
    
    const body = await request.json();
    const { vendors, questions = [] } = body;
    
    console.log("📧 Request payload:", { vendorsCount: vendors?.length, questionsCount: questions.length });
    
    if (!Array.isArray(vendors) || vendors.length === 0) {
      console.error("❌ Invalid request format - vendors is not an array or is empty");
      return NextResponse.json(
        { error: 'No vendors provided or invalid format' },
        { status: 400 }
      );
    }
    
    console.log(`📧 Sending invitations to ${vendors.length} potential vendors`);
    
    const supabase = createServerClient();
    
    // Get the from email from environment variables
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';
    console.log(`📧 Using from email: ${fromEmail}`);

    // Process each vendor
    const results = await Promise.all(vendors.map(async (vendor: { name?: string, email: string }) => {
      console.log(`📧 Processing vendor: ${vendor.name || 'unnamed'} <${vendor.email}>`);
      
      try {
        // Save vendor to database with "invited" status
        const { data: existingVendor, error: checkError } = await supabase
          .from('vendor_applications')
          .select('id, email, status')
          .eq('email', vendor.email)
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          console.error(`❌ Database error checking vendor ${vendor.email}:`, checkError);
          throw new Error(`Database error checking vendor: ${checkError.message}`);
        }
        
        // If vendor exists but not with "invited" status, skip
        if (existingVendor && existingVendor.status !== 'invited') {
          console.log(`📧 Vendor ${vendor.email} already exists with status: ${existingVendor.status} - skipping`);
          return {
            email: vendor.email,
            status: 'skipped',
            message: `Vendor already exists with status: ${existingVendor.status}`
          };
        }
        
        // If vendor doesn't exist or has "invited" status, proceed
        let vendorId;
        
        if (existingVendor) {
          vendorId = existingVendor.id;
          console.log(`📧 Updating existing vendor: ${vendor.email} (ID: ${vendorId})`);
          
          // Update last_emailed timestamp
          const { error: updateError } = await supabase
            .from('vendor_applications')
            .update({ last_emailed: new Date().toISOString() })
            .eq('id', vendorId);
            
          if (updateError) {
            console.error(`❌ Error updating last_emailed for vendor ${vendor.email}:`, updateError);
            throw new Error(`Failed to update vendor: ${updateError.message}`);
          }
        } else {
          // Insert new vendor with invited status
          console.log(`📧 Creating new vendor: ${vendor.email}`);
          
          const { data: newVendor, error: insertError } = await supabase
            .from('vendor_applications')
            .insert({
              email: vendor.email,
              business_name: vendor.name || vendor.email,
              status: 'invited',
              last_emailed: new Date().toISOString(),
              // Add required fields with default values
              product_type: 'Other',
              locally_sourced: 'No',
              organic_pesticide_free: 'No',
              eco_friendly_packaging: 'No',
              payment_status: 'pending'
            })
            .select('id')
            .single();
            
          if (insertError) {
            console.error(`❌ Error inserting vendor ${vendor.email}:`, insertError);
            throw new Error(`Failed to insert vendor: ${insertError.message}`);
          }
          
          vendorId = newVendor.id;
          console.log(`📧 New vendor created with ID: ${vendorId}`);
        }
        
        // Send invitation email
        console.log(`📧 Preparing email for vendor: ${vendor.email} with ${questions.length} questions`);
        const emailContent = emailTemplate(vendor.name || '', questions);
        
        // Use the email utility function for better error handling
        console.log(`📧 Sending email to: ${vendor.email}`);
        try {
          const emailResult = await sendEmail({
            to: vendor.email,
            from: {
              email: fromEmail,
              name: 'Flow Farmers Market'
            },
            subject: 'You\'re Invited to Join Flow Farmers Market',
            html: emailContent
          });
          
          console.log(`📧 Email sent successfully to ${vendor.email}:`, emailResult);
        } catch (emailError: unknown) {
          console.error(`❌ Error sending email to ${vendor.email}:`, emailError);
          throw emailError;
        }
        
        return {
          email: vendor.email,
          status: 'success',
          id: vendorId
        };
      } catch (error: unknown) {
        console.error(`❌ Error processing vendor ${vendor.email}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          email: vendor.email,
          status: 'error',
          message: errorMessage
        };
      }
    }));
    
    // Count successes and failures
    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const failureCount = results.filter(r => r.status === 'error').length;
    
    const responseMessage = `Invitations sent to ${successCount} vendors, ${skippedCount} skipped, ${failureCount} failed`;
    console.log(`📧 ${responseMessage}`);
    
    return NextResponse.json({
      success: true,
      message: responseMessage,
      results
    });
  } catch (error: unknown) {
    console.error('❌ Error in sendVendorInvitation route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 