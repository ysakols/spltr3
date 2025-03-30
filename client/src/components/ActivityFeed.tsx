import { useState, useEffect, useMemo } from 'react';
import { User } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';

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

type Settlement = {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  groupId?: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  transactionReference?: string;
  fromUser?: User;
  toUser?: User;
  group?: {
    id: number;
    name: string;
  };
};

type Activity = {
  type: 'invitation' | 'settlement';
  timestamp: string;
  data: GroupInvitation | Settlement;
};

export function ActivityFeed({ groupId }: { groupId: number }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch invitations for this group
  const { data: invitations = [] } = useQuery({
    queryKey: ['/api/groups', groupId, 'invitations'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/invitations`),
  });

  // Fetch settlements for this group
  const { data: settlements = [] } = useQuery({
    queryKey: ['/api/groups', groupId, 'settlements'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/settlements`),
  });

  // Combine and sort invitations and settlements by timestamp - using useMemo to prevent re-computation
  const sortedActivities = useMemo(() => {
    // Only process if we have valid arrays 
    if (!Array.isArray(invitations) || !Array.isArray(settlements)) {
      return [];
    }
    
    const invitationActivities: Activity[] = invitations.map((invitation: GroupInvitation) => ({
      type: 'invitation',
      timestamp: invitation.invitedAt,
      data: invitation
    }));

    const settlementActivities: Activity[] = settlements.map((settlement: Settlement) => ({
      type: 'settlement',
      timestamp: settlement.createdAt,
      data: settlement
    }));

    // Combine all activities and sort by timestamp (most recent first)
    return [...invitationActivities, ...settlementActivities].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [invitations, settlements]);
  
  // Update state once when sorted activities change
  useEffect(() => {
    setActivities(sortedActivities);
  }, [sortedActivities]);

  // Filter activities based on active tab
  const filteredActivities = activeTab === 'all' 
    ? activities 
    : activities.filter(activity => activity.type === activeTab);

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'accepted':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'expired':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  // Format payment method for display
  const formatPaymentMethod = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'Cash';
      case 'venmo':
        return 'Venmo';
      case 'other':
        return 'Other';
      default:
        return method;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Activity</CardTitle>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="invitation">Invitations</TabsTrigger>
            <TabsTrigger value="settlement">Settlements</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        {filteredActivities.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No activity found
          </div>
        ) : (
          <div className="space-y-4">
            {filteredActivities.map((activity, index) => (
              <div key={`${activity.type}-${activity.type === 'invitation' 
                  ? (activity.data as GroupInvitation).id 
                  : (activity.data as Settlement).id}`}>
                {index > 0 && <Separator className="my-3" />}
                
                {activity.type === 'invitation' && (
                  <InvitationActivity 
                    invitation={activity.data as GroupInvitation} 
                    getStatusColor={getStatusColor}
                  />
                )}
                
                {activity.type === 'settlement' && (
                  <SettlementActivity 
                    settlement={activity.data as Settlement} 
                    getStatusColor={getStatusColor}
                    formatPaymentMethod={formatPaymentMethod}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Component for invitation activities
function InvitationActivity({ 
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
        {invitation.inviterUser?.firstName || invitation.inviterUser?.email || 'Someone'} invited {invitation.inviteeEmail}
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

// Component for settlement activities
function SettlementActivity({ 
  settlement, 
  getStatusColor,
  formatPaymentMethod
}: { 
  settlement: Settlement, 
  getStatusColor: (status: string) => string,
  formatPaymentMethod: (method: string) => string
}) {
  const amount = typeof settlement.amount === 'string' 
    ? parseFloat(settlement.amount) 
    : settlement.amount;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Settlement</span>
        <Badge className={`${getStatusColor(settlement.status)} font-normal`}>
          {settlement.status}
        </Badge>
      </div>
      <p className="text-sm">
        {settlement.fromUser ? `${settlement.fromUser.firstName} ${settlement.fromUser.lastName}` : 'Someone'} paid {settlement.toUser ? `${settlement.toUser.firstName} ${settlement.toUser.lastName}` : 'someone'} ${amount.toFixed(2)} via {formatPaymentMethod(settlement.paymentMethod)}
      </p>
      {settlement.notes && (
        <p className="text-xs italic">"{settlement.notes}"</p>
      )}
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(settlement.createdAt), { addSuffix: true })}
        </span>
        {settlement.completedAt && (
          <span className="text-xs text-muted-foreground">
            Completed {formatDistanceToNow(new Date(settlement.completedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}