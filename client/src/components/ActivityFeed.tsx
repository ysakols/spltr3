import { useMemo } from 'react';
import { User, TransactionType, TransactionStatus } from '@shared/schema';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { 
  FileEdit, 
  Trash,
  CreditCard,
  Banknote,
  CheckCircle2,
  User as UserIcon,
  Calendar as CalendarIcon
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
    <Card className="shadow-sm !rounded-none mb-0 mx-0 px-0">
      <CardHeader className="pb-2 space-y-2 !rounded-none px-3 sm:px-6">
        <CardTitle className="text-xl">Activity Feed</CardTitle>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 !rounded-none">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity found
          </div>
        ) : (
          <div className="grid gap-2 md:gap-3">
            {activities.map((activity: Activity, index: number) => {
              const key = `${activity.type}-${
                activity.type === 'invitation' 
                  ? (activity.data as GroupInvitation).id 
                  : (activity.data as Transaction).id
              }-${activity.timestamp}`;
              
              // Determine activity type for styling
              let activityColor = "border-l-blue-400";
              if (activity.type === 'transaction') {
                activityColor = activity.activityType === 'expense' ? "border-l-indigo-400" : "border-l-teal-400";
              } else if (activity.type === 'edit') {
                activityColor = "border-l-purple-400";
              } else if (activity.type === 'delete') {
                activityColor = "border-l-red-400";
              }
              
              return (
                <div 
                  key={key}
                  className={`transaction-card border overflow-hidden bg-card transition-all hover:shadow-sm border-l-4 ${activityColor}`}
                >
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
    <div className="p-2 sm:p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <UserIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <h3 className="font-medium text-sm truncate whitespace-nowrap">
              {invitation.group?.name ? `Group: ${invitation.group.name}` : 'Join group'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <p className="text-sm text-muted-foreground">
              {invitation.inviterUser?.name || invitation.inviterUser?.username || invitation.inviterUser?.email || 'Someone'} invited {invitation.inviteeEmail}
            </p>
          </div>
        </div>
        
        <Badge className={`${getStatusColor(invitation.status)} font-normal text-sm py-0.5 h-6 flex-shrink-0`}>
          {invitation.status}
        </Badge>
      </div>
      
      <div className="flex flex-wrap gap-1 mt-1.5">
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(invitation.invitedAt), { addSuffix: true })}
        </span>
        {invitation.acceptedAt && (
          <span className="flex items-center text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />
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
    <div className="p-2 sm:p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <CreditCard className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <h3 className="font-medium text-sm truncate whitespace-nowrap">
              {transaction.description}
            </h3>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center whitespace-nowrap">
              <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              {format(new Date(transaction.date), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center whitespace-nowrap">
              <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[120px] inline-block">
                Paid by {transaction.paidByUser?.name || transaction.paidByUser?.username || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-bold whitespace-nowrap">{formatCurrency(transaction.amount)}</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mt-1.5">
        <Badge variant="outline" className="text-sm py-0.5 h-6 flex items-center">
          {transaction.splitType || 'Equal split'}
        </Badge>
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
  const payer = transaction.paidByUser?.name || transaction.paidByUser?.username || 'Someone';
  const receiver = transaction.toUser?.name || transaction.toUser?.username || 'Someone';
  
  return (
    <div className="p-2 sm:p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <Banknote className="h-4 w-4 text-teal-500 flex-shrink-0" />
            <h3 className="font-medium text-sm truncate whitespace-nowrap">
              Payment
            </h3>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center whitespace-nowrap">
              <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              {format(new Date(transaction.date), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center gap-1">
              <span className="truncate max-w-[80px] inline-block">{payer}</span>
              <span className="text-muted-foreground">→</span>
              <span className="truncate max-w-[80px] inline-block">{receiver}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-bold whitespace-nowrap text-teal-600">{formatCurrency(transaction.amount)}</span>
          <div className="mt-1">
            <Badge className={`${getStatusColor(transaction.status)} font-normal text-sm py-0.5 h-6 flex-shrink-0`}>
              {transaction.status || TransactionStatus.PENDING}
            </Badge>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mt-1.5">
        <Badge variant="outline" className="text-sm py-0.5 h-6 flex items-center">
          {formatPaymentMethod(transaction.paymentMethod)}
        </Badge>
        
        {transaction.notes && (
          <Badge variant="outline" className="text-sm py-0.5 h-6 flex items-center">
            Note: {transaction.notes}
          </Badge>
        )}
        
        <span className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}
        </span>
        
        {transaction.completedAt && (
          <span className="flex items-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
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
  const isExpense = transaction.type === TransactionType.EXPENSE;
  
  return (
    <div className="p-2 sm:p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <FileEdit className="h-4 w-4 text-purple-500 flex-shrink-0" />
            <h3 className="font-medium text-sm truncate whitespace-nowrap">
              {isExpense ? transaction.description : 'Payment Edit'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center whitespace-nowrap">
              <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              {format(new Date(transaction.date), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center whitespace-nowrap">
              <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[120px] inline-block">
                Edited by {transaction.updatedByUser?.name || transaction.updatedByUser?.username || 'Someone'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-bold whitespace-nowrap">{formatCurrency(transaction.amount)}</span>
          <div className="mt-1">
            <Badge variant="outline" className="font-normal text-sm py-0.5 h-6 bg-purple-50">Edited</Badge>
          </div>
        </div>
      </div>
      
      {transaction.previousValues && (
        <div className="bg-muted/20 rounded-sm p-2 mt-2 text-sm text-muted-foreground space-y-1.5">
          <p className="font-medium">Previous Values:</p>
          {(() => {
            try {
              const prevValues = JSON.parse(transaction.previousValues);
              return (
                <div className="space-y-1">
                  {isExpense ? (
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
                      {prevValues.paymentMethod && <p>Method: {formatPaymentMethod(prevValues.paymentMethod)}</p>}
                      {prevValues.status && <p>Status: {prevValues.status}</p>}
                      {prevValues.notes && <p>Notes: {prevValues.notes}</p>}
                    </>
                  )}
                </div>
              );
            } catch (e) {
              // If parsing fails, just show the raw string
              return <p>Previous details not available</p>;
            }
          })()}
        </div>
      )}
      
      <div className="flex flex-wrap gap-1 mt-1.5">
        <span className="text-xs text-muted-foreground">
          {transaction.updatedAt && formatDistanceToNow(new Date(transaction.updatedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// Component for delete activities
function DeleteActivity({ 
  transaction
}: { 
  transaction: Transaction
}) {
  const isExpense = transaction.type === TransactionType.EXPENSE;
  
  return (
    <div className="p-2 sm:p-3">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <Trash className="h-4 w-4 text-red-500 flex-shrink-0" />
            <h3 className="font-medium text-sm truncate whitespace-nowrap line-through">
              {isExpense ? transaction.description : 'Payment'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center whitespace-nowrap">
              <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              {format(new Date(transaction.date), 'MMM d, yyyy')}
            </div>
            <div className="flex items-center whitespace-nowrap">
              <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
              <span className="truncate max-w-[120px] inline-block">
                Deleted by {transaction.deletedByUser?.name || transaction.deletedByUser?.username || 'Someone'}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="font-bold whitespace-nowrap line-through">{formatCurrency(transaction.amount)}</span>
          <div className="mt-1">
            <Badge variant="destructive" className="font-normal text-sm py-0.5 h-6">Deleted</Badge>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mt-1.5">
        <span className="text-xs text-muted-foreground">
          {transaction.deletedAt && formatDistanceToNow(new Date(transaction.deletedAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}