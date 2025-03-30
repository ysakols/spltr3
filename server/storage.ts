import { 
  groups, expenses, users, userGroups, expenseSplits, friendships,
  contacts, groupInvitations, settlements,
  type Group, type InsertGroup, type Expense, type InsertExpense, 
  type Balance, type SettlementCalculation, type Settlement, type InsertSettlement,
  SplitType, SettlementStatus, PaymentMethod,
  type User, type InsertUser, type UserGroup, type InsertUserGroup, 
  type ExpenseSplit, type InsertExpenseSplit, type Friendship, type InsertFriendship,
  type Contact, type InsertContact, type GroupInvitation, type InsertGroupInvitation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, notInArray, asc, desc, isNull, sql } from "drizzle-orm";

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
  removeUserFromGroup(groupId: number, userId: number): Promise<void>;
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
  
  // Contact methods
  addContact(contact: InsertContact): Promise<Contact>;
  getUserContacts(userId: number): Promise<Contact[]>;
  updateContactInteraction(userId: number, contactUserId: number): Promise<Contact | undefined>;
  deleteContact(userId: number, contactUserId: number): Promise<boolean>;
  
  // Summary method
  calculateSummary(groupId: number): Promise<Balance>;
  
  // Global summary
  calculateGlobalSummary(userId: number): Promise<Balance>;
  
  // Settlement methods
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  getSettlement(id: number): Promise<Settlement | undefined>;
  getUserSettlements(userId: number): Promise<Settlement[]>;
  getGroupSettlements(groupId: number): Promise<Settlement[]>;
  updateSettlement(id: number, data: Partial<InsertSettlement>): Promise<Settlement | undefined>;
  markExpenseSplitsAsSettled(settlementId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Settlement methods
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
    return await db
      .select()
      .from(settlements)
      .where(eq(settlements.groupId, groupId))
      .orderBy(desc(settlements.createdAt));
  }
  
  async updateSettlement(id: number, data: Partial<InsertSettlement>): Promise<Settlement | undefined> {
    const [updatedSettlement] = await db
      .update(settlements)
      .set(data)
      .where(eq(settlements.id, id))
      .returning();
    
    return updatedSettlement;
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

  async removeUserFromGroup(groupId: number, userId: number): Promise<void> {
    // Mark the user as inactive in the group rather than deleting
    await db.update(userGroups)
      .set({ isActive: false })
      .where(and(
        eq(userGroups.groupId, groupId),
        eq(userGroups.userId, userId)
      ));
    
    // Update any expenses where this user is involved
    // This is a complex operation that would involve reassigning expenses
    // Here we're keeping it simple - we'll handle this when calculating summaries
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
          
          // Insert the split record
          await tx.insert(expenseSplits).values({
            expenseId: newExpense.id,
            userId,
            amount: userAmount,
            percentage: userPercentage,
            isSettled: false
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
          
          // Insert the split record
          await tx.insert(expenseSplits).values({
            expenseId: updatedExpense.id,
            userId,
            amount: userAmount,
            percentage: userPercentage,
            isSettled: false
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
  async addContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db
      .insert(contacts)
      .values(contact)
      .returning();
    
    return newContact;
  }
  
  async getUserContacts(userId: number): Promise<Contact[]> {
    return await db
      .select()
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.lastInteractionAt));
  }
  
  async updateContactInteraction(userId: number, contactUserId: number): Promise<Contact | undefined> {
    // First check if contact exists
    const [existingContact] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.contactUserId, contactUserId)
        )
      );
    
    if (existingContact) {
      // Update frequency and last interaction time
      const [updatedContact] = await db
        .update(contacts)
        .set({
          frequency: existingContact.frequency + 1,
          lastInteractionAt: new Date()
        })
        .where(
          and(
            eq(contacts.userId, userId),
            eq(contacts.contactUserId, contactUserId)
          )
        )
        .returning();
      
      return updatedContact;
    }
    
    return undefined;
  }
  
  async deleteContact(userId: number, contactUserId: number): Promise<boolean> {
    // Delete the contact relationship
    const result = await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          eq(contacts.contactUserId, contactUserId)
        )
      );
    
    return result.rowCount !== null && result.rowCount > 0;
  }

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
    
    // Get all expenses for the group
    const expenses = await this.getExpenses(groupId);
    
    // Initialize objects
    const paid: Record<string, number> = {};
    const owes: Record<string, number> = {};
    
    // Initialize every member with zero
    memberIds.forEach(id => {
      paid[id] = 0;
      owes[id] = 0;
    });
    
    // Get all expense splits
    const allSplits = await db
      .select()
      .from(expenseSplits)
      .where(inArray(
        expenseSplits.expenseId,
        expenses.map(e => e.id)
      ));
    
    // Group splits by expense ID for quick access
    const splitsByExpense: Record<number, ExpenseSplit[]> = {};
    allSplits.forEach(split => {
      if (!splitsByExpense[split.expenseId]) {
        splitsByExpense[split.expenseId] = [];
      }
      splitsByExpense[split.expenseId].push(split);
    });
    
    // Calculate what each person paid and owes
    for (const expense of expenses) {
      // Add the expense amount to the paid total for the payer
      if (expense.paidByUserId && memberIds.includes(expense.paidByUserId)) {
        paid[expense.paidByUserId] = (paid[expense.paidByUserId] || 0) + Number(expense.amount);
      }
      
      // Add the owed amounts based on the splits
      const splits = splitsByExpense[expense.id] || [];
      for (const split of splits) {
        if (memberIds.includes(split.userId)) {
          owes[split.userId] = (owes[split.userId] || 0) + Number(split.amount);
        }
      }
    }
    
    // Calculate net balances (positive means you're owed money, negative means you owe money)
    const balances: Record<string, number> = {};
    memberIds.forEach(id => {
      balances[id] = paid[id] - owes[id];
    });
    
    // Generate the settlement plan
    const settlements = this.generateSettlements(balances);
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    
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
    
    // Calculate net balances
    Array.from(allUserIds).forEach(id => {
      allBalances[id] = allPaid[id] - allOwes[id];
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