import React, { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import type { Group } from '@shared/schema';

interface ExpenseFormProps {
  group: Group;
  onExpenseAdded: () => void;
}

function ExpenseForm({ group, onExpenseAdded }: ExpenseFormProps) {
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: '',
    paidBy: group.people[0] || '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setExpenseData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaidByChange = (value: string) => {
    setExpenseData(prev => ({ ...prev, paidBy: value }));
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
      await apiRequest('POST', `/api/groups/${group.id}/expenses`, {
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        paidBy: expenseData.paidBy,
        splitWith: group.people // Split with all group members by default
      });
      
      // Reset form
      setExpenseData({
        description: '',
        amount: '',
        paidBy: group.people[0] || '',
      });
      
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
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Add New Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
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
          
          <Button type="submit" className="mt-4" disabled={loading}>
            {loading ? 'Adding...' : 'Add Expense'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default ExpenseForm;
