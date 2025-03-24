import { pgTable, text, serial, integer, boolean, timestamp, numeric, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enhanced Users table with more profile information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").unique(), // Optional email for notifications (nullable)
  displayName: text("display_name"), // Optional display name (nullable)
  avatarUrl: text("avatar_url"), // Optional profile picture URL (nullable)
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
  password: true,
  email: true,
  displayName: true,
  avatarUrl: true
}).extend({
  email: z.string().email().optional().nullable(),
  displayName: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable()
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  description: true,
  createdById: true
}).extend({
  description: z.string().optional().nullable(),
  initialMembers: z.array(z.number()) // Array of user IDs to add to the group
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

// Settlement type (not stored in database, calculated on demand)
export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

// Balance type (not stored in database, calculated on demand)
export type Balance = {
  paid: Record<string, number>;
  owes: Record<string, number>;
  balances: Record<string, number>;
  settlements: Settlement[];
  totalExpenses: number;
};
