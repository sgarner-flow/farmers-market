import { createBaseEmailTemplate } from './base-template';

type VendorBulletinOptions = {
  newVendors?: string[];
  isNewVendor?: boolean;
};

/**
 * Creates a vendor bulletin email with proper image URLs
 */
export function createVendorBulletinEmail(options: VendorBulletinOptions = {}) {
  const { newVendors = [], isNewVendor = false } = options;
  
  // Prepare the new vendors section
  const newVendorsList = newVendors.length > 0
    ? newVendors.map(v => `<li style="margin-bottom: 8px;">${v}</li>`).join('')
    : '';

  const newVendorsSection = newVendors.length > 0 
    ? `
      <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Welcome New Vendors!</h2>
      <div style="background-color: #F0F7ED; padding: 15px; border-radius: 5px; border: 1px solid #E0ECD8; margin-bottom: 20px;">
        <p style="margin-top: 0; margin-bottom: 10px;">We're excited to welcome these new vendors to our market:</p>
        <ul style="padding-left: 20px; margin-bottom: 15px;">
          ${newVendorsList}
        </ul>
        <p style="margin-bottom: 0; font-style: italic;">Please take a moment to introduce yourself to our new vendors! Building connections within our vendor community creates a more welcoming atmosphere for everyone.</p>
      </div>
    ` 
    : '';
  
  // Special message for new vendors
  const newVendorMessage = isNewVendor 
    ? `
      <div style="margin-bottom: 20px; border-left: 4px solid #71725E; padding-left: 15px;">
        <p style="margin-top: 0; font-weight: bold; color: #71725E;">👋 Special Welcome to New Vendors!</p>
        <p style="margin-bottom: 5px;">Since this is your first market with us, here are a few extra tips:</p>
        <ul style="padding-left: 20px; margin-bottom: 0;">
          <li style="margin-bottom: 5px;">Arrive 15 minutes earlier than the regular setup time for a brief orientation</li>
          <li style="margin-bottom: 5px;">Don't hesitate to ask neighboring vendors for advice - our vendor community is friendly and supportive</li>
          <li style="margin-bottom: 5px;">Consider bringing business cards to share with other vendors for future collaborations</li>
          <li style="margin-bottom: 5px;">Take photos of your first setup to celebrate this milestone!</li>
        </ul>
      </div>
    `
    : '';
  
  // Main content for the email
  const mainContent = `
    <h1 style="color: #71725E; font-size: 24px; margin-bottom: 20px; font-weight: bold;">Flow Farmers Market - Vendor Bulletin</h1>
    <p style="margin-bottom: 16px;">Hello valued vendor,</p>
    <p style="margin-bottom: 16px;">We're excited to have you at our upcoming market. Here are some important reminders:</p>
    
    ${isNewVendor ? newVendorMessage : ''}
    
    <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Setup Information</h2>
    <ul style="padding-left: 20px; margin-bottom: 20px;">
      <li style="margin-bottom: 8px;">Setup begins at 7:00 AM</li>
      <li style="margin-bottom: 8px;">Please have your booth ready by 8:30 AM</li>
      <li style="margin-bottom: 8px;">Market hours are 10:00 AM to 3:00 PM</li>
    </ul>
    
    ${newVendorsSection}
    
    <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Vendor Rules & Guidelines</h2>
    <ul style="padding-left: 20px; margin-bottom: 20px;">
      <li style="margin-bottom: 8px;">Display your business name prominently</li>
      <li style="margin-bottom: 8px;">Price all items clearly</li>
      <li style="margin-bottom: 8px;">Bring your own tables, chairs, and canopy</li>
      <li style="margin-bottom: 8px;">Weights for your canopy are mandatory (min. 25lbs per leg)</li>
      <li style="margin-bottom: 8px;">Clean up your area at the end of the market</li>
    </ul>
    
    <h2 style="color: #71725E; font-size: 18px; margin-top: 25px; margin-bottom: 10px; font-weight: bold;">Parking</h2>
    <p style="margin-bottom: 16px;">After unloading, please park in the designated vendor parking area to leave the closest spots for customers.</p>
    
    <p style="margin-bottom: 16px;">If you have any questions, please contact the market manager at <a href="mailto:sgarns@gmail.com" style="color: #4A8233; text-decoration: underline;">sgarns@gmail.com</a> or call (305) 555-1234.</p>
    
    <div style="margin-top: 30px; border-top: 1px solid #DDD; padding-top: 15px;">
      <p style="margin-bottom: 8px;">Thank you for being part of our market community!</p>
      <p style="margin-bottom: 8px;">Flow Farmers Market Team</p>
    </div>
  `;
  
  // Generate the complete email using the base template
  return createBaseEmailTemplate({
    title: 'Flow Farmers Market - Vendor Bulletin',
    previewText: 'Important information for vendors at this weekend\'s Flow Farmers Market',
    mainContent: mainContent,
    footerContent: `
      <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} Flow Farmers Market. All rights reserved.</p>
      <p style="margin-bottom: 0;">698 NE 1st Avenue, Miami, FL 33132</p>
    `
  });
} 