import { getEmailImageUrl } from '../email-utils';

/**
 * Creates a base email template with proper image references
 * @param options Template options including content, title, etc.
 */
export function createBaseEmailTemplate(options: {
  title: string;
  previewText: string;
  mainContent: string;
  footerContent?: string;
}) {
  // Use the getEmailImageUrl function which has special handling for email images
  const logoUrl = "https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Flow-Header.png";
  const dividerImageUrl = "https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Dividier-Padded.png";
  const footerImageUrl = "https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Oneness_-_light_1.png";
  
  return `
  <!DOCTYPE html>
  <html lang="en-US">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${options.title}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F6EEDD; font-family: Arial, Helvetica, sans-serif; color: #4A4A4A; line-height: 1.6;">
    <!-- Preheader text (shows in email client previews) -->
    <span style="display: none; max-height: 0px; overflow: hidden;">
      ${options.previewText}
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
                  <img src="${logoUrl}" alt="Flow Farmers Market" style="display: block; width: 100%; max-width: 250px; height: auto;">
                </div>
              </td>
            </tr>
            
            <!-- Content section -->
            <tr>
              <td style="padding: 20px; background-color: #F6EEDD;">
                ${options.mainContent}
              </td>
            </tr>
            
            <!-- Divider image -->
            <tr>
              <td align="center" style="padding: 10px 0;">
                <img src="${dividerImageUrl}" alt="Divider" width="600" />
              </td>
            </tr>
            
            <!-- Footer section -->
            <tr>
              <td style="padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #DDD;">
                <!-- Footer image -->
                <div style="margin: 0 auto 15px auto;">
                  <img src="${footerImageUrl}" alt="Flow Farmers Market Footer" width="150" />
                </div>
                ${options.footerContent || `
                <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
                <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
                `}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
} 