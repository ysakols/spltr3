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
      // Extract the error message from the error object
      let errorMessage = 'Failed to delete expense';
      
      if (error instanceof Error) {
        // Try to extract the server error message
        try {
          // The error message format is likely to be "403: {"message":"Only the expense creator..."}"
          const jsonPart = error.message.split(': ')[1];
          if (jsonPart) {
            const parsedError = JSON.parse(jsonPart);
            if (parsedError.message) {
              errorMessage = parsedError.message;
            }
          }
        } catch (e) {
          // If parsing fails, use the entire error message
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
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
