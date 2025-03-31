import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import type { Group, Expense, User } from '@shared/schema';
import type { ExtendedExpense } from '@/types';
import { SplitType } from '@shared/schema';

interface ExpenseFormProps {
  group: Group;
  onExpenseAdded: () => void;
  expenseToEdit?: ExtendedExpense;
  isEditing?: boolean;
  onExpenseEdited?: () => void;
  onCancelEdit?: () => void;
  members?: User[];
}

const ExpenseForm = forwardRef<{ setOpen: (open: boolean) => void }, ExpenseFormProps>(
  (props, ref) => {
    const { 
      group, 
      onExpenseAdded, 
      expenseToEdit, 
      isEditing = false, 
      onExpenseEdited, 
      onCancelEdit,
      members = []
    } = props;
    
    const [open, setOpen] = useState(isEditing);
    
    // Expose setOpen method to parent components
    useImperativeHandle(ref, () => ({
      setOpen,
    }));
    
    const [expenseDate, setExpenseDate] = useState<Date | undefined>(
      expenseToEdit?.date ? new Date(expenseToEdit.date) : new Date()
    );

    const [expenseData, setExpenseData] = useState(() => {
      if (expenseToEdit) {
        console.log('Expense to edit:', expenseToEdit);
        return {
          description: expenseToEdit.description,
          amount: String(expenseToEdit.amount),
          paidByUserId: expenseToEdit.paidByUserId,
          splitType: expenseToEdit.splitType,
        };
      }
      return {
        description: '',
        amount: '',
        paidByUserId: members.length > 0 ? members[0].id : 0,
        splitType: SplitType.PERCENTAGE as string,
      };
    });
    
    const [splitDetails, setSplitDetails] = useState<Record<string, number>>(() => {
      if (expenseToEdit && expenseToEdit.splitDetails && expenseToEdit.splitDetails !== '{}') {
        try {
          return JSON.parse(expenseToEdit.splitDetails);
        } catch (e) {
          console.error('Error parsing split details', e);
          return {};
        }
      }
      return {};
    });
    
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const resetForm = () => {
      // Reset form data
      setExpenseData({
        description: '',
        amount: '',
        paidByUserId: members.length > 0 ? members[0].id : 0,
        splitType: SplitType.PERCENTAGE as string,
      });
      
      // Initialize with placeholder values for all members
      const initialSplitDetails: Record<string, number> = {};
      // Ensure we add entries for all members to make it easier to display in the table
      if (members && members.length > 0) {
        members.forEach(member => {
          initialSplitDetails[member.id] = 0;
        });
      }
      
      setSplitDetails(initialSplitDetails);
      setExpenseDate(new Date());
    };
    
    // Update form data when expenseToEdit changes
    useEffect(() => {
      if (expenseToEdit) {
        console.log('Expense to edit changed:', expenseToEdit);
        setExpenseData({
          description: expenseToEdit.description,
          amount: String(expenseToEdit.amount),
          paidByUserId: expenseToEdit.paidByUserId,
          splitType: expenseToEdit.splitType,
        });
        
        // Update expense date if it exists
        if (expenseToEdit.date) {
          setExpenseDate(new Date(expenseToEdit.date));
        }
        
        // Handle split details based on split type
        if (expenseToEdit.splitType === SplitType.EQUAL) {
          // For equal splits, initialize with placeholder values for all members
          const initialSplitDetails: Record<string, number> = {};
          if (members && members.length > 0) {
            members.forEach(member => {
              initialSplitDetails[member.id] = 0;
            });
          }
          setSplitDetails(initialSplitDetails);
        } else if (expenseToEdit.splitDetails && expenseToEdit.splitDetails !== '{}') {
          // For other split types, parse the details from the expense
          try {
            const details = JSON.parse(expenseToEdit.splitDetails);
            setSplitDetails(details);
          } catch (e) {
            console.error('Error parsing split details in useEffect', e);
            
            // Fallback: initialize with defaults based on split type
            handleSplitTypeChange(expenseToEdit.splitType);
          }
        } else {
          // Default: initialize with the right split type handler
          handleSplitTypeChange(expenseToEdit.splitType);
        }
      }
    }, [expenseToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setExpenseData(prev => ({ ...prev, [name]: value }));
      
      // When amount changes and we're using exact split mode, update the split details
      if (name === 'amount' && expenseData.splitType === SplitType.EXACT && value) {
        const totalAmount = parseFloat(value);
        
        if (!isNaN(totalAmount) && totalAmount > 0) {
          const perPersonAmount = parseFloat((totalAmount / members.length).toFixed(2));
          const newSplitDetails: Record<string, number> = {};
          let distributed = 0;
            
          members.forEach((member, index) => {
            if (index === members.length - 1) {
              // Last person gets remaining amount to avoid rounding errors
              newSplitDetails[member.id] = parseFloat((totalAmount - distributed).toFixed(2));
            } else {
              newSplitDetails[member.id] = perPersonAmount;
              distributed += perPersonAmount;
            }
          });
          
          setSplitDetails(newSplitDetails);
        }
      }
    };

    const handlePaidByChange = (value: number) => {
      setExpenseData(prev => ({ ...prev, paidByUserId: value }));
    };
    
    const handleSplitTypeChange = (value: string) => {
      setExpenseData(prev => ({ ...prev, splitType: value }));
      
      // Initialize split details based on the split type
      const newSplitDetails: Record<string, number> = {};
      
      if (value === SplitType.EQUAL) {
        // For equal splits, we still need to include all members in splitDetails
        // even though the actual amounts will be calculated on the server
        members.forEach(member => {
          // Just set a placeholder value to identify which users are in the split
          newSplitDetails[member.id] = 0;  
        });
      } else if (value === SplitType.PERCENTAGE) {
        // Initialize with equal percentages
        const equalPercentage = parseFloat((100 / members.length).toFixed(2));
        let totalAssigned = 0;
        
        members.forEach((member, index) => {
          if (index === members.length - 1) {
            // Last person gets remaining percentage to avoid rounding errors
            newSplitDetails[member.id] = parseFloat((100 - totalAssigned).toFixed(2)); 
          } else {
            newSplitDetails[member.id] = equalPercentage;
            totalAssigned += equalPercentage;
          }
        });
      } else if (value === SplitType.EXACT) {
        // Initialize with equal amounts if there's a current amount,
        // otherwise initialize with zeros
        if (expenseData.amount) {
          const totalAmount = parseFloat(expenseData.amount);
          const perPersonAmount = parseFloat((totalAmount / members.length).toFixed(2));
          
          // Distribute the amount evenly, adjusting the last person to account for rounding
          let distributed = 0;
          
          members.forEach((member, index) => {
            if (index === members.length - 1) {
              // Last person gets remaining amount to avoid rounding errors
              newSplitDetails[member.id] = parseFloat((totalAmount - distributed).toFixed(2));
            } else {
              newSplitDetails[member.id] = perPersonAmount;
              distributed += perPersonAmount;
            }
          });
        } else {
          // No amount entered yet, initialize with zeros
          members.forEach(member => {
            newSplitDetails[member.id] = 0;
          });
        }
      }
      
      setSplitDetails(newSplitDetails);
    };
    
    const handleSplitDetailChange = (userId: number, value: string) => {
      const numValue = parseFloat(value) || 0;
      setSplitDetails(prev => ({
        ...prev,
        [userId]: numValue
      }));
    };
    
    // Function to handle the "Even Split" button click
    const handleEvenSplit = () => {
      if (!members || members.length === 0) return;
      
      const newSplitDetails: Record<string, number> = {};
      
      if (expenseData.splitType === SplitType.PERCENTAGE) {
        // For percentage split, divide 100% equally
        const equalPercentage = parseFloat((100 / members.length).toFixed(2));
        let totalAssigned = 0;
        
        members.forEach((member, index) => {
          if (index === members.length - 1) {
            // Last person gets remaining percentage to avoid rounding errors
            newSplitDetails[member.id] = parseFloat((100 - totalAssigned).toFixed(2));
          } else {
            newSplitDetails[member.id] = equalPercentage;
            totalAssigned += equalPercentage;
          }
        });
      } else if (expenseData.splitType === SplitType.EXACT) {
        // For exact split, we need a valid amount
        if (!expenseData.amount) {
          toast({
            title: "Missing Amount",
            description: "Please enter a total amount first.",
            variant: "destructive"
          });
          return;
        }
        
        const totalAmount = parseFloat(expenseData.amount);
        if (isNaN(totalAmount) || totalAmount <= 0) {
          toast({
            title: "Invalid Amount",
            description: "Please enter a valid amount greater than zero.",
            variant: "destructive"
          });
          return;
        }
        
        // Calculate equal shares
        const perPersonAmount = parseFloat((totalAmount / members.length).toFixed(2));
        let distributed = 0;
        
        members.forEach((member, index) => {
          if (index === members.length - 1) {
            // Last person gets remaining amount to avoid rounding errors
            newSplitDetails[member.id] = parseFloat((totalAmount - distributed).toFixed(2));
          } else {
            newSplitDetails[member.id] = perPersonAmount;
            distributed += perPersonAmount;
          }
        });
      } else if (expenseData.splitType === SplitType.EQUAL) {
        // For equal split, we just set placeholder values
        members.forEach(member => {
          newSplitDetails[member.id] = 0;
        });
      }
      
      setSplitDetails(newSplitDetails);
      
      toast({
        title: "Even Split Applied",
        description: `The expense has been split evenly among ${members.length} members.`
      });
    };

    // Check for invalid or missing users in split details
    const checkForMissingUsers = () => {
      if (!splitDetails || Object.keys(splitDetails).length === 0) return false;
      
      // Get the current member IDs in the group as strings
      const currentMemberIds = members.map(m => String(m.id));
      
      // Check for any user IDs in splitDetails that aren't in the current members
      const invalidUserIds = Object.keys(splitDetails).filter(userId => 
        !currentMemberIds.includes(userId) && splitDetails[userId] > 0
      );
      
      // Return true if we have any invalid users with non-zero allocations
      return invalidUserIds.length > 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!expenseData.description || !expenseData.amount || !expenseData.paidByUserId) {
        toast({
          title: 'Error',
          description: 'Please fill all required fields',
          variant: 'destructive',
        });
        return;
      }
      
      try {
        setLoading(true);
        
        // Check for invalid users first
        const hasMissingUsers = checkForMissingUsers();
        if (hasMissingUsers) {
          // Show a warning but allow the user to proceed
          const warnResult = window.confirm(
            'Warning: This expense contains allocations for users who are no longer in the group. ' +
            'These allocations may be lost or need to be redistributed. Do you want to continue?'
          );
          
          if (!warnResult) {
            setLoading(false);
            return;
          }
        }
        
        // Validate split details if not using equal split
        if (expenseData.splitType !== SplitType.EQUAL) {
          // For percentage split, ensure percentages add up to 100%
          if (expenseData.splitType === SplitType.PERCENTAGE) {
            const totalPercentage = Object.values(splitDetails).reduce((sum, val) => sum + val, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
              toast({
                title: 'Error',
                description: `Percentages must add up to 100%. Current total: ${totalPercentage.toFixed(2)}%`,
                variant: 'destructive',
              });
              setLoading(false);
              return;
            }
          }
          
          // For exact split, ensure amounts add up to the total
          if (expenseData.splitType === SplitType.EXACT) {
            const totalAmount = parseFloat(expenseData.amount);
            const splitTotal = Object.values(splitDetails).reduce((sum, val) => sum + val, 0);
            if (Math.abs(totalAmount - splitTotal) > 0.01) {
              toast({
                title: 'Error',
                description: `Split amounts must add up to the total ${formatCurrency(totalAmount)}. Current total: ${formatCurrency(splitTotal)}`,
                variant: 'destructive',
              });
              setLoading(false);
              return;
            }
          }
        }
        
        // Date handling
        const currentDate = expenseDate instanceof Date ? expenseDate : new Date();
        
        // Create the request payload
        const payload = {
          description: expenseData.description,
          amount: parseFloat(expenseData.amount),
          paidByUserId: expenseData.paidByUserId,
          splitWithUserIds: members.map(member => member.id), // Split with all group members by default
          splitType: expenseData.splitType,
          splitDetails: JSON.stringify(splitDetails),
          // Always include date - we've updated the schema to handle string dates properly
          date: currentDate.toISOString()
        };
        
        if (isEditing && expenseToEdit) {
          // Update existing expense
          await apiRequest('PUT', `/api/expenses/${expenseToEdit.id}`, payload);
          
          toast({
            title: 'Success',
            description: 'Expense updated successfully',
          });
          
          // Notify parent component
          if (onExpenseEdited) onExpenseEdited();
        } else {
          // Create new expense
          await apiRequest('POST', `/api/groups/${group.id}/expenses`, payload);
          
          toast({
            title: 'Success',
            description: 'Expense added successfully',
          });
          
          // Notify parent component
          onExpenseAdded();
        }
        
        // Invalidate queries to refresh all affected components
        // This ensures that all tables, summaries, and history are updated
        queryClient.invalidateQueries({ queryKey: ['/api/groups/all-summaries'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'summary'] });
        queryClient.invalidateQueries({ queryKey: ['/api/users', expenseData.paidByUserId, 'global-summary'] });
        
        // Invalidate any related transaction queries (for the new unified system)
        queryClient.invalidateQueries({ queryKey: ['/api/groups', group.id, 'transactions'] });
        
        // Reset form and close dialog
        resetForm();
        setOpen(false);
      } catch (err) {
        toast({
          title: 'Error',
          description: (err as Error).message || 'Failed to add expense',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="mb-6">
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen && onCancelEdit && isEditing) {
            onCancelEdit();
          } else if (!isOpen) {
            resetForm();
          }
        }}>
          {!isEditing && (
            <DialogTrigger asChild>
              <Button 
                style={{
                  backgroundColor: '#344054', 
                  color: 'white',
                  border: '1px solid #344054',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  height: '2.5rem',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  fontSize: '0.875rem',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.25rem',
                  fontWeight: '500',
                  borderRadius: '0.375rem',
                  minWidth: '8rem',
                }}
                className="add-expense-button">
                <Plus className="h-4 w-4" />
                Add New Expense
              </Button>
            </DialogTrigger>
          )}
          <DialogContent 
            className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
            aria-describedby="expense-form-description"
          >
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
              <p id="expense-form-description" className="text-sm text-muted-foreground">
                {isEditing 
                  ? 'Update expense details and adjust how the cost is split between group members.'
                  : 'Enter expense details and choose how to split the cost between group members.'
                }
              </p>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="py-4">
              {/* Date Picker - Moved to the top */}
              <div className="mb-4">
                <Label htmlFor="expenseDate">Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full mt-1 justify-start text-left font-normal"
                      id="expenseDate"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expenseDate ? format(expenseDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expenseDate}
                      onSelect={setExpenseDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex flex-wrap gap-4 justify-between">
                <div className="w-full md:w-auto flex-1">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    value={expenseData.description}
                    onChange={handleChange}
                    placeholder="e.g., Dinner, Hotel, Gas"
                    className="mt-1"
                    required
                  />
                </div>
                
                <div className="w-32">
                  <Label htmlFor="amount">Amount</Label>
                  <div className="mt-1 relative rounded-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      value={expenseData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0.01"
                      className="pl-7"
                      required
                    />
                  </div>
                </div>
                
                <div className="w-40">
                  <Label htmlFor="paidBy">Paid By</Label>
                  <Select
                    value={String(expenseData.paidByUserId)}
                    onValueChange={(value) => handlePaidByChange(Number(value))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.firstName && user.lastName 
                            ? `${user.firstName} ${user.lastName}`
                            : user.email || `User ${user.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Split Type Selection */}
              <div className="mt-6">
                <Label className="block mb-2">Split Type</Label>
                <RadioGroup
                  value={expenseData.splitType}
                  onValueChange={handleSplitTypeChange}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={SplitType.PERCENTAGE} id="percentage" />
                    <Label htmlFor="percentage">Percentage Split</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={SplitType.EXACT} id="exact" />
                    <Label htmlFor="exact">Dollar Split</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Split Details */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-3">
                  <Label className="block">
                    {expenseData.splitType === SplitType.PERCENTAGE ? 'Percentage Allocation' : 'Dollar Allocation'}
                  </Label>
                  <Button 
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEvenSplit}
                    className="text-xs px-2.5 py-1.5 h-auto"
                  >
                    Even Split
                  </Button>
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-secondary text-secondary-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Person</th>
                        <th className="px-4 py-2 text-right font-medium">
                          {expenseData.splitType === SplitType.PERCENTAGE ? 'Percentage (%)' : 'Amount ($)'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {members.map((member, index) => (
                        <tr key={member.id} className={index % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                          <td className="px-4 py-2 text-left">
                            {member.firstName && member.lastName 
                              ? `${member.firstName} ${member.lastName}`
                              : member.email || `User ${member.id}`}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="relative inline-block">
                              {expenseData.splitType === SplitType.PERCENTAGE && (
                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                  <span className="text-gray-500 sm:text-sm">%</span>
                                </div>
                              )}
                              {expenseData.splitType === SplitType.EXACT && (
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-gray-500 sm:text-sm">$</span>
                                </div>
                              )}
                              <Input
                                type="number"
                                value={splitDetails[member.id] || ''}
                                onChange={(e) => handleSplitDetailChange(member.id, e.target.value)}
                                step="0.01"
                                className={`w-24 text-right ${expenseData.splitType === SplitType.EXACT ? "pl-7" : "pr-7"}`}
                                placeholder={expenseData.splitType === SplitType.PERCENTAGE ? "50" : "12.50"}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-primary/5 font-medium">
                        <td className="px-4 py-2 text-left">Total</td>
                        <td className="px-4 py-2 text-right">
                          {expenseData.splitType === SplitType.PERCENTAGE && (
                            <div>
                              <span className={`${Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - 100) > 0.01 ? 'text-red-500' : 'text-green-500'} block`}>
                                {Object.values(splitDetails).reduce((sum, val) => sum + val, 0).toFixed(2)}%
                              </span>
                              {Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - 100) > 0.01 && (
                                <span className="text-sm text-muted-foreground block mt-1">
                                  {Object.values(splitDetails).reduce((sum, val) => sum + val, 0) > 100 
                                    ? `${(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - 100).toFixed(2)}% over` 
                                    : `${(100 - Object.values(splitDetails).reduce((sum, val) => sum + val, 0)).toFixed(2)}% under`}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {expenseData.splitType === SplitType.EXACT && expenseData.amount && (
                            <div>
                              <span className={`${Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - parseFloat(expenseData.amount)) > 0.01 ? 'text-red-500' : 'text-green-500'} block`}>
                                {formatCurrency(Object.values(splitDetails).reduce((sum, val) => sum + val, 0))}
                              </span>
                              {Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - parseFloat(expenseData.amount)) > 0.01 && (
                                <span className="text-sm text-muted-foreground block mt-1">
                                  {Object.values(splitDetails).reduce((sum, val) => sum + val, 0) > parseFloat(expenseData.amount)
                                    ? `${formatCurrency(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - parseFloat(expenseData.amount))} over` 
                                    : `${formatCurrency(parseFloat(expenseData.amount) - Object.values(splitDetails).reduce((sum, val) => sum + val, 0))} under`}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading 
                    ? (isEditing ? 'Updating...' : 'Adding...') 
                    : (isEditing ? 'Update Expense' : 'Add Expense')
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

export default ExpenseForm;