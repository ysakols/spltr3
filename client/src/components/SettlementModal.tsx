import React, { useState } from 'react';
import { useSettlementModal } from '@/hooks/use-settlement-modal';
import { PaymentMethod, SettlementStatus } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Banknote, ArrowUpRight } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

// Form schema
const settlementFormSchema = z.object({
  notes: z.string().optional(),
  transactionReference: z.string().optional(),
});

type SettlementFormValues = z.infer<typeof settlementFormSchema>;

export function SettlementModal() {
  const { isOpen, settlementDetails, clearSettlementDetails } = useSettlementModal();
  const [activeTab, setActiveTab] = useState<string>(PaymentMethod.CASH);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      notes: '',
      transactionReference: '',
    },
  });

  // Reset form when modal closes
  const onDismiss = () => {
    form.reset();
    clearSettlementDetails();
  };

  if (!settlementDetails) {
    return null;
  }

  const { fromUserId, toUserId, amount, groupId, fromUsername, toUsername } = settlementDetails;

  const handleVenmoPayment = async () => {
    try {
      // Create a settlement record with status pending
      const response = await apiRequest('POST', '/api/settlements', {
          fromUserId,
          toUserId,
          amount: amount.toString(),
          groupId: groupId || null,
          paymentMethod: PaymentMethod.VENMO,
          status: SettlementStatus.PENDING,
          notes: form.getValues().notes,
      });

      // Generate Venmo deep link - would usually get proper Venmo username
      // For demo purposes, we'll use a generic Venmo link
      const venmoDeepLink = `venmo://paycharge?txn=pay&recipients=${toUsername}&amount=${amount}&note=Payment from expense sharing app`;
      
      toast({
        title: 'Payment initialized',
        description: 'Redirecting to Venmo...',
      });

      // Open Venmo app or Venmo web if app is not available
      window.location.href = venmoDeepLink;
      
      // Would normally handle the return from Venmo here
      // For now, we'll close the modal
      onDismiss();
      
      // Invalidate queries to refresh data
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/users/${fromUserId}/global-summary`] });
      
    } catch (error) {
      console.error('Error creating Venmo settlement:', error);
      toast({
        title: 'Error',
        description: 'Could not process Venmo payment.',
        variant: 'destructive',
      });
    }
  };

  const handleCashPayment = async (values: SettlementFormValues) => {
    setIsSubmitting(true);
    try {
      // Create settlement record with status completed
      await apiRequest('POST', '/api/settlements', {
          fromUserId,
          toUserId,
          amount: amount.toString(),
          groupId: groupId || null,
          paymentMethod: PaymentMethod.CASH,
          status: SettlementStatus.COMPLETED,
          notes: values.notes,
          transactionReference: values.transactionReference,
          completedAt: new Date(),
      });

      toast({
        title: 'Settlement recorded',
        description: 'The payment has been marked as complete.',
      });

      // Invalidate queries to refresh data
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/users/${fromUserId}/global-summary`] });
      
      onDismiss();
    } catch (error) {
      console.error('Error creating cash settlement:', error);
      toast({
        title: 'Error',
        description: 'Could not record the settlement.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settle Up</DialogTitle>
          <DialogDescription>
            You owe {toUsername} {formatCurrency(amount)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={PaymentMethod.CASH} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value={PaymentMethod.CASH}>
              <Banknote className="h-4 w-4 mr-2" />
              Mark as Settled
            </TabsTrigger>
            <TabsTrigger value={PaymentMethod.VENMO}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Pay with Venmo
            </TabsTrigger>
          </TabsList>

          <TabsContent value={PaymentMethod.CASH}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCashPayment)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g. Paid in cash on March 24" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transactionReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g. Cash transaction #123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={onDismiss}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mark as Settled
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value={PaymentMethod.VENMO}>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                You'll be redirected to Venmo to complete the payment.
                After you complete the payment, the debt will be marked as settled.
              </p>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add a note for this payment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={onDismiss}>
                  Cancel
                </Button>
                <Button 
                  type="button" 
                  onClick={handleVenmoPayment}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continue to Venmo
                </Button>
              </DialogFooter>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}