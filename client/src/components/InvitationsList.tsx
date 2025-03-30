import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { User } from '@shared/schema';

type GroupInvitation = {
  id: number;
  groupId: number;
  inviterUserId: number;
  inviteeEmail: string;
  status: string;
  token: string;
  invitedAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  inviterUser?: User;
  group?: {
    id: number;
    name: string;
  };
};

export function InvitationsList({ groupId }: { groupId: number }) {
  // Fetch invitations for this group
  const { data: invitations = [] } = useQuery<GroupInvitation[]>({
    queryKey: ['/api/groups', groupId, 'invitations'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/invitations`),
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <Card className="w-full mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No invitations found
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation, index) => (
              <div key={invitation.id}>
                {index > 0 && <Separator className="my-3" />}
                <InvitationItem 
                  invitation={invitation} 
                  getStatusColor={getStatusColor}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for invitation items
function InvitationItem({ 
  invitation, 
  getStatusColor 
}: { 
  invitation: GroupInvitation, 
  getStatusColor: (status: string) => string 
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Invitation</span>
        <Badge className={`${getStatusColor(invitation.status)} font-normal`}>
          {invitation.status}
        </Badge>
      </div>
      <p className="text-sm">
        {invitation.inviterUser?.firstName && invitation.inviterUser.lastName
          ? `${invitation.inviterUser.firstName} ${invitation.inviterUser.lastName}` 
          : invitation.inviterUser?.displayName || invitation.inviterUser?.email || 'Someone'} 
        invited {invitation.inviteeEmail}
      </p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(invitation.invitedAt), { addSuffix: true })}
        </span>
        {invitation.acceptedAt && (
          <span className="text-xs text-muted-foreground">
            Accepted {formatDistanceToNow(new Date(invitation.acceptedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}