import { pgTable, text, serial, integer, boolean, timestamp, numeric, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enhanced Users table with more profile information and Google auth
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(), // Legacy username field
  firstName: text("first_name"), // User's first name (nullable)
  lastName: text("last_name"), // User's last name (nullable)
  password: text("password").notNull(), // Can be empty for OAuth users
  email: text("email").notNull().unique(), // Email for notifications and authentication (required)
  displayName: text("display_name"), // Optional display name (nullable)
  avatarUrl: text("avatar_url"), // Optional profile picture URL (nullable)
  googleId: text("google_id").unique(), // Google OAuth ID (nullable)
  googleAccessToken: text("google_access_token"), // Google access token (nullable)
  googleRefreshToken: text("google_refresh_token"), // Google refresh token (nullable)
  lastLogin: timestamp("last_login"), // Track last login time
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define user relations
export const usersRelations = relations(users, ({ many }) => ({
  userGroups: many(userGroups),
  friendships: many(friendships)
}));

// Groups table (now with creator)
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"), // Optional group description (nullable)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdById: integer("created_by_id").notNull().references(() => users.id)
});

// Define group relations
export const groupsRelations = relations(groups, ({ many, one }) => ({
  expenses: many(expenses),
  userGroups: many(userGroups),
  creator: one(users, {
    fields: [groups.createdById],
    references: [users.id]
  })
}));

// User-Group relationship table (many-to-many)
export const userGroups = pgTable("user_groups", {
  userId: integer("user_id").notNull().references(() => users.id),
  groupId: integer("group_id").notNull().references(() => groups.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.groupId] })
  };
});

// Define user-group relations
export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id]
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id]
  })
}));

// Friendship table to track users who have been in groups together
export const friendships = pgTable("friendships", {
  userId: integer("user_id").notNull().references(() => users.id),
  friendId: integer("friend_id").notNull().references(() => users.id),
  firstGroupId: integer("first_group_id").references(() => groups.id), // The first group they were in together
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.friendId] }),
    // Check that user and friend aren't the same person
    check: foreignKey({ 
      columns: [table.firstGroupId], 
      foreignColumns: [groups.id] 
    })
  };
});

// Define friendship relations
export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id]
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id]
  }),
  firstGroup: one(groups, {
    fields: [friendships.firstGroupId],
    references: [groups.id]
  })
}));

// Split types enum
export enum SplitType {
  EQUAL = 'equal',
  PERCENTAGE = 'percentage',
  EXACT = 'exact'
}

// Enhanced Expenses table
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paidByUserId: integer("paid_by_user_id").notNull().references(() => users.id),
  splitType: text("split_type").notNull().default(SplitType.EQUAL),
  splitDetails: text("split_details").notNull().default('{}'), // JSON string with split allocations
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  groupId: integer("group_id").notNull().references(() => groups.id)
});

// Define expense relations
export const expensesRelations = relations(expenses, ({ one, many }) => ({
  paidBy: one(users, {
    fields: [expenses.paidByUserId],
    references: [users.id]
  }),
  group: one(groups, {
    fields: [expenses.groupId],
    references: [groups.id]
  }),
  splits: many(expenseSplits)
}));

// Expense splits table to track who is involved in each expense
export const expenseSplits = pgTable("expense_splits", {
  expenseId: integer("expense_id").notNull().references(() => expenses.id),
  userId: integer("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  percentage: numeric("percentage", { precision: 5, scale: 2 }),
  isSettled: boolean("is_settled").default(false).notNull(),
  settledAt: timestamp("settled_at"),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.expenseId, table.userId] })
  };
});

