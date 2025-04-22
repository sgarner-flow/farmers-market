import sgMail from '@sendgrid/mail';

// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('⚠️ SENDGRID_API_KEY is not set. Email functionality will not work correctly.');
}

// Base URL for image assets in emails
const getImageBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_PRODUCTION_URL || 
         process.env.NEXT_PUBLIC_APP_URL ||
         'https://flowfarmersmarket.vercel.app';
};

/**
 * Returns the URL for an image to be used in emails
 * @param imagePath Path to the image relative to public directory
 */
export function getEmailImageUrl(imagePath: string): string {
  const baseUrl = getImageBaseUrl();
  
  // Special handling for common email images to ensure consistent URLs
  // rather than relying on filesystem access
  const imageName = imagePath.toLowerCase().replace(/^public\//, '');
  
  // Handle specific image files with hardcoded paths
  if (imageName.includes('flow-header.png') || imageName === 'flow-header.png') {
    return `${baseUrl}/Flow-Header.png`;
  }
  if (imageName.includes('flow-divider') || imageName === 'flow-divider.png') {
    return `${baseUrl}/flow-divider.png`;
  }
  if (imageName.includes('flow-footer') || imageName === 'flow-footer.svg') {
    // Return an absolute URL for the SVG file
    return `https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Oneness_-_light_1.png`;
  }
  if (imageName.includes('flow-logo') || imageName === 'flow-logo.svg') {
    return `https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Flow-Header.png`;
  }
  if (imageName.includes('dividier') || imageName.includes('divider-padded')) {
    return `https://rbreohiwrvcpfznnpumh.supabase.co/storage/v1/object/public/images//Dividier-Padded.png`;
  }
  
  // Default handling for other images
  const cleanPath = imagePath.replace(/^public\//, '');
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Sends an email using SendGrid
 * This is a wrapper around sgMail.send with better error handling
 */
export async function sendEmail(options: {
  to: string | { email: string; name?: string };
  from?: { email: string; name?: string };
  subject: string;
  html: string;
  text?: string;
}) {
  console.log("💌 sendEmail utility called");
  
  // Check if SendGrid API key is set
  if (!process.env.SENDGRID_API_KEY) {
    console.error("❌ SENDGRID_API_KEY is not set - email functionality disabled");
    throw new Error('SendGrid API key is not configured');
  }
  
  // Default from address
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sgarns@gmail.com';
  console.log(`💌 Using from email: ${fromEmail}`);
  
  // Recipient address
  const toEmail = typeof options.to === 'string' ? options.to : options.to.email;
  console.log(`💌 Sending to: ${toEmail}`);
  
  // Prepare email object
  const msg = {
    to: options.to,
    from: options.from || {
      email: fromEmail,
      name: 'Flow Farmers Market'
    },
    subject: options.subject,
    html: options.html,
    text: options.text || options.html.replace(/<[^>]*>/g, ''),
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    }
  };

  try {
    // Check if in development mode with email sending disabled
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_EMAIL_SENDING === 'true') {
      console.log('💌 Email sending disabled in development mode. Would have sent email to:', 
        typeof options.to === 'string' ? options.to : options.to.email);
      return { success: true, simulated: true };
    }
    
    console.log(`💌 Attempting to send email to ${toEmail}`);
    
    // Send the email
    const result = await sgMail.send(msg);
    console.log(`💌 Email sent successfully to ${toEmail}:`, { statusCode: result[0]?.statusCode });
    return { success: true, result };
  } catch (error: unknown) {
    const typedError = error as { message?: string; code?: string; response?: { body?: unknown } };
    
    console.error('❌ Email sending failed:', {
      message: typedError.message,
      code: typedError.code,
      response: typedError.response?.body
    });
    
    // Try simpler configuration as fallback
    try {
      console.log('💌 Attempting simplified email send as fallback...');
      await sgMail.send({
        to: options.to,
        from: fromEmail,
        subject: options.subject,
        html: options.html
      });
      console.log(`💌 Fallback email sent successfully to ${toEmail}`);
      return { success: true, fallback: true };
    } catch (retryError: unknown) {
      const typedRetryError = retryError as { message?: string; code?: string; response?: { body?: unknown } };
      console.error('❌ Retry also failed:', {
        message: typedRetryError.message,
        code: typedRetryError.code,
        response: typedRetryError.response?.body
      });
      
      throw new Error(`Failed to send email: ${typedError.message || 'Unknown error'}`);
    }
  }
} 