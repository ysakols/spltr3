import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, ArrowUpDown, ArrowDown, ArrowUp, Banknote, CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useExpenseFunctions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // Fetch transactions for this group (combines both expenses and settlements)
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/groups', groupId, 'transactions'],
    queryFn: () => {
      console.log("Fetching transactions for group:", groupId);
      return apiRequest('GET', `/api/groups/${groupId}/transactions`).then(data => {
        console.log("Transactions data:", data);
        return data;
      });
    },
  });
  
  // Only fetch members if we have transactions and they weren't passed as props
  const { data: fetchedMembers } = useQuery<User[]>({
    queryKey: ['/api/groups', groupId, 'members'],
    enabled: !!groupId && !propMembers
  });
  
  // Use members from props if available, otherwise use fetched members
  const members = propMembers || fetchedMembers || [];
  
  // Filter transactions based on active tab
  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(transaction => 
        transaction.type.toLowerCase() === activeTab.toLowerCase()
      );
  
  // Sort transactions
  const sortedTransactions = useMemo(() => {
    if (!filteredTransactions) return [];
    
    let sorted = [...filteredTransactions];
    
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
  }, [filteredTransactions, sortField, sortDirection]);
  
  // Function to get username by user ID with full name preferred
  const getUsernameById = (userId?: number) => {
    if (!userId || !members) return 'Unknown User';
    
    const user = members.find(member => member.id === userId);
    return user ? (
      user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.displayName || user.email
    ) : `User ${userId}`;
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'canceled':
        return 'bg-red-100 text-red-800 border-red-300';
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
        return <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 mr-1 text-amber-600" />;
      case 'canceled':
        return <XCircle className="h-4 w-4 mr-1 text-red-600" />;
      default:
        return null;
    }
  };
  
  // Delete transaction handler
  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (transaction.type === 'expense') {
      handleDeleteExpense(transaction.id, () => {
        // Refresh data after deletion
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
        onTransactionDeleted();
      });
    } else if (transaction.type === 'settlement') {
      try {
        // Delete settlement via the transactions endpoint
        await apiRequest('DELETE', `/api/transactions/${transaction.id}`);
        
        // Refresh all the relevant data after deletion
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', groupId, 'summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', currentUser?.id, 'global-summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups/all-summaries'] });
        
        onTransactionDeleted();
      } catch (error) {
        console.error('Error deleting settlement:', error);
        // You could add toast notifications here in the future
      }
    }
  };
  
  // Function to handle edit transaction
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
    else if (transaction.type === 'settlement' && transaction.createdByUserId === currentUser?.id) {
      handleDeleteTransaction(transaction);
      // Settlement editing could be implemented in a future iteration
      // For now, delete the settlement and the user can create a new one
    }
  };
  
  // Tab change handler
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
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
    <Card>
      <CardHeader className="pb-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Transactions</CardTitle>
          <div className="flex space-x-1 text-sm">
            <Button
              variant={activeTab === 'all' ? "secondary" : "ghost"}
              className="h-8 px-2"
              onClick={() => handleTabChange('all')}
            >
              All
            </Button>
            <Button
              variant={activeTab === 'expense' ? "secondary" : "ghost"}
              className="h-8 px-2"
              onClick={() => handleTabChange('expense')}
            >
              Expenses
            </Button>
            <Button
              variant={activeTab === 'settlement' ? "secondary" : "ghost"}
              className="h-8 px-2"
              onClick={() => handleTabChange('settlement')}
            >
              Settlements
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No transactions found. Add an expense to get started.
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer w-[140px]" 
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center">
                      Date {renderSortIndicator('date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('description')}
                  >
                    <div className="flex items-center">
                      Description {renderSortIndicator('description')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center">
                      Type {renderSortIndicator('type')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer" 
                    onClick={() => handleSort('paidByUserId')}
                  >
                    <div className="flex items-center">
                      Paid By {renderSortIndicator('paidByUserId')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer text-right" 
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center justify-end">
                      Amount {renderSortIndicator('amount')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTransactions.map((transaction) => (
                  <TableRow key={`${transaction.type}-${transaction.id}`}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="text-left">
                            <span>{truncateText(transaction.description)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{transaction.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      {/* Show badges for additional details */}
                      <div className="flex mt-1 space-x-1">
                        {/* We no longer show split type badges as requested */}
                        
                        {/* For settlements, show payment method and status */}
                        {transaction.type === 'settlement' && transaction.paymentMethod && (
                          <Badge variant="outline" className="text-xs flex items-center">
                            {getPaymentMethodIcon(transaction.paymentMethod)}
                            <span>{getPaymentMethodLabel(transaction.paymentMethod)}</span>
                          </Badge>
                        )}
                        
                        {transaction.type === 'settlement' && transaction.status && (
                          <Badge className={`${getStatusBadgeStyle(transaction.status)} text-xs flex items-center`}>
                            {getStatusIcon(transaction.status)}
                            <span>{transaction.status}</span>
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`${
                          transaction.type === 'expense' 
                            ? 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' 
                            : 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200'
                        }`}
                      >
                        {transaction.type === 'expense' ? 'Expense' : 'Settlement'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'expense' ? (
                        // For expenses, show paidBy
                        getUsernameById(transaction.paidByUserId)
                      ) : (
                        // For settlements, show from -> to
                        <div className="flex items-center text-sm">
                          <span>{getUsernameById(transaction.paidByUserId)}</span>
                          <span className="mx-1">→</span>
                          <span>{getUsernameById(transaction.toUserId)}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${
                        transaction.type === 'settlement' ? 'text-green-600 flex items-center justify-end' : ''
                      }`}>
                        {transaction.type === 'settlement' && (
                          <span className="mr-1">+</span>
                        )}
                        {formatCurrency(typeof transaction.amount === 'string' ? parseFloat(transaction.amount) : transaction.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {/* Edit button */}
                        {/* For expenses, show if onEditExpense is available */}
                        {(transaction.type === 'expense' && onEditExpense) && (
                          <Button 
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditTransaction(transaction)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* For settlements, currently we only support delete (no edit) */}
                        {/* Omitted as we'll use the delete button below */}
                        
                        {/* Delete button with debug logging */}
                        {console.log(`Transaction ${transaction.id}: type=${transaction.type}, createdByUserId=${transaction.createdByUserId}, currentUser=${currentUser?.id}`)}
                        {(transaction.type === 'expense' || 
                          (transaction.type === 'settlement' && transaction.createdByUserId === currentUser?.id)) && (
                          <Button 
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteTransaction(transaction)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TransactionsTable;