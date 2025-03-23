import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

import type { Group, Expense } from '@shared/schema';
import { SplitType } from '@shared/schema';

interface ExpenseFormProps {
  group: Group;
  onExpenseAdded: () => void;
  expenseToEdit?: Expense;
  isEditing?: boolean;
  onExpenseEdited?: () => void;
  onCancelEdit?: () => void;
}

const ExpenseForm = forwardRef<{ setOpen: (open: boolean) => void }, ExpenseFormProps>(
  (props, ref) => {
    const { 
      group, 
      onExpenseAdded, 
      expenseToEdit, 
      isEditing = false, 
      onExpenseEdited, 
      onCancelEdit 
    } = props;
    
    const [open, setOpen] = useState(isEditing);
    
    // Expose setOpen method to parent components
    useImperativeHandle(ref, () => ({
      setOpen,
    }));
    
    const [expenseData, setExpenseData] = useState(() => {
      if (expenseToEdit) {
        console.log('Expense to edit:', expenseToEdit);
        return {
          description: expenseToEdit.description,
          amount: String(expenseToEdit.amount),
          paidBy: expenseToEdit.paidBy,
          splitType: expenseToEdit.splitType,
        };
      }
      return {
        description: '',
        amount: '',
        paidBy: group.people[0] || '',
        splitType: SplitType.EQUAL as string,
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
      setExpenseData({
        description: '',
        amount: '',
        paidBy: group.people[0] || '',
        splitType: SplitType.EQUAL as string,
      });
      setSplitDetails({});
    };
    
    // Update form data when expenseToEdit changes
    useEffect(() => {
      if (expenseToEdit) {
        console.log('Expense to edit changed:', expenseToEdit);
        setExpenseData({
          description: expenseToEdit.description,
          amount: String(expenseToEdit.amount),
          paidBy: expenseToEdit.paidBy,
          splitType: expenseToEdit.splitType,
        });
        
        // Update split details if they exist
        if (expenseToEdit.splitDetails && expenseToEdit.splitDetails !== '{}') {
          try {
            const details = JSON.parse(expenseToEdit.splitDetails);
            setSplitDetails(details);
          } catch (e) {
            console.error('Error parsing split details in useEffect', e);
            setSplitDetails({});
          }
        } else {
          setSplitDetails({});
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
          const perPersonAmount = parseFloat((totalAmount / group.people.length).toFixed(2));
          const newSplitDetails: Record<string, number> = {};
          let distributed = 0;
            
          group.people.forEach((person, index) => {
            if (index === group.people.length - 1) {
              // Last person gets remaining amount to avoid rounding errors
              newSplitDetails[person] = parseFloat((totalAmount - distributed).toFixed(2));
            } else {
              newSplitDetails[person] = perPersonAmount;
              distributed += perPersonAmount;
            }
          });
          
          setSplitDetails(newSplitDetails);
        }
      }
    };

    const handlePaidByChange = (value: string) => {
      setExpenseData(prev => ({ ...prev, paidBy: value }));
    };
    
    const handleSplitTypeChange = (value: string) => {
      setExpenseData(prev => ({ ...prev, splitType: value }));
      
      // Reset split details when changing split type
      if (value === SplitType.EQUAL) {
        setSplitDetails({});
      } else {
        // Initialize split details based on the split type
        const newSplitDetails: Record<string, number> = {};
        
        if (value === SplitType.PERCENTAGE) {
          // Initialize with equal percentages
          const equalPercentage = parseFloat((100 / group.people.length).toFixed(2));
          group.people.forEach(person => {
            newSplitDetails[person] = equalPercentage;
          });
        } else if (value === SplitType.EXACT) {
          // Initialize with equal amounts if there's a current amount,
          // otherwise initialize with zeros
          if (expenseData.amount) {
            const totalAmount = parseFloat(expenseData.amount);
            const perPersonAmount = parseFloat((totalAmount / group.people.length).toFixed(2));
            
            // Distribute the amount evenly, adjusting the last person to account for rounding
            let distributed = 0;
            
            group.people.forEach((person, index) => {
              if (index === group.people.length - 1) {
                // Last person gets remaining amount to avoid rounding errors
                newSplitDetails[person] = parseFloat((totalAmount - distributed).toFixed(2));
              } else {
                newSplitDetails[person] = perPersonAmount;
                distributed += perPersonAmount;
              }
            });
          } else {
            // No amount entered yet, initialize with zeros
            group.people.forEach(person => {
              newSplitDetails[person] = 0;
            });
          }
        }
        
        setSplitDetails(newSplitDetails);
      }
    };
    
    const handleSplitDetailChange = (person: string, value: string) => {
      const numValue = parseFloat(value) || 0;
      setSplitDetails(prev => ({
        ...prev,
        [person]: numValue
      }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (!expenseData.description || !expenseData.amount || !expenseData.paidBy) {
        toast({
          title: 'Error',
          description: 'Please fill all required fields',
          variant: 'destructive',
        });
        return;
      }
      
      try {
        setLoading(true);
        
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
        
        // Common payload for both create and update
        const payload = {
          description: expenseData.description,
          amount: parseFloat(expenseData.amount),
          paidBy: expenseData.paidBy,
          splitWith: group.people, // Split with all group members by default
          splitType: expenseData.splitType,
          splitDetails: JSON.stringify(splitDetails)
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
              <Button className="flex items-center gap-2">
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
                    value={expenseData.paidBy}
                    onValueChange={handlePaidByChange}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select person" />
                    </SelectTrigger>
                    <SelectContent>
                      {group.people.map((person, index) => (
                        <SelectItem key={index} value={person}>
                          {person}
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
                    <RadioGroupItem value={SplitType.EQUAL} id="equal" />
                    <Label htmlFor="equal">Equal Split</Label>
                  </div>
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
              {expenseData.splitType !== SplitType.EQUAL && (
                <div className="mt-4">
                  <Label className="block mb-3">
                    {expenseData.splitType === SplitType.PERCENTAGE ? 'Percentage Allocation' : 'Dollar Allocation'}
                  </Label>
                  
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
                        {group.people.map((person, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-secondary/20'}>
                            <td className="px-4 py-2 text-left">{person}</td>
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
                                  value={splitDetails[person] || ''}
                                  onChange={(e) => handleSplitDetailChange(person, e.target.value)}
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
                              <span className={`${Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - 100) > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                                {Object.values(splitDetails).reduce((sum, val) => sum + val, 0).toFixed(2)}%
                                {Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - 100) > 0.01 ? ' (should be 100%)' : ''}
                              </span>
                            )}
                            
                            {expenseData.splitType === SplitType.EXACT && expenseData.amount && (
                              <span className={`${Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - parseFloat(expenseData.amount)) > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                                {formatCurrency(Object.values(splitDetails).reduce((sum, val) => sum + val, 0))}
                                {Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - parseFloat(expenseData.amount)) > 0.01 
                                  ? ` (should be ${formatCurrency(parseFloat(expenseData.amount))})` 
                                  : ''}
                              </span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
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