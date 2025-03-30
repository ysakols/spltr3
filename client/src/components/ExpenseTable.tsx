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
import { Trash2, Edit2, ArrowUpDown, ArrowDown, ArrowUp, Users } from 'lucide-react';
import { useExpenseFunctions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { handleDeleteExpense, formatCurrency } = useExpenseFunctions();
  
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
      return user.username.substring(0, 1).toUpperCase();
    } else if (user.email) {
      return user.email.substring(0, 1).toUpperCase();
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
    } else if (user.email) {
      return user.email;
    }
    
    return `User ${userId}`;
  };

  const deleteExpense = async (id: number) => {
    await handleDeleteExpense(id, onExpenseDeleted);
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
                  <TableRow key={expense.id} className="hover:bg-muted/5">
                    <TableCell className="whitespace-nowrap py-1 px-2 text-xs">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium py-1 px-2 text-xs">
                      {expense.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-primary py-1 px-2 text-xs">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                  {expense.paidByUser ? 
                                    getUserAvatar(expense.paidByUserId) : 
                                    getUserAvatar(expense.paidByUserId)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[80px]">
                                {getShortUserName(expense.paidByUserId)}
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
                    <TableCell className="py-1 px-2 text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 cursor-default">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                  {expense.createdByUserId ? 
                                    getUserAvatar(expense.createdByUserId) : 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[80px]">
                                {expense.createdByUserId ? getShortUserName(expense.createdByUserId) : 'Unknown'}
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
                    <TableCell className="py-1 px-2 text-xs">
                      {/* Get split details from JSON string */}
                      {(() => {
                        try {
                          // If it's an equal split, we'll show all members equally badge
                          if (expense.splitType === SplitType.EQUAL) {
                            return (
                              <div className="flex items-center">
                                <Badge variant="outline" className="gap-1 flex items-center text-xs px-1.5 py-0">
                                  <Users className="h-3 w-3" />
                                  All equally
                                </Badge>
                              </div>
                            );
                          }
                          
                          // For other split types, parse the details and show avatars
                          if (expense.splitDetails && expense.splitDetails !== '{}') {
                            const details = JSON.parse(expense.splitDetails);
                            const userIds = Object.keys(details).map(id => parseInt(id));
                            
                            if (userIds.length === 0) return "All members";
                            
                            // Show a few avatars with a count badge for others
                            const displayLimit = 3;
                            const shownUserIds = userIds.slice(0, displayLimit);
                            const remainingCount = userIds.length - displayLimit;
                            
                            // Get all usernames for the tooltip
                            const allUserNames = userIds.map(id => getUsernameById(id)).join(", ");
                            
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-0">
                                      {/* Show the first few avatars */}
                                      <div className="flex items-center">
                                        <Avatar className="h-5 w-5">
                                          <AvatarFallback className="text-[10px]">
                                            {getUserAvatar(shownUserIds[0])}
                                          </AvatarFallback>
                                        </Avatar>
                                        <span className="ml-1 truncate max-w-[80px]">
                                          {getShortUserName(shownUserIds[0]).split(' ')[0]} 
                                          {remainingCount > 0 && (
                                            <Badge variant="secondary" className="ml-1 px-1.5 text-[10px] py-0 h-4">
                                              +{remainingCount + (shownUserIds.length > 1 ? shownUserIds.length - 1 : 0)}
                                            </Badge>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="p-2 text-xs">
                                    <p>Split with: {allUserNames}</p>
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
                    <TableCell className="text-right py-1 px-2 text-xs">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 h-5 w-5 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
