import { db } from './db';
import { 
  expenses, expenseSplits, 
  settlements,
  transactions, transactionSplits,
  TransactionType, TransactionStatus
} from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This migration script will:
 * 1. Find any expenses that don't have corresponding transactions and create them
 * 2. Find any settlements that don't have corresponding transactions and create them
 * 3. Return statistics about what was migrated
 */
export async function migrateToUnifiedSystem(): Promise<{
  migratedExpenses: number;
  migratedSettlements: number;
  totalExpenses: number;
  totalSettlements: number;
}> {
  console.log('Starting migration to unified transaction system...');
  
  // Get all expenses
  const allExpenses = await db.select().from(expenses);
  console.log(`Found ${allExpenses.length} expenses in legacy system`);
  
  // Get all settlements
  const allSettlements = await db.select().from(settlements);
  console.log(`Found ${allSettlements.length} settlements in legacy system`);
  
  // Get all transactions
  const allTransactions = await db.select().from(transactions);
  console.log(`Found ${allTransactions.length} transactions in unified system`);
  
  // Count migrated items
  let migratedExpenses = 0;
  let migratedSettlements = 0;
  
  // Migrate expenses
  for (const expense of allExpenses) {
    // Check if this expense already has a corresponding transaction
    const matchingTransaction = allTransactions.find(t => 
      t.type === TransactionType.EXPENSE &&
      t.description === expense.description &&
      t.amount === expense.amount &&
      t.paidByUserId === expense.paidByUserId &&
      t.groupId === expense.groupId
    );
    
    if (!matchingTransaction) {
      console.log(`Migrating expense ID ${expense.id}: ${expense.description}`);
      
      // Create the transaction
      const [newTransaction] = await db.insert(transactions)
        .values({
          type: TransactionType.EXPENSE,
          description: expense.description,
          amount: expense.amount,
          paidByUserId: expense.paidByUserId,
          createdByUserId: expense.createdByUserId,
          groupId: expense.groupId,
          splitType: expense.splitType,
          splitDetails: expense.splitDetails,
          date: expense.date,
          createdAt: expense.createdAt,
          isDeleted: false
        })
        .returning();
      
      // Get the expense splits
      const splits = await db.select().from(expenseSplits)
        .where(eq(expenseSplits.expenseId, expense.id));
      
      // Create transaction splits
      if (splits.length > 0) {
        const transactionSplitEntries = splits.map(split => ({
          userId: split.userId,
          amount: split.amount,
          percentage: split.percentage,
          isSettled: split.isSettled,
          settledAt: split.settledAt,
          transactionId: newTransaction.id
        }));
        
        await db.insert(transactionSplits).values(transactionSplitEntries);
      }
      
      migratedExpenses++;
    }
  }
  
  // Migrate settlements
  for (const settlement of allSettlements) {
    // Check if this settlement already has a corresponding transaction
    const matchingTransaction = allTransactions.find(t => 
      t.type === TransactionType.SETTLEMENT &&
      t.amount === settlement.amount &&
      t.paidByUserId === settlement.fromUserId &&
      t.toUserId === settlement.toUserId &&
      t.groupId === settlement.groupId &&
      t.paymentMethod === settlement.paymentMethod
    );
    
    if (!matchingTransaction) {
      console.log(`Migrating settlement ID ${settlement.id} from ${settlement.fromUserId} to ${settlement.toUserId}`);
      
      // Map settlement status to transaction status
      let status = TransactionStatus.PENDING;
      if (settlement.status === 'completed') {
        status = TransactionStatus.COMPLETED;
      } else if (settlement.status === 'canceled') {
        status = TransactionStatus.CANCELED;
      }
      
      // Create the transaction
      await db.insert(transactions)
        .values({
          type: TransactionType.SETTLEMENT,
          description: `Settlement payment`,
          amount: settlement.amount,
          paidByUserId: settlement.fromUserId,
          toUserId: settlement.toUserId,
          groupId: settlement.groupId,
          paymentMethod: settlement.paymentMethod,
          status,
          notes: settlement.notes,
          createdAt: settlement.createdAt,
          completedAt: settlement.completedAt,
          transactionReference: settlement.transactionReference,
          isDeleted: false
        });
      
      migratedSettlements++;
    }
  }
  
  console.log('Migration complete!');
  console.log(`Migrated ${migratedExpenses} of ${allExpenses.length} expenses`);
  console.log(`Migrated ${migratedSettlements} of ${allSettlements.length} settlements`);
  
  return {
    migratedExpenses,
    migratedSettlements,
    totalExpenses: allExpenses.length,
    totalSettlements: allSettlements.length
  };
}

// Export a route handler for running the migration via API
export function migrationRouteHandler(req: any, res: any) {
  migrateToUnifiedSystem()
    .then(result => {
      res.json({
        success: true,
        message: 'Migration to unified transaction system complete',
        stats: result
      });
    })
    .catch(error => {
      console.error('Error during migration:', error);
      res.status(500).json({
        success: false,
        message: 'Migration failed',
        error: error.message
      });
    });
}