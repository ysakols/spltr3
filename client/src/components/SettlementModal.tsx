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
import { Loader2, Banknote, ArrowUpRight, CheckCircle } from 'lucide-react';

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
import {
  Alert,
  AlertTitle,
  AlertDescription
} from '@/components/ui/alert';

// Form schema
const settlementFormSchema = z.object({
  amount: z.string()
    .min(1, { message: "Amount is required" })
    .refine(
      (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      { message: "Amount must be a positive number" }
    ),
  notes: z.string().optional(),
  transactionReference: z.string().optional(),
});

type SettlementFormValues = z.infer<typeof settlementFormSchema>;

export function SettlementModal() {
  const { isOpen, settlementDetails, clearSettlementDetails } = useSettlementModal();
  const [activeTab, setActiveTab] = useState<string>(PaymentMethod.CASH);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingSettlementId, setPendingSettlementId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up form with the amount defaulting to the suggested amount
  const form = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      amount: settlementDetails?.amount.toString() || '',
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
    // Validate the amount before proceeding
    const formAmount = form.getValues().amount;
    if (!formAmount || isNaN(parseFloat(formAmount)) || parseFloat(formAmount) <= 0) {
      form.setError('amount', { 
        type: 'manual', 
        message: 'Please enter a valid positive amount' 
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create a settlement record with status pending
      const settlement = await apiRequest('POST', '/api/settlements', {
          fromUserId,
          toUserId,
          amount: formAmount,
          groupId: groupId || null,
          paymentMethod: PaymentMethod.VENMO,
          status: SettlementStatus.PENDING,
          notes: form.getValues().notes,
      });

      // Store the settlement ID for later
      setPendingSettlementId(settlement.id);

      // Use Venmo web URL with simpler parameters to avoid triggering security restrictions
      const paymentNote = encodeURIComponent("Payment from expense sharing app");
      const venmoWebUrl = `https://venmo.com/`;
      
      // Open a new tab with the Venmo interface instead of direct payment URL
      // This avoids triggering Venmo's anti-fraud mechanisms that block scripted payment redirects
      const venmoWindow = window.open(venmoWebUrl, '_blank');
      
      toast({
        title: 'Navigate to Venmo',
        description: 'Opening Venmo in a new tab. Search for the recipient and send payment manually.',
      });
      
      // Show toast with clearer instructions
      toast({
        title: 'Manual action required',
        description: `Find and pay ${toUsername} ${formatCurrency(parseFloat(formAmount))} in Venmo, then return here to mark it complete.`,
        duration: 10000, // Show for 10 seconds
      });

      // Change the status to display completion options
      setActiveTab(PaymentMethod.VENMO);
      
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
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Mark a Venmo payment as completed
  const handleVenmoCompleted = async () => {
    if (!pendingSettlementId) {
      toast({
        title: 'Error',
        description: 'No pending Venmo payment found.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Update the settlement status to completed
      // Don't send completedAt from the client - server will handle this
      await apiRequest('PUT', `/api/settlements/${pendingSettlementId}`, {
        status: SettlementStatus.COMPLETED,
        transactionReference: form.getValues().transactionReference,
      });
      
      toast({
        title: 'Payment completed',
        description: 'Your Venmo payment has been marked as completed.',
      });
      
      // Invalidate queries to refresh data
      if (groupId) {
        queryClient.invalidateQueries({ queryKey: [`/api/groups/${groupId}/summary`] });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/users/${fromUserId}/global-summary`] });
      
      onDismiss();
    } catch (error) {
      console.error('Error marking payment as completed:', error);
      toast({
        title: 'Error',
        description: 'Could not mark the payment as completed.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCashPayment = async (values: SettlementFormValues) => {
    // Form validation should handle this, but double-check
    if (!values.amount || isNaN(parseFloat(values.amount)) || parseFloat(values.amount) <= 0) {
      form.setError('amount', { 
        type: 'manual', 
        message: 'Please enter a valid positive amount' 
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create settlement record with status completed
      await apiRequest('POST', '/api/settlements', {
          fromUserId,
          toUserId,
          amount: values.amount,
          groupId: groupId || null,
          paymentMethod: PaymentMethod.CASH,
          status: SettlementStatus.COMPLETED,
          notes: values.notes,
          transactionReference: values.transactionReference,
      });

      toast({
        title: 'Settlement recorded',
        description: `You paid ${toUsername} ${formatCurrency(parseFloat(values.amount))}`,
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
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Amount ($)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                          <input
                            type="text"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="0.00"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
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
            <Form {...form}>
              <div className="space-y-4 py-4">
                {pendingSettlementId ? (
                  // Show this when user has been to Venmo and needs to mark payment as completed
                  <>
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle>Final Step</AlertTitle>
                      <AlertDescription>
                        If you've completed your payment to <strong>{toUsername}</strong> in Venmo, 
                        please click "Mark as Completed" below to record it in the system.
                      </AlertDescription>
                    </Alert>
                    
                    <FormField
                      control={form.control}
                      name="transactionReference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venmo Transaction ID (Optional)</FormLabel>
                          <FormControl>
                            <Textarea placeholder="e.g. Venmo transaction reference" {...field} />
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
                        onClick={handleVenmoCompleted}
                        disabled={isSubmitting}
                        variant="default"
                      >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Completed
                      </Button>
                    </DialogFooter>
                  </>
                ) : (
                  // Show this initially before they go to Venmo
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        You'll be redirected to the Venmo website. To complete payment:
                      </p>
                      <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                        <li>Search for recipient <strong>{toUsername}</strong> in Venmo</li>
                        <li>Pay them the amount you specify below</li>
                        <li>Once payment is complete, return here and click "Mark as Completed"</li>
                      </ol>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Amount ($)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2">$</span>
                              <input
                                type="text"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-9 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="0.00"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
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
                  </>
                )}
              </div>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}