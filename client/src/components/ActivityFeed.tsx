import { useMemo } from 'react';
import { User, TransactionType, TransactionStatus } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { 
  FileEdit, 
  Trash 
} from 'lucide-react';

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

// Transaction type for the unified data model
type Transaction = {
  id: number;
  type: string; // 'expense' or 'settlement'
  description: string;
  amount: string | number;
  paidByUserId: number;
  createdByUserId?: number;
  date: string;
  createdAt: string;
  groupId: number;
  // Expense-specific fields
  splitType?: string;
  splitDetails?: string;
  // Settlement-specific fields
  toUserId?: number;
  paymentMethod?: string;
  status?: string;
  notes?: string;
  completedAt?: string;
  transactionReference?: string;
  // User details
  paidByUser?: User;
  createdByUser?: User;
  toUser?: User;
  // Audit fields
  updatedAt?: string;
  deletedAt?: string;
  updatedByUserId?: number;
  deletedByUserId?: number;
  updatedByUser?: User;
  deletedByUser?: User;
  isDeleted?: boolean;
  isEdited?: boolean;
  previousValues?: string;
};

// Activity type for the feed
type Activity = {
  type: 'invitation' | 'transaction' | 'edit' | 'delete';
  activityType?: string; // More specific: 'expense', 'settlement', etc.
  timestamp: string;
  data: GroupInvitation | Transaction;
};

