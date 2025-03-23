import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';

export function useExpenseFunctions() {
  const { toast } = useToast();

  const handleDeleteExpense = useCallback(async (id: number, onSuccess: () => void) => {
    try {
      await apiRequest('DELETE', `/api/expenses/${id}`);
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
