import { db } from './db';
import { 
  transactions, 
  transactionSplits, 
  users,
  groups,
  Transaction,
  TransactionType,
  SplitType
} from '../shared/schema';
import { eq, and, or, desc, asc, inArray, isNull } from 'drizzle-orm';

/**
 * Verifies the consistency between a transaction and its splits
 * This checks if:
 * 1. The transaction exists
 * 2. The transaction has associated splits
 * 3. The total of splits equals the transaction amount
 * 4. The payer is included in the splits
 */
export async function verifyTransactionConsistency(transactionId: number): Promise<{
  isConsistent: boolean;
  transaction?: Transaction;
  splits?: Array<any>;
  totalSplitAmount?: number;
  transactionAmount?: number;
  errorDetails?: string;
}> {
  // Get the transaction
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, transactionId));
  
  if (!transaction) {
    return {
      isConsistent: false,
      errorDetails: `Transaction with ID ${transactionId} not found`
    };
  }
  
  // Skip non-expense transactions
  if (transaction.type !== TransactionType.EXPENSE) {
    return { isConsistent: true, transaction };
  }
  
  // Get all splits for this transaction
  const splits = await db
    .select()
    .from(transactionSplits)
    .where(eq(transactionSplits.transactionId, transactionId));
  
  if (splits.length === 0) {
    return {
      isConsistent: false,
      transaction,
      splits: [],
      errorDetails: `Transaction ${transactionId} has no associated splits`
    };
  }
  
  // Calculate the total split amount
  let totalSplitAmount = 0;
  for (const split of splits) {
    const splitAmount = parseFloat(split.amount as string);
    if (isNaN(splitAmount)) {
      return {
        isConsistent: false,
        transaction,
        splits,
        errorDetails: `Invalid split amount for user ${split.userId}: ${split.amount}`
      };
    }
    totalSplitAmount += splitAmount;
  }
  
  // Get the transaction amount
  const transactionAmount = parseFloat(transaction.amount as string);
  if (isNaN(transactionAmount)) {
    return {
      isConsistent: false,
      transaction,
      splits,
      errorDetails: `Invalid transaction amount: ${transaction.amount}`
    };
  }
  
  // Compare the two amounts (convert to cents to avoid floating-point issues)
  const transactionCents = Math.round(transactionAmount * 100);
  const splitsCents = Math.round(totalSplitAmount * 100);
  
  if (transactionCents !== splitsCents) {
    return {
      isConsistent: false,
      transaction,
      splits,
      totalSplitAmount,
      transactionAmount,
      errorDetails: `Transaction amount (${transactionAmount.toFixed(2)}) doesn't match total of splits (${totalSplitAmount.toFixed(2)})`
    };
  }
  
  // Check that the payer is in the splits
  const payerIsInSplits = splits.some(split => split.userId === transaction.paidByUserId);
  if (!payerIsInSplits) {
    return {
      isConsistent: false,
      transaction,
      splits,
      errorDetails: `Payer (${transaction.paidByUserId}) is not included in the transaction splits`
    };
  }
  
  // All checks passed
  return {
    isConsistent: true,
    transaction,
    splits,
    totalSplitAmount,
    transactionAmount
  };
}

/**
 * Reconciles inconsistent transaction data
 * This will:
 * 1. Check if there are any inconsistencies
 * 2. If splits are missing, it will create equal splits for all group members
 * 3. If splits don't add up to the transaction amount, it will adjust them proportionally
 * 4. If the payer is not in the splits, it will add them with a 0 amount
 */
