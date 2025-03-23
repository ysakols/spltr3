import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';

export function useExpenseFunctions() {
  const { toast } = useToast();

  const handleDeleteExpense = useCallback(async (id: number, onSuccess: () => void) => {
    try {
      await apiRequest('DELETE', `/api/expenses/${id}`);
      
      // Invalidate all queries that might be affected by this deletion
      queryClient.invalidateQueries({ queryKey: ['/api/groups/all-summaries'] });
      
      toast({
        title: 'Success',
        description: 'Expense deleted successfully',
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete expense',
        variant: 'destructive',
      });
    }
  }, [toast]);

  return {
    handleDeleteExpense,
    formatCurrency,
  };
}

export function useQueryErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback((error: Error) => {
    toast({
      title: 'Error',
      description: error.message || 'An error occurred',
      variant: 'destructive',
    });
  }, [toast]);

  return handleError;
}
