import React from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useExpenseFunctions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';

import type { Expense } from '@shared/schema';
import { SplitType } from '@shared/schema';

interface ExpenseTableProps {
  expenses: Expense[];
  totalExpenses: number;
  onExpenseDeleted: () => void;
}

function ExpenseTable({ expenses, totalExpenses, onExpenseDeleted }: ExpenseTableProps) {
  const { handleDeleteExpense, formatCurrency } = useExpenseFunctions();

  const deleteExpense = async (id: number) => {
    await handleDeleteExpense(id, onExpenseDeleted);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        {expenses.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No expenses yet. Add your first expense above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid By</TableHead>
                  <TableHead>Split Type</TableHead>
                  <TableHead>Split With</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {expense.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-primary">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell>
                      {expense.paidBy}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Badge variant={
                          expense.splitType === SplitType.EQUAL 
                            ? "default" 
                            : expense.splitType === SplitType.PERCENTAGE 
                              ? "secondary"
                              : "outline"
                        }>
                          {expense.splitType === SplitType.EQUAL 
                            ? "Equal"
                            : expense.splitType === SplitType.PERCENTAGE
                              ? "Percentage"
                              : "Dollar"
                          }
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {expense.splitWith.join(', ')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell colSpan={5} className="text-primary font-bold">
                    {formatCurrency(totalExpenses)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ExpenseTable;
