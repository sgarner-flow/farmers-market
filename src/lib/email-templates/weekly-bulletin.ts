import { createBaseEmailTemplate } from './base-template';

/**
 * Creates a weekly bulletin email with proper image URLs
 * @param newVendors List of new vendor names to highlight
 */
export function createWeeklyBulletinEmail(newVendors: string[] = []) {
  const newVendorsSection = newVendors && newVendors.length > 0 
    ? `
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
    ` 
    : '';

  // Main content for the email
  const mainContent = `
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

    ${newVendorsSection}

    <div style="margin-bottom: 25px;">
      <h2 style="color: #71725E; font-size: 18px; margin-top: 20px; margin-bottom: 10px; font-weight: bold;">Important Reminders</h2>
      <ul style="padding-left: 20px; margin-bottom: 0;">
        <li style="margin-bottom: 8px;">Please ensure all products are properly labeled with prices</li>
        <li style="margin-bottom: 8px;">Keep your booth area clean and organized</li>
        <li style="margin-bottom: 8px;">Follow all food safety guidelines</li>
        <li style="margin-bottom: 8px;">Report any issues to market management</li>
      </ul>
    </div>
  `;
  
  // Generate the complete email using the base template
  return createBaseEmailTemplate({
    title: 'Flow Farmers Market Weekly Bulletin',
    previewText: 'Weekly Bulletin for Flow Farmers Market vendors.',
    mainContent: mainContent,
    footerContent: `
      <p style="margin-bottom: 8px;">If you have any questions, please contact us at sgarns@gmail.com</p>
      <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
      <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
    `
  });
} 