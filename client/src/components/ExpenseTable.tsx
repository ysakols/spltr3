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
import { Trash2, Edit2, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import { useExpenseFunctions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

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
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">Expenses</CardTitle>
      </CardHeader>
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
                  <TableHead className="py-1 px-2 text-xs font-medium">Split Type</TableHead>
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
                      {expense.paidByUser ? (
                        expense.paidByUser.firstName && expense.paidByUser.lastName
                          ? `${expense.paidByUser.firstName} ${expense.paidByUser.lastName}`
                          : expense.paidByUser.displayName || expense.paidByUser.email
                      ) : getUsernameById(expense.paidByUserId)}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-xs">
                      <Badge variant={
                        expense.splitType === SplitType.EQUAL 
                          ? "default" 
                          : expense.splitType === SplitType.PERCENTAGE 
                            ? "secondary"
                            : "outline"
                      } className="text-[10px] py-0 px-1.5 h-4">
                        {expense.splitType === SplitType.EQUAL 
                          ? "Equal"
                          : expense.splitType === SplitType.PERCENTAGE
                            ? "Percentage"
                            : "Dollar"
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 px-2 text-xs">
                      {/* Get split details from JSON string */}
                      {(() => {
                        try {
                          // If it's an equal split, we'll show all members regardless of splitDetails
                          if (expense.splitType === SplitType.EQUAL) {
                            return "All members equally";
                          }
                          
                          // For other split types, parse the details
                          if (expense.splitDetails && expense.splitDetails !== '{}') {
                            const details = JSON.parse(expense.splitDetails);
                            // Make sure we have details
                            if (Object.keys(details).length > 0) {
                              return Object.keys(details).map(userId => 
                                getUsernameById(parseInt(userId))
                              ).join(", ");
                            }
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
