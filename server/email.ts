import { Resend } from 'resend';
import { User, Group, GroupInvitation } from '@shared/schema';

// Function to check if Resend API is properly configured
export function hasEmailConfiguration(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Export detailed configuration check function
export function checkEmailConfig(): {
  configured: boolean;
  provider: 'resend' | 'none';
  missingFields: string[];
  details: {
    resend?: {
      configured: boolean;
      apiKey: boolean;
    };
  };
} {
  const resendFields = ['RESEND_API_KEY'];
  const missingResendFields = resendFields.filter(field => !process.env[field]);
  
  const hasResend = missingResendFields.length === 0;
  
  let provider: 'resend' | 'none' = 'none';
  if (hasResend) {
    provider = 'resend';
  }
  
  return {
    configured: hasResend,
    provider,
    missingFields: hasResend ? [] : missingResendFields,
    details: {
      resend: {
        configured: hasResend,
        apiKey: !!process.env.RESEND_API_KEY
      }
    }
  };
}

// Create Resend client
function createResendClient() {
  if (!hasEmailConfiguration()) {
    console.warn('Resend email service is not properly configured. Set RESEND_API_KEY environment variable.');
    return null;
  }
  
  return new Resend(process.env.RESEND_API_KEY);
}

// Create invitation email content (no sending)
export function createInvitationEmailContent(
  invitation: GroupInvitation, 
  group: Group, 
  inviter?: User
): { html: string; text: string; subject: string } {
  // Base URL for invitation link (from environment or default to localhost)
  const baseUrl = process.env.APP_URL || 'http://localhost:5000';
  const invitationLink = `${baseUrl}/invitation/${invitation.token}`;

  // Format inviter's name if available
  const inviterName = inviter 
    ? (inviter.displayName || `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email) 
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

// Send invitation email using Resend
export async function sendInvitationEmail(
  invitation: GroupInvitation, 
  group: Group, 
  inviter?: User
): Promise<boolean> {
  const resend = createResendClient();
  
  // If client couldn't be created, fail silently
  if (!resend) {
    console.log(`Email would have been sent to ${invitation.inviteeEmail} for group "${group.name}"`);
    return false;
  }

  try {
    // Generate email content
    const { html, text, subject } = createInvitationEmailContent(invitation, group, inviter);
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'spltr3 <onboarding@resend.dev>', // Default sender for Resend free tier
      to: invitation.inviteeEmail,
      subject,
      html,
      text,
    });
    
    if (error) {
      console.error('Error sending invitation email with Resend:', error);
      return false;
    }
    
    console.log(`Invitation email sent to ${invitation.inviteeEmail} with Resend ID:`, data?.id);
    return true;
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}