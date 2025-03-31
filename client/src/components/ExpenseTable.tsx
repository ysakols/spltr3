import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Edit2, ArrowUpDown, ArrowDown, ArrowUp, Users, Loader2, AlertTriangle } from 'lucide-react';
import { useExpenseFunctions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

import type { User, Expense } from '@shared/schema';
import type { ExtendedExpense } from '@/types';
import { SplitType } from '@shared/schema';

interface ExpenseTableProps {
  expenses: ExtendedExpense[];
  totalExpenses: number;
  onExpenseDeleted: () => void;
  onEditExpense?: (expense: ExtendedExpense) => void;
  members?: User[]; // Accept members from parent component if available
}

function ExpenseTable({ 
  expenses, 
  totalExpenses, 
  onExpenseDeleted, 
  onEditExpense,
  members: propMembers 
}: ExpenseTableProps) {
  const { formatCurrency } = useExpenseFunctions();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for sorting
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Only fetch members if we have expenses and they weren't passed as props
  const groupId = expenses.length > 0 ? expenses[0].groupId : null;
  
  const { data: fetchedMembers, isLoading } = useQuery<User[]>({
    queryKey: groupId ? [`/api/groups/${groupId}/members`] : ['no-members'],
    enabled: !!groupId && !propMembers
  });
  
  // Use members from props if available, otherwise use fetched members
  const members = propMembers || fetchedMembers;
  
  // Prefetch user data for expenses if needed
  useEffect(() => {
    if (groupId && !members) {
      queryClient.prefetchQuery({
        queryKey: [`/api/groups/${groupId}/members`]
      });
    }
  }, [groupId, members]);
  
  // Function to get username by user ID
  const getUsernameById = (userId: number) => {
    if (!members) return `Loading...`;
    
    const user = members.find(member => member.id === userId);
    return user ? (
      user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.displayName || user.email
    ) : `User ${userId}`;
  };
  
  // Function to get user avatar initial (single letter)
  const getUserAvatar = (userId: number) => {
    if (!members) return 'U';
    
    const user = members.find(member => member.id === userId);
    if (!user) return 'U';
    
    if (user.firstName) {
      return user.firstName.substring(0, 1).toUpperCase();
    } else if (user.displayName) {
      return user.displayName.substring(0, 1).toUpperCase();
    } else if (user.username) {
      // Extract the first letter before the @ sign or first letter only if no @ sign
      const usernameStart = user.username.split('@')[0];
      return usernameStart.substring(0, 1).toUpperCase();
    } else if (user.email) {
      // Extract the first letter before the @ sign
      const emailStart = user.email.split('@')[0];
      return emailStart.substring(0, 1).toUpperCase();
    }
    
    return 'U';
  };
  
  // Function to get abbreviated user display name
  const getShortUserName = (userId: number) => {
    if (!members) return 'Unknown';
    
    const user = members.find(member => member.id === userId);
    if (!user) return 'Unknown';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName.substring(0, 1)}. ${user.lastName}`;
    } else if (user.displayName) {
      return user.displayName;
    } else if (user.username) {
      // Get the part before plus sign or @ sign
      const usernameBase = user.username.split(/[+@]/)[0];
      return usernameBase.charAt(0).toUpperCase() + usernameBase.slice(1);
    } else if (user.email) {
      const emailBase = user.email.split('@')[0];
      return emailBase;
    }
    
    return `User ${userId}`;
  };

  // State for delete confirmation
  const [expenseToDelete, setExpenseToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deleteExpense = async (id: number) => {
    setExpenseToDelete(id);
    setIsDeleting(true);
    try {
      await apiRequest('DELETE', `/api/expenses/${id}`);
      
      // Invalidate all queries that might be affected by this deletion
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/expenses`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/transactions`] });
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/users/all-summaries'] });
      
      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
      
      onExpenseDeleted();
    } catch (error) {
      let errorMessage = 'Failed to delete expense';
      
      if (error instanceof Error) {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setExpenseToDelete(null);
    }
  };
  
  // Handle sort click
  const handleSort = (field: string) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If sorting by a new field, default to descending (newest/highest first)
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  // Sort expenses based on current sort settings
  const sortedExpenses = useMemo(() => {
    if (!sortField) return expenses;
    
    return [...expenses].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'date':
          aValue = new Date(a.date).getTime();
          bValue = new Date(b.date).getTime();
          break;
        case 'description':
          aValue = a.description.toLowerCase();
          bValue = b.description.toLowerCase();
          break;
        case 'amount':
          aValue = parseFloat(a.amount);
          bValue = parseFloat(b.amount);
          break;
        case 'paidBy':
          aValue = getUsernameById(a.paidByUserId).toLowerCase();
          bValue = getUsernameById(b.paidByUserId).toLowerCase();
          break;
        case 'createdBy':
          aValue = a.createdByUserId ? getUsernameById(a.createdByUserId).toLowerCase() : 'unknown';
          bValue = b.createdByUserId ? getUsernameById(b.createdByUserId).toLowerCase() : 'unknown';
          break;
        default:
          return 0;
      }
      
      // Apply sort direction
      const sortMultiplier = sortDirection === 'asc' ? 1 : -1;
      
      if (aValue < bValue) return -1 * sortMultiplier;
      if (aValue > bValue) return 1 * sortMultiplier;
      return 0;
    });
  }, [expenses, sortField, sortDirection, members]);
  
  // Function to render sort icon
  const renderSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 inline" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3 inline text-primary" />
      : <ArrowDown className="ml-1 h-3 w-3 inline text-primary" />;
  };

  return (
    <Card className="shadow-sm border-muted/60">
      <CardContent className="p-2">
        {expenses.length === 0 ? (
          <div className="text-center py-3 text-gray-500 text-xs">
            <p>No expenses yet. Add your first expense above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-muted/5">
                  <TableHead 
                    className="py-1 px-2 text-xs font-medium cursor-pointer"
                    onClick={() => handleSort('date')}
                  >
                    Date {renderSortIcon('date')}
                  </TableHead>
                  <TableHead 
                    className="py-1 px-2 text-xs font-medium cursor-pointer"
                    onClick={() => handleSort('description')}
                  >
                    Description {renderSortIcon('description')}
                  </TableHead>
                  <TableHead 
                    className="py-1 px-2 text-xs font-medium cursor-pointer"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {renderSortIcon('amount')}
                  </TableHead>
                  <TableHead 
                    className="py-1 px-2 text-xs font-medium cursor-pointer"
                    onClick={() => handleSort('paidBy')}
                  >
                    Paid By {renderSortIcon('paidBy')}
                  </TableHead>
                  <TableHead 
                    className="py-1 px-2 text-xs font-medium cursor-pointer"
                    onClick={() => handleSort('createdBy')}
                  >
                    Created By {renderSortIcon('createdBy')}
                  </TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium">Split With</TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedExpenses.map(expense => (
                  <TableRow key={expense.id} className="hover:bg-muted/5 h-12">
                    <TableCell className="whitespace-nowrap py-2 px-2 text-xs">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium py-2 px-2 text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="truncate max-w-[150px] cursor-default flex items-center">
                              {expense.description}
                              {/* Check if any users in splitDetails are no longer in the group */}
                              {(() => {
                                try {
                                  if (expense.splitDetails && expense.splitDetails !== '{}' && members) {
                                    const details = JSON.parse(expense.splitDetails);
                                    const userIdsInSplit = Object.keys(details).map(id => parseInt(id));
                                    const memberIds = members.map(m => m.id);
                                    
                                    // Check if any user in splitDetails is not in current members
                                    const invalidUsers = userIdsInSplit.filter(id => !memberIds.includes(id) && details[id] > 0);
                                    
                                    if (invalidUsers.length > 0) {
                                      return (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="ml-1 text-amber-500">
                                                <svg 
                                                  xmlns="http://www.w3.org/2000/svg" 
                                                  width="12" 
                                                  height="12" 
                                                  viewBox="0 0 24 24" 
                                                  fill="none" 
                                                  stroke="currentColor" 
                                                  strokeWidth="2" 
                                                  strokeLinecap="round" 
                                                  strokeLinejoin="round"
                                                >
                                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                  <line x1="12" y1="9" x2="12" y2="13"></line>
                                                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                </svg>
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent className="p-2 text-xs">
                                              <p className="text-amber-600">Warning: This expense contains allocations for {invalidUsers.length} user(s) who are no longer in the group.</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    }
                                  }
                                  return null;
                                } catch (e) {
                                  console.error("Error checking for invalid users:", e);
                                  return null;
                                }
                              })()}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 text-xs">
                            <p>{expense.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-primary py-2 px-2 text-xs">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="py-2 px-2 text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-default">
                              <span className="truncate max-w-[150px] block">
                                {getUsernameById(expense.paidByUserId)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 text-xs">
                            <p>Paid by: {expense.paidByUser ? (
                              expense.paidByUser.firstName && expense.paidByUser.lastName
                                ? `${expense.paidByUser.firstName} ${expense.paidByUser.lastName}`
                                : expense.paidByUser.displayName || expense.paidByUser.email
                            ) : getUsernameById(expense.paidByUserId)}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-default">
                              <span className="truncate max-w-[150px] block">
                                {expense.createdByUserId ? getUsernameById(expense.createdByUserId) : 'Unknown'}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 text-xs">
                            <p>Created by: {expense.createdByUser ? (
                              expense.createdByUser.firstName && expense.createdByUser.lastName
                                ? `${expense.createdByUser.firstName} ${expense.createdByUser.lastName}`
                                : expense.createdByUser.displayName || expense.createdByUser.email
                            ) : expense.createdByUserId ? getUsernameById(expense.createdByUserId) : 'Unknown'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="py-2 px-2 text-xs">
                      {/* Get split details from JSON string */}
                      {(() => {
                        try {
                          // If it's an equal split, we'll show all members equally badge
                          if (expense.splitType === SplitType.EQUAL) {
                            return (
                              <div className="flex items-center">
                                <Badge variant="outline" className="gap-1 flex items-center py-0.5 px-2">
                                  <Users className="h-3 w-3" />
                                  <span className="text-[10px]">All equally</span>
                                </Badge>
                              </div>
                            );
                          }
                          
                          // For other split types, parse the details and show avatars
                          if (expense.splitDetails && expense.splitDetails !== '{}') {
                            const details = JSON.parse(expense.splitDetails);
                            const userIds = Object.keys(details).map(id => parseInt(id));
                            
                            if (userIds.length === 0) return "All members";
                            
                            // Get all usernames for the tooltip
                            const allUserNames = userIds.map(id => getUsernameById(id)).join(", ");
                            
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center">
                                      {/* Use a badge with avatar style to show count */}
                                      <Badge variant="outline" className="py-0.5 px-2 flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        <span className="text-[10px]">{userIds.length} member{userIds.length !== 1 ? 's' : ''}</span>
                                      </Badge>
                                      
                                      {/* Add warning icon if there are missing users */}
                                      {(() => {
                                        if (members) {
                                          const memberIds = members.map(m => m.id);
                                          const invalidUsers = userIds.filter(id => !memberIds.includes(id) && details[id] > 0);
                                          
                                          if (invalidUsers.length > 0) {
                                            return (
                                              <div className="ml-1 text-amber-500">
                                                <svg 
                                                  xmlns="http://www.w3.org/2000/svg" 
                                                  width="12" 
                                                  height="12" 
                                                  viewBox="0 0 24 24" 
                                                  fill="none" 
                                                  stroke="currentColor" 
                                                  strokeWidth="2" 
                                                  strokeLinecap="round" 
                                                  strokeLinejoin="round"
                                                >
                                                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                                  <line x1="12" y1="9" x2="12" y2="13"></line>
                                                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                                </svg>
                                              </div>
                                            );
                                          }
                                        }
                                        return null;
                                      })()}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="p-2 text-xs">
                                    <p>Split with: {allUserNames}</p>
                                    {(() => {
                                      if (members) {
                                        const memberIds = members.map(m => m.id);
                                        const invalidUsers = userIds.filter(id => !memberIds.includes(id) && details[id] > 0);
                                        
                                        if (invalidUsers.length > 0) {
                                          return (
                                            <p className="text-amber-600 mt-1 font-medium">
                                              Warning: {invalidUsers.length} user(s) in this split are no longer in the group
                                            </p>
                                          );
                                        }
                                      }
                                      return null;
                                    })()}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          }
                          
                          // Fallback for empty split details
                          return "All members";
                        } catch (e) {
                          console.error("Error parsing split details:", e, expense.splitDetails);
                          return "All members";
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-right py-2 px-2 text-xs">
                      <div className="flex justify-end gap-0.5">
                        {onEditExpense && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditExpense(expense)}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 h-5 w-5 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-900 hover:bg-red-50 h-5 w-5 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Delete Expense
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this expense?
                                <div className="mt-2 p-3 bg-muted/50 rounded-md">
                                  <p className="font-medium">{expense.description}</p>
                                  <p className="text-sm text-primary mt-1">{formatCurrency(Number(expense.amount))}</p>
                                </div>
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteExpense(expense.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {isDeleting && expenseToDelete === expense.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : <Trash2 className="h-4 w-4 mr-2" />}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="py-1 px-2 text-xs">Total</TableCell>
                  <TableCell colSpan={5} className="text-primary font-bold py-1 px-2 text-xs">
                    {formatCurrency(totalExpenses)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExpenseTable;
