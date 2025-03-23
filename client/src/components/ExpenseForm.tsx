import React, { useState } from 'react';
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

import type { Group } from '@shared/schema';
import { SplitType } from '@shared/schema';

interface ExpenseFormProps {
  group: Group;
  onExpenseAdded: () => void;
}

function ExpenseForm({ group, onExpenseAdded }: ExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: '',
    paidBy: group.people[0] || '',
    splitType: SplitType.EQUAL as string,
  });
  const [splitDetails, setSplitDetails] = useState<Record<string, number>>({});
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
      
      await apiRequest('POST', `/api/groups/${group.id}/expenses`, {
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        paidBy: expenseData.paidBy,
        splitWith: group.people, // Split with all group members by default
        splitType: expenseData.splitType,
        splitDetails: JSON.stringify(splitDetails)
      });
      
      // Reset form and close dialog
      resetForm();
      setOpen(false);
      
      toast({
        title: 'Success',
        description: 'Expense added successfully',
      });
      
      // Notify parent component
      onExpenseAdded();
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
        if (!isOpen) resetForm();
      }}>
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Expense
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
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
              
              <div>
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
              
              <div>
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
                <Label className="block mb-2">
                  {expenseData.splitType === SplitType.PERCENTAGE ? 'Percentage Allocation' : 'Dollar Allocation'}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {group.people.map((person, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="w-1/3">{person}:</span>
                      <div className="relative flex-1">
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
                          className={expenseData.splitType === SplitType.EXACT ? "pl-7" : "pr-7"}
                          placeholder={expenseData.splitType === SplitType.PERCENTAGE ? "e.g., 50" : "e.g., 12.50"}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Total display */}
                <div className="mt-3 text-sm">
                  {expenseData.splitType === SplitType.PERCENTAGE && (
                    <div className="flex justify-between">
                      <span>Total Percentage:</span>
                      <span className={`font-semibold ${Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - 100) > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                        {Object.values(splitDetails).reduce((sum, val) => sum + val, 0).toFixed(2)}%
                        {Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - 100) > 0.01 ? ' (should be 100%)' : ''}
                      </span>
                    </div>
                  )}
                  
                  {expenseData.splitType === SplitType.EXACT && expenseData.amount && (
                    <div className="flex justify-between">
                      <span>Total Split Amount:</span>
                      <span className={`font-semibold ${Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - parseFloat(expenseData.amount)) > 0.01 ? 'text-red-500' : 'text-green-500'}`}>
                        {formatCurrency(Object.values(splitDetails).reduce((sum, val) => sum + val, 0))}
                        {Math.abs(Object.values(splitDetails).reduce((sum, val) => sum + val, 0) - parseFloat(expenseData.amount)) > 0.01 
                          ? ` (should be ${formatCurrency(parseFloat(expenseData.amount))})` 
                          : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ExpenseForm;
