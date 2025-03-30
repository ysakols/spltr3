import { Resend } from 'resend';

async function main() {
  // Log environment info
  console.log('Node version:', process.version);
  console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
  console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0);
  
  // Create Resend client
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  // Log the client
  console.log('Resend client created:', !!resend);
  
  try {
    // Attempt to send a test email
    console.log('Sending test email...');
    
    const result = await resend.emails.send({
      from: 'spltr3 <onboarding@resend.dev>',
      to: 'delivered@resend.dev',  // Resend's official test email for deliverability testing
      subject: 'Test Email from spltr3',
      html: '<h1>Test Email</h1><p>This is a test email from spltr3 application.</p>',
      text: 'Test Email\n\nThis is a test email from spltr3 application.'
    });
    
    console.log('Email send result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('Failed to send email:', result.error);
    } else {
      console.log('Email sent successfully with ID:', result.data.id);
    }
  } catch (error) {
    console.error('Exception while sending email:');
    console.error(error);
    
    // Print error details
    if (error.response) {
      console.error('Response error data:', error.response.data);
    }
  }
}

main().catch(error => {
  console.error('Unhandled error in main function:', error);
});