export function ActivityFeed({ groupId }: { groupId: number }) {
  // Fetch invitations for this group
  const { data: invitations = [] } = useQuery({
    queryKey: ['/api/groups', groupId, 'invitations'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/invitations`),
  });

  // Fetch transactions for this group (replaces separate expense and settlement queries)
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/groups', groupId, 'transactions'],
    queryFn: () => apiRequest('GET', `/api/groups/${groupId}/transactions`),
  });

  // Compute activities from invitations and transactions
  const sortedActivities = useMemo(() => {
    // Only process if we have valid arrays 
    if (!Array.isArray(invitations) || !Array.isArray(transactions)) {
      return [];
    }
    
    const invitationActivities: Activity[] = invitations.map((invitation: GroupInvitation) => ({
      type: 'invitation',
      timestamp: invitation.invitedAt,
      data: invitation
    }));

    // Process regular transactions (creations)
    const transactionActivities: Activity[] = transactions
      .filter(transaction => !transaction.isDeleted && !transaction.isEdited)
      .map((transaction: Transaction) => ({
        type: 'transaction',
        activityType: transaction.type,
        timestamp: transaction.createdAt,
        data: transaction
      }));

    // Process edited transactions
    const editActivities: Activity[] = transactions
      .filter(transaction => transaction.isEdited && !transaction.isDeleted && transaction.updatedAt)
      .map((transaction: Transaction) => ({
        type: 'edit',
        activityType: transaction.type,
        timestamp: transaction.updatedAt!,
        data: transaction
      }));

    // Process deleted transactions
    const deleteActivities: Activity[] = transactions
      .filter(transaction => transaction.isDeleted && transaction.deletedAt)
      .map((transaction: Transaction) => ({
        type: 'delete',
        activityType: transaction.type,
        timestamp: transaction.deletedAt!,
        data: transaction
      }));

    // Combine all activities and sort by timestamp (most recent first)
    return [
      ...invitationActivities, 
      ...transactionActivities,
      ...editActivities,
      ...deleteActivities
    ].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [invitations, transactions]);

  // Display all activities
  const activities = sortedActivities;

  // Get status badge color
  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 border-gray-300';
    
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
  const formatPaymentMethod = (method?: string) => {
    if (!method) return 'Unknown';
    
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
        <CardTitle className="text-xl">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No activity found
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity: Activity, index: number) => {
              const key = `${activity.type}-${
                activity.type === 'invitation' 
                  ? (activity.data as GroupInvitation).id 
                  : (activity.data as Transaction).id
              }-${activity.timestamp}`;
              
              return (
                <div key={key}>
                  {index > 0 && <Separator className="my-3" />}
                  
                  {activity.type === 'invitation' && (
                    <InvitationActivity 
                      invitation={activity.data as GroupInvitation} 
                      getStatusColor={getStatusColor}
                    />
                  )}
                  
                  {activity.type === 'transaction' && activity.activityType === 'settlement' && (
                    <SettlementActivity 
                      transaction={activity.data as Transaction} 
                      getStatusColor={getStatusColor}
                      formatPaymentMethod={formatPaymentMethod}
                    />
                  )}
                  
                  {activity.type === 'transaction' && activity.activityType === 'expense' && (
                    <ExpenseActivity 
                      transaction={activity.data as Transaction} 
                    />
                  )}
                  
                  {activity.type === 'edit' && (
                    <EditActivity 
                      transaction={activity.data as Transaction}
                      formatPaymentMethod={formatPaymentMethod}
                    />
                  )}
                  
                  {activity.type === 'delete' && (
                    <DeleteActivity 
                      transaction={activity.data as Transaction}
                    />
                  )}
                </div>
              );
            })}
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

// Component for expense activities
function ExpenseActivity({ 
  transaction
}: { 
  transaction: Transaction
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Expense Added</span>
        <Badge variant="outline" className="font-normal">
          {transaction.splitType || 'Split'}
        </Badge>
      </div>
      <p className="text-sm">
        <span className="font-medium">{transaction.description}</span>: {transaction.createdByUser?.firstName || 'Someone'} added an expense of {formatCurrency(transaction.amount)} paid by {transaction.paidByUser?.firstName || 'Unknown'}
      </p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// Component for settlement activities
function SettlementActivity({ 
  transaction, 
  getStatusColor,
  formatPaymentMethod
}: { 
  transaction: Transaction,
  getStatusColor: (status?: string) => string,
  formatPaymentMethod: (method?: string) => string
}) {
  const payer = transaction.paidByUser?.firstName || 'Someone';
  const receiver = transaction.toUser?.firstName || 'Someone';
  
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium">Payment</span>
        <Badge className={`${getStatusColor(transaction.status)} font-normal`}>
          {transaction.status || TransactionStatus.PENDING}
        </Badge>
      </div>
      <p className="text-sm">
        {payer} paid {receiver} {formatCurrency(transaction.amount)} via {formatPaymentMethod(transaction.paymentMethod)}
      </p>
      {transaction.notes && (
        <p className="text-xs italic">"{transaction.notes}"</p>
      )}
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
        </span>
        {transaction.completedAt && (
          <span className="text-xs text-muted-foreground">
            Completed {formatDistanceToNow(new Date(transaction.completedAt), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}

// Component for edit activities
function EditActivity({ 
  transaction,
  formatPaymentMethod
}: { 
  transaction: Transaction,
  formatPaymentMethod: (method?: string) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium flex items-center">
          <FileEdit className="h-4 w-4 mr-1" />
          {transaction.type === TransactionType.EXPENSE ? 'Expense Edited' : 'Payment Edited'}
        </span>
        <Badge variant="outline" className="font-normal bg-blue-50">
          Edited
        </Badge>
      </div>
      <p className="text-sm">
        {transaction.updatedByUser?.firstName || 'Someone'} edited {' '}
        {transaction.type === TransactionType.EXPENSE 
          ? `expense "${transaction.description}"`
          : `payment of ${formatCurrency(transaction.amount)} via ${formatPaymentMethod(transaction.paymentMethod)}`
        }
      </p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {transaction.updatedAt && formatDistanceToNow(new Date(transaction.updatedAt), { addSuffix: true })}
        </span>
      </div>
      {transaction.previousValues && (
        <div className="mt-1 text-xs text-muted-foreground border-l-2 border-muted pl-2">
          {(() => {
            try {
              const prevValues = JSON.parse(transaction.previousValues);
              return (
                <div className="space-y-1">
                  <p className="font-medium">Previous Values:</p>
                  {transaction.type === TransactionType.EXPENSE ? (
                    <>
                      <p>Description: {prevValues.description}</p>
                      <p>Amount: {formatCurrency(prevValues.amount)}</p>
                      <p>Date: {new Date(prevValues.date).toLocaleDateString()}</p>
                      {prevValues.splitType && <p>Split Type: {prevValues.splitType}</p>}
                    </>
                  ) : (
                    <>
                      <p>Amount: {formatCurrency(prevValues.amount)}</p>
                      <p>Date: {new Date(prevValues.date).toLocaleDateString()}</p>
                      {prevValues.paymentMethod && <p>Payment Method: {formatPaymentMethod(prevValues.paymentMethod)}</p>}
                      {prevValues.status && <p>Status: {prevValues.status}</p>}
                      {prevValues.notes && <p>Notes: {prevValues.notes}</p>}
                    </>
                  )}
                </div>
              );
            } catch (e) {
              // If parsing fails, just show the raw string
              return <p>Previous details: {transaction.previousValues}</p>;
            }
          })()}
        </div>
      )}
    </div>
  );
}

// Component for delete activities
function DeleteActivity({ 
  transaction
}: { 
  transaction: Transaction
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-medium flex items-center">
          <Trash className="h-4 w-4 mr-1" />
          {transaction.type === TransactionType.EXPENSE ? 'Expense Deleted' : 'Payment Deleted'}
        </span>
        <Badge variant="destructive" className="font-normal">
          Deleted
        </Badge>
      </div>
      <p className="text-sm">
        {transaction.deletedByUser?.firstName || 'Someone'} deleted {' '}
        {transaction.type === TransactionType.EXPENSE 
          ? `expense "${transaction.description}"`
          : `payment of ${formatCurrency(transaction.amount)}`
        }
      </p>
      <div className="flex justify-between items-center mt-1">
        <span className="text-xs text-muted-foreground">
          {transaction.deletedAt && formatDistanceToNow(new Date(transaction.deletedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}