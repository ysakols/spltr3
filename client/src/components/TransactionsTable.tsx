import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Trash2, Edit2, ArrowUpDown, ArrowDown, ArrowUp, Banknote, CreditCard, 
  CheckCircle2, XCircle, Clock, CalendarIcon, DollarSign, User as UserIcon, Tag, 
  AlertTriangle, Loader2, Check
} from 'lucide-react';
import { useSettlementModal } from '@/hooks/use-settlement-modal';
import { useExpenseFunctions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

import { format } from 'date-fns';
import type { User } from '@shared/schema';
import { SplitType, TransactionType, PaymentMethod, TransactionStatus } from '@shared/schema';

interface Transaction {
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
}

interface TransactionsTableProps {
  groupId: number;
  totalAmount: number;
  onTransactionDeleted: () => void;
  onEditExpense?: (expense: any) => void;
  members?: User[]; // Accept members from parent component if available
}

function TransactionsTable({ 
  groupId,
  totalAmount, 
  onTransactionDeleted, 
  onEditExpense,
  members: propMembers 
}: TransactionsTableProps) {
  const { handleDeleteExpense, formatCurrency } = useExpenseFunctions();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get current user
  const { data: currentUser } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    queryFn: getQueryFn({ 
      on401: "returnNull" 
    }),
    staleTime: 60000,
  });
  
  // State for sorting
  const [sortField, setSortField] = useState<string | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Fetch transactions for this group (combines both expenses and settlements)
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/groups', groupId, 'transactions'],
    queryFn: () => {
      return apiRequest('GET', `/api/groups/${groupId}/transactions`);
    },
  });
  
  // Only fetch members if we have transactions and they weren't passed as props
  const { data: fetchedMembers } = useQuery<User[]>({
    queryKey: ['/api/groups', groupId, 'members'],
    enabled: !!groupId && !propMembers
  });
  
  // Use members from props if available, otherwise use fetched members
  const members = propMembers || fetchedMembers || [];
  
  // Sort transactions
  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let sorted = [...transactions];
    
    if (sortField) {
      sorted.sort((a: any, b: any) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        // Handle date sorting
        if (sortField === 'date' || sortField === 'createdAt' || sortField === 'completedAt') {
          aValue = new Date(aValue || 0).getTime();
          bValue = new Date(bValue || 0).getTime();
        }
        
        // Handle numeric sorting
        if (sortField === 'amount') {
          aValue = parseFloat(aValue);
          bValue = parseFloat(bValue);
        }
        
        // Sort direction
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }
    
    return sorted;
  }, [transactions, sortField, sortDirection]);
  
  // Function to get username by user ID with display_name preferred
  const getUsernameById = (userId?: number) => {
    if (!userId || !members) return 'Unknown User';
    
    const user = members.find(member => member.id === userId);
    if (!user) return `User ${userId}`;
    
    return user.display_name || 
      ((user.first_name && user.last_name) 
        ? `${user.first_name} ${user.last_name}`
        : user.email || `User ${userId}`);
  };
  
  // Function to handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Render the sort indicator for column headers
  const renderSortIndicator = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };
  
  // Function to get label for split type
  const getSplitTypeLabel = (type?: string) => {
    switch (type) {
      case 'equal':
        return 'Split equally';
      case 'percentage':
        return 'Split by percentage';
      case 'exact':
        return 'Split by exact amounts';
      default:
        return 'Unknown split';
    }
  };
  
  // Function to get style for split type badge
  const getSplitTypeBadgeStyle = (type?: string) => {
    switch (type) {
      case 'equal':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'percentage':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'exact':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  // Function to get status badge color
  const getStatusBadgeStyle = (status?: string) => {
    if (!status) return '';
    
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300 ring-1 ring-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300 ring-1 ring-green-200 font-medium';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-300 ring-1 ring-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };
  
  // Function to get payment method display text
  const getPaymentMethodLabel = (method?: string) => {
    if (!method) return '';
    
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
  
  // Function to get payment method icon
  const getPaymentMethodIcon = (method?: string) => {
    if (!method) return null;
    
    switch (method.toLowerCase()) {
      case 'cash':
        return <Banknote className="h-4 w-4 mr-1" />;
      case 'venmo':
        return <CreditCard className="h-4 w-4 mr-1" />;
      default:
        return <CreditCard className="h-4 w-4 mr-1" />;
    }
  };
  
  // Function to get status icon
  const getStatusIcon = (status?: string) => {
    if (!status) return null;
    
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 mr-1 text-green-600 animate-once-pulse" />;
      case 'pending':
        return <Clock className="h-4 w-4 mr-1 text-amber-600" />;
      case 'canceled':
        return <XCircle className="h-4 w-4 mr-1 text-red-600" />;
      default:
        return null;
    }
  };
  
  // States for delete confirmation
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Delete transaction handler - to be called from confirmation dialog
  const confirmDeleteTransaction = async (transaction: Transaction) => {
    setIsDeleting(true);
    
    try {
      if (transaction.type === 'expense') {
        await apiRequest('DELETE', `/api/expenses/${transaction.id}`);
        
        // Refresh data after deletion
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'global-summary'] });
        onTransactionDeleted();
      } else if (transaction.type === 'settlement') {
        // Use the transactions endpoint instead of the settlements endpoint
        await apiRequest('DELETE', `/api/transactions/${transaction.id}`);
        
        // Refresh all the relevant data after deletion
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'global-summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups/all-summaries'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'settlements'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'settlements'] });
        
        onTransactionDeleted();
      }
    } catch (error) {
      console.error(`Error deleting ${transaction.type}:`, error);
      toast({
        title: "Error",
        description: `Failed to delete ${transaction.type}. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setTransactionToDelete(null);
    }
  };
  
  // Set transaction to delete (this opens the dialog)
  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
  };
  
  // Function to handle edit transaction
  // Function to handle creditor marking a settlement as complete
  const handleMarkSettlementReceived = async (transaction: Transaction) => {
    if (!transaction.toUserId || !transaction.paidByUserId || transaction.type !== 'settlement') {
      return;
    }
    
    // Only allow if the current user is the recipient (creditor)
    if (transaction.toUserId !== currentUser?.id) {
      return;
    }
    
    // Get the payer's name (debtor)
    const payerName = getUsernameById(transaction.paidByUserId);
    
    // Use the settlement modal to confirm
    useSettlementModal.getState().openModal({
      title: 'Mark Payment As Received',
      description: `Confirm that you received ${formatCurrency(parseFloat(transaction.amount.toString()))} from ${payerName}.`,
      fromUserId: transaction.paidByUserId,
      toUserId: transaction.toUserId,
      amount: parseFloat(transaction.amount.toString()),
      groupId: transaction.groupId,
      fromUserName: payerName,
      isCreditor: true,
      onConfirm: async () => {
        try {
          // In a unified transaction system, we need to update the transaction directly
          await apiRequest('PATCH', `/api/transactions/${transaction.id}`, {
            status: 'completed',
            notes: 'Marked as received by creditor'
          });
          
          toast({
            title: 'Payment confirmed',
            description: `You confirmed payment of ${formatCurrency(parseFloat(transaction.amount.toString()))} from ${payerName}`,
          });
          
          // Refresh all the relevant data after update
          queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
          queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'summary'] });
          queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'global-summary'] });
          queryClient.invalidateQueries({ queryKey: ['/api/groups/all-summaries'] });
          queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'settlements'] });
          queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'settlements'] });
          
        } catch (error) {
          console.error('Error confirming payment:', error);
          toast({
            title: 'Error',
            description: 'Could not mark the payment as completed.',
            variant: 'destructive'
          });
        }
      }
    });
  };

  const handleEditTransaction = (transaction: Transaction) => {
    // If it's an expense, pass it to the expense edit handler
    if (transaction.type === 'expense' && onEditExpense) {
      // Convert transaction to expense format for the existing edit function
      const expenseData = {
        id: transaction.id,
        description: transaction.description,
        amount: transaction.amount,
        paidByUserId: transaction.paidByUserId,
        createdByUserId: transaction.createdByUserId,
        splitType: transaction.splitType,
        splitDetails: transaction.splitDetails,
        date: transaction.date,
        createdAt: transaction.createdAt,
        groupId: transaction.groupId,
        // Include user details if available
        paidByUser: transaction.paidByUser,
        createdByUser: transaction.createdByUser
      };
      
      onEditExpense(expenseData);
    } 
    // For settlements, we currently use the delete action and then create a new one
    // Future enhancement: Implement a dedicated settlement edit form
    else if (transaction.type === 'settlement' && 
             (transaction.createdByUserId === currentUser?.id || transaction.paidByUserId === currentUser?.id)) {
      handleDeleteTransaction(transaction);
      // Settlement editing could be implemented in a future iteration
      // For now, delete the settlement and the user can create a new one
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };
  
  // Truncate long text with ellipsis and tooltip
  const truncateText = (text: string, maxLength = 40) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };
  
  // Function to get a summary of who borrowed in an expense
  const getSplitSummary = (transaction: Transaction) => {
    if (!transaction.splitDetails || !transaction.splitType) return null;
    
    try {
      // Parse the split details
      const splitDetails = JSON.parse(transaction.splitDetails);
      const transactionAmount = typeof transaction.amount === 'string' 
        ? parseFloat(transaction.amount) 
        : transaction.amount;
      
      // Get a list of usernames who borrowed (everyone except the payer)
      const borrowerNames = Object.keys(splitDetails)
        .filter(userId => parseInt(userId) !== transaction.paidByUserId)
        .map(userId => {
          const splitValue = splitDetails[userId];
          const name = getUsernameById(parseInt(userId));
          
          // Calculate actual amount based on split type
          let actualAmount = 0;
          if (transaction.splitType === 'percentage') {
            // Convert percentage to dollar amount
            actualAmount = (splitValue / 100) * transactionAmount;
          } else if (transaction.splitType === 'equal') {
            // Equal split - amount is already the dollar value
            actualAmount = splitValue;
          } else {
            // Exact amount - value is already the dollar amount
            actualAmount = splitValue;
          }
          
          return { name, amount: actualAmount };
        });
      
      if (borrowerNames.length === 0) return "No borrowers";
      
      // If there are more than 3 borrowers, just show count
      if (borrowerNames.length > 3) {
        return `${borrowerNames.length} people`;
      }
      
      // Show names and amounts for 1-3 borrowers
      return borrowerNames.map(b => {
        return `${b.name} (${formatCurrency(b.amount)})`;
      }).join(', ');
    } catch (error) {
      console.error("Error parsing split details:", error);
      return "Error parsing split details";
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Card>
          <CardContent className="p-4">
            <div className="h-6 w-full bg-muted/50 rounded animate-pulse mb-4"></div>
            <div className="h-40 w-full bg-muted/30 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <Card className="shadow-sm !rounded-none mb-0 mx-0 px-0">
      <CardHeader className="pb-2 !rounded-none px-3 sm:px-6">
        <div className="flex flex-row justify-between items-center">
          <CardTitle className="text-xl">Transactions</CardTitle>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleSort('date')}
            >
              Date {renderSortIndicator('date')}
            </Button>
            <Button
              variant="ghost" 
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleSort('amount')}
            >
              Amount {renderSortIndicator('amount')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 !rounded-none">
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found. Add an expense to get started.
          </div>
        ) : (
          <div className="grid gap-2 md:gap-3">
            {sortedTransactions.map((transaction) => {
              const isExpense = transaction.type === 'expense';
              const amount = typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount;
              
              return (
                <div 
                  key={`${transaction.type}-${transaction.id}`} 
                  className={`transaction-card border overflow-hidden transition-all hover:shadow-sm ${
                    isExpense 
                      ? 'border-l-4 border-l-indigo-400 bg-card' 
                      : transaction.status?.toLowerCase() === 'completed'
                        ? 'border-l-4 border-l-green-400 bg-green-50/40'
                        : 'border-l-4 border-l-teal-400 bg-card'
                  }`}
                >
                  <div className="p-2 sm:p-3">
                    {/* Transaction header */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 mb-1">
                          {isExpense ? (
                            <CreditCard className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                          ) : (
                            <Banknote className="h-4 w-4 text-teal-500 flex-shrink-0" />
                          )}
                          <h3 className="font-medium text-sm truncate whitespace-nowrap">
                            {transaction.description}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center whitespace-nowrap">
                            <CalendarIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            {formatDate(transaction.date)}
                          </div>
                          <div className="flex items-center whitespace-nowrap">
                            <UserIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                            {isExpense ? (
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                  <span className="font-medium text-green-600">Paid by:</span> 
                                  <span className="truncate max-w-[80px] inline-block">{getUsernameById(transaction.paidByUserId)}</span>
                                </div>
                                {transaction.splitDetails && (
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <span className="font-medium text-amber-600">Borrowed by:</span> 
                                    <span>{getSplitSummary(transaction)}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-amber-600">Payer:</span> 
                                    <span className="truncate max-w-[60px] inline-block">{getUsernameById(transaction.paidByUserId)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium text-green-600">Receiver:</span> 
                                    <span className="truncate max-w-[60px] inline-block">{getUsernameById(transaction.toUserId)}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex-shrink-0">
                        <div className={`font-semibold text-lg ${
                          isExpense ? 'text-gray-800' : 'text-teal-600'
                        }`}>
                          {!isExpense && <span className="mr-1">+</span>}
                          {formatCurrency(amount)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Settlement specific elements */}
                    {!isExpense && transaction.status && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {transaction.paymentMethod && (
                          <Badge variant="outline" className="text-sm py-0.5 h-6 flex items-center">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <span>{getPaymentMethodLabel(transaction.paymentMethod)}</span>
                          </Badge>
                        )}
                        <Badge className={`text-sm py-0.5 h-6 flex items-center ${getStatusBadgeStyle(transaction.status)}`}>
                          {getStatusIcon(transaction.status)}
                          <span>{transaction.status}</span>
                        </Badge>
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    {((isExpense && onEditExpense) || 
                      (!isExpense && 
                      (transaction.createdByUserId === currentUser?.id || transaction.paidByUserId === currentUser?.id || transaction.toUserId === currentUser?.id)
                    )) && (
                      <div className="flex justify-end mt-2 gap-1 border-t pt-1.5 border-gray-100">
                        {/* Edit button - only for expenses */}
                        {(isExpense && onEditExpense) && (
                          <Button 
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-sm"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit2 className="h-4 w-4 mr-1.5" />
                            Edit
                          </Button>
                        )}
                        
                        {/* Mark as Received button - only for pending settlements where current user is creditor */}
                        {!isExpense && 
                          transaction.status?.toLowerCase() === 'pending' && 
                          transaction.toUserId === currentUser?.id && (
                          <Button 
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-sm bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                            onClick={() => handleMarkSettlementReceived(transaction)}
                          >
                            <Check className="h-4 w-4 mr-1.5" />
                            Mark Received
                          </Button>
                        )}
                        
                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4 mr-1.5" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Delete {isExpense ? 'Expense' : 'Settlement'}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                <div>
                                  Are you sure you want to delete this {transaction.type}?
                                  <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                    <div className="font-medium">{transaction.description}</div>
                                    <div className="text-xs text-primary mt-1">
                                      {formatCurrency(amount)}
                                    </div>
                                  </div>
                                  This action cannot be undone.
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => confirmDeleteTransaction(transaction)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isDeleting && transactionToDelete?.id === transaction.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : <Trash2 className="h-4 w-4 mr-2" />}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionsTable;