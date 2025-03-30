import { 
  groups, expenses, users, userGroups, expenseSplits, friendships,
  groupInvitations, settlements, transactions, transactionSplits,
  type Group, type InsertGroup, type Expense, type InsertExpense, 
  type Balance, type SettlementCalculation, type Settlement, type InsertSettlement,
  SplitType, SettlementStatus, PaymentMethod, TransactionStatus, TransactionType,
  type User, type InsertUser, type UserGroup, type InsertUserGroup, 
  type ExpenseSplit, type InsertExpenseSplit, type Friendship, type InsertFriendship,
  type GroupInvitation, type InsertGroupInvitation,
  type Transaction, type InsertTransaction, type TransactionSplit, type InsertTransactionSplit
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, notInArray, asc, desc, isNull, sql, count, not } from "drizzle-orm";

// System limits
export const LIMITS = {
  MAX_GROUPS_PER_USER: 100,
  MAX_EXPENSES_PER_USER: 1000,
  MAX_EXPENSES_PER_GROUP: 100
};

// Helper function for OR conditions
function or(...conditions: any[]) {
  return sql`(${sql.join(conditions, sql` OR `)})`;
}

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  getUserFriends(userId: number): Promise<User[]>;
  
  // Group methods
  getGroups(): Promise<Group[]>;
  getUserGroups(userId: number): Promise<Group[]>;
  getGroup(id: number): Promise<Group | undefined>;
  createGroup(group: InsertGroup): Promise<Group>;
  updateGroup(id: number, group: Partial<InsertGroup>): Promise<Group | undefined>;
  deleteGroup(id: number): Promise<boolean>;
  addUserToGroup(groupId: number, userId: number): Promise<UserGroup>;
  removeUserFromGroup(groupId: number, userId: number): Promise<{
    deletedExpensesCount: number;
    affectedExpensesCount: number;
    affectedExpenses: Array<{ id: number; description: string; amount: string }>;
  }>;
  getGroupMembers(groupId: number): Promise<User[]>;
  
  // Expense methods
  getExpenses(groupId: number): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Friendship methods
  createFriendship(userId: number, friendId: number, groupId: number): Promise<Friendship>;
  
  // Invitation methods
  createGroupInvitation(invitation: InsertGroupInvitation): Promise<GroupInvitation>;
  getGroupInvitationByToken(token: string): Promise<GroupInvitation | undefined>;
  getGroupInvitationsByEmail(email: string): Promise<GroupInvitation[]>;
  getGroupInvitationsByGroupId(groupId: number): Promise<GroupInvitation[]>;
  getGroupInvitationsByInviterUserId(userId: number): Promise<GroupInvitation[]>;
  updateGroupInvitation(id: number, data: Partial<InsertGroupInvitation>): Promise<GroupInvitation | undefined>;
  
  // Contact methods have been removed
  
  // Summary method
  calculateSummary(groupId: number): Promise<Balance>;
  
  // Global summary
  calculateGlobalSummary(userId: number): Promise<Balance>;
  
  // Transaction methods (new unified approach)
  getTransactions(groupId?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getGroupTransactions(groupId: number): Promise<Transaction[]>;
  markTransactionSplitsAsSettled(transactionId: number): Promise<void>;
  
  // Settlement methods (legacy - to be migrated)
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  getSettlement(id: number): Promise<Settlement | undefined>;
  getUserSettlements(userId: number): Promise<Settlement[]>;
  getGroupSettlements(groupId: number): Promise<Settlement[]>;
  updateSettlement(id: number, data: Partial<InsertSettlement>): Promise<Settlement | undefined>;
  deleteSettlement(id: number): Promise<boolean>;
  markExpenseSplitsAsSettled(settlementId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Transaction methods - new unified approach
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    return transaction;
  }

  async getTransactions(groupId?: number): Promise<Transaction[]> {
    // If groupId is provided, filter by group
    const query = groupId 
      ? db.select().from(transactions).where(eq(transactions.groupId, groupId))
      : db.select().from(transactions);
    
    return await query.orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    return await db.transaction(async (tx) => {
      // Extract splitWithUserIds if present before inserting
      const { splitWithUserIds, ...transactionData } = transaction;
      
      // For expense transactions, ensure we have splitType and splitDetails
      if (transaction.type === TransactionType.EXPENSE) {
        if (!transaction.splitType) {
          transactionData.splitType = SplitType.EQUAL;
        }
        if (!transaction.splitDetails) {
          transactionData.splitDetails = '{}';
        }
      }
      
      // For settlement transactions, ensure we have required fields
      if (transaction.type === TransactionType.SETTLEMENT) {
        if (!transaction.status) {
          transactionData.status = TransactionStatus.PENDING;
        }
      }
      
      // Create the transaction
      const [newTransaction] = await tx
        .insert(transactions)
        .values({
          ...transactionData,
          createdAt: new Date(),
          date: transaction.date || new Date()
        })
        .returning();
      
      // If this is an expense transaction and we have splitWithUserIds, create the splits
      if (transaction.type === TransactionType.EXPENSE && splitWithUserIds && splitWithUserIds.length > 0) {
        // Parse the split details to determine how to create the splits
        const splitDetails = transaction.splitDetails 
          ? JSON.parse(transaction.splitDetails)
          : {};
        
        const amount = typeof transaction.amount === 'string' 
          ? parseFloat(transaction.amount) 
          : transaction.amount;
        
        // Create the splits based on the splitType
        const splits = [];
        
        switch (transaction.splitType) {
          case SplitType.EQUAL:
            // Equal split among all users
            const splitAmount = amount / splitWithUserIds.length;
            for (const userId of splitWithUserIds) {
              splits.push({
                transactionId: newTransaction.id,
                userId,
                amount: splitAmount.toString(), // Convert to string to match schema
                isSettled: userId === transaction.paidByUserId // Payer's split is always settled
              });
            }
            break;
            
          case SplitType.PERCENTAGE:
            // Percentage-based split
            for (const userId of splitWithUserIds) {
              const percentage = splitDetails[userId] || 0;
              const splitAmount = (amount * percentage) / 100;
              splits.push({
                transactionId: newTransaction.id,
                userId,
                amount: splitAmount.toString(),
                percentage: percentage.toString(),
                isSettled: userId === transaction.paidByUserId
              });
            }
            break;
            
          case SplitType.EXACT:
            // Exact amount split
            for (const userId of splitWithUserIds) {
              const splitAmount = splitDetails[userId] || 0;
              splits.push({
                transactionId: newTransaction.id,
                userId,
                amount: splitAmount.toString(),
                isSettled: userId === transaction.paidByUserId
              });
            }
            break;
        }
        
        // Insert the splits
        if (splits.length > 0) {
          await tx.insert(transactionSplits).values(splits);
        }
      }
      
      return newTransaction;
    });
  }

  async updateTransaction(id: number, updateData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();
    
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return await db.transaction(async (tx) => {
      // First delete all splits for this transaction
      await tx
        .delete(transactionSplits)
        .where(eq(transactionSplits.transactionId, id));
      
      // Then delete the transaction
      const result = await tx
        .delete(transactions)
        .where(eq(transactions.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    // Find all transactions where the user is involved
    // Either as payer, recipient, or has a split
    const splits = await db
      .select()
      .from(transactionSplits)
      .where(eq(transactionSplits.userId, userId));
    
    const transactionIds = splits.map(split => split.transactionId);
    
    const userTransactions = await db
      .select()
      .from(transactions)
      .where(
        or(
          eq(transactions.paidByUserId, userId),
          eq(transactions.toUserId, userId),
          inArray(transactions.id, transactionIds)
        )
      )
      .orderBy(desc(transactions.createdAt));
    
    return userTransactions;
  }

  async getGroupTransactions(groupId: number): Promise<Transaction[]> {
    // Get all transactions for the group with user details
    const groupTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.groupId, groupId))
      .orderBy(desc(transactions.createdAt));
    
    // Get user details for these transactions
    const userIds = new Set<number>();
    groupTransactions.forEach(t => {
      userIds.add(t.paidByUserId);
      if (t.toUserId) userIds.add(t.toUserId);
      if (t.createdByUserId) userIds.add(t.createdByUserId);
    });
    
    // Fetch all needed users
    const usersList = await db
      .select()
      .from(users)
      .where(inArray(users.id, Array.from(userIds)));
    
    const userMap = usersList.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {} as Record<number, User>);
    
    // Attach user details to transactions
    return groupTransactions.map(transaction => ({
      ...transaction,
      paidByUser: userMap[transaction.paidByUserId],
      toUser: transaction.toUserId ? userMap[transaction.toUserId] : undefined,
      createdByUser: transaction.createdByUserId ? userMap[transaction.createdByUserId] : undefined
    }));
  }

  async markTransactionSplitsAsSettled(transactionId: number): Promise<void> {
    // Get the transaction details
    const transaction = await this.getTransaction(transactionId);
    if (!transaction) {
      throw new Error(`Transaction with ID ${transactionId} not found`);
    }
    
    // Only proceed for settlement transactions that are completed
    if (transaction.type !== TransactionType.SETTLEMENT || transaction.status !== TransactionStatus.COMPLETED) {
      return;
    }
    
    // Get the user IDs involved
    const fromUserId = transaction.paidByUserId; // In settlements, the payer is the "from" user
    const toUserId = transaction.toUserId!; // The recipient is the "to" user
    const groupId = transaction.groupId;
    
    // If this is a group-specific settlement, only mark transaction splits in that group
    if (groupId) {
      // Get all expense transactions in this group
      const groupTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.groupId, groupId),
            eq(transactions.type, TransactionType.EXPENSE)
          )
        );
      
      for (const expense of groupTransactions) {
        // Get all unsettled splits where the payer is the creditor and the debtor has a split
        if (expense.paidByUserId === toUserId) {
          // Update the transaction splits
          await db
            .update(transactionSplits)
            .set({ 
              isSettled: true,
              settledAt: new Date()
            })
            .where(
              and(
                eq(transactionSplits.transactionId, expense.id),
                eq(transactionSplits.userId, fromUserId),
                eq(transactionSplits.isSettled, false)
              )
            );
        }
      }
    } else {
      // For global settlements, update across all groups
      // Get all expense transactions paid by the creditor
      const paidTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.paidByUserId, toUserId),
            eq(transactions.type, TransactionType.EXPENSE)
          )
        );
      
      for (const expense of paidTransactions) {
        // Update the transaction splits
        await db
          .update(transactionSplits)
          .set({ 
            isSettled: true,
            settledAt: new Date()
          })
          .where(
            and(
              eq(transactionSplits.transactionId, expense.id),
              eq(transactionSplits.userId, fromUserId),
              eq(transactionSplits.isSettled, false)
            )
          );
      }
    }
  }
  
  // Legacy Settlement methods
  async createSettlement(settlement: InsertSettlement): Promise<Settlement> {
    const [newSettlement] = await db
      .insert(settlements)
      .values(settlement)
      .returning();
    
    return newSettlement;
  }
  
  async getSettlement(id: number): Promise<Settlement | undefined> {
    const [settlement] = await db
      .select()
      .from(settlements)
      .where(eq(settlements.id, id));
    
    return settlement;
  }
  
  async getUserSettlements(userId: number): Promise<Settlement[]> {
    return await db
      .select()
      .from(settlements)
      .where(
        or(
          eq(settlements.fromUserId, userId),
          eq(settlements.toUserId, userId)
        )
      )
      .orderBy(desc(settlements.createdAt));
  }
  
  async getGroupSettlements(groupId: number): Promise<Settlement[]> {
    // First get all settlements for the group
    const groupSettlements = await db
      .select()
      .from(settlements)
      .where(eq(settlements.groupId, groupId))
      .orderBy(desc(settlements.createdAt));
    
    // Get user details for these settlements
    const userIds = new Set<number>();
    groupSettlements.forEach(s => {
      userIds.add(s.fromUserId);
      userIds.add(s.toUserId);
    });
    
    // Fetch all needed users
    const usersList = await db
      .select()
      .from(users)
      .where(inArray(users.id, Array.from(userIds)));
    
    const userMap = usersList.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {} as Record<number, User>);
    
    // Attach user details to settlements
    return groupSettlements.map(settlement => ({
      ...settlement,
      fromUser: userMap[settlement.fromUserId],
      toUser: userMap[settlement.toUserId]
    }));
  }
  
  async updateSettlement(id: number, data: Partial<InsertSettlement>): Promise<Settlement | undefined> {
    const [updatedSettlement] = await db
      .update(settlements)
      .set(data)
      .where(eq(settlements.id, id))
      .returning();
    
    return updatedSettlement;
  }
  
  async deleteSettlement(id: number): Promise<boolean> {
    // Delete the settlement
    const result = await db
      .delete(settlements)
      .where(eq(settlements.id, id));
    
    return result.rowCount !== null && result.rowCount > 0;
  }
  
  async markExpenseSplitsAsSettled(settlementId: number): Promise<void> {
    // Get the settlement details
    const settlement = await this.getSettlement(settlementId);
    if (!settlement) {
      throw new Error(`Settlement with ID ${settlementId} not found`);
    }
    
    // Only mark as settled if the settlement is completed
    if (settlement.status !== SettlementStatus.COMPLETED) {
      return;
    }
    
    // Get the user IDs involved
    const fromUserId = settlement.fromUserId;
    const toUserId = settlement.toUserId;
    const groupId = settlement.groupId;
    
    // If this is a group-specific settlement, only mark expense splits in that group
    if (groupId) {
      // Get all expenses in this group
      const groupExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.groupId, groupId));
      
      for (const expense of groupExpenses) {
        // Get all unsettled splits where the payer is the creditor and the debtor has a split
        if (expense.paidByUserId === toUserId) {
          // Update the expense splits
          await db
            .update(expenseSplits)
            .set({ 
              isSettled: true,
              settledAt: new Date()
            })
            .where(
              and(
                eq(expenseSplits.expenseId, expense.id),
                eq(expenseSplits.userId, fromUserId),
                eq(expenseSplits.isSettled, false)
              )
            );
        }
      }
    } else {
      // For global settlements, update across all groups
      // Get all expenses paid by the creditor
      const paidExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.paidByUserId, toUserId));
      
      for (const expense of paidExpenses) {
        // Update the expense splits
        await db
          .update(expenseSplits)
          .set({ 
            isSettled: true,
            settledAt: new Date()
          })
          .where(
            and(
              eq(expenseSplits.expenseId, expense.id),
              eq(expenseSplits.userId, fromUserId),
              eq(expenseSplits.isSettled, false)
            )
          );
      }
    }
  }
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }



  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Ensure username is set (use email prefix if not provided)
    if (!insertUser.username) {
      insertUser.username = insertUser.email.split('@')[0];
    }
    
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }

  async getUserFriends(userId: number): Promise<User[]> {
    // Get all of the user's friends (where user is either a friend or the initiator)
    const results = await db
      .select({
        friend: users
      })
      .from(friendships)
      .where(
        or(
          eq(friendships.userId, userId),
          eq(friendships.friendId, userId)
        )
      )
      .innerJoin(
        users,
        or(
          and(
            eq(friendships.friendId, users.id),
            eq(friendships.userId, userId)
          ),
          and(
            eq(friendships.userId, users.id),
            eq(friendships.friendId, userId)
          )
        )
      );
    
    return results.map(r => r.friend);
  }

  // Group methods
  async getGroups(): Promise<Group[]> {
    return await db.select().from(groups);
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    const activeUserGroups = await db
      .select()
      .from(userGroups)
      .where(
        and(
          eq(userGroups.userId, userId),
          eq(userGroups.isActive, true)
        )
      );
    
    const groupIds = activeUserGroups.map(ug => ug.groupId);
    
    if (groupIds.length === 0) {
      return [];
    }
    
    return await db
      .select()
      .from(groups)
      .where(inArray(groups.id, groupIds));
  }

  async getGroup(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group;
  }

  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    return await db.transaction(async (tx) => {
      // Extract initialMembers if present before inserting into group
      const { initialMembers, ...groupData } = insertGroup;
      
      // Create the group
      const [group] = await tx
        .insert(groups)
        .values({
          ...groupData,
          createdAt: new Date()
        })
        .returning();
      
      // Add the creator to the group
      await tx
        .insert(userGroups)
        .values({
          groupId: group.id,
          userId: insertGroup.createdById,
          isActive: true,
          joinedAt: new Date()
        });
      
      // Add additional members if provided
      if (initialMembers && initialMembers.length > 0) {
        // Prepare user group entries for all other members
        const memberEntries = initialMembers
          .filter(userId => userId !== insertGroup.createdById) // Skip creator as they're already added
          .map(userId => ({
            groupId: group.id,
            userId,
            isActive: true,
            joinedAt: new Date()
          }));
        
        // Insert additional members if there are any
        if (memberEntries.length > 0) {
          await tx.insert(userGroups).values(memberEntries);
        }
      }
      
      return group;
    });
  }

  async updateGroup(id: number, updateData: Partial<InsertGroup>): Promise<Group | undefined> {
    const [updatedGroup] = await db
      .update(groups)
      .set(updateData)
      .where(eq(groups.id, id))
      .returning();
    
    return updatedGroup;
  }
  
  async deleteGroup(id: number): Promise<boolean> {
    // Start a transaction to delete the group and related data
    return await db.transaction(async (tx) => {
      // Get all expenses for this group
      const groupExpenses = await tx
        .select()
        .from(expenses)
        .where(eq(expenses.groupId, id));
      
      // Delete all expense splits for this group's expenses
      for (const expense of groupExpenses) {
        await tx
          .delete(expenseSplits)
          .where(eq(expenseSplits.expenseId, expense.id));
      }
      
      // Delete all expenses for this group
      await tx
        .delete(expenses)
        .where(eq(expenses.groupId, id));
      
      // Delete group invitations
      await tx
        .delete(groupInvitations)
        .where(eq(groupInvitations.groupId, id));
      
      // Delete all user-group associations for this group
      await tx
        .delete(userGroups)
        .where(eq(userGroups.groupId, id));
      
      // Finally delete the group
      const result = await tx
        .delete(groups)
        .where(eq(groups.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  async addUserToGroup(groupId: number, userId: number): Promise<UserGroup> {
    // First check if the user is already in this group but inactive
    const [existingUserGroup] = await db
      .select()
      .from(userGroups)
      .where(
        and(
          eq(userGroups.groupId, groupId),
          eq(userGroups.userId, userId)
        )
      );
    
    if (existingUserGroup) {
      // Reactivate the user
      const [userGroup] = await db
        .update(userGroups)
        .set({ isActive: true })
        .where(
          and(
            eq(userGroups.groupId, groupId),
            eq(userGroups.userId, userId)
          )
        )
        .returning();
      
      return userGroup;
    }
    
    // Check if user has reached the maximum number of groups
    const userActiveGroups = await db
      .select({ count: count() })
      .from(userGroups)
      .where(
        and(
          eq(userGroups.userId, userId),
          eq(userGroups.isActive, true)
        )
      );
    
    const activeGroupCount = Number(userActiveGroups[0]?.count || 0);
    
    if (activeGroupCount >= LIMITS.MAX_GROUPS_PER_USER) {
      throw new Error(`User has reached the maximum limit of ${LIMITS.MAX_GROUPS_PER_USER} groups`);
    }
    
    // If not, add the user to the group
    const [userGroup] = await db
      .insert(userGroups)
      .values({
        groupId,
        userId,
        isActive: true,
        joinedAt: new Date()
      })
      .returning();
    
    // Create friendship connections with other group members
    const groupMembers = await this.getGroupMembers(groupId);
    
    // Create friendships with all other members (excluding self)
    for (const member of groupMembers) {
      if (member.id !== userId) {
        // Check if friendship exists in either direction
        const [existingFriendship] = await db
          .select()
          .from(friendships)
          .where(
            or(
              and(
                eq(friendships.userId, userId),
                eq(friendships.friendId, member.id)
              ),
              and(
                eq(friendships.userId, member.id),
                eq(friendships.friendId, userId)
              )
            )
          );
        
        if (!existingFriendship) {
          await db
            .insert(friendships)
            .values({
              userId,
              friendId: member.id,
              firstGroupId: groupId,
              createdAt: new Date()
            })
            .onConflictDoNothing();
        }
      }
    }
    
    return userGroup;
  }

  async removeUserFromGroup(groupId: number, userId: number): Promise<{
    deletedExpensesCount: number;
    affectedExpensesCount: number;
    affectedExpenses: Array<{ id: number; description: string; amount: string }>;
  }> {
    try {
      // Use a transaction to ensure all operations succeed or fail together
      return await db.transaction(async (tx) => {
        // Mark the user as inactive in the group rather than deleting
        await tx.update(userGroups)
          .set({ isActive: false })
          .where(and(
            eq(userGroups.groupId, groupId),
            eq(userGroups.userId, userId)
          ));
        
        // First, find all expenses in this group
        const groupExpenses = await tx.select()
          .from(expenses)
          .where(eq(expenses.groupId, groupId));
        
        // Find all expenses created by this user in the group
        const userCreatedExpenses = groupExpenses.filter(
          expense => expense.createdByUserId === userId
        );
        
        // Find expenses where the user is involved but didn't create them
        const expenseSplitsResult = await tx.select({
          expenseSplit: expenseSplits,
          expense: expenses
        })
        .from(expenseSplits)
        .innerJoin(
          expenses, 
          and(
            eq(expenseSplits.expenseId, expenses.id),
            eq(expenses.groupId, groupId),
            not(eq(expenses.createdByUserId, userId)) // Not created by this user
          )
        )
        .where(eq(expenseSplits.userId, userId));
        
        // Collect expenses where user is involved but didn't create
        const affectedExpenses: Array<{ id: number; description: string; amount: string }> = [];
        const processedExpenseIds = new Set<number>();
        
        for (const { expense } of expenseSplitsResult) {
          if (!processedExpenseIds.has(expense.id)) {
            processedExpenseIds.add(expense.id);
            affectedExpenses.push({
              id: expense.id,
              description: expense.description,
              amount: expense.amount.toString()
            });
          }
        }
        
        // Remove splits for expenses the user didn't create
        for (const expense of affectedExpenses) {
          await tx.delete(expenseSplits)
            .where(and(
              eq(expenseSplits.expenseId, expense.id),
              eq(expenseSplits.userId, userId)
            ));
        }
        
        // Process expenses created by this user
        let deletedExpensesCount = 0;
        if (userCreatedExpenses.length > 0) {
          console.log(`Removing ${userCreatedExpenses.length} expense(s) created by user ${userId} from group ${groupId}`);
          
          // Delete all expense splits for each expense first to avoid foreign key constraint violations
          for (const expense of userCreatedExpenses) {
            await tx.delete(expenseSplits)
              .where(eq(expenseSplits.expenseId, expense.id));
          }
          
          // Then delete the expenses themselves
          for (const expense of userCreatedExpenses) {
            const result = await tx.delete(expenses)
              .where(eq(expenses.id, expense.id));
            
            if (result.rowCount && result.rowCount > 0) {
              deletedExpensesCount++;
            }
          }
        }
        
        console.log(`Found ${affectedExpenses.length} expense(s) with orphaned splits from user ${userId}`);
        
        return {
          deletedExpensesCount,
          affectedExpensesCount: affectedExpenses.length,
          affectedExpenses
        };
      });
    } catch (error) {
      console.error('Error in removeUserFromGroup:', error);
      throw error;
    }
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    const members = await db.select({
      user: users
    })
    .from(userGroups)
    .where(and(
      eq(userGroups.groupId, groupId),
      eq(userGroups.isActive, true)
    ))
    .innerJoin(users, eq(userGroups.userId, users.id));
    
    return members.map(m => m.user);
  }

  // Expense methods
  async getExpenses(groupId: number): Promise<Expense[]> {
    return await db.select()
      .from(expenses)
      .where(eq(expenses.groupId, groupId))
      .orderBy(desc(expenses.date));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async createExpense(insertExpense: InsertExpense): Promise<Expense> {
    // Extract the splitWithUserIds array which isn't part of the database schema
    const { splitWithUserIds, ...expenseData } = insertExpense;
    
    // Add default createdAt if not provided
    const completeExpenseData = {
      ...expenseData,
      createdAt: new Date()
    };
    
    // Start a transaction to create the expense and its splits
    return await db.transaction(async (tx) => {
      // Check if the group has reached the maximum number of expenses
      const groupExpenses = await tx
        .select({ count: count() })
        .from(expenses)
        .where(eq(expenses.groupId, insertExpense.groupId));
      
      const groupExpenseCount = Number(groupExpenses[0]?.count || 0);
      
      if (groupExpenseCount >= LIMITS.MAX_EXPENSES_PER_GROUP) {
        throw new Error(`Group has reached the maximum limit of ${LIMITS.MAX_EXPENSES_PER_GROUP} expenses`);
      }
      
      // Check if user has reached the maximum number of expense associations
      // Count number of expenses where user is either the payer or has a split
      if (splitWithUserIds && splitWithUserIds.length > 0) {
        for (const userId of splitWithUserIds) {
          // Count expense splits for this user
          const userExpenseSplits = await tx
            .select({ count: count() })
            .from(expenseSplits)
            .where(eq(expenseSplits.userId, userId));
            
          // Count expenses paid by this user
          const userPaidExpenses = await tx
            .select({ count: count() })
            .from(expenses)
            .where(eq(expenses.paidByUserId, userId));
            
          const totalUserExpenses = Number(userExpenseSplits[0]?.count || 0) + 
                                   Number(userPaidExpenses[0]?.count || 0);
                                   
          if (totalUserExpenses >= LIMITS.MAX_EXPENSES_PER_USER) {
            throw new Error(`User with ID ${userId} has reached the maximum limit of ${LIMITS.MAX_EXPENSES_PER_USER} expenses`);
          }
        }
      }
      
      // Create the expense
      const [newExpense] = await tx.insert(expenses)
        .values(completeExpenseData)
        .returning();
      
      // Create expense splits for each involved user
      if (splitWithUserIds && splitWithUserIds.length > 0) {
        const amount = parseFloat(newExpense.amount.toString());
        const splitType = newExpense.splitType;
        let splitDetails: Record<string, number> = {};
        
        try {
          // Parse splitDetails JSON if available
          if (newExpense.splitDetails && newExpense.splitDetails !== '{}') {
            splitDetails = JSON.parse(newExpense.splitDetails);
          }
        } catch (error) {
          console.error('Error parsing splitDetails:', error);
          splitDetails = {};
        }
        
        // Create splits based on the split type
        for (const userId of splitWithUserIds) {
          let userAmount = 0;
          let userPercentage = null;
          
          if (splitType === SplitType.PERCENTAGE) {
            // Percentage split
            userPercentage = splitDetails[userId.toString()] || (100 / splitWithUserIds.length);
            userAmount = (amount * userPercentage) / 100;
          } else if (splitType === SplitType.EXACT) {
            // Exact amount split
            userAmount = splitDetails[userId.toString()] || 0;
          } else {
            // Equal split - should be SplitType.EQUAL
            // Calculate precise split with rounding correction
            const equalShare = amount / splitWithUserIds.length;
            
            // For equal splits, if there are splitDetails provided, use them
            // This allows the client to handle rounding issues properly
            if (Object.keys(splitDetails).length > 0 && splitDetails[userId.toString()] !== undefined) {
              userAmount = splitDetails[userId.toString()];
            } else {
              userAmount = equalShare;
            }
          }
          
          // Insert the split record with proper fields matching the schema
          await tx.insert(expenseSplits).values({
            userId: userId,
            amount: userAmount.toString(),
            percentage: userPercentage ? userPercentage.toString() : undefined,
            isSettled: false,
            expenseId: newExpense.id
          });
        }
      }
      
      return newExpense;
    });
  }

  async updateExpense(id: number, updateData: InsertExpense): Promise<Expense> {
    // Extract the splitWithUserIds array which isn't part of the database schema
    const { splitWithUserIds, ...expenseData } = updateData;
    
    // Start a transaction to update the expense and its splits
    return await db.transaction(async (tx) => {
      // Update the expense
      const [updatedExpense] = await tx.update(expenses)
        .set(expenseData)
        .where(eq(expenses.id, id))
        .returning();
      
      if (!updatedExpense) {
        throw new Error(`Expense with ID ${id} not found`);
      }
      
      // Delete existing splits
      await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, id));
      
      // Create new expense splits
      if (splitWithUserIds && splitWithUserIds.length > 0) {
        const amount = parseFloat(updatedExpense.amount.toString());
        const splitType = updatedExpense.splitType;
        let splitDetails: Record<string, number> = {};
        
        try {
          // Parse splitDetails JSON if available
          if (updatedExpense.splitDetails && updatedExpense.splitDetails !== '{}') {
            splitDetails = JSON.parse(updatedExpense.splitDetails);
          }
        } catch (error) {
          console.error('Error parsing splitDetails:', error);
          splitDetails = {};
        }
        
        // Create splits based on the split type
        for (const userId of splitWithUserIds) {
          let userAmount = 0;
          let userPercentage = null;
          
          if (splitType === SplitType.PERCENTAGE) {
            // Percentage split
            userPercentage = splitDetails[userId.toString()] || (100 / splitWithUserIds.length);
            userAmount = (amount * userPercentage) / 100;
          } else if (splitType === SplitType.EXACT) {
            // Exact amount split
            userAmount = splitDetails[userId.toString()] || 0;
          } else {
            // Equal split - should be SplitType.EQUAL
            // Calculate precise split with rounding correction
            const equalShare = amount / splitWithUserIds.length;
            
            // For equal splits, if there are splitDetails provided, use them
            // This allows the client to handle rounding issues properly
            if (Object.keys(splitDetails).length > 0 && splitDetails[userId.toString()] !== undefined) {
              userAmount = splitDetails[userId.toString()];
            } else {
              userAmount = equalShare;
            }
          }
          
          // Insert the split record with proper fields matching the schema
          await tx.insert(expenseSplits).values({
            userId: userId,
            amount: userAmount.toString(),
            percentage: userPercentage ? userPercentage.toString() : undefined,
            isSettled: false,
            expenseId: updatedExpense.id
          });
        }
      }
      
      return updatedExpense;
    });
  }

  async deleteExpense(id: number): Promise<boolean> {
    // Start a transaction to delete the expense and its splits
    return await db.transaction(async (tx) => {
      // Delete expense splits first (foreign key constraint)
      await tx.delete(expenseSplits).where(eq(expenseSplits.expenseId, id));
      
      // Delete the expense
      const result = await tx.delete(expenses).where(eq(expenses.id, id));
      
      return result.rowCount !== null && result.rowCount > 0;
    });
  }

  // Friendship methods
  async createFriendship(userId: number, friendId: number, groupId: number): Promise<Friendship> {
    const [friendship] = await db.insert(friendships)
      .values({
        userId,
        friendId,
        firstGroupId: groupId,
        createdAt: new Date()
      })
      .returning();
    
    return friendship;
  }
  
  // Group Invitation methods
  async createGroupInvitation(invitation: InsertGroupInvitation): Promise<GroupInvitation> {
    const [newInvitation] = await db
      .insert(groupInvitations)
      .values(invitation)
      .returning();
    
    return newInvitation;
  }
  
  async getGroupInvitationByToken(token: string): Promise<GroupInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(groupInvitations)
      .where(eq(groupInvitations.token, token));
    
    return invitation;
  }
  
  async getGroupInvitationsByEmail(email: string): Promise<GroupInvitation[]> {
    return await db
      .select()
      .from(groupInvitations)
      .where(eq(groupInvitations.inviteeEmail, email));
  }
  
  async getGroupInvitationsByGroupId(groupId: number): Promise<GroupInvitation[]> {
    return await db
      .select()
      .from(groupInvitations)
      .where(eq(groupInvitations.groupId, groupId))
      .orderBy(desc(groupInvitations.invitedAt));
  }
  
  async getGroupInvitationsByInviterUserId(userId: number): Promise<GroupInvitation[]> {
    return await db
      .select()
      .from(groupInvitations)
      .where(eq(groupInvitations.inviterUserId, userId))
      .orderBy(desc(groupInvitations.invitedAt));
  }
  
  async updateGroupInvitation(id: number, data: Partial<InsertGroupInvitation>): Promise<GroupInvitation | undefined> {
    const [updatedInvitation] = await db
      .update(groupInvitations)
      .set(data)
      .where(eq(groupInvitations.id, id))
      .returning();
    
    return updatedInvitation;
  }
  
  // Contact methods
  // Contact methods have been removed

  // Calculate summary for a group
  async calculateSummary(groupId: number): Promise<Balance> {
    // Get all active members of the group
    const members = await this.getGroupMembers(groupId);
    const memberIds = members.map(member => member.id);
    
    if (memberIds.length === 0) {
      return {
        paid: {},
        owes: {},
        balances: {},
        settlements: [],
        totalExpenses: 0
      };
    }
    
    // Get all transactions for the group
    const transactions = await this.getGroupTransactions(groupId);
    
    // Initialize objects
    const paid: Record<string, number> = {};
    const owes: Record<string, number> = {};
    const net: Record<string, number> = {};
    
    // Initialize every member with zero
    memberIds.forEach(id => {
      paid[id] = 0;
      owes[id] = 0;
      net[id] = 0;
    });
    
    // Get all expense transactions
    const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);
    
    // Get all transaction splits for the expense transactions
    const expenseIds = expenseTransactions.map(t => t.id);
    const allSplits = await db
      .select()
      .from(transactionSplits)
      .where(inArray(
        transactionSplits.transactionId,
        expenseIds
      ));
    
    // Group splits by transaction ID for quick access
    const splitsByTransaction: Record<number, TransactionSplit[]> = {};
    allSplits.forEach(split => {
      if (!splitsByTransaction[split.transactionId]) {
        splitsByTransaction[split.transactionId] = [];
      }
      splitsByTransaction[split.transactionId].push(split);
    });
    
    // Process expense transactions
    for (const transaction of expenseTransactions) {
      // Add the transaction amount to the paid total for the payer
      if (transaction.paidByUserId && memberIds.includes(transaction.paidByUserId)) {
        paid[transaction.paidByUserId] = (paid[transaction.paidByUserId] || 0) + Number(transaction.amount);
      }
      
      // Add the owed amounts based on the splits
      const splits = splitsByTransaction[transaction.id] || [];
      for (const split of splits) {
        if (memberIds.includes(split.userId)) {
          // Only count if not settled or if the user is not the payer
          if (!split.isSettled || split.userId !== transaction.paidByUserId) {
            owes[split.userId] = (owes[split.userId] || 0) + Number(split.amount);
          }
        }
      }
    }
    
    // Process settlement transactions
    const settlementTransactions = transactions.filter(
      t => t.type === TransactionType.SETTLEMENT && t.status === TransactionStatus.COMPLETED
    );
    
    for (const settlement of settlementTransactions) {
      if (settlement.paidByUserId && settlement.toUserId) {
        // The person who paid the settlement (paidByUserId) paid the other person (toUserId)
        const fromUserId = settlement.paidByUserId;
        const toUserId = settlement.toUserId;
        
        if (memberIds.includes(fromUserId) && memberIds.includes(toUserId)) {
          // This transfers money from the payer to the recipient, reducing what the payer owes
          // and reducing what the recipient is owed
          net[fromUserId] = (net[fromUserId] || 0) + Number(settlement.amount);
          net[toUserId] = (net[toUserId] || 0) - Number(settlement.amount);
        }
      }
    }
    
    // Calculate net balances (positive means you're owed money, negative means you owe money)
    const balances: Record<string, number> = {};
    memberIds.forEach(id => {
      // Balance = (what you paid - what you owe) + net settlement adjustments
      balances[id] = (paid[id] - owes[id]) + (net[id] || 0);
    });
    
    // Generate the settlement plan
    const settlements = this.generateSettlements(balances);
    
    // Calculate total expenses
    const totalExpenses = expenseTransactions.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
    return {
      paid,
      owes,
      balances,
      settlements,
      totalExpenses
    };
  }

  // Calculate a global summary across all groups for a user
  async calculateGlobalSummary(userId: number): Promise<Balance> {
    // Get all groups the user is a member of
    const userGroups = await this.getUserGroups(userId);
    
    if (userGroups.length === 0) {
      return {
        paid: {},
        owes: {},
        balances: {},
        settlements: [],
        totalExpenses: 0
      };
    }
    
    // Calculate summary for each group
    const groupSummaries: Balance[] = [];
    for (const group of userGroups) {
      const summary = await this.calculateSummary(group.id);
      groupSummaries.push(summary);
    }
    
    // Merge all the summaries
    const allPaid: Record<string, number> = {};
    const allOwes: Record<string, number> = {};
    const allBalances: Record<string, number> = {};
    let totalExpenses = 0;
    
    // Get a unique list of all users involved
    const allUserIds = new Set<string>();
    groupSummaries.forEach(summary => {
      Object.keys(summary.paid).forEach(id => allUserIds.add(id));
      Object.keys(summary.owes).forEach(id => allUserIds.add(id));
    });
    
    // Initialize each user with zero
    Array.from(allUserIds).forEach(id => {
      allPaid[id] = 0;
      allOwes[id] = 0;
      allBalances[id] = 0;
    });
    
    // Combine all summaries
    groupSummaries.forEach(summary => {
      // Add up what each person paid
      Object.entries(summary.paid).forEach(([id, amount]) => {
        allPaid[id] = (allPaid[id] || 0) + amount;
      });
      
      // Add up what each person owes
      Object.entries(summary.owes).forEach(([id, amount]) => {
        allOwes[id] = (allOwes[id] || 0) + amount;
      });
      
      // Add to the total expenses
      totalExpenses += summary.totalExpenses;
    });
    
    // Add global settlement transactions (not tied to a specific group)
    // Get all completed settlement transactions not associated with any group
    const globalSettlements = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.type, TransactionType.SETTLEMENT),
          eq(transactions.status, TransactionStatus.COMPLETED),
          isNull(transactions.groupId)
        )
      );
    
    // Process these settlements to adjust the balances
    for (const settlement of globalSettlements) {
      if (settlement.paidByUserId && settlement.toUserId) {
        const fromUserId = settlement.paidByUserId;
        const toUserId = settlement.toUserId;
        
        // Only consider if either is the current user or both are in our list of users
        if (
          (fromUserId.toString() === userId.toString() || toUserId.toString() === userId.toString()) ||
          (allUserIds.has(fromUserId.toString()) && allUserIds.has(toUserId.toString()))
        ) {
          // These affect the balances directly, not the paid/owes amounts
          // If you pay someone, your balance decreases and their balance increases
          allBalances[fromUserId] = (allBalances[fromUserId] || 0) - Number(settlement.amount);
          allBalances[toUserId] = (allBalances[toUserId] || 0) + Number(settlement.amount);
        }
      }
    }
    
    // Calculate net balances (combine the expenses and group-specific settlements from above)
    Array.from(allUserIds).forEach(id => {
      // If we don't already have a balance adjustment from global settlements, calculate from paid/owes
      if (!allBalances[id]) {
        allBalances[id] = allPaid[id] - allOwes[id];
      } else if (allPaid[id] || allOwes[id]) {
        // If we do have balance adjustments and paid/owes, combine them
        allBalances[id] += (allPaid[id] || 0) - (allOwes[id] || 0);
      }
    });
    
    // Generate the settlement plan
    const settlements = this.generateSettlements(allBalances);
    
    return {
      paid: allPaid,
      owes: allOwes,
      balances: allBalances,
      settlements,
      totalExpenses
    };
  }

  // Helper function to generate settlements
  private generateSettlements(balances: Record<string, number>): SettlementCalculation[] {
    const settlements: SettlementCalculation[] = [];
    
    // Identify debtors and creditors
    const debtors: { id: string; amount: number }[] = [];
    const creditors: { id: string; amount: number }[] = [];
    
    Object.entries(balances).forEach(([id, balance]) => {
      if (balance < -0.01) {
        debtors.push({ id, amount: Math.abs(balance) });
      } else if (balance > 0.01) {
        creditors.push({ id, amount: balance });
      }
    });
    
    // Sort by amount (largest first)
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    
    // Generate settlement plan
    debtors.forEach(debtor => {
      let remaining = debtor.amount;
      
      for (let i = 0; i < creditors.length && remaining > 0.01; i++) {
        const creditor = creditors[i];
        
        if (creditor.amount > 0.01) {
          const amount = Math.min(remaining, creditor.amount);
          
          settlements.push({
            from: debtor.id,
            to: creditor.id,
            amount: Math.round(amount * 100) / 100
          });
          
          remaining -= amount;
          creditors[i].amount -= amount;
        }
      }
    });
    
    return settlements;
  }
}

export const storage = new DatabaseStorage();