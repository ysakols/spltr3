import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRoute, Link, useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ArrowLeft, Edit, Trash, AlertTriangle } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useQueryErrorHandler } from '@/lib/hooks';
import { useToast } from '@/hooks/use-toast';
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
import { numericToDisplayId, displayToNumericId } from '@/lib/id-utils';

import ExpenseForm from '@/components/ExpenseForm';
import TransactionsTable from '@/components/TransactionsTable';
import GroupSummary from '@/components/GroupSummary';
import EditGroupForm from '@/components/EditGroupForm';
import { ActivityFeed } from '@/components/ActivityFeed';
import { SettleUpButton } from '../components/SettleUpButton';

import type { Group, Expense, Balance, User } from '@shared/schema';
import type { ExtendedExpense } from '@/types';

function GroupDetail() {
  const [, params] = useRoute<{ groupId: string }>('/groups/:groupId');
  const [, setLocation] = useLocation();
  // Convert display ID to numeric ID for API calls
  const groupId = params?.groupId ? displayToNumericId(params.groupId) : 0;
  const handleError = useQueryErrorHandler();
  const [isEditing, setIsEditing] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ExtendedExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const expenseFormRef = useRef<{ setOpen: (open: boolean) => void } | null>(null);
  const { toast } = useToast();
  
  // Queries
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });
  
  const { data: group, isLoading: isLoadingGroup, error: groupError } = useQuery<Group>({
    queryKey: [`/api/groups/${groupId}`],
    enabled: !!groupId,
  });
  
  const { data: members, isLoading: isLoadingMembers, error: membersError } = useQuery<User[]>({
    queryKey: [`/api/groups/${groupId}/members`],
    enabled: !!groupId,
  });
  
  const { data: expenses, isLoading: isLoadingExpenses, error: expensesError } = useQuery<ExtendedExpense[]>({
    queryKey: [`/api/groups/${groupId}/expenses`],
    enabled: !!groupId,
  });
  
  const { data: summary, isLoading: isLoadingSummary, error: summaryError } = useQuery<Balance>({
    queryKey: [`/api/groups/${groupId}/summary`],
    enabled: !!groupId,
  });

  // Handle errors
  if (groupError) handleError(groupError as Error);
  if (membersError) handleError(membersError as Error);
  if (expensesError) handleError(expensesError as Error);
  if (summaryError) handleError(summaryError as Error);

  const refreshData = () => {
    // Invalidate transactions which includes both expenses and settlements
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/transactions`] });
    // Still invalidate expenses for backward compatibility
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/expenses`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/members`] });
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/invitations`] });
  };
  
  const handleGroupUpdated = () => {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}`] });
    refreshData();
  };
  
  const handleEditExpense = (expense: ExtendedExpense) => {
    setExpenseToEdit(expense);
    // Open the expense form dialog
    if (expenseFormRef.current) {
      expenseFormRef.current.setOpen(true);
    }
    console.log("Expense to edit changed:", expense);
  };
  
  const handleExpenseEdited = () => {
    setExpenseToEdit(null);
    refreshData();
  };
  
  const handleCancelEdit = () => {
    setExpenseToEdit(null);
  };
  
  const handleDeleteGroup = async () => {
    try {
      await apiRequest('DELETE', `/api/groups/${groupId}`);
      toast({
        title: "Group deleted",
        description: "The group has been successfully deleted.",
      });
      // Redirect to the groups list page
      setLocation('/');
      // Invalidate the groups list cache
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error deleting group",
        description: "There was a problem deleting the group. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Close the dialog by resetting state if needed
      setIsDeleting(false);
    }
  };

  const isLoading = isLoadingGroup || isLoadingExpenses || isLoadingSummary || isLoadingMembers;

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
            <div className="flex flex-col space-y-3 mb-3">
              {/* Top row with group name and admin info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 mb-1 sm:mb-0">{group.name}</h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-xs text-gray-500">
                    <Users className="flex-shrink-0 mr-1 h-3.5 w-3.5 text-gray-400" />
                    <span className="mr-1">Created by:</span>
                    <span className="mr-1">
                      {(() => {
                        const creator = members?.find(m => m.id === group.createdById);
                        if (!creator) return 'Unknown';
                        return creator.first_name && creator.last_name
                          ? `${creator.first_name} ${creator.last_name}`
                          : creator.display_name || creator.email || creator.email?.split('@')[0] || 'Unknown';
                      })()}
                    </span>
                    <span className="font-medium text-primary">(Admin)</span>
                  </div>
                  <div className="flex gap-2">
                    {/* Show edit button for all group members */}
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
              </div>
              
              {/* Members list - moved to below top information */}
              {members && members.length > 0 && (
                <div className="flex items-center text-xs text-gray-500 border-t pt-2">
                  <Users className="flex-shrink-0 mr-1 h-3.5 w-3.5 text-gray-400" />
                  <span className="mr-1 font-medium">Members:</span>
                  <span className="overflow-hidden">
                    {members.map((m, index) => (
                      <span key={m.id} className="inline-block">
                        {m.first_name && m.last_name 
                          ? `${m.first_name} ${m.last_name}` 
                          : m.display_name || m.email || m.email?.split('@')[0]}
                        {index < members.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          )}

          {!isEditing && (
            <div className="pt-2">
              <div className="flex gap-3 mb-4 equal-width-buttons">
                <div className="button-container">
                  {summary && members && (
                    <SettleUpButton
                      groupId={groupId}
                      summary={summary} 
                      currentUser={currentUser!}
                      members={members}
                    />
                  )}
                </div>
                <div className="button-container">
                  <ExpenseForm 
                    ref={expenseFormRef}
                    group={group} 
                    members={members || []}
                    onExpenseAdded={refreshData}
                    expenseToEdit={expenseToEdit || undefined}
                    isEditing={!!expenseToEdit}
                    onExpenseEdited={handleExpenseEdited}
                    onCancelEdit={handleCancelEdit}
                  />
                </div>
              </div>
              
              <div className="w-full max-w-full overflow-hidden">
                <TransactionsTable 
                  groupId={groupId}
                  totalAmount={summary.totalExpenses}
                  onTransactionDeleted={refreshData}
                  onEditExpense={handleEditExpense}
                  members={members} // Pass members to TransactionsTable
                />
                
                {/* Show activity feed with invitations and group events */}
                <div className="w-full m-0 p-0">
                  <ActivityFeed groupId={groupId} />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>Group not found</div>
      )}
    </div>
  );
}

export default GroupDetail;
