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
import { Trash2, Edit2 } from 'lucide-react';
import { useExpenseFunctions } from '@/lib/hooks';
import { Badge } from '@/components/ui/badge';

import type { Expense } from '@shared/schema';
import { SplitType } from '@shared/schema';

interface ExpenseTableProps {
  expenses: Expense[];
  totalExpenses: number;
  onExpenseDeleted: () => void;
  onEditExpense?: (expense: Expense) => void;
}

function ExpenseTable({ expenses, totalExpenses, onExpenseDeleted, onEditExpense }: ExpenseTableProps) {
  const { handleDeleteExpense, formatCurrency } = useExpenseFunctions();

  const deleteExpense = async (id: number) => {
    await handleDeleteExpense(id, onExpenseDeleted);
  };

  return (
    <Card className="shadow-sm border-muted/60">
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-base">Expenses</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {expenses.length === 0 ? (
          <div className="text-center py-3 text-gray-500 text-xs">
            <p>No expenses yet. Add your first expense above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="hover:bg-muted/5">
                  <TableHead className="py-1 px-2 text-xs font-medium">Date</TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium">Description</TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium">Amount</TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium">Paid By</TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium">Split Type</TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium">Split With</TableHead>
                  <TableHead className="py-1 px-2 text-xs font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(expense => (
                  <TableRow key={expense.id} className="hover:bg-muted/5">
                    <TableCell className="whitespace-nowrap py-1 px-2 text-xs">
                      {new Date(expense.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium py-1 px-2 text-xs">
                      {expense.description}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-primary py-1 px-2 text-xs">
                      {formatCurrency(Number(expense.amount))}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-xs">
                      {/* Look up username by ID */}
                      User {expense.paidByUserId}
                    </TableCell>
                    <TableCell className="py-1 px-2 text-xs">
                      <Badge variant={
                        expense.splitType === SplitType.EQUAL 
                          ? "default" 
                          : expense.splitType === SplitType.PERCENTAGE 
                            ? "secondary"
                            : "outline"
                      } className="text-[10px] py-0 px-1.5 h-4">
                        {expense.splitType === SplitType.EQUAL 
                          ? "Equal"
                          : expense.splitType === SplitType.PERCENTAGE
                            ? "Percentage"
                            : "Dollar"
                        }
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 px-2 text-xs">
                      {/* Display member IDs for now */}
                      All members
                    </TableCell>
                    <TableCell className="text-right py-1 px-2 text-xs">
                      <div className="flex justify-end gap-0.5">
                        {onEditExpense && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditExpense(expense)}
                            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 h-5 w-5 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteExpense(expense.id)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50 h-5 w-5 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={2} className="py-1 px-2 text-xs">Total</TableCell>
                  <TableCell colSpan={5} className="text-primary font-bold py-1 px-2 text-xs">
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