export async function reconcileTransactionData(transactionId: number): Promise<{
  success: boolean;
  message: string;
  fixes?: Array<string>;
}> {
  // First verify if there's actually an inconsistency
  const verification = await verifyTransactionConsistency(transactionId);
  
  if (verification.isConsistent) {
    return {
      success: true,
      message: 'No inconsistencies found'
    };
  }
  
  const fixes: Array<string> = [];
  
  // Get the full transaction and splits data
  const transaction = verification.transaction;
  if (!transaction) {
    return {
      success: false,
      message: 'Transaction not found'
    };
  }
  
  // Skip non-expense transactions
  if (transaction.type !== TransactionType.EXPENSE) {
    return {
      success: true,
      message: 'Not an expense transaction, no action needed'
    };
  }
  
  // Start a transaction to ensure all changes are atomic
  return await db.transaction(async (tx) => {
    try {
      const splits = await tx
        .select()
        .from(transactionSplits)
        .where(eq(transactionSplits.transactionId, transactionId));
      
      // Case 1: No splits found but transaction exists
      if (splits.length === 0) {
        // Create default equal splits
        const groupId = transaction.groupId;
        
        // Get group members if this is a group transaction
        let memberIds: number[] = [];
        if (groupId) {
          const members = await tx
            .select()
            .from(users)
            .innerJoin(
              'user_groups', 
              and(
                eq('user_groups.userId', users.id),
                eq('user_groups.groupId', groupId)
              )
            );
          
          memberIds = members.map(member => member.users.id);
        } else {
          // For non-group transactions, at least include the payer
          memberIds = [transaction.paidByUserId];
        }
        
        // Don't proceed if we couldn't find any members
        if (memberIds.length === 0) {
          return {
            success: false,
            message: 'Could not determine transaction participants'
          };
        }
        
        // Generate equal splits for all members
        const transactionAmount = parseFloat(transaction.amount as string);
        const splitAmount = transactionAmount / memberIds.length;
        
        const newSplits = memberIds.map(userId => ({
          transactionId,
          userId,
          amount: splitAmount.toFixed(2),
          isSettled: userId === transaction.paidByUserId,
          settledAt: userId === transaction.paidByUserId ? new Date() : null
        }));
        
        // Insert the new splits
        await tx.insert(transactionSplits).values(newSplits);
        
        fixes.push(`Created ${newSplits.length} equal splits for transaction ${transactionId}`);
      } 
      // Case 2: Splits exist but don't add up to the transaction amount
      else if (verification.totalSplitAmount !== verification.transactionAmount) {
        // Adjust the splits proportionally to match the transaction amount
        const transactionAmount = parseFloat(transaction.amount as string);
        let totalSplitAmount = 0;
        
        // First calculate the current total
        for (const split of splits) {
          totalSplitAmount += parseFloat(split.amount as string);
        }
        
        // If total is zero, create equal splits instead
        if (totalSplitAmount === 0) {
          const equalSplitAmount = transactionAmount / splits.length;
          
          for (const split of splits) {
            await tx
              .update(transactionSplits)
              .set({ amount: equalSplitAmount.toFixed(2) })
              .where(
                and(
                  eq(transactionSplits.transactionId, split.transactionId),
                  eq(transactionSplits.userId, split.userId)
                )
              );
          }
          
          fixes.push(`Replaced zero splits with equal splits of ${equalSplitAmount.toFixed(2)}`);
        } 
        // Otherwise adjust splits proportionally
        else {
          const ratio = transactionAmount / totalSplitAmount;
          
          for (const split of splits) {
            const originalAmount = parseFloat(split.amount as string);
            const newAmount = (originalAmount * ratio).toFixed(2);
            
            await tx
              .update(transactionSplits)
              .set({ amount: newAmount })
              .where(
                and(
                  eq(transactionSplits.transactionId, split.transactionId),
                  eq(transactionSplits.userId, split.userId)
                )
              );
          }
          
          fixes.push(`Adjusted all splits by ratio ${ratio.toFixed(4)} to match transaction amount`);
        }
      }
      
      // Case 3: Payer is not in the splits
      if (!splits.some(split => split.userId === transaction.paidByUserId)) {
        // Add the payer to the splits
        const transactionAmount = parseFloat(transaction.amount as string);
        const payerSplit = {
          transactionId,
          userId: transaction.paidByUserId,
          amount: '0.00', // Start with zero - we'll adjust the other splits to compensate
          isSettled: true,
          settledAt: new Date()
        };
        
        await tx.insert(transactionSplits).values(payerSplit);
        
        // Recalculate all splits to fit the transaction amount
        const updatedSplits = await tx
          .select()
          .from(transactionSplits)
          .where(eq(transactionSplits.transactionId, transactionId));
        
        // Distribute the amount among non-payer users
        const nonPayerSplits = updatedSplits.filter(split => split.userId !== transaction.paidByUserId);
        const splitAmount = transactionAmount / nonPayerSplits.length;
        
        for (const split of nonPayerSplits) {
          await tx
            .update(transactionSplits)
            .set({ amount: splitAmount.toFixed(2) })
            .where(
              and(
                eq(transactionSplits.transactionId, split.transactionId),
                eq(transactionSplits.userId, split.userId)
              )
            );
        }
        
        fixes.push(`Added missing payer (${transaction.paidByUserId}) to splits and redistributed amounts`);
      }
      
      return {
        success: true,
        message: 'Transaction data reconciled successfully',
        fixes
      };
    } catch (error) {
      console.error('Error reconciling transaction data:', error);
      return {
        success: false,
        message: `Failed to reconcile: ${error.message}`
      };
    }
  });
}

/**
 * Finds all transactions that have inconsistencies between the transaction amount
 * and the sum of their splits. Returns details for each inconsistent transaction.
 */
export async function findInconsistentTransactions(): Promise<Array<{
  transactionId: number;
  transactionAmount: string;
  totalSplitAmount: string;
  difference: string;
  type: TransactionType;
  paidByUserId: number;
  createdAt: Date;
}>> {
  // Get all expense transactions
  const expenseTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.type, TransactionType.EXPENSE));
  
  const inconsistentTransactions = [];
  
  // Check each transaction for inconsistencies
  for (const transaction of expenseTransactions) {
    const verification = await verifyTransactionConsistency(transaction.id);
    
    if (!verification.isConsistent && verification.totalSplitAmount !== undefined && verification.transactionAmount !== undefined) {
      // Calculate the difference
      const difference = verification.transactionAmount - verification.totalSplitAmount;
      
      inconsistentTransactions.push({
        transactionId: transaction.id,
        transactionAmount: transaction.amount as string,
        totalSplitAmount: verification.totalSplitAmount.toFixed(2),
        difference: difference.toFixed(2),
        type: transaction.type,
        paidByUserId: transaction.paidByUserId,
        createdAt: transaction.createdAt
      });
    }
  }
  
  return inconsistentTransactions;
}

/**
 * Validates a single transaction amount is equal to the sum of its splits
 * This is a simpler version that only checks the mathematical equality
 * without performing any other validations or lookups
 */
export function validateTransactionTotal(
  transactionAmount: number | string,
  splits: Array<{ amount: number | string }>
): boolean {
  if (!splits || splits.length === 0) {
    return false;
  }

  // Convert transaction amount to number
  const totalAmount = typeof transactionAmount === 'string' 
    ? parseFloat(transactionAmount) 
    : transactionAmount;
  
  // Calculate sum of splits
  let splitSum = 0;
  for (const split of splits) {
    const splitAmount = typeof split.amount === 'string'
      ? parseFloat(split.amount)
      : split.amount;
      
    if (isNaN(splitAmount)) {
      return false;
    }
    
    splitSum += splitAmount;
  }
  
  // Compare the totals (in cents to avoid floating point issues)
  const totalCents = Math.round(totalAmount * 100);
  const splitCents = Math.round(splitSum * 100);
  
  return totalCents === splitCents;
}