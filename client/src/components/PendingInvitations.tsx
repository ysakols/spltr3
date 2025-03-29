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
import { Clock, Mail, UserCheck, XCircle, CheckCircle, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

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
        <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
        <CardDescription className="text-xs">
          Invitations that have been sent but not yet accepted
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
                  </div>
                </div>
              </div>
              
              {/* Only show cancel button for pending invitations */}
              {invitation.status === 'pending' && (
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