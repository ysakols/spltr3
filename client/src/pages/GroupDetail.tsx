import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Edit } from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { useQueryErrorHandler } from '@/lib/hooks';

import ExpenseForm from '@/components/ExpenseForm';
import ExpenseTable from '@/components/ExpenseTable';
import GroupSummary from '@/components/GroupSummary';
import EditGroupForm from '@/components/EditGroupForm';

import type { Group, Expense, Balance } from '@shared/schema';

function GroupDetail() {
  const [, params] = useRoute<{ groupId: string }>('/groups/:groupId');
  const groupId = params?.groupId ? parseInt(params.groupId) : 0;
  const handleError = useQueryErrorHandler();
  const [isEditing, setIsEditing] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const expenseFormRef = useRef<{ setOpen: (open: boolean) => void } | null>(null);
  
  // Queries
  const { data: group, isLoading: isLoadingGroup, error: groupError } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId,
  });
  
  const { data: expenses, isLoading: isLoadingExpenses, error: expensesError } = useQuery<Expense[]>({
    queryKey: [`/api/groups/${groupId}/expenses`],
    enabled: !!groupId,
  });
  
  const { data: summary, isLoading: isLoadingSummary, error: summaryError } = useQuery<Balance>({
    queryKey: [`/api/groups/${groupId}/summary`],
    enabled: !!groupId,
  });

  // Handle errors
  if (groupError) handleError(groupError as Error);
  if (expensesError) handleError(expensesError as Error);
  if (summaryError) handleError(summaryError as Error);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/expenses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
  };
  
  const handleGroupUpdated = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
    refreshData();
  };
  
  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    // Open the expense form dialog
    if (expenseFormRef.current) {
      expenseFormRef.current.setOpen(true);
    }
  };
  
  const handleExpenseEdited = () => {
    setExpenseToEdit(null);
    refreshData();
  };
  
  const handleCancelEdit = () => {
    setExpenseToEdit(null);
  };

  const isLoading = isLoadingGroup || isLoadingExpenses || isLoadingSummary;

  if (!groupId) {
    return <div>Invalid group ID</div>;
  }

  return (
    <div>
      <div className="mb-3">
        <Button variant="ghost" asChild className="text-primary hover:text-primary/80 p-0 h-7 text-xs">
          <Link href="/">
            <ArrowLeft className="mr-1 h-3.5 w-3.5" />
            Back to Groups
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div>
          <Skeleton className="h-6 w-1/3 mb-3" />
          <Skeleton className="h-4 w-1/2 mb-4" />
          <Tabs defaultValue="expenses">
            <TabsList className="h-7">
              <TabsTrigger value="expenses" className="text-xs h-6 px-2">Expenses</TabsTrigger>
              <TabsTrigger value="summary" className="text-xs h-6 px-2">Summary</TabsTrigger>
            </TabsList>
            <TabsContent value="expenses">
              <Card className="mb-3 shadow-sm">
                <CardHeader className="p-2">
                  <Skeleton className="h-4 w-1/4" />
                </CardHeader>
                <CardContent className="p-2">
                  <div className="space-y-2">
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-full" />
                    <Skeleton className="h-7 w-full" />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : group && expenses && summary ? (
        <div>
          {isEditing ? (
            <div className="mb-3">
              <EditGroupForm 
                group={group} 
                onGroupUpdated={handleGroupUpdated} 
                onCancel={() => setIsEditing(false)} 
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-gray-900 mb-1 sm:mb-0">{group.name}</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center text-xs text-gray-500">
                  <Users className="flex-shrink-0 mr-1 h-3.5 w-3.5 text-gray-400" />
                  <span>{group.people.length} members: {group.people.join(', ')}</span>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex items-center gap-1 h-6 text-xs py-0 px-1.5"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-3 w-3" /> 
                  Edit Group
                </Button>
              </div>
            </div>
          )}

          {!isEditing && (
            <Tabs defaultValue="expenses">
              <TabsList className="h-7">
                <TabsTrigger value="expenses" className="text-xs h-6 px-2">Expenses</TabsTrigger>
                <TabsTrigger value="summary" className="text-xs h-6 px-2">Summary</TabsTrigger>
              </TabsList>
              
              <TabsContent value="expenses" className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Expenses</h3>
                  <ExpenseForm 
                    ref={expenseFormRef}
                    group={group} 
                    onExpenseAdded={refreshData}
                    expenseToEdit={expenseToEdit || undefined}
                    isEditing={!!expenseToEdit}
                    onExpenseEdited={handleExpenseEdited}
                    onCancelEdit={handleCancelEdit}
                  />
                </div>
                
                <ExpenseTable 
                  expenses={expenses} 
                  totalExpenses={summary.totalExpenses}
                  onExpenseDeleted={refreshData}
                  onEditExpense={handleEditExpense}
                />
              </TabsContent>
              
              <TabsContent value="summary" className="pt-2">
                <GroupSummary 
                  group={group} 
                  summary={summary} 
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      ) : (
        <div>Group not found</div>
      )}
    </div>
  );
}

export default GroupDetail;
