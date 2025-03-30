import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Mail, UserCheck, XCircle, CheckCircle, Trash2, Copy, Link2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { copyInvitationLink, getInvitationUrl } from '@/lib/invitationUtils';

type GroupInvitation = {
  id: number;
  groupId: number;
  inviterUserId: number;
  inviteeEmail: string;
  inviteeFirstName: string | null;
  status: string;
  invitedAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  token: string;
  inviterName?: string | null;
};

interface PendingInvitationsProps {
  groupId: number;
}

export function PendingInvitations({ groupId }: PendingInvitationsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: invitations, isLoading } = useQuery<GroupInvitation[]>({
    queryKey: [`/api/groups/${groupId}/invitations`],
    enabled: !!groupId,
  });
  
  const handleCancelInvitation = async (invitationId: number) => {
    try {
      await apiRequest('PUT', `/api/invitations/${invitationId}`, {
        status: 'canceled'
      });
      
      toast({
        title: "Invitation canceled",
        description: "The invitation has been successfully canceled.",
      });
      
      // Refresh invitations list
      queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/invitations`] });
    } catch (error) {
      console.error('Error canceling invitation:', error);
      toast({
        title: "Error",
        description: "Failed to cancel the invitation. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleResendEmail = async (invitation: GroupInvitation) => {
    try {
      // Call the API to resend the invitation email
      await apiRequest('POST', `/api/invitations/${invitation.id}/resend`, {});
      
      toast({
        title: "Email sent",
        description: `Invitation email has been sent to ${invitation.inviteeEmail}.`,
      });
    } catch (error) {
      console.error('Error sending invitation email:', error);
      toast({
        title: "Error",
        description: "Failed to send the invitation email. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading invitations...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!invitations || invitations.length === 0) {
    return null;
  }
  
  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Invitations</CardTitle>
        <CardDescription className="text-xs">
          People who have been invited to join this group
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center space-x-2">
                <div className="p-1 bg-primary/10 rounded">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{invitation.inviteeEmail}</p>
                    <StatusBadge status={invitation.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span>Invited {formatInvitationDate(invitation.invitedAt)}</span>
                    {invitation.inviterName && (
                      <span> by {invitation.inviterName}</span>
                    )}
                    {invitation.expiresAt && invitation.status === 'pending' && (
                      <div className="text-xs text-amber-600">
                        Expires {formatInvitationDate(invitation.expiresAt)}
                      </div>
                    )}
                    
                    {/* Add note for accepted invitations where user hasn't created an account yet */}
                    {invitation.status === 'accepted' && (
                      <div className="mt-1 italic">
                        Waiting for user to create an account
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action buttons based on invitation status */}
              {invitation.status === 'pending' && (
                <div className="flex space-x-1">
                  {/* Send email button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-blue-500"
                    onClick={() => handleResendEmail(invitation)}
                    title="Resend invitation email"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Resend invitation email</span>
                  </Button>
                  
                  {/* Copy link button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    onClick={async () => {
                      const success = await copyInvitationLink(invitation.token);
                      if (success) {
                        toast({
                          title: "Link copied!",
                          description: "Invitation link copied to clipboard",
                        });
                      } else {
                        toast({
                          title: "Error",
                          description: "Could not copy link to clipboard",
                          variant: "destructive",
                        });
                      }
                    }}
                    title="Copy invitation link"
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="sr-only">Copy invitation link</span>
                  </Button>
                  
                  {/* Cancel button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleCancelInvitation(invitation.id)}
                    title="Cancel invitation"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Cancel invitation</span>
                  </Button>
                </div>
              )}
              
              {/* Action buttons for accepted invitations */}
              {invitation.status === 'accepted' && (
                <div className="flex space-x-1">
                  {/* Copy link button - useful if they need to resend the invitation link */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                    onClick={async () => {
                      const success = await copyInvitationLink(invitation.token);
                      if (success) {
                        toast({
                          title: "Link copied!",
                          description: "Invitation link copied to clipboard to resend",
                        });
                      } else {
                        toast({
                          title: "Error",
                          description: "Could not copy link to clipboard",
                          variant: "destructive",
                        });
                      }
                    }}
                    title="Copy invitation link to resend"
                  >
                    <Link2 className="h-4 w-4" />
                    <span className="sr-only">Copy invitation link</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'pending':
      return (
        <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50 text-[10px] h-5">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case 'accepted':
      return (
        <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50 text-[10px] h-5">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50 text-[10px] h-5">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    case 'canceled':
      return (
        <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50 text-[10px] h-5">
          <Trash2 className="h-3 w-3 mr-1" />
          Canceled
        </Badge>
      );
    default:
      return null;
  }
}

function formatInvitationDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    return 'recently';
  }
}