// Define expense-split relations
export const expenseSplitsRelations = relations(expenseSplits, ({ one }) => ({
  expense: one(expenses, {
    fields: [expenseSplits.expenseId],
    references: [expenses.id]
  }),
  user: one(users, {
    fields: [expenseSplits.userId],
    references: [users.id]
  })
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  firstName: true,
  lastName: true,
  password: true,
  email: true,
  displayName: true,
  avatarUrl: true,
  googleId: true,
  googleAccessToken: true,
  googleRefreshToken: true
}).extend({
  username: z.string().default(''),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  email: z.string().email({ message: "Invalid email address format" }).min(1, { message: "Email address is required" }),
  displayName: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  googleId: z.string().optional().nullable(),
  googleAccessToken: z.string().optional().nullable(),
  googleRefreshToken: z.string().optional().nullable()
});

// Schema for Google OAuth users
export const googleUserSchema = z.object({
  googleId: z.string(),
  email: z.string().email({ message: "Invalid email address format" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  displayName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  googleAccessToken: z.string(),
  googleRefreshToken: z.string().optional()
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  description: true,
  createdById: true
}).extend({
  description: z.string().optional().nullable(),
  initialMembers: z.array(z.number()).optional() // Array of user IDs to add to the group
});

export const insertUserGroupSchema = createInsertSchema(userGroups);

export const insertExpenseSchema = createInsertSchema(expenses)
  .pick({
    description: true,
    amount: true,
    paidByUserId: true,
    groupId: true,
    splitType: true,
    splitDetails: true,
    date: true
  })
  .extend({
    // Extend the schema to coerce the amount to a string since Drizzle expects it that way
    amount: z.coerce.string(),
    // Make splitType optional with a default of EQUAL
    splitType: z.nativeEnum(SplitType).default(SplitType.EQUAL).optional(),
    // Make splitDetails optional with a default empty object
    splitDetails: z.string().default('{}').optional(),
    // Array of user IDs involved in this expense
    splitWithUserIds: z.array(z.number()),
    // Optional specific date for the expense - accept both string and Date types
    date: z.preprocess(
      // Convert string to Date if it's a string
      (arg) => {
        if (typeof arg === 'string') {
          return new Date(arg);
        }
        return arg;
      },
      z.date().optional()
    )
  });

export const insertExpenseSplitSchema = createInsertSchema(expenseSplits)
  .pick({
    expenseId: true,
    userId: true,
    amount: true,
    percentage: true
  });

export const insertFriendshipSchema = createInsertSchema(friendships)
  .pick({
    userId: true,
    friendId: true,
    firstGroupId: true
  });

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groups.$inferSelect;

export type InsertUserGroup = z.infer<typeof insertUserGroupSchema>;
export type UserGroup = typeof userGroups.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertExpenseSplit = z.infer<typeof insertExpenseSplitSchema>;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;

export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendships.$inferSelect;

// Group invitation table for email-based invites
export const groupInvitations = pgTable("group_invitations", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  inviterUserId: integer("inviter_user_id").notNull().references(() => users.id),
  inviteeEmail: text("invitee_email").notNull(), // Email of the invited user
  inviteeFirstName: text("invitee_first_name"), // First name of the invited user (optional)
  status: text("status").notNull().default('pending'), // pending, accepted, rejected
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  acceptedAt: timestamp("accepted_at"), // When the invitation was accepted
  token: text("token").notNull().unique(), // Unique token for invitation URL
  resendCount: integer("resend_count").default(0).notNull(), // Number of times the invitation has been resent
  lastResendAt: timestamp("last_resend_at") // When the invitation was last resent
});

// Define group invitation relations
export const groupInvitationsRelations = relations(groupInvitations, ({ one }) => ({
  group: one(groups, {
    fields: [groupInvitations.groupId],
    references: [groups.id]
  }),
  inviter: one(users, {
    fields: [groupInvitations.inviterUserId],
    references: [users.id]
  })
}));

// Contacts feature has been completely removed
// Users can now only connect through group invitations
// We maintain the friendships table only for tracking user relationships that form through groups

// Insert schema for invitations
export const insertGroupInvitationSchema = createInsertSchema(groupInvitations)
  .pick({
    groupId: true,
    inviterUserId: true,
    inviteeEmail: true,
    inviteeFirstName: true,
    status: true,
    token: true,
    expiresAt: true,
    invitedAt: true,
    acceptedAt: true,
    resendCount: true,
    lastResendAt: true
  })
  .extend({
    inviteeEmail: z.string().email({ message: "Invalid email address format" }),
    inviteeFirstName: z.string().optional().nullable(),
    expiresAt: z.date().optional().nullable(),
    invitedAt: z.date().optional(),
    acceptedAt: z.date().optional().nullable(),
    resendCount: z.number().default(0),
    lastResendAt: z.date().optional().nullable()
  });

// Types for new schemas
export type InsertGroupInvitation = z.infer<typeof insertGroupInvitationSchema>;
export type GroupInvitation = typeof groupInvitations.$inferSelect;

// Settlement calculation type (not stored in database, calculated on demand)
export type SettlementCalculation = {
  from: string;
  to: string;
  amount: number;
};

// Balance type (not stored in database, calculated on demand)
export type Balance = {
  paid: Record<string, number>;
  owes: Record<string, number>;
  balances: Record<string, number>;
  settlements: SettlementCalculation[];
  totalExpenses: number;
};

// Payment method enum
export enum PaymentMethod {
  CASH = 'cash',
  VENMO = 'venmo',
  OTHER = 'other'
}

// Settlement status enum
export enum SettlementStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELED = 'canceled'
}

// Settlements table to track debt settlements
export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  groupId: integer("group_id").references(() => groups.id), // Optional - may be a global settlement
  paymentMethod: text("payment_method").notNull(), // cash, venmo, other
  status: text("status").notNull().default(SettlementStatus.PENDING),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  transactionReference: text("transaction_reference"), // For external payment references
});

// Define settlement relations
export const settlementsRelations = relations(settlements, ({ one }) => ({
  fromUser: one(users, {
    fields: [settlements.fromUserId],
    references: [users.id]
  }),
  toUser: one(users, {
    fields: [settlements.toUserId],
    references: [users.id]
  }),
  group: one(groups, {
    fields: [settlements.groupId],
    references: [groups.id]
  })
}));

// Insert schema for settlements
export const insertSettlementSchema = createInsertSchema(settlements)
  .pick({
    fromUserId: true,
    toUserId: true,
    amount: true,
    groupId: true,
    paymentMethod: true,
    status: true,
    notes: true,
    transactionReference: true
  })
  .extend({
    amount: z.coerce.string(),
    groupId: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
    transactionReference: z.string().optional().nullable(),
    completedAt: z.date().optional().nullable(),
  });

// Types for settlements
export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlements.$inferSelect;
