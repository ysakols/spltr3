import { Resend } from 'resend';

// Create invitation email content function (copied directly to avoid import issues)
function createInvitationEmailContent(
  invitation, 
  group, 
  inviter
) {
  // Base URL for invitation link (from environment or default to localhost)
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const invitationLink = `${baseUrl}/invitation/${invitation.token}`;

  // Format inviter's name if available
  const inviterName = inviter 
    ? (inviter.display_name || `${inviter.first_name || ''} ${inviter.last_name || ''}`.trim() || inviter.email) 
    : 'Someone';

  // Format expiration date if available
  const expirationDate = invitation.expiresAt 
    ? new Date(invitation.expiresAt).toLocaleDateString()
    : 'one week from now';
  
  // Subject line
  const subject = `You've been invited to join "${group.name}" on spltr3`;
  
  // HTML email content
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
    }
    .container {
      padding: 20px;
      border: 1px solid #eaeaea;
      border-radius: 5px;
    }
    .header {
      border-bottom: 1px solid #eaeaea;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #6366f1;
    }
    .button {
      display: inline-block;
      background-color: #6366f1;
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 4px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eaeaea;
      padding-top: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">spltr3</div>
    </div>
    
    <p>Hello,</p>
    
    <p><strong>${inviterName}</strong> has invited you to join the expense group <strong>"${group.name}"</strong> on spltr3.</p>
    
    <p>To accept this invitation, click the button below:</p>
    
    <a href="${invitationLink}" class="button">Accept Invitation</a>
    
    <p>This invitation will expire on ${expirationDate}.</p>
    
    <p>If you don't have an account yet, you'll be able to create one when you accept the invitation.</p>
    
    <p>Best regards,<br>The spltr3 Team</p>
    
    <div class="footer">
      <p>If you're having trouble with the button above, copy and paste the URL below into your web browser:</p>
      <p>${invitationLink}</p>
    </div>
  </div>
</body>
</html>
  `;
  
  // Plain text content
  const text = `
Hello,

${inviterName} has invited you to join the expense group "${group.name}" on spltr3.

To accept this invitation, click the link below:
${invitationLink}

This invitation will expire on ${expirationDate}.

If you don't have an account yet, you'll be able to create one when you accept the invitation.

Best regards,
The spltr3 Team
  `;
  
  return { html, text, subject };
}

const mockInvitation = {
  id: 0,
  groupId: 1,
  inviterUserId: 999,
  inviteeEmail: 'delivered@resend.dev',
  inviteeName: null,
  token: 'test-token-' + Date.now(),
  status: 'pending',
  invitedAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  acceptedAt: null
};

const mockGroup = {
  id: 1,
  name: 'Test Group',
  description: 'A test group for email sending',
  createdAt: new Date(),
  createdById: 999,
};

const mockUser = {
  id: 999,
  email: 'test-sender@example.com',
  first_name: 'Test',
  last_name: 'User',
  display_name: 'Test User'
};

async function main() {
  console.log('Starting direct email test...');
  console.log('RESEND_API_KEY present:', !!process.env.RESEND_API_KEY);
  console.log('RESEND_API_KEY length:', process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0);
  
  // Create Resend client
  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log('Resend client created:', !!resend);
  
  try {
    // Generate email content
    const { html, text, subject } = createInvitationEmailContent(mockInvitation, mockGroup, mockUser);
    console.log('Email content generated');
    
    // Send email
    console.log('Sending email to:', mockInvitation.inviteeEmail);
    const result = await resend.emails.send({
      from: 'spltr3 <onboarding@resend.dev>',
      to: 'delivered@resend.dev',
      subject,
      html,
      text,
    });
    
    console.log('Email send result:', JSON.stringify(result, null, 2));
    
    if (result.error) {
      console.error('Failed to send email:', result.error);
    } else {
      console.log('Email sent successfully with ID:', result.data.id);
    }
  } catch (error) {
    console.error('Exception during email sending:', error);
    if (error.response) {
      console.error('Response error data:', error.response.data);
    }
  }
}

main().catch(error => {
  console.error('Unhandled error in main function:', error);
});